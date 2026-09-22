# Publication candidate QA — 2026-09-22

Local review only. No remote repository, commit, tag, release, deployment or
publication was created. The client and original website copy remain untouched.

## Scope and visual review

Only the homepage composition was changed. A modest product/version heading,
plain Download/Documentation links and the existing real screenshot appear first.
Release and News sections share a compact desktop row and stack below 600px.
The original shell, typography, colors and internal article styling are retained.
Terminal CSS and command handling were not redesigned. There is no chooser.

Reviewed homepage screenshots at 320, 360, 390, 768 and 1440px. The result retains
square rules, underlined links and a small software-project layout. No modern
cards, shadows, rounded controls, decorative product mockups or giant hero added.
Screenshot scaling, desktop columns and mobile stacking passed browser assertions.

## Python: 21 tests passed

Command: `python3 -m unittest discover -s tests -v`.

Existing blog discovery/order/metadata, project extraction, config, community,
guestbook, showcase and GIF tests pass. Added tests cover:

- Two successful builds produce identical output bytes, and an injected
  `dist/SHOULD_NOT_SURVIVE.txt` does not survive the second build.
- Invalid source data preserves every byte of the previous successful output.
- Simulated staging copy failure also preserves every byte of previous output.
- Approved local community GIF dimensions are read from the image; mismatched
  declarations, external image URLs and path traversal are rejected.
- Root website MIT license, interface-neutral opening post, and conditional
  Open Graph absolute URL/image metadata.

Build warnings identify empty publicSiteUrl, websiteRepository and IRC settings
without failing a review build. Output is staged on the same filesystem and swapped
only after successful generation, with rollback if the final rename fails.

## Chromium: both suites passed

`tests/classic.cjs` and `tests/browser.cjs` passed using the previously retrieved
public v0.1.0 GitHub response. Network failures and empty data are controlled test
fixtures; this pass did not create/edit releases or require a new live API call.

Classic coverage includes every page, homepage default, direct terminal access,
repeated `gui` switching, retained session history and shared API cache. Regressions
check Download has no self-link, release-page links have truthful labels, News
remains on #blog routes, and public pages contain no owner/config-file instructions.
No public URL means no placeholder embed code or Copy HTML action. A configured
browser-only fixture verifies correct HTML plus clipboard success/manual fallback.
Downloadable GIF controls remain available in both states.

Community tests retain empty/one/multiple-member ring behavior, literal-safe
message rendering, missing local-button fallback and showcase rendering. Fixtures
are intercepted only in tests; production community arrays remain empty. Production
media validation accepts reviewed local PNG/GIF files under assets/community/ only.
Moderation explanation appears once in the Community introduction.

Terminal coverage retains all commands, history editing, Tab, Ctrl+L, install
selection, clipboard fallback, screenshot modal/Escape/focus, safe Markdown,
release caching/error handling, blog selectors/deep links and both sudo jokes,
including reduced-motion behavior and recovery after fictional deletion.

## Responsive coverage

At 320, 360, 390, 768 and 1440px, browser assertions found no page-level horizontal
overflow for homepage, Download, individual releases, News article, Community,
Link to IRdisC and terminal output. Navigation wraps; code blocks scroll locally;
screenshot modal fits and restores focus; the official GIF remains exactly 88×31.
Tests run beneath `/IRdisC/` to verify static project-subdirectory paths. Configured
embed snippets and copy fallback were exercised separately from unconfigured UI.
Screenshots are included under test-results/.

## Publication configuration and limits

Before publishing, set real publicSiteUrl and websiteRepository in config/site.json.
Set IRC network/server/channel/port/tls only when official details exist; leaving
IRC blank produces an honest public message. Rebuild after configuration changes.
No fake domain, localhost production URL or community members are shipped.

Testing used Chromium plus touch emulation, not physical devices, Safari, Firefox
or manual screen-reader review. Open Graph metadata is site-level; hash articles
have no independent server-rendered share metadata. Public release API rate limits
remain external, with fallback links. Community PNG/GIF header/dimension checks do
not replace full visual/content moderation. Builds should not run concurrently.
The client reference snapshot still requires deliberate future refresh.
