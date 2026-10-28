# AWF_saveMaster

Ultimate tool for exploring and saving media content on the web.

Current version: **1.3.9** — [CHANGELOG.md](CHANGELOG.md)

## One click, then the settings

One-click save for images, GIF and video, plus a built-in interface with layered menus and a full settings panel. Chrome and Opera GX.

Point at a picture, GIF or video and press the save key once. The file lands in Downloads, or in a subfolder you set.

The extension brings its own interface, not a single button. Hold the save key and the first menu opens under the cursor: presets, open, copy, save, hotkeys. Hold longer and a second menu takes over for tabs. The viewer is a third layer: history, fit, and save-as for that file. Settings sit behind all of this, so the click stays simple and the rest is adjustable.

Ten presets, rename patterns, PNG or original format, zoom, and wheel tab switching. JPG, PNG, WebP, GIF, MP4 and WebM open in the viewer. Right-click stays the normal browser menu. No account. Files and settings stay on your computer.

## Layers

| Layer | What it is |
|---|---|
| Save click | One press writes the file. |
| First menu | Under the cursor: presets, open, copy, save, hotkeys. |
| Second menu | Tabs: back, forward, reload, close, pin, duplicate. |
| Viewer | History, fit, and save-as for the open file. |
| Settings | Presets, names, folder, delays, pierce, repair, import and export. |

## Install

Load the folder that contains `manifest.json`. Not `devData`, not `main`.

1. `opera://extensions` or `chrome://extensions`.
2. Developer mode on.
3. **Load unpacked** and choose that folder.
4. Shortcuts: `opera://extensions/shortcuts` or `chrome://extensions/shortcuts`.

| Key | Action |
|---|---|
| Alt+C or Ctrl+K | Tap saves. Hold opens the first menu. Hold longer opens the tab menu. |
| Alt+Q | Open the highlighted media in the viewer. |
| Alt+V | Copy the file, or the URL if that option is off. |
| Alt+Z | Pin or unpin the current tab. |
| Middle click | Opens a link as usual. Hold on a picture to zoom. |

## Folders

| Path | What it is |
|---|---|
| `manifest.json`, `content.js`, `settings.js`, `popup.html`, `popup.js`, `theme.css` | Root. Popup, page script, shared settings, look. |
| `main/` | Viewer and the scripts that run on the page. |
| `inWork/` | Background worker, download page, snapshot. |
| `publish/` | Icons, 48 and 128. |
| `devData/` | This readme and the changelog. The browser does not load them. |
| `LICENSE` | Forks are allowed. Selling needs written permission. |

## Privacy

No account. Settings, presets and viewer history stay in the browser. The save key reads the media under the pointer so it can write a file. That content is not sent to the author.

The public policy is one page, and the address does not change between versions:

https://2bitewolf.github.io/awf_saveMaster/

Paste that address into the Chrome Web Store privacy field. The same text is kept in [privacy.html](privacy.html).

## License

Forks, copies and changes are allowed for free. Selling the extension, or putting it inside a paid product, needs prior written permission from Artem Ivanov (AW). Full text: [LICENSE](../LICENSE).
