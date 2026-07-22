# Agent brief: build `grampanext`

## Goal

Create a minimal Chrome and Firefox extension named `grampanext`.

While reading a normal web article, the user presses one keyboard shortcut. The extension scans the article once and highlights every phrase or sentence matched by Grampan. Pressing the same shortcut again removes the highlights. Pressing it again restores the same highlights from cached match data. It must not rescan unless the page is reloaded or navigated.

## Source repository

Lift the detection implementation directly from:

`https://github.com/stephenturner/grampan`

Use the current `main` branch unless a commit is pinned before implementation. Record the exact source commit SHA in the new repository.

Grampan is a self-contained browser application. Its pattern definitions live in the `patterns` array in `index.html`. Its finder helpers include `makeRegexFinder`, `makeChainFinder`, and `makeCountingFinder`. Each detector returns string offsets.

Do not rewrite, simplify, reinterpret, rename, or selectively port the detection rules. Copy the relevant detector code verbatim into a dedicated source file. Preserve its tests where practical and keep the Apache-2.0 licence and attribution required by the upstream repository.

## Strict scope

Implement only:

- Chrome support.
- Firefox support.
- One keyboard shortcut.
- Scan the current article on first activation.
- Add inline highlights for Grampan matches.
- Remove those highlights on second activation.
- Restore the cached highlights on later activations without rescanning.

Do not implement:

- A popup.
- A sidebar.
- A toolbar badge.
- A toast, notification, match count, status message, or other visible UI.
- Pattern settings.
- URL fetching.
- Text paste input.
- Live scanning.
- Mutation observers.
- Editor support.
- Google Docs support.
- PDF support.
- Context-menu actions.
- Telemetry or network requests.
- AI or model calls.

The only visible effect is the highlights themselves.

## Toggle lifecycle

Maintain per-tab state in the content script.

### First shortcut press

1. Locate the article container.
2. Build a stable map from article text offsets to DOM text nodes.
3. Run the lifted Grampan detector code once.
4. Cache the normalized matches and the information needed to recreate their DOM ranges.
5. Apply highlights.
6. Set state to `visible`.

### Second shortcut press

1. Remove only elements created by `grampanext`.
2. Preserve all page text, formatting, event handlers, selection, and unrelated DOM state.
3. Keep the cached matches and text-node mapping.
4. Set state to `hidden`.

### Later shortcut presses

- If state is `hidden`, restore highlights from the cache.
- If state is `visible`, remove highlights.
- Do not run the Grampan detectors again.

### Cache invalidation

Discard state naturally when the document unloads, reloads, or navigates. No persistence across page loads is required.

Do not monitor DOM mutations. If the article changes after the first scan, cached highlighting may become invalid. Fail safely: if restoration cannot recreate a range, skip that match rather than rescanning or corrupting the page.

## Article selection

Use this preference order:

1. `article`
2. `main`
3. `[role="main"]`
4. A conservative text-density fallback
5. `document.body` only as a final fallback

If several candidates exist, choose the most plausible article container by visible text volume and paragraph density. Avoid selecting a wrapper that mainly contains navigation, comments, recommendations, or site chrome.

Process readable block content such as:

- `p`
- `h1` through `h6`
- `li`
- `blockquote`
- `figcaption`

Ignore content inside:

- `script`
- `style`
- `noscript`
- `nav`
- `header`
- `footer`
- `aside`
- `button`
- `input`
- `textarea`
- `select`
- `option`
- `code`
- `pre`
- `[contenteditable="true"]`
- elements hidden with `display: none`, `visibility: hidden`, or equivalent non-rendered state
- any node created by the extension

## Text extraction and offset mapping

Grampan works on strings and returns character offsets. Article text often spans several DOM text nodes, so each processed block needs an offset map.

For each block:

1. Walk eligible descendant text nodes in document order.
2. Build one analysis string.
3. Record, for every appended segment:
   - source text node
   - start offset in the analysis string
   - end offset in the analysis string
   - local start and end offsets in the source node
4. Run all upstream Grampan patterns against that block string.
5. Convert each returned match range back to one or more DOM ranges.

Keep text normalization minimal. Any normalization must preserve a deterministic mapping back to the original DOM. Do not collapse or alter text in a way that changes detector semantics unless the upstream Grampan implementation already does so.

## Highlight application

Use extension-owned inline elements, for example:

```html
<mark class="grampanext-highlight" data-grampanext="true">...</mark>
```

Requirements:

- Use classic yellow highlighting unless upstream Grampan defines a specific highlight treatment that can be copied cleanly.
- Avoid `!important` unless necessary to remain visible.
- Do not replace `document.body.innerHTML` or any article container's `innerHTML`.
- Do not clone or rebuild the article subtree.
- Do not alter unmatched text.
- Do not intercept clicks or pointer events.
- Do not add labels, tooltips, counters, icons, or hover UI.
- Use a class and data attribute unique to the extension.

When removing highlights, unwrap only extension-owned marks and normalize affected parent nodes where safe.

## Overlapping and adjacent matches

The upstream detectors may return overlapping or nested ranges.

Before touching the DOM:

1. Normalize matches to valid `[start, end)` ranges.
2. Drop zero-length and invalid ranges.
3. Deduplicate identical ranges.
4. Resolve overlaps deterministically.

Prefer preserving the union of highlighted text rather than creating nested marks. Adjacent ranges may be merged when doing so does not highlight unmatched characters.

Document the overlap policy in code and test it.

## Extension structure

A suitable minimal layout:

```text
grampanext/
├── manifest.chrome.json
├── manifest.firefox.json
├── src/
│   ├── background.js
│   ├── content.js
│   ├── article.js
│   ├── dom-map.js
│   ├── highlights.js
│   └── grampan-engine.js
├── styles/
│   └── highlights.css
├── tests/
│   ├── upstream-engine.test.js
│   ├── dom-map.test.js
│   └── toggle.test.js
├── LICENSE
├── NOTICE
└── README.md
```

A build step is optional. Prefer plain JavaScript and the smallest practical toolchain.

## Keyboard command

Define one manifest command, such as:

`toggle-grampanext`

Suggested defaults:

- Windows/Linux: `Ctrl+Shift+G`
- macOS: `Command+Shift+G`

If a browser rejects or reserves the shortcut, document how the user can assign another shortcut. Do not add an alternative UI control.

## Permissions

Use the smallest permission set that supports shortcut-triggered injection into the active page.

Prefer:

- `activeTab`
- `scripting`

Add `storage` only if the implementation genuinely requires it. It should not be needed for this scope.

Do not request `<all_urls>` unless cross-browser command behavior makes programmatic injection impractical. If broad host permissions are used, explain why in the README.

No extension code may make network requests.

## Cross-browser requirements

Use one codebase. Keep browser-specific manifest differences separate.

Account for:

- Chromium Manifest V3 service workers.
- Firefox Manifest V3 support and `browser_specific_settings.gecko.id`.
- `chrome.*` versus `browser.*` compatibility.
- Restricted browser pages where content-script injection is prohibited.

On restricted pages, fail silently. Do not show an error UI.

## Upstream code requirements

`src/grampan-engine.js` must clearly separate copied upstream code from adapter code:

```js
// BEGIN VERBATIM GRAMPAN CODE
// Upstream: https://github.com/stephenturner/grampan
// Commit: <SHA>
// Licence: Apache-2.0

// copied implementation

// END VERBATIM GRAMPAN CODE
```

Adapter code may expose a stable function such as:

```js
export function findAllMatches(text) {
  // Invoke every lifted pattern without changing its implementation.
}
```

Do not modify a detector merely to make DOM integration easier. Fix integration in the adapter or mapping layer.

Copy or adapt the upstream self-tests so the extension repository proves that the lifted engine produces the same results as the source version.

## Testing

At minimum, test:

- Upstream detector tests pass unchanged or with a mechanical harness adaptation.
- Text contained in one text node.
- A match spanning inline elements such as `em`, `strong`, and links.
- Several matches in one paragraph.
- Adjacent matches.
- Overlapping matches.
- Ignored elements are not scanned.
- First activation scans and highlights.
- Second activation removes highlights.
- Third activation restores highlights without invoking the detector engine again.
- Page DOM and event listeners remain functional after toggling.
- Failed cached range restoration skips the affected match safely.
- Multiple article-like containers select the correct target.

Use fixtures representing ordinary news articles and blogs. Do not add site-specific adapters in the first version.

## Acceptance criteria

The work is complete when all of the following are true:

1. The unpacked extension loads in current Chrome and Firefox.
2. On a normal article page, the configured shortcut creates inline highlights for Grampan matches.
3. The same shortcut removes all extension highlights.
4. The next shortcut press restores the same highlights without rerunning the detector engine.
5. No popup, badge, toast, sidebar, counter, settings view, or other extension UI exists.
6. No network request is made.
7. The Grampan detector implementation is visibly and traceably lifted from upstream rather than rewritten.
8. Existing page behavior remains intact after repeated toggles.
9. Tests cover detector parity, DOM mapping, overlap handling, and no-rescan toggling.
10. The repository includes the required Apache-2.0 licence and attribution.

## Implementation priorities

Prioritize, in order:

1. Exact detector parity with Grampan.
2. Non-destructive DOM handling.
3. Correct one-scan toggle behavior.
4. Reliable behavior on ordinary article pages.
5. Minimal code and permissions.

Do not broaden scope to solve editors, PDFs, dynamic article mutation, reader modes, or every unusual site.
