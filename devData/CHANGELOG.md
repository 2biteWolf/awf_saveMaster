# Changelog

All notable changes to **AWF_saveMaster** are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## Checkpoint

**[1.2.8]** is the frozen baseline (2026-09-17). Later versions add features on top of that snapshot.

## [1.3.9] — 2026-10-04

### Changed

- The package folder and the zip are named `AWF_saveMaster`. The name inside the browser was already AWF_saveMaster.
- The saved-image database keeps its old internal id, so existing history is not wiped.

## [1.3.8] — 2026-10-04

### Changed

- Files are grouped. Root keeps the manifest, popup, page script, settings and theme. `main/` is the viewer and page helpers. `inWork/` is the background, offscreen download and snapshot. `publish/` is the icons. `devData/` is the readme and changelog.
- Removed `CHECKPOINT.md`, `awsmIcon.jpg` and `icon16.png`. Icons are 48 and 128.

## [1.3.7] — 2026-10-04

### Changed

- Package name is AWF_saveMaster.
- Settings: the Q/W/A/S/D strip is gone. Name tags sit in a closed list; a click adds that tag to the end of the file name. The long hint under the sliders is gone. Tab menu size and MMB zoom hold sit above the 2nd-hold row. Pierce is only auto or off.

### Fixed

- Video opens in the viewer. A direct mp4/webm/avi address is played there instead of the browser's own player. The file itself is not copied into history.

## [1.3.6] — 2026-10-03

### Fixed

- Right click is never intercepted. The browser context menu always opens. The viewer no longer saves on right click.

## [1.3.5] — 2026-10-03

### Fixed

- Subfolder save no longer falls back to a plain Downloads click. The browser is told the path `Folder/file` when it asks for the filename. If it still ignores the folder, the log says so and the file is not quietly saved beside it.

### Added

- Repair buttons are red.
- copy devLogs, under save settings, writes `AWF-sm-logs.txt`. Each line is time, action, where it was saved, format, and why.
- import set / export set write and read `awfSM_settingData.json` (settings and presets).

## [1.3.4] — 2026-10-03

### Fixed

- Opening a saved webp (and any image tab) crashed: `AW.MODES` had been removed. Fit modes work again.

## [1.3.3] — 2026-10-03

### Fixed

- App icon is the full square `awsmIcon.jpg`, not a head crop.

## [1.3.2] — 2026-10-03

### Added

- Viewer plays jpg, png, webp, gif, mp4 and webm. AVI can be saved; the window says if preview is not supported.
- Save as button, bottom right. The list is PNG, JPG, WEBP, GIF, MP4, WEBM, AVI. The choice is stored on that file and selected again when the file is reopened.
- A still image can be written as png, jpg or webp. GIF stays gif. A video stays in its own container. Anything else falls back: image png, video the real file (mp4 when that is the file), gif gif.
- App icon files: `awsmIcon.jpg`, `icon16.png`, `icon48.png`, `icon128.png`. 1.3.2 used a head crop; 1.3.3 uses the full frame.

## [1.3.1] — 2026-10-03

### Changed

- Preset slots are 10. The list scrolls if it is taller than the screen. Each row still shows the folder and the filename template.

## [1.3.0] — 2026-10-03

### Fixed

- Save as PNG now re-encodes a still image in the page and writes a real `.png`. GIF and video stay motion files.
- Subfolder save uses `chrome.downloads` with `Folder/file.ext`. If Opera rejects that write, the file still lands in Downloads and the toast says so.
- Preset rows show the folder and the filename template, not only the template.
- GIF and video are sniffed (`GIF`, `ftyp`, WebM) and are not flattened to a jpeg.
- Pierce: three saves with no media in the same spot turn the covering layer off, find the file under it, and remember the site. Popup debug: pierce auto / on / off, repair history, repair format.

## [1.2.18] — 2026-09-24

### Fixed

- History strip showed broken thumbs. Image bytes were sent through the worker as a raw buffer, which Opera corrupts, then shown as a fake jpeg. History now stores base64 that sniffs as a real image. The strip reads that store directly. Old rows refetch the original URL when the saved bytes are not an image.

## [1.2.17] — 2026-09-24

### Fixed

- `media_N.png` at 1 KB, unknown format: Opera was saving the site's error page, or a `blob:` / `data:` URL the download manager cannot read. Save now keeps the real image bytes (jpeg/png/webp/gif magic) and writes them with a normal download click. A non-image body is rejected instead of being renamed to `.png`. The same bytes go into history.

## [1.2.15] — 2026-09-24

### Fixed

- Saves were a black file: the service worker handed `chrome.downloads` a `blob:` URL it cannot read, and PNG re-encode in that worker painted black. HTTP images now download as the original file. Bytes go out as a data URL, not a blob URL.
- Viewer history and right-click: stored pixels had no image type, so the strip was broken and “Save image as” wrote a `.txt`. Blobs are typed (`image/jpeg` and friends). Right-click on the viewer picture saves that file.

## [1.2.14] — 2026-09-24

### Fixed

- Redgifs watch player: hover was the overlay / hidden `-mobile.jpg` poster. Save rasterized that (or a black video frame) into a broken jpg, and zoom cloned a blob with no picture. The poster name maps to the real file `https://media.redgifs.com/{Name}.mp4` (drop `-mobile`). Save downloads that mp4. Zoom plays it. Stills and other sites are unchanged.

## [1.2.13] — 2026-09-18

### Added

- On `data:image…` tabs (and other image-only pages where the wheel does nothing), each wheel tick always switches one tab in the current workspace. Not a mode — just the page.

## [1.2.12] — 2026-09-18

### Fixed

- Hold menu no longer dies on key-release or mouseleave. It stays until LMB away, RMB, wheel-spin, Esc, a HUD action, or a second tap of the save key.
- Tab spin cycles from a cached tab list and does not wait for each page to finish loading. Overlay is injected immediately on activate.
- Direct image tabs (Perchance, etc.) are adopted into the real viewer with history, including after a browser restart.

## [1.2.11] — 2026-09-18

### Fixed

- Tab spin stays inside the current Opera GX workspace (`workspaceId`). It no longer walks into other spaces.

## [1.2.10] — 2026-09-18

### Changed

- Tab spin is a browser-level feature, not tied to the HUD page. Wheel closes the menu, then cycles real browser tabs. A transparent overlay eats input on the destination tab so the mode does not die on a “foreign” site. Click or Alt+C/Ctrl+K exits. Privileged pages (express panel / chrome://) are skipped while spinning because the browser will not inject there.

## [1.2.9] — 2026-09-18

### Added

- Hold-menu wheel tab switch, two modes:
  - 1st menu: first wheel tick only — next/prev tab.
  - 2nd menu: tab-spin — every tick cycles tabs until save-key or LMB/RMB click (RMB does not open the context menu).

## [1.2.8] — 2026-09-17

### Fixed

- Image-tab stretch no longer resets to ugly full-fill. Saved fit mode is applied (and re-applied when settings load). Default is original size (`none`).
- After Reload unpacked, existing site tabs get the script again without a manual F5 (generation guard retires the orphaned instance).
- Viewer tabs closed by an extension reload are remembered and reopened. Popup: **reopen last images**.

## [1.2.7] — 2026-09-17

### Added

- Separate **2nd hold** delay for the tab menu: same / ×1.5 / ×2 / +1.5s (default ×2 of the first hold).
- Separate **MMB zoom hold** slider in the popup.

### Changed

- Short middle-click on a link still opens a new tab. Hold MMB for the zoom delay → inspect zoom. Releasing the wheel does **not** close zoom.
- Zoom: LMB drag pans; wheel inspects 100–300%; right slider has 5 ticks (max = fill screen, 0 = exit).

## [1.2.6] — 2026-09-17

### Fixed

- Save failed on Perchance: Opera GX service worker has no `URL.createObjectURL`. Downloads now fall back to a data URL via FileReader.
- `navigator.clipboard.writeText` on pages where clipboard is missing — copy no longer throws.
- Zoom slider: dropped non-standard `appearance: slider-vertical` (Opera warning). Uses `writing-mode: vertical-lr; direction: rtl`.

## [1.2.5] — 2026-09-17

### Fixed

- Middle-click on a linked image is no longer swallowed. A short MMB click opens the link in a new tab as the browser intended. Hold-to-zoom still runs only on bare media (not on `<a href>`). Auxclick is blocked only while the zoom overlay is open.

## [1.2.4] — 2026-09-17

### Fixed

- Perchance / createaifurry generators: `#resultImgEl` lives in nested iframes (often `about:blank` / srcdoc) and is a huge `data:image/jpeg;base64` URL. Hover no longer reads `img.src` (that froze the page and killed the file-input **Change** button, the prompt, and the drop zone).
- Same-origin iframes are pierced so highlight / save / open see the real image. Cross-origin embeds fall back to a cropped screenshot.
- Content scripts inject into `about:blank` / `blob:` frames (`match_about_blank` + `match_origin_as_fallback`).
- Open-in-new-tab (W / alt-menu Open / Alt+Q) is broadcast to every frame, then opens the viewer with snapped pixels — not a truncated data URL.
- Zoom no longer hides the original image (a failed clone left the generator blank).
- Hover ignores file inputs, textareas, and buttons so the generator UI stays clickable.

## [1.2.3] — 2026-09-17

### Fixed

- Gallery / search pages (createaifurry and similar) were treated as a lone image-tab: intercept only runs on a real top-level image document, never inside iframes.
- `Extension context invalidated` after Reload: chrome calls are guarded; refresh the tab after reloading the extension.
- Removed `downloads.setShelfEnabled` (needs `downloads.shelf`; Opera logged an unchecked lastError). Bubble mute still uses erase + setUiOptions.

## [1.2.2] — 2026-09-17

### Fixed

- Perchance / `data:` / `blob:` images (`#resultImgEl` and overlay-covered media): pixels are snapped in the page and saved as a file. Open-in-viewer uses the same bytes. Content script now runs in iframes so generator embeds work; save/open from the top page relays into the frame under the cursor.

### Changed

- Inspect zoom no longer fills the whole viewport. Default is ~88% fit, with a side slider and wheel for live scale in % of original. Esc or click the dim backdrop exits.
- Double-hold tab menu is a compact two-column grid under the cursor (back/fwd, save/open, reload/close, pin/dup). Size is slider **10** in the popup (50–140%).

## [1.2.1] — 2026-09-16

### Fixed

- Core path was waiting on the service worker: highlight, image-tab stretch, save and viewer went silent if the worker stalled. CSS and image-doc now start immediately; settings load has a timeout.
- Toolbar popup could fail to open when the worker died on download-UI hooks. Those hooks no longer run at worker startup. Popup no longer throws if a row is missing.

## [1.2.0] — 2026-09-16

### Added

- Middle-button hold on highlighted media (same delay as the hold menu) zooms that image/gif/video to fill the viewport. Stays locked until you move the mouse or scroll the wheel. Autoscroll on that media is blocked.
- Holding the save key after the WASD menu opens for another hold-delay — without pressing a menu key — swaps to a tab menu: back / forward, reload, close, pin-unpin (label from current state), duplicate. Same HUD tiles, sized for the pointer. Overlay is reused, no extra flash. Releasing the save key keeps the WASD menu; only continued hold opens the tab HUD.
- Browser download shelf/bubble for our saves is muted (when the API exists) and the shelf entry is erased after the file lands, so Opera's download toast no longer steals the next click (second save works).

## [1.1.0] — 2026-09-01

### Fixed

- Viewer was still black: Opera drops `executeScript` return values, truncated `data:` URLs were saved as fake images, and the viewer painted a hotlinked http URL instead of the stored blob. Pixels now travel through `snap.js` → `runtime.sendMessage`, must pass `createImageBitmap`, live in IndexedDB as ArrayBuffer, and the viewer reads IDB itself before showing anything. No snapshot → no redirect (native image stays).

## [1.0.9] — 2026-09-01

### Fixed

- Perchance "open image in new tab" often became a black viewer with **Load failed**. Chrome truncates long `data:` tab URLs, so history stored a broken stub. The extension now snapshots the live `<img>` (canvas → IDB blob) and **only then** switches to the viewer. If the snapshot fails, the native image tab is left alone.
- History meta no longer holds image bytes (that blew the 10MB quota and wiped entries). Bytes live in IndexedDB as Blobs. Empty stubs are not saved.

## [1.0.8] — 2026-08-31

### Fixed

- Hold menu died after a tap-save: a leftover keyup cancelled the next hold. Hold is now generation-stamped; stale keyups are ignored.
- Copy (A / Alt+V) wrote the URL with "file blocked" (CORS + clipboard only accepts PNG). Now the image is fetched in the worker, converted to PNG, and placed on the clipboard like browser "Copy image".

## [1.0.7] — 2026-08-31

### Fixed

- Saving a preset to slot 4 also filled 5; saving to 1 then filled every slot. Lookup used both 1-based and 0-based keys (`"4"` leaked into index 4). Keys are only `"1"`…`"5"`, each slot is a cloned object.

## [1.0.6] — 2026-08-31

### Fixed

- Presets never stuck: `storage.sync` dropped the `[null, …]` array. Slots now live in `storage.local` as `{ "1": {…} }` with a write check. Empty load still toasts; save toasts only after a confirmed write.

## [1.0.5] — 2026-08-31

### Changed

- Radial keys sit like the keyboard: `Q W` on the top row, `A S D` under them.

### Added

- **Q presets.** Five slots, named by the current rename template. Empty at first.
- `~` in the Q list is a tiny checkbox. On = next 1–5 **saves** the current S-settings into that slot. Off = 1–5 **loads** the slot. Toast on save/load. Empty load stays open.

## [1.0.4] — 2026-08-31

### Changed

- Hold-to-open delay default **1.0s**. Popup row 9 slider (0.40–2.00s), saves live.
- Menu captures **e.code** (WASD and 1–5 work on any keyboard layout). 1–5 run S-items even before opening the S list.
- While the menu is open, page keys are blocked (no fit-cycle, no game WASD). The S2/S4 field takes focus immediately; typing stays in the field. Enter saves, Esc closes.
- Rename legend is a full tag list with meaning. New tags: `{ext}` `{n}` `{ymd}` `{host}` `{rand}`.

### Added

- Viewer: bottom-left `›` opens a left column of history thumbnails. Closed by default. Click a thumb to jump.

## [1.0.3] — 2026-08-31

### Fixed

- Viewer history: "No data for this entry" after prev/next. The viewer page was treated as an image document, which wrote empty history rows and raced `popstate` with the real viewer.
- Large images (data: URLs) are stored in IndexedDB instead of `storage.local`, so quota no longer wipes the gallery.
- Empty history entries are ignored. Missing blobs are hydrated on demand; http images are fetched once and kept.

## [1.0.2] — 2026-08-31

### Changed

- Radial WASD menu opens by **holding the save key 1.5s** (Alt+C or Ctrl+K), not Alt+K.
- Tap the same key still saves. Hold opens the cross at the cursor.
- Click a cell with the mouse, or press W/A/S/D. Click empty space or move the mouse off the menu to close. Esc still closes.
- Removed the `save_media` command so Opera no longer eats Alt+C before the hold can fire.

## [1.0.1] — 2026-08-31

### Changed

- Toolbar / store icon is now the 128×128 from AW_ImageFullscreen.
- One file only: `icon128.png` in the extension root. Opera scales it down. To swap the icon later, replace that one PNG (keep 128×128).

## [1.0.0] — 2026-08-31

First unified build. Replaces four separate Opera GX extensions.

### Added

- Hover highlight on `img` / `video` / media links / canvas; save / open / copy without the context menu (from AW_mediaQS).
- Image-tab intercept for `data:image` and direct image URLs; four fit modes on click: original, fit height, stretch, fit width (from AW_ImageFullscreen).
- Persistent image gallery, 50 entries in `storage.local`. Survives browser restart. Viewer Back / ← / prev walks closed image-tabs. Ctrl+Shift+T restores via `viewer.html?hid=…` (hash in storage, not a dead tab id).
- Alt+Z pin / unpin (from AW_hotPin). Badge flash on the action icon.
- Block Opera GX Alt menu, toggleable (from Block Alt). Combos Alt+letter still work.
- Hold Alt+K 1.6s → WASD radial menu at cursor. Keyboard captured while open.
  - W open in viewer
  - A copy
  - D browser hotkey page (`chrome://extensions/shortcuts` then `opera://extensions/shortcuts`)
  - S save submenu: S1 Downloads/subfolder, S2 folder name, S3 rename on/off, S4 template, S5 PNG
- Pixel popup: 2×2 WASD legend, two text fields, rows 1–8, toast timeout slider.
- Real PNG convert via OffscreenCanvas / canvas (not a renamed extension). Video stays original format.
- Lime toasts (`#222034` / `#99e550`), timeout 1.5–10 s.
- Default hotkeys: Alt+C save, Ctrl+K save (content), Alt+Z pin, Alt+Q open, Alt+V copy.

### Notes

- A on the radial was not named in the brief; bound to Copy (pairs with Alt+V).
- Disable the four old extensions before Load unpacked so keys do not collide.

[1.1.0]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.1.0
[1.0.9]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.9
[1.0.8]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.8
[1.0.7]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.7
[1.0.6]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.6
[1.0.5]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.5
[1.0.4]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.4
[1.0.3]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.3
[1.0.2]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.2
[1.0.1]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.1
[1.0.0]: https://github.com/2biteWolf/AW_saveMasterFuta-browsExt-/releases/tag/v1.0.0
