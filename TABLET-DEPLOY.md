# iPad web deployment

Publish this repository's `gh-pages` branch to GitHub Pages. Do not copy tablet changes into the Electron distribution unless explicitly requested.

For every tablet release:

1. Change `index.html`'s `tablet-release` meta content to a unique release identifier.
2. Bump the URL version of each changed CSS/module and its importing parents through `app.js` and `index.html`. Include all new modules in the commit.
3. Test poem selection, touch/scroll, three languages, ending/reset, and update deferral before pushing.
4. Check the Pages build and compare public files with the committed release.

`tablet-update.js` checks `index.html` without cache every 30 seconds, on return to the app, when back online, and on entering the ending. It verifies entry assets, then waits for the film restart or an empty editor idle for 60 seconds. It preserves URL parameters (room/language), does not reload with a poem in progress, and leaves the running page intact on network errors. The display/Electron path never installs this updater.

An already-running release without the updater cannot be remotely refreshed by this code. It must load an updater-enabled page once. A sessionStorage attempt guard prevents repeated navigation to the same release if stale HTML is returned.
