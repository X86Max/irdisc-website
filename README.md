# IRdisC website

A standalone static website for
[X86Max/IRdisC](https://github.com/X86Max/IRdisC). The classic
software-project homepage is the default. The approved Web Terminal is
an alternate interface. This source tree is independent of the Python
IRC client: no client source, client runtime or adjacent client checkout
is required.

## Build and preview

From this directory, using Python 3.11+ (standard library only):

``` bash
python3 build.py
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000/ for the homepage and
http://localhost:8000/terminal.html for the terminal. Use HTTP, not
`file://`. Rebuild after editing source, configuration, blog posts or
community data. The Python server is for local preview only; the output
is entirely static.

## Files and ownership

-   `src/index.html`, `classic.css`, `classic.js`: classic homepage and
    page views.
-   `src/terminal.js`, `style.css`: preserved terminal registry and
    approved appearance.
-   `src/app.js`, `interface.css`: lightweight interface switching and
    the short `gui` fade.
-   `src/shared.js`: shared data cache, dates, webring navigation and
    embed HTML.
-   `src/releases.js`: read-only public GitHub API provider shared by
    both interfaces.
-   `src/markdown.js`, `src/vendor/`: allowlisted Markdown renderer and
    Marked/MIT license.
-   `config/site.json`: public site/repository/IRC configuration.
-   `posts/*.md`: website-owned blog/news source.
-   `data/*.json`: moderated community sites, guestbook and showcase.
-   `assets/`: real screenshot, logo and official 88×31 button files.
-   `reference/`: small attributed client documentation/metadata
    snapshot for offline builds. See `reference/PROVENANCE.md`; this is
    not a copy of the IRC client source tree.
-   `.github/ISSUE_TEMPLATE/`: moderated community submission forms.
-   `.github/workflows/deploy.yml`: GitHub Pages build and deployment
    workflow.
-   `dist/`: generated static output (ignored by Git).
-   `tests/`: Python validation tests and Playwright browser tests.
-   `test-results/`: local review screenshots (ignored by Git).

The client repository remains the source of releases, download URLs,
source code and documentation. This website owns its posts, community
entries and web assets.

## Configuration

Edit `config/site.json`:

  -----------------------------------------------------------------------
  Key                                 Meaning
  ----------------------------------- -----------------------------------
  `clientRepository`                  Actual IRdisC GitHub URL, used by
                                      the release provider.

  `publicSiteUrl`                     Absolute website base URL,
                                      including any project path.

  `websiteRepository`                 Website repository URL, used for
                                      moderated community submissions.

  `irc`                               Official IRC
                                      network/server/channel, port and
                                      TLS configuration.

  `screenshot`, `button`              Local asset paths.
  -----------------------------------------------------------------------

Never add a private token: none is needed or accepted by the browser
release code.

## Pages and direct links

Home `/`; About `#about`; Download `#download`; Docs `#docs`;
Screenshots `#screenshots`; News `#blog`; a post `#blog/slug`; Releases
`#releases`; a release `#release/v0.1.0`; Community `#community`; Links
`#links`; Link to IRdisC `#link`; submission guidance
`#submissions/site`, `#submissions/guestbook`, or
`#submissions/showcase`. All classic routes are rooted in `index.html`.

The terminal entry point is `terminal.html`. Its blog URLs remain
`terminal.html#blog/slug`. Static hosts need no rewrite rules. Both real
HTML entry points contain readable fallback content and ordinary anchor
navigation. JavaScript is required for live data and interactive views,
including the terminal.

## Terminal and switching

All previous commands/history/autocomplete, installation choices,
screenshot viewer, clipboard fallback and harmless easter eggs are
retained. `gui` prints "Starting graphical web interface..." and
performs an 800ms stepped fade back to the classic homepage. Reduced
motion switches immediately. `Web Terminal` links return directly to the
terminal. There is no interface selector.

Enhanced same-tab navigation keeps the terminal DOM, history, draft,
installation selection and first-warning state in memory. A hard reload
or new tab starts a new session. Both interfaces use the same loaded
project/blog JSON and the same release request cache. No HTML transcript
is persisted into browser storage.

## Releases and project information

The browser reads public `releases` and `releases/latest` endpoints for
X86Max/IRdisC. List pagination uses 30 results. Latest follows GitHub's
official latest selection. Successful and in-flight requests are cached
for the current page session; failures are cached for 60 seconds and
time out after 20 seconds. Offline/rate-limit/empty states provide
honest messages and a GitHub fallback. Refresh to see a release
published after this session's cached response.

Names, dates, notes and asset URLs come from GitHub. No parallel release
database exists. Markdown is rebuilt through an element/attribute
allowlist; scripts, events, unsafe URLs and embeds are not inserted into
the live document.

Offline copy, features, requirements and installation commands derive
from the attributed README/metadata snapshot under `reference/`. Refresh
that snapshot when client installation details change. The v0.1.0
release has no uploaded wheel; the site reproduces README wheel
instructions without inventing an asset.

## Add a blog/news post

Create `posts/2026-10-04-your-slug.md`:

``` markdown
---
title: "Your title"
date: 2026-10-04
author: "Max"
description: "One sentence describing the post."
---

Your Markdown content, lists, links and code blocks.
```

Run `python3 build.py`. Both interfaces and the community noticeboard
update from that one file. No JavaScript array or manual index changes.
Posts sort newest first; for equal dates, by slug. The filename minus
date prefix becomes the slug. Optional `slug: permanent-name` keeps
links stable after renaming. `latest` and numeric slugs are reserved.
Required metadata must be nonempty strings; date is YYYY-MM-DD. Front
matter is deliberately a simple string-only format, not arbitrary YAML.
Use absolute links or paths relative to the built site root for links in
posts.

## Community data (all production lists start empty)

Edit JSON arrays, then rebuild. Invalid fields, dates, unsafe URLs,
duplicate IDs, missing local assets or invalid button sizes fail with a
named file/list position. Content is rendered as text; user data is
never treated as executable HTML.

`data/community-sites.json` entries:

``` json
{
  "id": "stable-lowercase-slug",
  "name": "Member's chosen site name",
  "url": "https://example.com/",
  "description": "A reviewed description.",
  "button": {"src": "assets/community/approved-button.gif", "width": 88, "height": 31}
}
```

This is a **documentation example only**, not a real member. `button` is
optional; its `src` must reference a reviewed PNG/GIF under
`assets/community/`. Copy the approved image into that directory rather
than hotlinking it. Inspect content, permission, animation and privacy
before accepting it. The build reads dimensions from the PNG/GIF header
and checks button declarations against the actual size (width 1--240,
height 1--100). It rejects remote media, missing files and path escapes.
This is format/dimension validation, not a substitute for visually
reviewing and fully decoding submissions. Convert other image formats
before adding them. Missing images have a text fallback; reduced-motion
visitors see member text links.

The same list powers the site directory, button wall and webring. File
order is ring order. Previous/Next wrap around the selected member;
Random excludes the selected member when others exist. Zero members show
an empty state. One member links back to itself, explained in the UI.
`#community/member-id` preselects a member; no fake members or activity
counters are included.

`data/guestbook.json` entries use `id`, `name`, `date`, `message`, and
optional HTTP(S) `website`. Entries are shown in the owner's curated
file order. There is no public write endpoint, account or form
pretending to save a message.

`data/showcase.json` entries use `id`, `title`, `date`, `author`,
`description`, optional `url`, and optional `image` with required `alt`.
Images must also be reviewed local PNG/GIF files under
`assets/community/`. External website links remain ordinary HTTP(S)
links. A missing image has a fallback.

## Moderated submissions

Community submissions use the GitHub Issue templates under
`.github/ISSUE_TEMPLATE/`. The workflow is: visitor opens a submission
issue → owner reviews content and permissions → owner updates the
appropriate JSON/assets → owner rebuilds and publishes.

Do not include private chat, secrets or images without permission.
Nothing is published automatically. There are no polls, votes, likes,
accounts or direct uploads.

## Official 88×31 button

`assets/irdisc-88x31.gif` is exactly 88×31 pixels, with 3 frames and a
2.5-second loop. `assets/irdisc-88x31-static.gif` is the still
alternative selected on-site by `prefers-reduced-motion`. Both are
copied into `dist/assets/` and downloadable. The image uses the original
project's arrow identity, native pixel lettering, a small bevel and
alternating sparkles; it is not a CSS-only recreation.

The Link to IRdisC page provides hotlink/self-hosted HTML, Clipboard API
copying, and a manual-selection fallback. The self-hosted example uses
`/images/` on the visitor's own server. `publicSiteUrl` is the only
production base URL setting.

Optional developer-only regeneration: `python3 assets/make_button.py`
(requires Pillow). Pillow is **not** needed to build/serve the website;
the GIFs are bundled.

## Tests

``` bash
python3 -m unittest discover -s tests -v
```

Browser tests require Node and the isolated Playwright development
dependency:

``` bash
npm install
npx playwright install chromium
# Keep the preview HTTP server running in another terminal.
SITE_URL=http://localhost:8000/terminal.html node tests/browser.cjs
SITE_URL=http://localhost:8000/ node tests/classic.cjs
```

Both have synthetic test-only release fixtures by default. To replay
current public data, fetch it to a temporary file and set
`RELEASE_SNAPSHOT` for either script. Fixtures never enter production
output. `CHROMIUM_PATH` can select an installed Chromium executable.
Tests target the current v0.1.0 and opening post; adapt expected content
when intentionally updating those fixtures.

## Deployment

The website is built with `python3 build.py`. Only the generated `dist/`
directory is intended for GitHub Pages publication; source files are not
served directly.

`.github/workflows/deploy.yml` contains the GitHub Pages workflow. On
pushes to `main` (or a manual workflow dispatch), it checks out the
repository, runs the build, uploads `dist/` as the Pages artifact and
deploys that artifact.

Relative paths are designed to work beneath the configured project-site
path.

## Build and publication notes

Only the homepage composition changed: a modest product title, the real
screenshot near the top, and compact Release/News columns that stack on
phones. Internal classic pages and the approved terminal appearance are
retained. News is the classic label; `#blog`, `#blog/<slug>` and the
terminal `blog` command stay compatible. Shared posts should be
interface-neutral.

Build inputs are validated first. Output is then generated in a
temporary directory on the same filesystem, and replaces `dist/` only
after completion. Successful builds remove stale output; validation or
staging failures preserve the previous successful build. Do not run
multiple builds concurrently. Serve only the finished `dist/`, never the
source tree.

The source template uses `clientRepository` for repository links and the
shared Markdown URL base; the historical reference snapshot and authored
posts retain their factual source citations. Open Graph metadata is
static site-level metadata, not per-hash article metadata.

## License

Website code is MIT licensed: see root `LICENSE`, Copyright (c) 2026
Max. The Marked license remains in `src/vendor/`; reference attribution
and the client snapshot license remain under `reference/`. Submitted
media must have appropriate permission and attribution; inclusion does
not silently relicense it.
