const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const artifacts=require('node:path').join(__dirname,'../test-results');fs.mkdirSync(artifacts,{recursive:true});
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
const snapshot=process.env.RELEASE_SNAPSHOT ? JSON.parse(fs.readFileSync(process.env.RELEASE_SNAPSHOT,'utf8')) : [{tag_name:'v0.1.0',name:'QA fixture',published_at:'2026-09-21T01:22:41Z',body:'## Test notes\n\n- Test only',html_url:'https://github.com/X86Max/IRdisC/releases/tag/v0.1.0',assets:[]}];
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let calls=0;
await page.route('https://api.github.com/**',r=>{calls++;return r.fulfill({json:r.request().url().endsWith('/latest')?snapshot[0]:snapshot});});
await page.goto(base);await page.locator('#classic-content').getByRole('heading',{name:'IRdisC v0.1.0',exact:true}).waitFor();
async function route(hash='') {await page.locator('#classic nav a').first().evaluate((el,hash)=>{el.href='./index.html'+(hash?'#'+hash:'');el.click();},hash);await page.waitForFunction(()=>!document.querySelector('#classic-content').hasAttribute('aria-busy'));}
async function command(cmd){await page.locator('#command').fill(cmd);await page.locator('#command').press('Enter');await page.waitForFunction(()=>document.querySelector('#activity').textContent==='ready');}
for(const [hash,title]of [['','IRdisC v0.1.0'],['about','About IRdisC'],['download','Download IRdisC'],['docs','Documentation'],['screenshots','Screenshots'],['blog','News'],['blog/why-i-built-irdisc','Why I built IRdisC'],['releases','Releases'],['release/v0.1.0','Releases'],['community','Community'],['links','Links'],['link','Link to IRdisC']]){
await route(hash);assert.equal(await page.locator('#classic-content h1').innerText(),title);}
assert.equal(calls,2);
assert.match(await page.locator('#classic-content').innerText(),/final embed code is not available/);
assert.equal(await page.getByRole('button',{name:'Copy HTML',exact:true}).count(),0);
await route('download');assert.equal(await page.locator('#classic-content a[href$="#download"]').count(),0);
await route('releases');assert.equal(await page.getByRole('link',{name:'[ Download ]',exact:true}).count(),0);assert.ok(await page.getByRole('link',{name:'[ GitHub release ]',exact:true}).count());
await route('release/v0.1.0');assert.ok(await page.getByRole('link',{name:'[ View on GitHub ]',exact:true}).count());
for(const hash of ['community','submissions/site','submissions/guestbook','submissions/showcase','link']){await route(hash);assert.doesNotMatch(await page.locator('#classic-content').innerText(),/Owner setup|config\/site\.json|PUBLIC_IRDISC_SITE_URL/);}
assert.equal(await page.locator('#classic nav a[href$="#blog"]').innerText(),'News');
await route('link');
const download=page.waitForEvent('download');await page.getByRole('link',{name:'[ Download irdisc-88x31.gif ]',exact:true}).click();assert.equal((await download).suggestedFilename(),'irdisc-88x31.gif');
await page.locator('#classic nav [data-terminal]').click();await command('about');await command('version');await command('gui');await page.waitForFunction(()=>document.body.dataset.interface==='classic');
assert.match(await page.locator('#classic-content').innerText(),/IRdisC v0.1.0/);
await page.locator('#classic nav [data-terminal]').click();await command('history');assert.match(await page.locator('#output').innerText(),/about[\s\S]*version[\s\S]*gui/);
await page.emulateMedia({reducedMotion:'reduce'});const start=Date.now();await command('gui');await page.waitForFunction(()=>document.body.dataset.interface==='classic');assert.ok(Date.now()-start<1500);
await page.locator('#classic nav [data-terminal]').click();await command('whoami');await command('gui');await page.waitForFunction(()=>document.body.dataset.interface==='classic');assert.equal(calls,2,'shared release cache survives switches');
await route('community');for(const text of ['No community websites','No one has signed','Nothing has been submitted','no members yet'])assert.match(await page.locator('#classic-content').innerText(),new RegExp(text));
for(const width of [320,360,390,768,1440]){
await page.setViewportSize({width,height:900});
for(const name of ['home','download','community','link','blog/why-i-built-irdisc','release/v0.1.0']){
await route(name==='home'?'':name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' '+width);
if(name==='home'){const boxes=await page.locator('.home-updates section').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));assert.equal(boxes[0].y===boxes[1].y,width>600);const image=page.locator('.home-product img');assert.ok(await image.evaluate(e=>e.complete&&e.naturalWidth>0));}
if(['home','community','link'].includes(name))await page.screenshot({path:`${artifacts}/classic-${name}-${width}.png`,fullPage:true});
if(name==='link'){const box=await page.locator('#classic-content .web-button').boundingBox();assert.equal(box.width,88);assert.equal(box.height,31);}
}
await route('screenshots');await page.getByRole('button',{name:'View IRdisC screenshot'}).click();assert.ok(await page.locator('dialog img').evaluate(el=>el.complete&&el.naturalWidth>0));await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'View IRdisC screenshot'}).evaluate(el=>el===document.activeElement),true);
}
// Fixture-only community members; nothing is written into production data.
for(const count of [1,3]){
const members=Array.from({length:count},(_,i)=>({id:'member-'+i,name:'QA member '+i,url:'https://example.com/'+i,description:'<img onerror=alert(1)>',button:{src:'assets/community/missing.gif',width:88,height:31}}));
const test=await browser.newPage({viewport:{width:320,height:850}});
await test.route('https://api.github.com/**',r=>r.fulfill({json:r.request().url().endsWith('/latest')?snapshot[0]:snapshot}));
await test.route('**/data/community-sites.json',r=>r.fulfill({json:members}));
await test.route('**/data/guestbook.json',r=>r.fulfill({json:[{id:'qa',name:'QA only',date:'2026-09-21',message:'<script>alert(1)</script>',website:'https://example.com'}]}));
await test.route('**/data/showcase.json',r=>r.fulfill({json:[{id:'qa',title:'QA only',date:'2026-09-21',author:'Fixture',description:'A test',image:'assets/screenshot.png',alt:'Test screenshot'}]}));
await test.route('https://example.com/**',r=>r.abort());
await test.goto(base+'index.html#community');await test.waitForFunction(()=>!document.querySelector('#classic-content').hasAttribute('aria-busy'));
const prev=test.getByRole('link',{name:'[ ← Previous ]',exact:true}),next=test.getByRole('link',{name:'[ Next → ]',exact:true});
assert.equal(await prev.getAttribute('href'),'https://example.com/'+(count-1));assert.equal(await next.getAttribute('href'),'https://example.com/'+(count===1?0:1));
if(count===3){await test.getByLabel('Ring member').selectOption('member-1');assert.equal(await prev.getAttribute('href'),'https://example.com/0');assert.equal(await next.getAttribute('href'),'https://example.com/2');}
assert.ok(await test.getByRole('link',{name:'[ Random Site ]',exact:true}).getAttribute('href'));
assert.equal(await test.locator('#classic-content script,#classic-content [onerror]').count(),0);
assert.ok(await test.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.match(await test.locator('#classic-content').innerText(),/<script>alert/);
assert.ok(await test.locator('.button-wall').innerText());
await test.close();
}
const parsed=await page.evaluate(async()=>{const {embedHTML,ringNeighbours,randomMember}=await import('./shared.js');const e=embedHTML('https://example.com/project/');const a=document.createElement('div');a.innerHTML=e;return {href:a.querySelector('a').href,src:a.querySelector('img').src,empty:ringNeighbours([],null),random:randomMember([],null)}});
assert.equal(parsed.href,'https://example.com/project/');assert.equal(parsed.src,'https://example.com/project/assets/irdisc-88x31.gif');assert.deepEqual(parsed.empty,{previous:null,next:null});assert.equal(parsed.random,null);
// Configured embed fixture tests copying without publishing a fictitious URL.
const configured=await browser.newPage();
await configured.route('**/site-config.js',async r=>{const response=await r.fetch();let text=await response.text();text=text.replace('"publicSiteUrl": ""','"publicSiteUrl": "https://example.com/project/"');await r.fulfill({response,body:text});});
await configured.goto(base+'index.html#link');await configured.getByRole('button',{name:'Copy HTML',exact:true}).first().waitFor();
await configured.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await configured.getByRole('button',{name:'Copy HTML',exact:true}).first().click();assert.match(await configured.evaluate(()=>getSelection().toString()),/width="88" height="31"/);
await configured.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.copied=text}}));await configured.getByRole('button',{name:'Copy HTML',exact:true}).first().click();assert.match(await configured.evaluate(()=>window.copied),/https:\/\/example.com\/project/);await configured.close();
const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base);assert.match(await nojs.locator('#classic-content').innerText(),/lightweight IRC TUI/);await nojs.locator('#classic nav [data-terminal]').click();assert.equal(await nojs.locator('.terminal').isVisible(),true);await nojs.close();
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: classic pages, shared caches, gui/history, community fixtures, webring, GIF download/copy, 5 widths and no-JS links.');
})().catch(e=>{console.error(e);process.exit(1)});
