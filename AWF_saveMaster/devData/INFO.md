# AWF_saveMaster

Opera GX / Chrome MV3 extension. One package instead of four:
**AW_ImageFullscreen**, **AW_mediaQS**, **AW_hotPin**, **Block Alt**.

Hover-save media, image-tab viewer with history, pin tabs, Alt-menu block, hold save-key radial WASD menu, inspect-zoom, tab HUD.

Current version: **1.4.2** — [CHANGELOG.md](CHANGELOG.md)

Load unpacked from the extension root (the folder that contains `manifest.json`). Docs live in `devData/` and are not part of the running extension.

## Install (Opera GX)

1. Disable the four old extensions so they do not fight over the same keys.
2. Open `opera://extensions`.
3. Developer mode ON.
4. **Load unpacked** → the folder that contains `manifest.json` (not `devData`, not `main`).
5. Keys live in the extension window. Defaults: Ctrl+K and Alt+C save, Alt+Z pin, Alt+Q open, Alt+V copy. They can be changed there. The browser key page is optional: `opera://extensions/shortcuts`.

## Folders

| Path | What it is |
|---|---|
| `manifest.json`, `content.js`, `settings.js`, `popup.html`, `popup.js`, `theme.css` | Package root. Popup, page script, shared settings, look. |
| `main/` | What runs in the page and the viewer: menu guards, tab wheel, poster-to-file helper, viewer. |
| `inWork/` | Background worker, offscreen download page, one-shot snapshot. |
| `publish/` | Icons, 48 and 128. |
| `devData/` | README and changelog. Not loaded by the browser. |

Chrome / Chromium: `chrome://extensions` → Load unpacked. Shortcuts: `chrome://extensions/shortcuts`.

## Hotkeys

| Key | Action |
|---|---|
| Ctrl+K or Alt+C | Tap = save · hold = WASD menu at cursor · keep holding the same delay = tab menu. Both keys can be changed in the window. |
| MMB hold on media | Inspect zoom (same delay as the zoom slider). Releasing the wheel does not close zoom. |
| Alt+Z | Pin / unpin current tab |
| Alt+Q | Open highlighted media in the viewer |
| Alt+V | Copy file (or URL if checkbox off) |

### Radial (keyboard layout)

| Key | Action |
|---|---|
| Q | Presets. `~` toggles save-mode. 1–5 load (or save if `~` is on) |
| W | Open selected media in viewer |
| A | Copy selected media |
| S | Save-settings submenu (1–5) |
| D | Browser hotkey settings page |

**S1** Downloads vs subfolder · **S2** subfolder name · **S3** rename on/off · **S4** template · **S5** save as PNG.

**Q:** ten slots, labeled with the rename template. Empty at first. Turn `~` on (lime fill), press 1–5 to write the current S-settings into that slot. `~` off + 1–5 applies the slot. The window can reach all ten.

Keep holding after the WASD menu opens (same delay, no extra key) to swap it for the tab menu: back / forward, reload, close, pin or unpin, duplicate.

Any S action closes the whole menu. Esc too.

## Image tabs

Any image opened in its own tab is fitted. Click cycles 4 modes (original / fit height / stretch / fit width). Closed images stay in a 50-entry gallery in `storage.local` (survives restart). Back / ← goes to the previous closed image. Ctrl+Shift+T restores via `viewer.html?hid=…`.

## Popup

RU / EN at the top switches the window, the toasts, the menu labels and the viewer at once.

Sections: Keys, Where to save, How it behaves, Service. The save key is first and already shows Ctrl+K. The second save key shows Alt+C. A click on a key, then the next combo, writes it immediately. Esc cancels. Folder and template still use the save button. Other switches write as you click them.

Service writes `AWF-sm-logs.txt`. One block per try: time, page, tag, short address, each step, and why it failed or where the file landed.

Toasts: `#222034` fill, `#99e550` text and border. The window is about 340px wide. The font stays VT323.

Saves hide the browser download bubble and erase the shelf row (file stays on disk).

## Icon

Icons are `publish/icon48.png` and `publish/icon128.png`.