import { SITE } from './site-config.js';
// One session cache for both interfaces; failures can be retried.
const data = new Map();
export function loadData(name) {
  if (!data.has(name)) data.set(name, fetch(new URL(`./data/${name}.json`, import.meta.url))
    .then(r => { if (!r.ok) throw new Error('Local data unavailable. Rebuild and serve dist over HTTP.'); return r.json(); })
    .catch(error => { data.delete(name); throw error; }));
  return data.get(name);
}
export const project = () => loadData('project');
export const posts = () => loadData('posts');
export const config = () => Promise.resolve(SITE);
export function date(value) {
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(parsed.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en', {dateStyle:'long',timeZone:'UTC'}).format(parsed);
}
export function ringNeighbours(sites, id) {
  if (!sites.length) return {previous:null,next:null};
  const i = Math.max(0, sites.findIndex(s => s.id === id));
  return {previous:sites[(i-1+sites.length)%sites.length],next:sites[(i+1)%sites.length]};
}
export function randomMember(sites, id, random = Math.random) {
  const others = sites.filter(s=>s.id!==id);
  const pool = others.length ? others : sites;
  return pool.length ? pool[Math.floor(random()*pool.length)] : null;
}
export function embedHTML(base, selfHosted=false) {
  const escape = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const url = base ? base.replace(/\/?$/, '/') : 'PUBLIC_IRDISC_SITE_URL/';
  return `<a href="${escape(url)}">\n  <img src="${escape(selfHosted ? '/images/irdisc-88x31.gif' : url+'assets/irdisc-88x31.gif')}"\n       width="88" height="31"\n       alt="IRdisC — IRC, discomplicated.">\n</a>`;
}
