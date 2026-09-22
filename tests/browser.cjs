/* Local-only tests. Start the built site over HTTP, then set SITE_URL if needed.
   RELEASE_SNAPSHOT is an optional path to a fresh public GitHub API response.
   Test-only synthetic records never enter the website build. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SITE_URL || 'http://127.0.0.1:8765/terminal.html';
const artifacts = process.env.TEST_ARTIFACTS || path.join(__dirname, '../test-results');
fs.mkdirSync(artifacts, { recursive: true });
const snapshot = process.env.RELEASE_SNAPSHOT ? JSON.parse(fs.readFileSync(process.env.RELEASE_SNAPSHOT, 'utf8')) : null;
const synthetic = { tag_name: 'v0.1.0', name: 'Test fixture', published_at: '2026-09-21T01:22:41Z', body: '# Heading\n\n**Bold** and *italic* with `inline`.\n\n- Item\n\n1. One\n\n```sh\npython3 irdisc.py\n```\n\n[GitHub](https://github.com/X86Max/IRdisC)', html_url: 'https://github.com/X86Max/IRdisC/releases/tag/v0.1.0', assets: [] };
const releases = snapshot || [synthetic];
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let apiRequests = 0;
  await page.route('https://api.github.com/**', async route => {
    apiRequests++;
    await route.fulfill({ json: route.request().url().endsWith('/latest') ? releases.find(r => !r.prerelease) : releases });
  });
  await page.goto(base);
  const input = page.locator('#command');
  async function command(text, expected) {
    await input.fill(text); await input.press('Enter');
    if (expected) await page.locator('#output').getByText(expected, { exact: false }).last().waitFor();
    await page.waitForFunction(() => document.querySelector('#activity').textContent === 'ready');
  }
  await page.screenshot({ path: path.join(artifacts, 'desktop.png'), fullPage: true });
  assert.equal(await page.locator('.terminal header,.terminal footer,.terminal nav,.terminal .run,.terminal .shortcuts,.terminal .titlebar,.terminal .sessionbar').count(),0);
  assert.equal(await input.evaluate(el=>getComputedStyle(el).borderWidth),'0px');
  assert.equal(await page.locator('#output').evaluate(el=>getComputedStyle(el).maxHeight),'none');
  assert.equal(await page.locator('.terminal h1').evaluate(el=>getComputedStyle(el).fontSize),'15px');
  const promptBox = await page.locator('.prompt').boundingBox(), inputBox = await input.boundingBox();
  assert.ok(Math.abs(promptBox.y-inputBox.y)<3, 'prompt and input share a line');
  for (const [cmd, expected] of [
    ['help','Available commands'], ['about','lightweight IRC TUI'], ['features','Verified TLS'],
    ['install','Choose installation method'], ['1','python3 irdisc.py'],
    ['install venv','pip install .'], ['install wheel','--no-index'],
    ['docs','README / installation'], ['github','Open repository'],
    ['download','Download v0.1.0'], ['releases','IRdisC Releases'],
    ['release latest', releases[0].name], ['release v0.1.0', releases[0].name],
    ['release v9.9.9','IRdisC release not found: v9.9.9'],
    ['blog','IRdisC Blog'], ['blog latest','Why I built IRdisC'], ['blog 1','Why I built IRdisC'],
    ['blog why-i-built-irdisc','Why I built IRdisC'], ['blog missing','Blog post not found.'],
    ['version','current official release'], ['whoami','guest'], ['history','Command history'],
    ['xyz','irdisc: command not found: xyz'], ['sudo apt install irdisc','Nice try.']
  ]) await command(cmd, expected);
  assert.equal(apiRequests, 2, 'session caches list and latest independently');
  await command('clear'); assert.equal(await page.locator('#output').innerText(), '');
  await command('about'); await command('features'); await command('github');
  for (const [key, value] of [['ArrowUp','github'],['ArrowUp','features'],['ArrowUp','about'],['ArrowDown','features'],['ArrowDown','github'],['ArrowDown','']]) {
    await input.press(key); assert.equal(await input.inputValue(), value);
  }
  await input.press('ArrowUp'); await input.fill('whoami');
  assert.equal(await page.locator('#output .entry').count(), 3, 'history edits do not execute');
  await input.press('Enter');
  await input.fill('fea'); await input.press('Tab'); assert.equal(await input.inputValue(), 'features');
  await input.fill('rel'); await input.press('Tab'); assert.equal(await input.inputValue(), 'release');
  assert.match(await page.locator('#output').innerText(), /Matches: releases · release/);
  await input.fill(''); await input.press('Tab'); assert.equal(await input.evaluate(el => el === document.activeElement), false);
  await input.focus(); await input.press('Control+l'); assert.equal(await page.locator('#output').innerText(), '');
  await command('help');
  await page.locator('.command-list [data-command="about"]').click();
  await page.locator('#output').getByText('lightweight IRC TUI', { exact: false }).waitFor();
  await command('screenshot', 'View screenshot');
  const view = page.getByRole('button', {name:'View screenshot',exact:true}); await view.click();
  assert.equal(await page.locator('dialog').evaluate(el => el.open), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('dialog').evaluate(el => el.contains(document.activeElement)), true, 'modal traps focus');
  await page.keyboard.press('Escape');
  assert.equal(await view.evaluate(el => el === document.activeElement), true, 'modal restores trigger');
  await command('install'); assert.equal(await page.locator('.prompt').innerText(), 'Select:'); await page.getByRole('button',{name:'[2] Virtual environment',exact:true}).click();
  await page.locator('.result pre').last().waitFor();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value:undefined }));
  await page.getByRole('button',{name:'Copy commands',exact:true}).last().click();
  assert.match(await page.evaluate(() => getSelection().toString()), /pip install/);
  await command('sudo rm -rf /','This is your only warning.');
  const start = Date.now(); await command('sudo rm -rf /', "You didn't really think");
  assert.ok(Date.now()-start < 5000); assert.ok(Date.now()-start >= 2000);
  await command('whoami','guest');
  await page.emulateMedia({reducedMotion:'reduce'});
  await command('sudo rm -rf /',"You didn't really think");
  assert.doesNotMatch(await page.locator('#output').innerText(),/only warning/);
  await command('blog 1','Why I built IRdisC');
  await page.reload(); await page.getByText('Why I built IRdisC',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).hash, '#blog/why-i-built-irdisc');

  // Markdown allowlist and hostile content; executed in the same production renderer.
  const safe = await page.evaluate(async () => {
    const {markdown} = await import('./markdown.js');
    const section = document.createElement('div');
    section.append(markdown('# Heading\n\n**bold** *italic* `code`\n\n- item\n\n1. first\n\n```js\n<x>\n```\n\n[bad](javascript:alert(1))\n\n<script>window.pwned=true</script><img src=x onerror="window.pwned=true"><svg onload="window.pwned=true"></svg><a href="data:text/html,x" onclick="alert(1)">bad</a>'));
    document.querySelector('#output').append(section);
    return {bad:section.querySelectorAll('script,img,svg,[onclick],[onerror],a[href^="javascript"],a[href^="data:"]').length, tags:['strong','em','code','pre','ul','ol'].every(tag=>section.querySelector(tag)), pwned:!!window.pwned};
  });
  assert.deepEqual(safe,{bad:0,tags:true,pwned:false});

  for (const width of [320,360,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    await command('clear'); await command('install wheel'); await command('blog latest'); await command('release latest');
    await page.evaluate(() => {
      const text = document.createElement('p'); text.textContent='https://example.com/'+'long-path-'.repeat(60); document.querySelector('#output').append(text);
    });
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `no page overflow at ${width}`);
    assert.ok(await page.locator('#output').evaluate(el=>el.scrollWidth<=el.clientWidth), `no transcript overflow at ${width}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight), 'document provides scrollback');
    await page.screenshot({path:path.join(artifacts,`width-${width}.png`),fullPage:true});
    await command('screenshot'); await page.getByRole('button',{name:'View screenshot',exact:true}).click();
    const image = await page.locator('dialog img').boundingBox();
    assert.ok(image.x>=0 && image.x+image.width<=width);
    assert.ok(await page.locator('dialog img').evaluate(img=>img.complete && img.naturalWidth>0));
    await page.screenshot({path:path.join(artifacts,`modal-${width}.png`),fullPage:true});
    await page.keyboard.press('Escape');
    await command('sudo rm -rf /'); await command('sudo rm -rf /',"You didn't really think");
    await command('help','Available commands');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.deepEqual(errors,[]);

  // Separate sessions exercise failures, empty states and rate-limit caching.
  for (const mode of ['network','rate-limit','empty','posts-missing','posts-empty']) {
    const test = await browser.newPage({viewport:{width:320,height:800}});
    let calls=0;
    await test.route('https://api.github.com/**', route => {
      calls++;
      if(mode==='network') return route.abort();
      if(mode==='rate-limit') return route.fulfill({status:403,json:{message:'rate limit'}});
      return route.fulfill(route.request().url().endsWith('/latest') ? {status:404,json:{}} : {json:[]});
    });
    if(mode.startsWith('posts-')) await test.route('**/data/posts.json',route=>route.fulfill(mode==='posts-missing'?{status:404,body:''}:{json:[]}));
    await test.goto(base);
    async function run(cmd) { await test.locator('#command').fill(cmd);await test.locator('#command').press('Enter'); await test.waitForFunction(()=>document.querySelector('#activity').textContent==='ready'); }
    if(mode.startsWith('posts-')) {
      await run('blog');assert.match(await test.locator('#output').innerText(),mode==='posts-empty'?/No blog posts yet/:/could not be loaded/);
    } else {
      await run('releases'); await run('releases');
      assert.equal(calls,1);
      assert.match(await test.locator('#output').innerText(),mode==='empty'?/No official releases yet/:/temporarily unavailable/);
      assert.ok(await test.getByRole('link',{name:'View releases on GitHub ↗'}).count());
      await run('version');
    }
    await run('whoami'); assert.match(await test.locator('#output').innerText(),/guest/);
    await test.close();
  }
  // Touch users discover every command through terminal text; no toolbar is needed.
  const touch = await browser.newPage({viewport:{width:320,height:740},isMobile:true,hasTouch:true});
  await touch.goto(base);
  await touch.locator('.welcome [data-command="help"]').tap();
  await touch.locator('.command-list [data-command="blog"]').tap();
  await touch.getByRole('button',{name:'Read',exact:true}).tap();
  await touch.locator('#output h2').getByText('Why I built IRdisC').waitFor();
  await touch.screenshot({path:path.join(artifacts,'touch-blog-320.png'),fullPage:true});
  await touch.locator('.command-list [data-command="install"]').tap();
  await touch.getByRole('button',{name:'[3] Wheel',exact:true}).tap();
  assert.ok(await touch.locator('.result pre').last().evaluate(el=>el.scrollWidth>el.clientWidth));
  await touch.locator('#command').tap();
  assert.equal(await touch.locator('#command').evaluate(el=>el===document.activeElement),true);
  await touch.locator('#command').fill('whoami'); await touch.locator('#command').press('Enter');
  assert.equal(await touch.locator('.entry').last().locator('.result').innerText(),'guest');
  assert.ok(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await touch.close();
  await browser.close();
  console.log(`PASS: commands, keyboard, modal/focus, copy fallback, blog deep links, Markdown safety, release caching/errors, simulation and 5 responsive widths. ${snapshot?'Used current public GitHub snapshot.':'Used synthetic release fixture.'}`);
})().catch(error=>{console.error(error);process.exit(1)});
