// Read-only provider. Replace this module with a static-data provider later if desired.
import { SITE } from './site-config.js';
export const REPOSITORY = SITE.clientRepository;
const API = 'https://api.github.com/repos/' + new URL(REPOSITORY).pathname.split('/').filter(Boolean).slice(0,2).join('/');
const cache = new Map();

async function request(path) {
  const existing = cache.get(path);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const record = { expires: Infinity };
  record.promise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(API + path, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) {
        const error = new Error(response.status === 403 || response.status === 429 ? 'GitHub API rate limit reached.' : 'Release information is temporarily unavailable.');
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      record.expires = Date.now() + 60000; // Avoid hammering the API on failures.
      throw error;
    } finally { clearTimeout(timeout); }
  })();
  cache.set(path, record);
  return record.promise;
}

export async function listReleases() {
  const releases = [];
  for (let page = 1; ; page++) {
    const data = await request(page === 1 ? '/releases' : `/releases?per_page=30&page=${page}`);
    if (!Array.isArray(data)) throw new Error('Invalid GitHub release response.');
    releases.push(...data.filter(release => !release.draft));
    if (data.length < 30) break;
  }
  return releases.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}
export async function latestRelease() {
  try { return await request('/releases/latest'); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
export async function findRelease(version) {
  const releases = await listReleases();
  return releases.find(release => release.tag_name === version || release.tag_name === `v${version}`) || null;
}
