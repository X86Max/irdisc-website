import { SITE } from './site-config.js';
import { marked } from './vendor/marked.js';

const allowed = new Set(['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','STRONG','EM','DEL','CODE','PRE','BLOCKQUOTE','A','BR','HR','TABLE','THEAD','TBODY','TR','TH','TD']);
const drop = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEMPLATE','LINK','META']);
export function safeURL(value, base = SITE.clientRepository + '/') {
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

// Parse off-document, then rebuild a small allowlist of elements/attributes.
// Untrusted HTML is never inserted into the live page.
export function markdown(text, base) {
  const template = document.createElement('template');
  template.innerHTML = marked.parse(String(text), { gfm: true, breaks: false });
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    const fragment = document.createDocumentFragment();
    if (node.nodeType !== Node.ELEMENT_NODE || drop.has(node.tagName)) return fragment;
    if (node.tagName === 'IMG') return document.createTextNode(node.getAttribute('alt') || '');
    let result = allowed.has(node.tagName) ? document.createElement(node.tagName === 'H1' ? 'h3' : node.tagName.toLowerCase()) : fragment;
    if (node.tagName === 'A' && result !== fragment) {
      const href = safeURL(node.getAttribute('href'), base);
      if (href) { result.href = href; result.target = '_blank'; result.rel = 'noopener noreferrer'; }
    }
    if (node.tagName === 'OL' && /^\d+$/.test(node.getAttribute('start') || '')) result.start = Number(node.getAttribute('start'));
    for (const child of node.childNodes) result.append(clean(child));
    return result;
  }
  const result = document.createDocumentFragment();
  for (const child of template.content.childNodes) result.append(clean(child));
  return result;
}
