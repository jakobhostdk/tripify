# Tripify · Add to plan (Chrome extension)

A tiny Manifest V3 extension. Click the toolbar icon on any web page, pick a
trip, and the current page becomes a proposal on that trip's planning table —
the rest of the group sees it live on the Overview view.

## How auth works

The extension reuses your existing Tripify session cookie. You need to be
signed into Tripify in the same browser profile — sign in once, then the
extension just works. No tokens to copy.

The `host_permissions` line in `manifest.json` is what lets the extension's
`fetch` calls include cookies for `localhost:3000` without bumping into CORS.

## Load it

1. **Make sure Tripify is running** at `http://localhost:3000` and you've
   signed in (in this same Chrome profile).
2. Open `chrome://extensions`.
3. Toggle **Developer mode** (top-right).
4. Click **Load unpacked** and pick the `extension/` folder of this repo.
5. The extension appears in your toolbar (default puzzle icon). Pin it for
   easier access.

## Use it

1. Browse to anything you want the group to consider — a hotel listing, a
   museum, a restaurant write-up.
2. Click the Tripify icon in the toolbar.
3. Pick the trip, confirm/edit the title, optionally add a note, hit **Put
   it on the table**.
4. On Tripify, the proposal appears immediately on the trip's Overview
   (live via SSE) and on the Plan section where everyone votes.

## Pointing it at a different host

The popup defaults to `http://localhost:3000`. To use a deployed Tripify
instance:

1. Update `host_permissions` in `manifest.json` to include the production
   origin, e.g. `"https://tripify.example.com/*"`.
2. From `chrome://extensions`, reload the extension.
3. In the extension's popup, the API base is stored in
   `chrome.storage.local`. There's no UI to change it yet — set it via the
   browser devtools on the popup:
   ```js
   chrome.storage.local.set({ apiBase: "https://tripify.example.com" });
   ```

## Icons

There are no PNG icons bundled — Chrome shows the default puzzle piece. Drop
your own `icon16.png`, `icon48.png`, `icon128.png` into this folder and
extend `manifest.json` with:

```json
"icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" },
"action": {
  "default_icon": { "16": "icon16.png", "48": "icon48.png" },
  ...
}
```

## Files

- `manifest.json` — MV3 manifest, declares the popup + `host_permissions`.
- `popup.html` — the form UI.
- `popup.css` — Tripify-aesthetic styling, light + dark mode aware.
- `popup.js` — reads the active tab, fetches `/api/extension/{me,trips}`,
  posts to `/api/extension/proposals`, remembers the last-used trip.
