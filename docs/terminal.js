import { project, posts } from './shared.js';
import { markdown, safeURL } from './markdown.js';
import { REPOSITORY, listReleases, latestRelease, findRelease } from './releases.js';

const $ = selector => document.querySelector(selector);
const output = $('#output'), input = $('#command'), announcement = $('#announcement');
const commandHistory = [];
let historyIndex = 0, installSelection = false, warned = false, theatrical = false, modalTrigger;

const descriptions = {
  gui: 'Return to the official website', help: 'Available commands', about: 'What is IRdisC?', features: 'Show features',
  install: 'Installation instructions', screenshot: 'View IRdisC', docs: 'Documentation',
  github: 'Open repository', download: 'Download latest release', releases: 'Release history',
  release: 'Read a release: release latest / <version>', blog: 'Posts: blog latest / <number> / <slug>',
  version: 'Current official release', whoami: 'Current user', history: 'Command history', clear: 'Clear terminal'
};
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function p(target, text, className) { const node = el('p', text, className); target.append(node); return node; }
function action(target, label, command) {
  const button = el('button', label); button.type = 'button'; button.setAttribute('aria-label', label); button.dataset.command = command; target.append(button); return button;
}
function link(target, label, url) {
  const href = safeURL(url);
  if (!href) return;
  const anchor = el('a', label); anchor.href = href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; target.append(anchor); return anchor;
}
function heading(target, text) { target.append(el('h2', text)); }
function announce(text) { announcement.textContent = text; }
function scroll() { if ($('.terminal').hidden) return; window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); }
function scrollToEntry(entry) {
  if ($('.terminal').hidden) return;
  if (entry.isConnected && entry.offsetHeight > window.innerHeight - 60) {
    entry.scrollIntoView({ block: 'start', behavior: 'instant' });
  } else scroll();
}
function updatePrompt() { $('.prompt').textContent = installSelection ? 'Select:' : 'guest@irdisc:~$'; }
function date(value) {
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(parsed.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(parsed);
}
function releaseFallback(target, error) {
  p(target, 'Release information is temporarily unavailable.');
  if (error?.status === 403 || error?.status === 429) p(target, 'GitHub API rate limit reached. Try again later.', 'muted');
  link(target, 'View releases on GitHub ↗', `${REPOSITORY}/releases`);
}
async function loading(target, task) {
  const label = p(target, 'Loading…', 'muted');
  try { return await task(); } finally { label.remove(); }
}
function codeBlock(target, text) {
  const pre = el('pre'); pre.append(el('code', text)); target.append(pre);
  const row = el('div', undefined, 'copy-row'), button = el('button', 'Copy commands');
  button.type = 'button'; button.setAttribute('aria-label', 'Copy commands'); row.append(button); target.append(row);
  button.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text); announce('Commands copied.'); button.textContent = 'Copied';
    } catch {
      const range = document.createRange(); range.selectNodeContents(pre);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      button.textContent = 'Selected — copy manually';
      announce('Clipboard unavailable. Commands selected; use your normal copy action.');
    }
  });
}
async function renderRelease(target, release) {
  if (!release) { p(target, 'No official releases yet.'); link(target, 'View releases on GitHub ↗', `${REPOSITORY}/releases`); return; }
  heading(target, release.name || release.tag_name);
  p(target, `${release.tag_name} · Released: ${date(release.published_at)}${release.prerelease ? ' · prerelease' : ''}`, 'metadata');
  target.append(markdown(release.body || 'No release notes provided.', `${REPOSITORY}/blob/${encodeURIComponent(release.tag_name)}/`));
  link(target, 'View on GitHub ↗', release.html_url);
}
async function renderPost(target, post) {
  heading(target, post.title); p(target, `${date(post.date)} · ${post.author}`, 'metadata');
  target.append(markdown(post.body, new URL('./', import.meta.url).href));
  const permalink = el('a', 'Link to this post'); permalink.href = `#blog/${encodeURIComponent(post.slug)}`; target.append(permalink);
  const url = new URL(location.href); url.hash = `blog/${post.slug}`;
  window.history.replaceState(null, '', url);
  action(target, 'All posts', 'blog');
}

const commands = {
  gui(target) { p(target, 'Starting graphical web interface...'); window.dispatchEvent(new Event('irdisc:gui')); },
  help(target) {
    heading(target, 'Available commands'); const list = el('dl', undefined, 'command-list');
    for (const [name, description] of Object.entries(descriptions)) {
      const term = el('dt'); action(term, name, name).className = 'inline-command';
      list.append(term, el('dd', description));
    }
    target.append(list); p(target, 'Type or click a command. Links open in a new tab.', 'muted');
  },
  async about(target) { heading(target, '⇹ IRdisC'); p(target, (await project()).about); p(target, 'IRC, discomplicated.', 'tagline'); },
  async features(target) { heading(target, 'Features'); target.append(markdown((await project()).features)); },
  async install(target, args) {
    const data = await project();
    const choices = ['Source', 'Virtual environment', 'Wheel'];
    const methods = ['source', 'venv', 'wheel'];
    const choice = args.length ? (/^[123]$/.test(args[0]) ? Number(args[0]) - 1 : methods.indexOf(args[0])) : -1;
    if (args.length && choice < 0) { p(target, 'Choose install source, install venv, or install wheel.'); return; }
    heading(target, choice < 0 ? 'Install IRdisC' : `Install / ${choices[choice]}`);
    if (choice < 0) {
      installSelection = true;
      p(target, 'Choose installation method:');
      choices.forEach((name, index) => { action(target, `[${index + 1}] ${name}`, `install ${methods[index]}`).className = 'install-option'; });
      p(target, 'Type 1, 2 or 3, or tap a method.', 'muted'); return;
    }
    // The full requirements/context and commands are extracted from README at build time.
    p(target, data.installation.split('\n\n')[0].replaceAll('**', '').replaceAll('`', ''));
    p(target, choice === 0 ? 'Extract the source ZIP or tar.gz. Run from its directory. Keep all Python modules together.' : choice === 1 ? 'Run from the source directory. Source installation uses setuptools >=77. Avoid installing into system Python.' : 'Run from the release bundle directory containing dist/. These are the README wheel instructions; an attached wheel is not guaranteed on GitHub.');
    codeBlock(target, data.installBlocks[choice]);
    if (choice > 0) p(target, 'If your distribution packages Python venv separately, install that package first.', 'muted');
    link(target, 'Full installation instructions ↗', `${REPOSITORY}#installation`);
  },
  async screenshot(target, args, trigger) {
    if (args[0] === 'view') {
      openScreenshot(trigger || input); return;
    }
    heading(target, `IRdisC ${(await project()).version}`);
    p(target, 'Actual curses renderer with synthetic offline demo conversations.', 'muted');
    action(target, 'View screenshot', 'screenshot view');
  },
  docs(target) { heading(target, 'Documentation'); link(target, 'README / installation, controls and limitations ↗', `${REPOSITORY}#readme`); p(target, 'The repository is the source of truth.'); },
  github(target) { heading(target, 'X86Max / IRdisC'); link(target, 'Open repository ↗', REPOSITORY); },
  async download(target) {
    try {
      const release = await loading(target, latestRelease);
      if (!release) { p(target, 'No official releases yet.'); link(target, 'View releases on GitHub ↗', `${REPOSITORY}/releases`); return; }
      heading(target, `Download ${release.tag_name}`);
      link(target, 'Open official release / downloads ↗', release.html_url);
      for (const asset of release.assets || []) { const row = p(target, ''); link(row, asset.name, asset.browser_download_url); }
      if (!release.assets?.length) p(target, 'This release has no uploaded assets. GitHub provides source archives on the release page.', 'muted');
    } catch (error) { releaseFallback(target, error); }
  },
  async releases(target) {
    try {
      const releases = await loading(target, listReleases); heading(target, 'IRdisC Releases');
      if (!releases.length) { p(target, 'No official releases yet.'); link(target, 'View releases on GitHub ↗', `${REPOSITORY}/releases`); }
      for (const release of releases) {
        const row = el('div', undefined, 'post-item');
        action(row, release.tag_name, `release ${release.tag_name}`);
        row.append(el('span', `${date(release.published_at)}${release.prerelease ? ' · prerelease' : ''}`, 'metadata')); target.append(row);
      }
      p(target, "Type 'release <version>' or 'release latest' to read release notes.", 'muted');
    } catch (error) { releaseFallback(target, error); }
  },
  async release(target, args) {
    const version = args.join(' ') || 'latest';
    try {
      const release = await loading(target, () => version === 'latest' ? latestRelease() : findRelease(version));
      if (!release && version !== 'latest') { p(target, `IRdisC release not found: ${version}`); return; }
      await renderRelease(target, release);
    } catch (error) { releaseFallback(target, error); }
  },
  async blog(target, args) {
    const all = await posts();
    if (!all.length) { p(target, 'No blog posts yet.'); return; }
    if (!args.length) {
      heading(target, 'IRdisC Blog');
      all.forEach((post, index) => {
        const row = el('article', undefined, 'post-item'); row.append(el('h3', `${index + 1}. ${post.title}`));
        p(row, `${date(post.date)} · ${post.author}`, 'metadata'); p(row, post.description);
        action(row, 'Read', `blog ${post.slug}`); target.append(row);
      });
      p(target, "Type 'blog <number>', 'blog <slug>' or 'blog latest'.", 'muted'); return;
    }
    const key = args.join(' ');
    const post = key === 'latest' ? all[0] : /^\d+$/.test(key) ? all[Number(key) - 1] : all.find(post => post.slug === key);
    if (!post) { p(target, 'Blog post not found.'); return; }
    await renderPost(target, post);
  },
  async version(target) {
    try {
      const release = await loading(target, latestRelease);
      if (release) { p(target, `IRdisC ${release.tag_name} — current official release`); }
      else p(target, 'No official releases yet.');
    } catch (error) {
      releaseFallback(target, error);
      p(target, `Local project metadata: ${(await project()).version} (latest release could not be verified).`, 'muted');
    }
  },
  whoami(target) { p(target, 'guest'); },
  history(target) {
    heading(target, 'Command history');
    const list = el('ol'); for (const command of commandHistory) list.append(el('li', command)); target.append(list);
  },
  clear() { output.replaceChildren(); }
};

async function fakeDeletion(target) {
  if (!warned) { warned = true; p(target, "Don't do this.\nPlease.\n\nThis is your only warning.", 'fake-line'); return; }
  theatrical = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const demo = ['/usr/bin/irdisc', '/usr/lib/python3', '/etc/hostname', '/home/guest', '/var/log', '/boot', '/'];
  const disabled = [...document.querySelectorAll('.controls button, .controls input')];
  disabled.forEach(node => { node.disabled = true; });
  $('.terminal').classList.add('destruction');
  announce('Playing a fictional deletion sequence. Nothing is being deleted.');
  const sequence = el('div'); sequence.setAttribute('aria-hidden', 'true'); target.append(sequence);
  try {
    if (reduced) p(sequence, 'Pretending to remove demo files…\n[simulation complete]', 'fake-line');
    else {
      for (const path of demo) {
        p(sequence, `Removing ${path}…`, 'fake-line'); scroll();
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }
    // Only this web page's transcript is replaced, never files or browser storage.
    output.replaceChildren();
    const restored = el('article', undefined, 'entry');
    p(restored, '…'); heading(restored, "You didn't really think I'd let you do that, did you?");
    p(restored, '⇹ IRdisC restored. Your guest session is still here.', 'muted'); output.append(restored);
    announce('Simulation complete. Nothing was deleted. IRdisC terminal restored.');
  } finally {
    theatrical = false; $('.terminal').classList.remove('destruction');
    disabled.forEach(node => { node.disabled = false; }); input.focus(); scroll();
  }
}
const eggs = new Map([
  ['sudo apt install irdisc', target => { p(target, '[sudo] password for guest:'); p(target, "Nice try.\nRun 'install' for the actual installation instructions.", 'fake-line'); }],
  ['sudo rm -rf /', fakeDeletion]
]);

async function execute(raw, trigger = input) {
  const command = raw.trim().replace(/\s+/g, ' ');
  if (!command || theatrical) return;
  commandHistory.push(command); historyIndex = commandHistory.length; input.value = '';
  const wasSelecting = installSelection;
  const entry = el('article', undefined, 'entry');
  const echo = el('p', undefined, 'echo'); echo.append(el('span', wasSelecting && /^[123]$/.test(command) ? 'Select: ' : 'guest@irdisc:~$ '), document.createTextNode(command));
  const result = el('div', undefined, 'result'); entry.append(echo, result); output.append(entry);
  installSelection = false; updatePrompt();
  const [name, ...args] = command.split(' ');
  $('#activity').textContent = 'working'; scroll();
  try {
    if (eggs.has(command)) await eggs.get(command)(result);
    else if (wasSelecting && /^[123]$/.test(command)) await commands.install(result, [command]);
    else if (Object.hasOwn(commands, name)) await commands[name](result, args, trigger);
    else { p(result, `irdisc: command not found: ${command}`); p(result, "Type 'help' to see available commands."); }
  } catch (error) {
    p(result, 'This content could not be loaded. The terminal is still available.');
    p(result, error.message, 'muted');
  } finally {
    $('#activity').textContent = 'ready'; updatePrompt(); scrollToEntry(entry);
    if (!theatrical && result.isConnected) announce(`${command}: ${result.textContent.slice(0, 700) || 'done'}`);
    else if (name === 'clear') announce('Terminal cleared.');
    // Restore input only when the initiating control still owns focus.
    if (!$('#screenshot-dialog').open && (document.activeElement === trigger || document.activeElement === document.body)) input.focus({ preventScroll: true });
  }
}
$('#command-form').addEventListener('submit', event => { event.preventDefault(); execute(input.value); });
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-command]');
  if (button) execute(button.dataset.command, button);
});
input.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
    input.value = commandHistory[historyIndex] || ''; input.setSelectionRange(input.value.length, input.value.length);
  } else if (event.key === 'Tab' && !event.shiftKey && input.value && !/\s/.test(input.value)) {
    const matches = Object.keys(commands).filter(command => command.startsWith(input.value));
    if (!matches.length || matches.includes(input.value)) return;
    event.preventDefault();
    let common = matches[0]; while (!matches.every(command => command.startsWith(common))) common = common.slice(0, -1);
    input.value = common;
    if (matches.length > 1) { const hint = p(output, `Matches: ${matches.join(' · ')}`, 'muted'); hint.dataset.completion = 'true'; announce(hint.textContent); scroll(); }
  } else if (event.ctrlKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === 'l') {
    event.preventDefault(); execute('clear');
  }
});
$('#close-dialog').addEventListener('click', () => $('#screenshot-dialog').close());
$('#screenshot-dialog').addEventListener('keydown', event => {
  // The close button is currently the dialog's only interactive element.
  if (event.key === 'Tab') { event.preventDefault(); $('#close-dialog').focus(); }
});
$('#screenshot-dialog').addEventListener('close', () => {
  if (document.activeElement === document.body || $('#screenshot-dialog').contains(document.activeElement)) {
    (modalTrigger?.isConnected ? modalTrigger : input).focus({ preventScroll: true });
  }
});
export function terminalRoute() {
  if ($('.terminal').hidden) return;
  if (!location.hash.startsWith('#blog/')) return;
  try { execute(`blog ${decodeURIComponent(location.hash.slice(6))}`); }
  catch { const node = el('article', undefined, 'entry'); p(node, 'Blog post not found.'); output.append(node); }
}

export function openScreenshot(trigger = input) {
  modalTrigger = trigger;
  $('#screenshot-dialog').showModal(); $('#close-dialog').focus();
}
export function focusTerminal() { if (matchMedia('(pointer: fine)').matches) input.focus({preventScroll:true}); }
