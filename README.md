# grampanext

`grampanext` is a command-only Chrome and Firefox extension that toggles inline
highlights for [Grampan](https://github.com/stephenturner/grampan) matches on the
current article. It has no popup, toolbar UI, network requests, or persistent
page data.

Use `Ctrl+Shift+G` on Windows/Linux or `Command+Shift+G` on macOS. The first
press scans the selected article once; later presses only hide or restore the
cached ranges. If a browser reserves the shortcut, assign a different one in
its extension-shortcuts settings.

Each `v*` tag produces `grampanext-chrome.zip` and `grampanext-firefox.zip` in
GitHub Releases. Extract the appropriate ZIP, then load its folder as an
unpacked extension in `chrome://extensions` or `about:debugging`. Firefox
unsigned extensions are temporary unless they are signed by Mozilla. The
manifests request only `activeTab` and `scripting`; restricted browser pages
silently do nothing.

The detector code in `src/grampan-engine.js` is copied from Grampan commit
`300cdab52a6451e3eee3dae62a5911333e6a3ee8`. See `NOTICE` and `LICENSE` for the
Apache-2.0 attribution and license.

Run tests with `npm test`.
