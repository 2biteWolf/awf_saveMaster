/* AWF_saveMaster service worker */
importScripts("../settings.js");

var HISTORY_KEY = "imageHistory";
var HISTORY_MAX = 50;
var IDB_NAME = "aw_saveMaster";
var IDB_STORE = "blobs";
var META_URL_MAX = 200000;
var INLINE_MAX = 180000;
var dlNames = [];

function awLog(action, detail) {
  var line = new Date().toISOString() + " | " + action + " | " + (detail || "");
  try { console.log("[AW]", line); } catch (e) {}
  var store = (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;
  try {
    store.get("awDevLogs", function (res) {
      var list = (res && res.awDevLogs) || [];
      list.push(line);
      if (list.length > 500) list = list.slice(-500);
      store.set({ awDevLogs: list });
    });
  } catch (e2) {}
}

try {
  chrome.downloads.onDeterminingFilename.addListener(function (item, suggest) {
    try {
      if (!item || item.byExtensionId !== chrome.runtime.id || !dlNames.length) return;
      var name = dlNames.shift();
      awLog("folder", "browser asked for a name, we set " + name);
      suggest({ filename: name, conflictAction: "uniquify" });
    } catch (e) {
      try { suggest(); } catch (e2) {}
    }
  });
} catch (e) {}

function idbOpen() {
  return new Promise(function (resolve, reject) {
    try {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    } catch (e) {
      reject(e);
    }
  });
}

function idbPut(id, value) {
  if (!id || value == null || value === "") return Promise.resolve(false);
  return idbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, id);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  }).then(function () { return true; }).catch(function () { return false; });
}

function idbGet(id) {
  if (!id) return Promise.resolve("");
  return idbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, "readonly");
      var rq = tx.objectStore(IDB_STORE).get(id);
      rq.onsuccess = function () { resolve(rq.result || ""); };
      rq.onerror = function () { reject(rq.error); };
    });
  }).catch(function () { return ""; });
}

function idbDel(id) {
  if (!id) return Promise.resolve();
  return idbOpen().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
    });
  }).catch(function () {});
}

function getSettings() {
  return new Promise(function (resolve) {
    chrome.storage.sync.get(AW.DEFAULTS, function (items) {
      chrome.storage.local.get(["fitMode", "pierceHosts"], function (loc) {
        var s = AW.merge(items);
        if (loc && loc.fitMode && AW.MODES.indexOf(loc.fitMode) !== -1) s.fitMode = loc.fitMode;
        s.pierceHosts = (loc && loc.pierceHosts) || {};
        resolve(s);
      });
    });
  });
}

function setSettings(patch) {
  return new Promise(function (resolve) {
    chrome.storage.sync.set(patch, function () {
      resolve();
    });
  });
}

var PRESET_KEY = "awPresets";

function emptySlots() {
  var slots = [];
  var n = AW.PRESET_COUNT || 10;
  var i;
  for (i = 0; i < n; i++) slots.push(null);
  return slots;
}

function clonePreset(p) {
  if (!p || typeof p !== "object") return null;
  return {
    renameTemplate: String(p.renameTemplate || ""),
    customPath: String(p.customPath || "AW_Media"),
    customPathEnabled: !!p.customPathEnabled,
    renameEnabled: !!p.renameEnabled,
    saveAsPng: !!p.saveAsPng
  };
}

function mapToSlots(map) {
  var slots = emptySlots();
  if (!map || typeof map !== "object" || Array.isArray(map)) return slots;
  var i;
  for (i = 0; i < (AW.PRESET_COUNT || 10); i++) {
    var p = map[String(i + 1)];
    if (p && typeof p === "object" && (p.renameTemplate || p.customPath)) {
      slots[i] = clonePreset(p);
    }
  }
  return slots;
}

function slotsToMap(slots) {
  var map = {};
  var i;
  for (i = 0; i < (AW.PRESET_COUNT || 10); i++) {
    var p = clonePreset(slots[i]);
    if (p && (p.renameTemplate || p.customPath)) map[String(i + 1)] = p;
  }
  return map;
}

function getPresetSlots() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([PRESET_KEY], function (res) {
      resolve(mapToSlots(res[PRESET_KEY]));
    });
  });
}

function setPresetSlot(index, preset) {
  index = index | 0;
  if (index < 0 || index >= (AW.PRESET_COUNT || 10)) {
    return getPresetSlots().then(function (slots) {
      return { ok: false, error: "bad index", slots: slots };
    });
  }
  return getPresetSlots().then(function (slots) {
    slots[index] = clonePreset(preset);
    var map = slotsToMap(slots);
    return new Promise(function (resolve) {
      chrome.storage.local.set({ [PRESET_KEY]: map }, function () {
        var err = chrome.runtime.lastError && chrome.runtime.lastError.message;
        resolve({ ok: !err, error: err || "", slots: mapToSlots(map) });
      });
    });
  });
}

function getHistory() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([HISTORY_KEY], function (res) {
      var list = Array.isArray(res[HISTORY_KEY]) ? res[HISTORY_KEY] : [];
      var changed = false;
      var out = [];
      list.forEach(function (x) {
        if (!x || !x.id) return;
        var fat = "";
        if (x.dataUrl && x.dataUrl.length > 80) fat = x.dataUrl;
        else if (x.url && x.url.indexOf("data:image/") === 0 && x.url.length > 80) fat = x.url;
        if (fat) {
          changed = true;
          idbPut(x.id, fat);
          x.hasBlob = true;
        }
        var url = httpOnly(x.url);
        if (x.url && x.url !== url) changed = true;
        out.push({
          id: x.id,
          url: url,
          dataUrl: "",
          hasBlob: !!x.hasBlob,
          mime: x.mime || "",
          exportFmt: x.exportFmt || "",
          w: x.w || 0,
          h: x.h || 0,
          ts: x.ts || Date.now()
        });
      });
      if (changed) chrome.storage.local.set({ [HISTORY_KEY]: out });
      resolve(out);
    });
  });
}

function saveHistory(list) {
  var slim = (list || []).map(function (x) {
    return {
      id: x.id,
      url: httpOnly(x.url),
      dataUrl: "",
      hasBlob: !!x.hasBlob,
      mime: x.mime || "",
      exportFmt: x.exportFmt || "",
      w: x.w || 0,
      h: x.h || 0,
      ts: x.ts || Date.now()
    };
  });
  return new Promise(function (resolve) {
    chrome.storage.local.set({ [HISTORY_KEY]: slim }, function () {
      resolve(slim);
    });
  });
}

function hashId(str) {
  var s = String(str || "");
  var n = s.length;
  var sample = s.slice(0, 2048) + "|" + n + "|" + s.slice(Math.max(0, n - 2048));
  var h = 2166136261;
  var i;
  for (i = 0; i < sample.length; i++) {
    h ^= sample.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + "_" + n;
}

function httpOnly(url) {
  var u = String(url || "");
  if (/^https?:\/\//i.test(u)) return u;
  return "";
}

function makeId(url, blob) {
  var http = httpOnly(url);
  if (http) return hashId(http);
  var n = blob && blob.size ? blob.size : (typeof blob === "string" ? blob.length : 0);
  return Date.now().toString(36) + "_" + n.toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then(function (r) { return r.blob(); });
}

function pushHistory(entry) {
  entry = entry || {};
  var rawUrl = entry.url || "";
  var blob = entry.blob || null;
  var rawData = entry.dataUrl || "";

  function append(item) {
    if (!item || !item.id) return Promise.resolve(null);
    if (!item.hasBlob && !item.url) return Promise.resolve(null);
    return getHistory().then(function (list) {
      var prev = null;
      var i;
      for (i = 0; i < list.length; i++) if (list[i] && list[i].id === item.id) prev = list[i];
      if (prev && prev.exportFmt && !item.exportFmt) item.exportFmt = prev.exportFmt;
      var next = [item].concat(list.filter(function (x) { return x.id !== item.id; }));
      var extra = [];
      if (next.length > HISTORY_MAX) {
        extra = next.slice(HISTORY_MAX);
        next = next.slice(0, HISTORY_MAX);
      }
      extra.forEach(function (x) { if (x && x.id) idbDel(x.id); });
      return saveHistory(next).then(function () { return item; });
    });
  }

  function finishWithBlob(b) {
    return asImageBlob(b).catch(function () {
      return b && b.size > 32 ? b : null;
    }).then(function (valid) {
      var store = valid || (b && b.size > 32 ? b : null);
      var id = entry.id || makeId(rawUrl, store || b);
      var item = {
        id: id,
        url: httpOnly(rawUrl),
        dataUrl: "",
        hasBlob: false,
        mime: entry.mime || (store && store.type) || "",
        exportFmt: entry.exportFmt || "",
        w: entry.w || 0,
        h: entry.h || 0,
        ts: Date.now()
      };
      if (!store) return append(item);
      var toStore = store.arrayBuffer ? store.arrayBuffer() : Promise.resolve(null);
      return toStore.then(function (buf) {
        var mime = (buf && AW.sniffMime && AW.sniffMime(buf)) || "";
        if (!mime || !buf) return append(item);
        item.mime = mime;
        return idbPut(id, { b: buf, m: mime }).then(function (ok) {
          item.hasBlob = !!ok;
          return append(item);
        });
      });
    });
  }

  if (blob && typeof Blob !== "undefined" && blob instanceof Blob) {
    return finishWithBlob(blob);
  }
  if (entry.buffer) {
    return finishWithBlob(new Blob([entry.buffer], { type: entry.mime || "image/png" }));
  }
  if (rawData && rawData.indexOf("data:") === 0 && rawData.length > 80) {
    return dataUrlToBlob(rawData).then(finishWithBlob).catch(function () { return finishWithBlob(null); });
  }
  if (/^https?:/i.test(rawUrl)) {
    var videoMime = entry.mime && String(entry.mime).indexOf("video/") === 0 ? entry.mime : "";
    if (!videoMime && /\.(mp4|m4v|mov)(\?|#|$)/i.test(rawUrl)) videoMime = "video/mp4";
    if (!videoMime && /\.webm(\?|#|$)/i.test(rawUrl)) videoMime = "video/webm";
    if (!videoMime && /\.avi(\?|#|$)/i.test(rawUrl)) videoMime = "video/x-msvideo";
    if (videoMime) {
      return append({
        id: entry.id || makeId(rawUrl, null),
        url: httpOnly(rawUrl),
        dataUrl: "",
        hasBlob: false,
        mime: videoMime,
        exportFmt: entry.exportFmt || "",
        w: 0,
        h: 0,
        ts: Date.now()
      });
    }
    return fetch(rawUrl)
      .then(function (res) { if (!res.ok) throw new Error("bad"); return res.blob(); })
      .then(function (b) {
        if (!b || b.size < 32) throw new Error("empty");
        if (b.size > 25000000) throw new Error("huge");
        return b;
      })
      .then(finishWithBlob)
      .catch(function () { return finishWithBlob(null); });
  }
  return Promise.resolve(null);
}

function hydrateItem(item) {
  if (!item) return Promise.resolve(null);
  if (item.dataUrl) return Promise.resolve(item);
  if (!item.hasBlob) return Promise.resolve(item);
  return idbGet(item.id).then(function (data) {
    if (!data) return item;
    if (data && data.b) {
      item.mime = item.mime || data.m || "";
      item._blob = data.b;
      return item;
    }
    if (typeof data === "string") {
      if (data.length < 250000) item.dataUrl = data;
      else item._blob = data;
      return item;
    }
    item._blob = data;
    return item;
  });
}

function findHistory(id) {
  return getHistory().then(function (list) {
    if (!id) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }).then(hydrateItem);
}

function viewerUrl(id) {
  return chrome.runtime.getURL("main/viewer.html") + "?hid=" + encodeURIComponent(id);
}

function blobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(r.result); };
    r.onerror = function () { reject(r.error || new Error("read")); };
    r.readAsDataURL(blob);
  });
}

function objectUrl(blob) {
  try {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      return URL.createObjectURL(blob) || "";
    }
  } catch (e) {}
  try {
    if (typeof webkitURL !== "undefined" && typeof webkitURL.createObjectURL === "function") {
      return webkitURL.createObjectURL(blob) || "";
    }
  } catch (e2) {}
  return "";
}

function mediaMime(buf, type) {
  var sniff = AW.sniffMime ? AW.sniffMime(buf) : "";
  if (sniff) return sniff;
  type = type || "";
  if (type.indexOf("video/") === 0) return type;
  if (type.indexOf("image/svg") === 0) return type;
  return "";
}

var offscreenReady = null;
function ensureOffscreen() {
  if (!chrome.offscreen || !chrome.offscreen.createDocument) return Promise.resolve(false);
  if (offscreenReady) return offscreenReady;
  offscreenReady = new Promise(function (resolve) {
    chrome.offscreen.hasDocument().then(function (has) {
      if (has) return resolve(true);
      chrome.offscreen.createDocument({
        url: "inWork/offscreen.html",
        reasons: ["BLOBS"],
        justification: "Save image bytes as a real file"
      }).then(function () { resolve(true); }).catch(function () {
        offscreenReady = null;
        resolve(false);
      });
    }).catch(function () {
      offscreenReady = null;
      resolve(false);
    });
  });
  return offscreenReady;
}

function downloadViaOffscreen(buf, mime, filename) {
  return ensureOffscreen().then(function (ok) {
    if (!ok) return { ok: false };
    var b64 = "";
    try { b64 = AW.bufToB64(buf); } catch (e) { return Promise.resolve({ ok: false }); }
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({
        type: "offscreenDownload",
        b64: b64,
        mime: mime,
        filename: filename
      }, function (res) {
        if (chrome.runtime.lastError) resolve({ ok: false });
        else resolve(res || { ok: false });
      });
    });
  });
}

function pullMedia(url, referer) {
  var headers = {};
  if (referer && referer.indexOf("http") === 0) headers.Referer = referer;
  return fetch(url, { headers: headers, credentials: "include" }).then(function (res) {
    if (!res.ok) throw new Error("http");
    return res.blob();
  }).then(function (blob) {
    if (!blob || blob.size < 32) throw new Error("tiny");
    if (blob.size > 30000000) return { huge: true, mime: blob.type || "" };
    return blob.arrayBuffer().then(function (buf) {
      var mime = mediaMime(buf, blob.type || "");
      if (!mime) throw new Error("notmedia");
      return { buffer: buf, mime: mime };
    });
  });
}

async function convertToPngDataUrl(url) {
  if (!url) throw new Error("no url");
  if (url.indexOf("data:image/png") === 0) return url;
  var res = await fetch(url);
  if (!res.ok && url.indexOf("data:") !== 0) throw new Error("fetch " + res.status);
  var blob = await res.blob();
  if (blob.type && blob.type.indexOf("video/") === 0) throw new Error("video");
  var bitmap = await createImageBitmap(blob);
  var canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  var ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  var out = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(out);
}

function sendToTab(tabId, msg) {
  return new Promise(function (resolve) {
    if (!tabId) return resolve(null);
    chrome.tabs.sendMessage(tabId, msg, function (res) {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(res || null);
    });
  });
}

function broadcastTab(tabId, msg) {
  if (!tabId) return;
  try {
    chrome.webNavigation.getAllFrames({ tabId: tabId }, function (frames) {
      var list = frames && frames.length ? frames : [{ frameId: 0 }];
      list.forEach(function (f) {
        try {
          chrome.tabs.sendMessage(tabId, msg, { frameId: f.frameId }, function () {
            try { void chrome.runtime.lastError; } catch (e) {}
          });
        } catch (e) {}
      });
    });
  } catch (e) {
    chrome.tabs.sendMessage(tabId, msg, function () {
      try { void chrome.runtime.lastError; } catch (e2) {}
    });
  }
}

function queryActive() {
  return new Promise(function (resolve) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

async function convertBlobToPngUrl(blob) {
  var bitmap = await createImageBitmap(blob);
  var canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  var ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  var out = await canvas.convertToBlob({ type: "image/png" });
  try { if (bitmap.close) bitmap.close(); } catch (e) {}
  return blobToDataUrl(out);
}

async function buildDownloadName(url, mime, hint) {
  var settings = await getSettings();
  var originalName = hint || AW.filenameFromUrl(url || "image.jpg");
  if (!/\.[a-z0-9]+$/i.test(originalName)) originalName += ".jpg";
  var mimeExt = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "video/mp4": ".mp4",
    "video/webm": ".webm"
  };
  if (mime && mimeExt[mime]) originalName = originalName.replace(/\.[^.]+$/, "") + mimeExt[mime];
  var finalName = originalName;
  if (settings.renameEnabled) {
    var n = settings.downloadCounter || 1;
    var host = "local";
    try { if (url && url.indexOf("http") === 0) host = new URL(url).hostname || "local"; } catch (e) {}
    finalName = AW.applyTemplate(finalName, settings.renameTemplate, n, { host: host, url: url || "" });
    await setSettings({ downloadCounter: n + 1 });
  }
  if (settings.customPathEnabled && settings.customPath) {
    finalName = AW.cleanFolder(settings.customPath) + "/" + finalName.split("/").pop();
  }
  return finalName;
}

function waitDownload(id) {
  return new Promise(function (resolve) {
    var done = false;
    function finish(item) {
      if (done) return;
      done = true;
      try { chrome.downloads.onChanged.removeListener(onCh); } catch (e) {}
      resolve(item || null);
    }
    function onCh(delta) {
      if (!delta || delta.id !== id || !delta.state) return;
      if (delta.state.current === "complete" || delta.state.current === "interrupted") {
        chrome.downloads.search({ id: id }, function (items) {
          finish(items && items[0]);
        });
      }
    }
    try { chrome.downloads.onChanged.addListener(onCh); } catch (e) {}
    try {
      chrome.downloads.search({ id: id }, function (items) {
        var it = items && items[0];
        if (it && (it.state === "complete" || it.state === "interrupted")) finish(it);
      });
    } catch (e2) {}
    setTimeout(function () { finish(null); }, 20000);
  });
}

function downloadPacked(msg) {
  var buf;
  var mime = "";
  try {
    buf = AW.b64ToBuf(msg.b64 || "");
    mime = AW.sniffMime(buf) || "";
  } catch (e) {
    awLog("save failed", "bytes could not be read");
    return Promise.resolve({ ok: false, error: "bytes" });
  }
  if (!mime || !buf || buf.byteLength < 64) {
    awLog("save failed", "not a real image or video, " + (buf ? buf.byteLength : 0) + " bytes");
    return Promise.resolve({ ok: false, error: "format" });
  }
  return buildDownloadName(msg.url || "", mime, msg.filenameHint || "").then(function (filename) {
    filename = String(filename || "file").replace(/\\/g, "/").replace(/^\/+/, "");
    var folder = filename.indexOf("/") >= 0 ? filename.split("/")[0] : "";
    awLog("save", "mime=" + mime + " bytes=" + buf.byteLength + " name=" + filename + (folder ? " folder=" + folder : " folder=Downloads"));
    var dataUrl = "data:" + mime + ";base64," + AW.bufToB64(buf);
    dlNames.push(filename);
    return new Promise(function (resolve) {
      try { muteDownloadUi(); } catch (e) {}
      chrome.downloads.download({ url: dataUrl, saveAs: false }, function (id) {
        var err = chrome.runtime.lastError;
        if (err || !id) {
          if (dlNames.length && dlNames[dlNames.length - 1] === filename) dlNames.pop();
          awLog("save failed", (err && err.message) || "download() returned no id");
          resolve({ ok: false, filename: filename, error: (err && err.message) || "download" });
          return;
        }
        waitDownload(id).then(function (item) {
          var size = item && (item.fileSize || item.bytesReceived || 0);
          var got = String((item && item.filename) || "").replace(/\\/g, "/");
          var inFolder = !folder || got.indexOf("/" + folder + "/") >= 0 || got.indexOf(folder + "/") === 0;
          if (!item || item.state !== "complete" || size < 80) {
            awLog("save failed", "state=" + (item && item.state) + " size=" + size + " path=" + got);
            try {
              chrome.downloads.removeFile(id, function () { void chrome.runtime.lastError; });
              chrome.downloads.erase({ id: id }, function () { void chrome.runtime.lastError; });
            } catch (e2) {}
            resolve({ ok: false, filename: filename, error: "file empty or interrupted" });
            return;
          }
          awLog("saved", "path=" + got + " size=" + size + " folder=" + (folder ? (inFolder ? "yes" : "IGNORED by browser") : "off"));
          resolve({
            ok: true,
            filename: got || filename,
            id: id,
            folderMiss: !!(folder && !inFolder)
          });
        });
      });
    });
  });
}

function blobBuf(data) {
  if (!data) return null;
  if (data instanceof ArrayBuffer) return data;
  if (data.b) return data.b;
  return null;
}

function repairStore() {
  return getHistory().then(function (list) {
    var fixed = 0;
    var dropped = 0;
    var chain = Promise.resolve();
    list.forEach(function (it) {
      chain = chain.then(function () {
        return idbGet(it.id).then(function (data) {
          var buf = blobBuf(data);
          var mime = buf ? AW.sniffMime(buf) : "";
          if (mime) {
            it.hasBlob = true;
            it.mime = mime;
            fixed += 1;
            return idbPut(it.id, { b: buf, m: mime });
          }
          if (it.url && String(it.url).indexOf("http") === 0) {
            return pullMedia(it.url, "").then(function (got) {
              if (got && got.buffer && AW.sniffMime(got.buffer)) {
                it.hasBlob = true;
                it.mime = got.mime;
                fixed += 1;
                return idbPut(it.id, { b: got.buffer, m: got.mime });
              }
              it.hasBlob = false;
              dropped += 1;
              return idbDel(it.id);
            }).catch(function () {
              it.hasBlob = false;
              dropped += 1;
              return idbDel(it.id);
            });
          }
          if (it.hasBlob) {
            it.hasBlob = false;
            dropped += 1;
            return idbDel(it.id);
          }
          return null;
        });
      });
    });
    return chain.then(function () {
      return saveHistory(list).then(function () {
        return { ok: true, fixed: fixed, dropped: dropped, n: list.length };
      });
    });
  });
}

async function handleDownload(url, tabId, forcePng, extra) {
  extra = extra || {};
  var blob = null;
  if (extra.buffer) {
    try { blob = new Blob([extra.buffer], { type: extra.mime || "image/jpeg" }); } catch (e) { blob = null; }
  }
  if (!url && !blob) return { ok: false, error: "no url" };
  var settings = await getSettings();
  var png = forcePng === true || (forcePng !== false && settings.saveAsPng);
  var originalName = extra.filenameHint || AW.filenameFromUrl(url || "image.jpg");
  if (!/\.[a-z0-9]+$/i.test(originalName)) originalName += ".jpg";
  if (blob && blob.type && blob.type.indexOf("image/") === 0) {
    var mimeExt = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "image/bmp": ".bmp" };
    var wantExt = mimeExt[blob.type] || ".jpg";
    if (!url || !/\.(png|jpe?g|gif|webp|bmp)$/i.test(String(url))) {
      originalName = originalName.replace(/\.[^.]+$/, "") + wantExt;
    }
  }
  var ext = AW.extFromUrl(url || originalName, ".jpg");
  var isVideo = /\.(mp4|webm|avi|mov|mkv|ogv)$/i.test(ext) || /^data:video\//.test(url || "") || (blob && blob.type && blob.type.indexOf("video/") === 0);
  var outUrl = url || "";
  var finalName = originalName;
  var objUrls = [];

  if (png && !isVideo && blob && blob.type === "image/png") {
    finalName = originalName.replace(/\.[^.]+$/, "") + ".png";
  } else if (png && !isVideo) {
    png = false;
  }

  if (settings.renameEnabled) {
    var n = settings.downloadCounter || 1;
    var host = "";
    try { if (url && url.indexOf("http") === 0) host = new URL(url).hostname; } catch (e) {}
    if (!host) host = "local";
    finalName = AW.applyTemplate(finalName, settings.renameTemplate, n, { host: host, url: url || "" });
    await setSettings({ downloadCounter: n + 1 });
  } else if (png && !/\.png$/i.test(finalName)) {
    finalName = finalName.replace(/\.[^.]+$/, "") + ".png";
  }

  if (settings.customPathEnabled && settings.customPath) {
    finalName = AW.cleanFolder(settings.customPath) + "/" + finalName;
  }

  return new Promise(function (resolve) {
    function finish(ok, name, id, fallback) {
      setTimeout(function () {
        objUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
      }, 20000);
      resolve({ ok: ok, filename: name, id: id, png: png, fallback: fallback });
    }
    function go(downloadUrl) {
      var name = String(finalName || "file").replace(/\\/g, "/").replace(/^\/+/, "");
      awLog("save url", name + " source=" + String(downloadUrl || "").slice(0, 140));
      dlNames.push(name);
      try { muteDownloadUi(); } catch (e) {}
      chrome.downloads.download({ url: downloadUrl, saveAs: false }, function (id) {
          if (chrome.runtime.lastError) {
            if (url && downloadUrl !== url) {
              chrome.downloads.download(
                { url: url, filename: originalName, saveAs: false, conflictAction: "uniquify" },
                function (id2) {
                  sweepDownload(id2);
                  finish(true, originalName, id2, true);
                }
              );
            } else {
              try { unmuteDownloadUi(); } catch (e) {}
              finish(false, originalName, null, false);
            }
          } else {
            sweepDownload(id);
            finish(true, finalName, id, false);
          }
        }
      );
    }
    if (blob) {
      blob.arrayBuffer().then(function (buf) {
        var mime = mediaMime(buf, blob.type || "");
        if (!mime || buf.byteLength < 32) {
          finish(false, finalName, null, false);
          return;
        }
        dlNames.push(String(finalName || "file").replace(/\\/g, "/").replace(/^\/+/, ""));
        downloadViaOffscreen(buf, mime, finalName).then(function (res) {
          if (res && res.ok) finish(true, finalName, res.id, false);
          else finish(false, finalName, null, false);
        });
      }).catch(function () { finish(false, finalName, null, false); });
      return;
    }
    if (outUrl && /^https?:/i.test(outUrl)) {
      var start = tabId
        ? new Promise(function (resolve) {
          chrome.tabs.get(tabId, function (t) { resolve((t && t.url) || ""); });
        })
        : Promise.resolve("");
      start.then(function (pageUrl) {
        return pullMedia(outUrl, pageUrl);
      }).then(function (got) {
        if (got && got.buffer) {
          downloadViaOffscreen(got.buffer, got.mime, finalName).then(function (res) {
            if (res && res.ok) finish(true, finalName, res.id, false);
            else finish(false, finalName, null, false);
          });
          return;
        }
        go(outUrl);
      }).catch(function () {
        finish(false, finalName, null, false);
      });
      return;
    }
    if (outUrl) {
      go(outUrl);
      return;
    }
    finish(false, originalName, null, false);
  });
}

function muteDownloadUi() {
  try {
    muteDepth++;
    applyDownloadUi(true);
  } catch (e) {}
}

function unmuteDownloadUi() {
  try {
    muteDepth = Math.max(0, muteDepth - 1);
    if (muteDepth === 0) applyDownloadUi(false);
  } catch (e) {}
}

function applyDownloadUi(hide) {
  try {
    if (chrome.downloads && chrome.downloads.setUiOptions) {
      chrome.downloads.setUiOptions({ enabled: !hide }, function () {
        try { void chrome.runtime.lastError; } catch (e) {}
      });
    }
  } catch (e) {}
}

var muteDepth = 0;
var ourDownloads = {};

function rememberDownload(id) {
  if (id == null) return;
  ourDownloads[id] = 1;
}

function forgetDownload(id) {
  if (id == null) return;
  delete ourDownloads[id];
}

function eraseOurDownload(id) {
  if (id == null) {
    unmuteDownloadUi();
    return;
  }
  if (!ourDownloads[id]) return;
  forgetDownload(id);
  try {
    chrome.downloads.erase({ id: id }, function () {
      void chrome.runtime.lastError;
      setTimeout(unmuteDownloadUi, 200);
    });
  } catch (e) {
    unmuteDownloadUi();
  }
}

function sweepDownload(id) {
  if (id == null) {
    setTimeout(unmuteDownloadUi, 400);
    return;
  }
  rememberDownload(id);
  try {
    function onChange(delta) {
      if (!delta || delta.id !== id) return;
      if (delta.state && (delta.state.current === "complete" || delta.state.current === "interrupted")) {
        try { chrome.downloads.onChanged.removeListener(onChange); } catch (e) {}
        eraseOurDownload(id);
      }
    }
    if (chrome.downloads && chrome.downloads.onChanged) {
      chrome.downloads.onChanged.addListener(onChange);
    }
  } catch (e) {}
  setTimeout(function () {
    if (ourDownloads[id]) eraseOurDownload(id);
  }, 6000);
}

function togglePin() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs || !tabs[0]) return;
    var tab = tabs[0];
    var next = !tab.pinned;
    chrome.tabs.update(tab.id, { pinned: next }, function () {
      try {
        chrome.action.setBadgeText({ text: next ? "PIN" : "UN" });
        chrome.action.setBadgeBackgroundColor({ color: next ? "#99e550" : "#2e2c42" });
        setTimeout(function () { chrome.action.setBadgeText({ text: "" }); }, 1000);
      } catch (e) {}
      sendToTab(tab.id, { type: "awToast", text: next ? "Tab pinned" : "Tab unpinned" });
    });
  });
}

function openShortcuts() {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, function () {
    if (chrome.runtime.lastError) {
      chrome.tabs.create({ url: "opera://extensions/shortcuts" }, function () {});
    }
  });
}

async function cropVisible(tabId, rect) {
  if (!rect || rect.w < 8 || rect.h < 8) return null;
  var dataUrl = await new Promise(function (resolve) {
    try {
      chrome.tabs.captureVisibleTab(undefined, { format: "png" }, function (url) {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(url || null);
      });
    } catch (e) {
      resolve(null);
    }
  });
  if (!dataUrl) return null;
  try {
    var res = await fetch(dataUrl);
    var blob = await res.blob();
    var bmp = await createImageBitmap(blob);
    var dpr = rect.dpr || 1;
    var sx = Math.max(0, Math.floor(rect.x * dpr));
    var sy = Math.max(0, Math.floor(rect.y * dpr));
    var sw = Math.min(bmp.width - sx, Math.floor(rect.w * dpr));
    var sh = Math.min(bmp.height - sy, Math.floor(rect.h * dpr));
    if (sw < 8 || sh < 8) {
      try { if (bmp.close) bmp.close(); } catch (e) {}
      return null;
    }
    var canvas = new OffscreenCanvas(sw, sh);
    canvas.getContext("2d").drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
    try { if (bmp.close) bmp.close(); } catch (e) {}
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  } catch (e) {
    return null;
  }
}

async function openInViewer(url, tabId, extra) {
  extra = extra || {};
  var mimeHint = extra.mime || "";
  var video = (mimeHint.indexOf("video/") === 0) || /\.(mp4|webm|avi|mov|m4v|ogv)(\?|#|$)/i.test(String(url || ""));
  if (video && /^https?:/i.test(url || "")) {
    var vitem = await pushHistory({ url: url, mime: mimeHint || "video/mp4" });
    if (!vitem || !vitem.id) return { ok: false };
    chrome.tabs.create({ url: viewerUrl(vitem.id) });
    return { ok: true, id: vitem.id };
  }
  var blob = null;
  if (extra.b64) {
    try {
      var raw = AW.b64ToBuf(extra.b64);
      var sniffed = AW.sniffMime(raw);
      if (sniffed) blob = new Blob([raw], { type: sniffed });
    } catch (e) {}
  }
  if (!blob && extra.buffer) {
    try { blob = await asImageBlob(new Blob([extra.buffer], { type: extra.mime || "image/jpeg" })); } catch (e2) {}
  }
  if (!blob && url) {
    if (String(url).indexOf("data:") === 0) {
      try { blob = await asImageBlob(await dataUrlToBlob(url)); } catch (e) {}
    } else if (/^https?:/i.test(url)) {
      try {
        var res = await fetch(url);
        if (res.ok) blob = await asImageBlob(await res.blob());
      } catch (e) {}
    }
  }
  if (!blob && !url) return { ok: false };
  var item = await pushHistory({ url: url || "", blob: blob, mime: extra.mime || (blob && blob.type) || "" });
  if (!item || !item.id) return { ok: false };
  chrome.tabs.create({ url: viewerUrl(item.id) });
  return { ok: true, id: item.id };
}

function isOurViewer(url) {
  return url && url.indexOf(chrome.runtime.getURL("main/viewer.html")) === 0;
}

function asImageBlob(blob) {
  if (!blob || !blob.size || blob.size < 24) return Promise.resolve(null);
  return createImageBitmap(blob).then(function (bmp) {
    if (!bmp || !bmp.width) return null;
    try { if (bmp.close) bmp.close(); } catch (e) {}
    return blob;
  }).catch(function () { return null; });
}

function delay(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

var snapWait = {};

function snapshotTab(tabId) {
  return new Promise(function (resolve) {
    var finished = false;
    function done(blob) {
      if (finished) return;
      finished = true;
      delete snapWait[tabId];
      resolve(blob || null);
    }
    snapWait[tabId] = done;
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["inWork/snap.js"]
    }).catch(function () { done(null); });
    setTimeout(function () { done(null); }, 5000);
  }).then(asImageBlob);
}

function looksLikeImageTab(url) {
  if (!url) return false;
  if (isOurViewer(url)) return false;
  if (url.indexOf("data:image/") === 0) return true;
  if (url.indexOf("blob:") === 0) return true;
  var path = url.split("#")[0].split("?")[0];
  return /\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|avi|mov|m4v|ogv)$/i.test(path);
}

var interceptLock = {};

async function interceptDataTab(tabId, url, extra) {
  extra = extra || {};
  var settings = await getSettings();
  if (!settings.enabled || !settings.interceptImages) return;
  if (!url || isOurViewer(url)) return;
  if (!looksLikeImageTab(url) && !extra.buffer && !extra.blob) return;
  if (interceptLock[tabId]) return;
  interceptLock[tabId] = true;
  try {
    var item = null;
    var videoTab = /\.(mp4|webm|avi|mov|m4v|ogv)(\?|#|$)/i.test(String(url || "").split("#")[0]);
    if (videoTab && /^https?:/i.test(url)) {
      item = await pushHistory({ url: url });
      if (item && item.id) {
        rememberRecentHid(item.id);
        await chrome.tabs.update(tabId, { url: viewerUrl(item.id) });
        snapshotOpenViewers();
      }
      return;
    }
    if (extra.buffer) {
      item = await pushHistory({ url: url, buffer: extra.buffer, mime: extra.mime, w: extra.w, h: extra.h });
    } else if (extra.blob) {
      item = await pushHistory({ url: url, blob: extra.blob, mime: extra.mime });
    }
    if ((!item || !item.hasBlob) && /^https?:/i.test(url)) {
      item = await pushHistory({ url: url });
    }
    if ((!item || !item.hasBlob) && url.indexOf("data:image/") === 0 && url.length < 12000000) {
      item = await pushHistory({ dataUrl: url, mime: (url.split(";")[0] || "").replace(/^data:/i, "") });
    }
    if (!item || !item.hasBlob) {
      var blob = await snapshotTab(tabId);
      if (blob) item = await pushHistory({ url: url, blob: blob, mime: blob.type });
    }
    if (!item || !item.id) return;
    if (!item.hasBlob && !httpOnly(item.url || url)) return;
    rememberRecentHid(item.id);
    await chrome.tabs.update(tabId, { url: viewerUrl(item.id) });
    snapshotOpenViewers();
  } catch (e) {
  } finally {
    setTimeout(function () { delete interceptLock[tabId]; }, 1500);
  }
}

function hidFromViewer(url) {
  if (!url) return "";
  try {
    if (url.indexOf(chrome.runtime.getURL("main/viewer.html")) !== 0) return "";
    return new URL(url).searchParams.get("hid") || "";
  } catch (e) {
    var m = String(url).match(/[?&]hid=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
}

function rememberRecentHid(hid) {
  if (!hid) return;
  chrome.storage.local.get(["recentViewers"], function (res) {
    var list = Array.isArray(res.recentViewers) ? res.recentViewers : [];
    list = list.filter(function (x) { return x && x !== hid; });
    list.unshift(hid);
    if (list.length > 20) list = list.slice(0, 20);
    chrome.storage.local.set({ recentViewers: list });
  });
}

function snapshotOpenViewers() {
  chrome.tabs.query({}, function (tabs) {
    var open = [];
    (tabs || []).forEach(function (t) {
      var hid = hidFromViewer(t.url);
      if (hid) open.push({ hid: hid, tabId: t.id });
    });
    if (open.length) chrome.storage.local.set({ openViewers: open });
  });
}

function injectTabCycle(tabId) {
  if (!tabId) return;
  try {
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: false },
      files: ["main/tabcycle.js"],
      injectImmediately: true
    }, function () {
      if (chrome.runtime.lastError) {
        try {
          chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: false },
            files: ["main/tabcycle.js"]
          }, function () { try { void chrome.runtime.lastError; } catch (e) {} });
        } catch (e2) {}
      }
    });
  } catch (e) {
    try {
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: false },
        files: ["main/tabcycle.js"]
      }, function () { try { void chrome.runtime.lastError; } catch (e2) {} });
    } catch (e3) {}
  }
}

function isQuietImageUrl(url) {
  if (!url) return false;
  if (url.indexOf("data:image/") === 0) return true;
  if (url.indexOf("blob:") === 0) return true;
  if (isOurViewer(url)) return true;
  var path = url.split("#")[0].split("?")[0];
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
}

function injectAliveTabs() {
  chrome.tabs.query({}, function (tabs) {
    (tabs || []).forEach(function (tab) {
      if (!tab.id || !tab.url) return;
      if (isQuietImageUrl(tab.url)) injectTabCycle(tab.id);
      if (!/^https?:|^file:/i.test(tab.url) && !isOurViewer(tab.url)) return;
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["main/tabspin.js", "main/tabcycle.js", "settings.js", "main/redgifs.js", "main/alt-guard.js", "content.js"]
        }, function () {
          try { void chrome.runtime.lastError; } catch (e) {}
        });
      } catch (e) {}
    });
  });
}

function convertOpenImageTabs() {
  chrome.tabs.query({}, function (tabs) {
    (tabs || []).forEach(function (t) {
      if (!t.id || !t.url || isOurViewer(t.url)) return;
      if (looksLikeImageTab(t.url)) interceptDataTab(t.id, t.url);
    });
  });
}

function restoreOpenViewers() {
  chrome.storage.local.get(["openViewers", "recentViewers"], function (res) {
    var wanted = [];
    var seen = {};
    function add(hid) {
      if (!hid || seen[hid]) return;
      seen[hid] = true;
      wanted.push(hid);
    }
    (res.openViewers || []).forEach(function (x) { add(x && x.hid ? x.hid : x); });
    if (!wanted.length) (res.recentViewers || []).slice(0, 8).forEach(add);
    if (!wanted.length) return;
    chrome.tabs.query({}, function (tabs) {
      var already = {};
      (tabs || []).forEach(function (t) {
        var hid = hidFromViewer(t.url);
        if (hid) already[hid] = true;
      });
      wanted.forEach(function (hid) {
        if (already[hid]) return;
        try { chrome.tabs.create({ url: viewerUrl(hid), active: false }); } catch (e) {}
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.storage.sync.get(null, function (items) {
    var patch = {};
    for (var k in AW.DEFAULTS) {
      if (items[k] === undefined) patch[k] = AW.DEFAULTS[k];
    }
    if (items.holdMenuMs === 1500 || items.holdMenuMs === 1600) patch.holdMenuMs = 1000;
    if (Object.keys(patch).length) chrome.storage.sync.set(patch);
    getPresetSlots().then(function (slots) {
      var filled = [];
      var i;
      for (i = 0; i < (AW.PRESET_COUNT || 10); i++) if (slots[i]) filled.push(JSON.stringify(slots[i]));
      if (filled.length >= 2) {
        var allSame = filled.every(function (s) { return s === filled[0]; });
        if (allSame) chrome.storage.local.remove(PRESET_KEY);
      }
    });
  });
  injectAliveTabs();
  if (!details || details.reason !== "install") {
    restoreOpenViewers();
    convertOpenImageTabs();
  }
});

try {
  chrome.runtime.onStartup.addListener(function () {
    injectAliveTabs();
    restoreOpenViewers();
    convertOpenImageTabs();
  });
} catch (e) {}

chrome.commands.onCommand.addListener(async function (command) {
  var tab = await queryActive();
  if (command === "toggle-pin") {
    togglePin();
    return;
  }
  if (!tab) return;
  if (command === "open_media") {
    broadcastTab(tab.id, { type: "awOpen" });
  } else if (command === "copy_media") {
    broadcastTab(tab.id, { type: "awCopy" });
  }
});

try {
  chrome.webNavigation.onCommitted.addListener(function (details) {
    if (details.frameId !== 0) return;
    interceptDataTab(details.tabId, details.url);
  });
} catch (e) {}

try {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    var url = (changeInfo.url || (changeInfo.status === "complete" && tab && tab.url) || "");
    if (!url) return;
    interceptDataTab(tabId, url);
    if (isQuietImageUrl(url)) injectTabCycle(tabId);
    var hid = hidFromViewer(url);
    if (hid) {
      rememberRecentHid(hid);
      snapshotOpenViewers();
    }
  });
} catch (e) {}

try {
  chrome.tabs.onRemoved.addListener(function () {
    setTimeout(snapshotOpenViewers, 1500);
  });
} catch (e) {}

function tabsInActiveWorkspace(tabs) {
  tabs = tabs || [];
  var active = null;
  var i;
  for (i = 0; i < tabs.length; i++) {
    if (tabs[i].active) {
      active = tabs[i];
      break;
    }
  }
  if (!active) return tabs;
  var ws = active.workspaceId;
  var hasWs = ws !== undefined && ws !== null && ws !== "";
  var out = [];
  for (i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    if (t.hidden) continue;
    if (hasWs && String(t.workspaceId) !== String(ws)) continue;
    out.push(t);
  }
  return out.length ? out : tabs;
}

function cycleTab(dir) {
  dir = dir < 0 ? -1 : 1;
  function step() {
    if (cycleIds.length < 2) return;
    cycleIdx = (cycleIdx + dir + cycleIds.length) % cycleIds.length;
    cycleAt = Date.now();
    var id = cycleIds[cycleIdx];
    chrome.tabs.update(id, { active: true }, function () {
      try { void chrome.runtime.lastError; } catch (e) {}
    });
  }
  if ((spinOn || Date.now() - cycleAt < 2500) && cycleIds.length >= 2) {
    step();
    return;
  }
  rebuildCycle(step);
}

var spinOn = false;
var cycleIds = [];
var cycleIdx = 0;
var cycleAt = 0;
try {
  chrome.storage.local.get(["awTabSpin"], function (r) {
    spinOn = !!(r && r.awTabSpin);
    if (spinOn) rebuildCycle();
  });
} catch (e) {}

function rebuildCycle(cb) {
  chrome.tabs.query({ currentWindow: true }, function (tabs) {
    tabs = tabsInActiveWorkspace(tabs);
    var list = tabs;
    if (spinOn) {
      var usable = tabs.filter(function (t) {
        return tabSpinCanInject(t.url) || t.discarded;
      });
      if (usable.length >= 2) list = usable;
    }
    cycleIds = list.map(function (t) { return t.id; });
    cycleIdx = 0;
    cycleAt = Date.now();
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].active) {
        cycleIdx = i;
        break;
      }
    }
    if (cb) cb();
  });
}

function tabSpinCanInject(url) {
  if (!url) return false;
  if (/^https?:/i.test(url) || /^file:/i.test(url)) return true;
  try {
    if (url.indexOf(chrome.runtime.getURL("")) === 0) return true;
  } catch (e) {}
  return false;
}

function setTabSpin(on, then) {
  spinOn = !!on;
  chrome.storage.local.set({ awTabSpin: spinOn }, function () {
    try {
      chrome.action.setBadgeText({ text: spinOn ? "SPIN" : "" });
      chrome.action.setBadgeBackgroundColor({ color: "#99e550" });
    } catch (e) {}
    if (spinOn) {
      prepareSpinTabs();
      rebuildCycle(then);
      return;
    }
    cycleIds = [];
    chrome.tabs.query({}, function (tabs) {
      (tabs || []).forEach(function (t) {
        if (!t.id) return;
        try {
          chrome.tabs.sendMessage(t.id, { type: "tabSpinPaint", on: false }, function () {
            try { void chrome.runtime.lastError; } catch (e2) {}
          });
        } catch (e) {}
      });
    });
    if (then) then();
  });
}

function prepareSpinTabs() {
  chrome.tabs.query({ currentWindow: true }, function (tabs) {
    tabs = tabsInActiveWorkspace(tabs || []);
    tabs.forEach(function (t) {
      if (!t.id) return;
      try { chrome.tabs.update(t.id, { autoDiscardable: false }); } catch (e) {}
      if (tabSpinCanInject(t.url) || t.discarded) injectTabSpin(t.id);
    });
  });
}

function injectTabSpin(tabId) {
  if (!tabId) return;
  function sendPaint() {
    try {
      chrome.tabs.sendMessage(tabId, { type: "tabSpinPaint", on: true }, function () {
        try { void chrome.runtime.lastError; } catch (e2) {}
      });
    } catch (e3) {}
  }
  try {
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: false },
      files: ["main/tabspin.js"],
      injectImmediately: true
    }, function () {
      if (chrome.runtime.lastError) {
        try {
          chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: false },
            files: ["main/tabspin.js"]
          }, function () {
            try { void chrome.runtime.lastError; } catch (e) {}
            sendPaint();
          });
        } catch (e2) { sendPaint(); }
        return;
      }
      sendPaint();
    });
  } catch (e) {
    try {
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: false },
        files: ["main/tabspin.js"]
      }, function () {
        try { void chrome.runtime.lastError; } catch (e2) {}
        sendPaint();
      });
    } catch (e3) {}
  }
}

function injectTabSpinAll() {
  chrome.tabs.query({ currentWindow: true }, function (tabs) {
    tabs = tabsInActiveWorkspace(tabs || []);
    (tabs || []).forEach(function (t) {
      if (t && t.id && (tabSpinCanInject(t.url) || t.discarded)) injectTabSpin(t.id);
    });
  });
}

try {
  chrome.tabs.onActivated.addListener(function (info) {
    chrome.tabs.get(info.tabId, function (tab) {
      if (chrome.runtime.lastError || !tab) return;
      if (isQuietImageUrl(tab.url)) injectTabCycle(tab.id);
    });
    if (!spinOn) return;
    var i = cycleIds.indexOf(info.tabId);
    if (i >= 0) cycleIdx = i;
    else rebuildCycle();
    injectTabSpin(info.tabId);
  });
} catch (e) {}

try {
  chrome.tabs.onRemoved.addListener(function (tabId) {
    if (spinOn) {
      cycleIds = cycleIds.filter(function (id) { return id !== tabId; });
      if (cycleIdx >= cycleIds.length) cycleIdx = 0;
    }
  });
} catch (e) {}

try {
  chrome.tabs.onCreated.addListener(function () {
    if (spinOn) rebuildCycle();
  });
} catch (e) {}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === "snapResult") {
    var tabId = sender.tab && sender.tab.id;
    var fn = tabId != null ? snapWait[tabId] : null;
    if (fn) {
      if (msg.ok && msg.buffer) fn(new Blob([msg.buffer], { type: msg.mime || "image/png" }));
      else fn(null);
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "devLog") {
    awLog("page", String(msg.text || ""));
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "saveDevLogs") {
    var logStore = (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;
    logStore.get("awDevLogs", function (res) {
      var lines = (res && res.awDevLogs) || [];
      var text = lines.join("\n") || "no logs yet";
      var b64 = "";
      try { b64 = btoa(unescape(encodeURIComponent(text))); } catch (e) { sendResponse({ ok: false }); return; }
      dlNames.push("AWF-sm-logs.txt");
      chrome.downloads.download({ url: "data:text/plain;base64," + b64, saveAs: false }, function (id) {
        var err = chrome.runtime.lastError;
        awLog("devlogs", err ? err.message : "wrote AWF-sm-logs.txt");
        sendResponse({ ok: !err && !!id, error: err && err.message });
      });
    });
    return true;
  }
  if (msg.type === "exportSettings") {
    Promise.all([getSettings(), getPresetSlots()]).then(function (both) {
      var presetMap = {};
      var i;
      for (i = 0; i < both[1].length; i++) if (both[1][i]) presetMap[String(i + 1)] = both[1][i];
      var data = {
        kind: "awfSM_settingData",
        version: 1,
        savedAt: new Date().toISOString(),
        settings: both[0],
        presets: presetMap
      };
      var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      dlNames.push("awfSM_settingData.json");
      chrome.downloads.download({ url: "data:application/json;base64," + b64, saveAs: false }, function (id) {
        var err = chrome.runtime.lastError;
        awLog("export set", err ? err.message : "awfSM_settingData.json");
        sendResponse({ ok: !err && !!id, error: err && err.message });
      });
    });
    return true;
  }
  if (msg.type === "importSettings") {
    var incoming = msg.data;
    if (!incoming || incoming.kind !== "awfSM_settingData" || !incoming.settings) {
      sendResponse({ ok: false, error: "bad file" });
      return;
    }
    var patch = {};
    var key;
    for (key in AW.DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(incoming.settings, key)) patch[key] = incoming.settings[key];
    }
    setSettings(patch).then(function () {
      var local = {};
      if (incoming.settings.pierceHosts) local.pierceHosts = incoming.settings.pierceHosts;
      if (incoming.settings.fitMode) local.fitMode = incoming.settings.fitMode;
      if (incoming.presets) local[PRESET_KEY] = incoming.presets;
      return new Promise(function (resolve) {
        if (!Object.keys(local).length) return resolve();
        chrome.storage.local.set(local, function () { resolve(); });
      });
    }).then(function () {
      awLog("import set", "settings and presets restored");
      sendResponse({ ok: true });
    }).catch(function () { sendResponse({ ok: false }); });
    return true;
  }
  if (msg.type === "getSettings") {
    getSettings().then(sendResponse);
    return true;
  }
  if (msg.type === "saveSettings") {
    var patch = msg.data || {};
    delete patch.presets;
    setSettings(patch).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === "copyPng") {
    convertToPngDataUrl(msg.url)
      .then(function (dataUrl) { sendResponse({ ok: true, dataUrl: dataUrl }); })
      .catch(function (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); });
    return true;
  }
  if (msg.type === "getPresets") {
    getPresetSlots().then(function (slots) {
      sendResponse({ ok: true, slots: slots });
    });
    return true;
  }
  if (msg.type === "savePreset") {
    var snap = msg.preset || {};
    var clean = {
      renameTemplate: String(snap.renameTemplate || "media_{date}_{counter}"),
      customPath: String(snap.customPath || "AW_Media"),
      customPathEnabled: !!snap.customPathEnabled,
      renameEnabled: !!snap.renameEnabled,
      saveAsPng: !!snap.saveAsPng
    };
    setPresetSlot(msg.index | 0, clean).then(sendResponse);
    return true;
  }
  if (msg.type === "relay") {
    var tabId = sender.tab && sender.tab.id;
    var payload = msg.payload;
    if (!tabId || !payload) {
      sendResponse({ ok: false });
      return;
    }
    var srcFrame = sender.frameId;
    chrome.webNavigation.getAllFrames({ tabId: tabId }, function (frames) {
      var list = frames || [];
      var pending = list.length;
      var ok = false;
      if (!pending) {
        sendResponse({ ok: false });
        return;
      }
      list.forEach(function (f) {
        if (f.frameId === srcFrame) {
          pending--;
          if (pending <= 0) sendResponse({ ok: ok });
          return;
        }
        chrome.tabs.sendMessage(tabId, payload, { frameId: f.frameId }, function (res) {
          void chrome.runtime.lastError;
          if (res && res.ok) ok = true;
          pending--;
          if (pending <= 0) sendResponse({ ok: ok });
        });
      });
      if (pending <= 0) sendResponse({ ok: ok });
    });
    return true;
  }
  if (msg.type === "openUrl") {
    if (msg.url && /^https?:/i.test(msg.url)) {
      chrome.tabs.create({ url: msg.url, active: true });
    }
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "reserveDownloadName") {
    buildDownloadName(msg.url || "", msg.mime || "", msg.filenameHint || "").then(function (filename) {
      sendResponse({ ok: true, filename: filename });
    });
    return true;
  }
  if (msg.type === "pullMediaB64") {
    var ref = (sender.tab && sender.tab.url) || "";
    pullMedia(msg.url || "", ref).then(function (got) {
      if (!got || !got.buffer) {
        sendResponse({ ok: false });
        return;
      }
      sendResponse({ ok: true, b64: AW.bufToB64(got.buffer), mime: got.mime });
    }).catch(function () { sendResponse({ ok: false }); });
    return true;
  }
  if (msg.type === "setExportFmt") {
    var fmt = String(msg.fmt || "");
    if (!AW.formatById(fmt)) {
      sendResponse({ ok: false });
      return;
    }
    getHistory().then(function (list) {
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === msg.id) list[i].exportFmt = fmt;
      }
      return saveHistory(list);
    }).then(function () { sendResponse({ ok: true }); }).catch(function () { sendResponse({ ok: false }); });
    return true;
  }
  if (msg.type === "downloadPacked") {
    downloadPacked(msg).then(sendResponse);
    return true;
  }
  if (msg.type === "repairHistory") {
    repairStore().then(sendResponse).catch(function () { sendResponse({ ok: false }); });
    return true;
  }
  if (msg.type === "downloadMedia") {
    handleDownload(msg.url, sender.tab && sender.tab.id, msg.forcePng, {
      buffer: msg.buffer,
      mime: msg.mime,
      filenameHint: msg.filenameHint
    }).then(function (r) {
      sendResponse(r);
    });
    return true;
  }
  if (msg.type === "openInViewer") {
    openInViewer(msg.url, sender.tab && sender.tab.id, {
      buffer: msg.buffer,
      b64: msg.b64,
      mime: msg.mime
    }).then(sendResponse);
    return true;
  }
  if (msg.type === "captureSave" || msg.type === "captureOpen") {
    var tabId = sender.tab && sender.tab.id;
    cropVisible(tabId, msg.rect).then(function (blob) {
      if (!blob) {
        sendResponse({ ok: false });
        return;
      }
      return blob.arrayBuffer().then(function (buf) {
        if (msg.type === "captureOpen") {
          return openInViewer("", tabId, { buffer: buf, mime: blob.type || "image/jpeg" }).then(sendResponse);
        }
        return handleDownload("", tabId, false, {
          buffer: buf,
          mime: blob.type || "image/jpeg",
          filenameHint: msg.filenameHint || "capture.jpg"
        }).then(sendResponse);
      });
    }).catch(function () { sendResponse({ ok: false }); });
    return true;
  }
  if (msg.type === "putHistoryBlob") {
    try {
      var healed = AW.b64ToBuf(msg.b64 || "");
      var healedMime = AW.sniffMime(healed);
      if (!msg.id || !healedMime) {
        sendResponse({ ok: false });
        return;
      }
      idbPut(msg.id, { b: healed, m: healedMime }).then(function () {
        return getHistory().then(function (list) {
          var i;
          for (i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === msg.id) {
              list[i].hasBlob = true;
              list[i].mime = healedMime;
            }
          }
          return saveHistory(list);
        });
      }).then(function () { sendResponse({ ok: true }); }).catch(function () { sendResponse({ ok: false }); });
    } catch (e) {
      sendResponse({ ok: false });
    }
    return true;
  }
  if (msg.type === "pushHistory") {
    var entry = msg.entry || {};
    if (msg.b64) {
      try { entry.buffer = AW.b64ToBuf(msg.b64); } catch (e) {}
    } else if (msg.buffer) entry.buffer = msg.buffer;
    if (msg.mime) entry.mime = msg.mime;
    if (msg.url) entry.url = msg.url;
    if (msg.blob) entry.blob = msg.blob;
    pushHistory(entry).then(sendResponse);
    return true;
  }
  if (msg.type === "adoptImageTab") {
    var tabId = sender.tab && sender.tab.id;
    var url = msg.url || (sender.tab && sender.tab.url) || "";
    interceptDataTab(tabId, url, {
      buffer: msg.buffer,
      mime: msg.mime,
      w: msg.w,
      h: msg.h
    }).then(function () { sendResponse({ ok: true }); }).catch(function () { sendResponse({ ok: false }); });
    return true;
  }
  if (msg.type === "restoreViewers") {
    restoreOpenViewers();
    getHistory().then(function (list) {
      chrome.storage.local.get(["openViewers", "recentViewers"], function (res) {
        var n = (res.openViewers && res.openViewers.length) || (res.recentViewers && Math.min(8, res.recentViewers.length)) || 0;
        if (!n && list && list.length) {
          list.slice(0, 5).forEach(function (it) {
            if (it && it.id) chrome.tabs.create({ url: viewerUrl(it.id), active: false });
          });
          n = Math.min(5, list.length);
        }
        sendResponse({ ok: true, n: n });
      });
    });
    return true;
  }
  if (msg.type === "getHistory") {
    getHistory().then(function (list) { sendResponse({ list: list }); });
    return true;
  }
  if (msg.type === "getHistoryItem") {
    findHistory(msg.id).then(function (item) {
      if (!item) {
        sendResponse({ item: null });
        return;
      }
      var copy = {
        id: item.id,
        url: item.url || "",
        dataUrl: item.dataUrl || "",
        hasBlob: !!item.hasBlob,
        mime: item.mime || "",
        w: item.w || 0,
        h: item.h || 0,
        ts: item.ts || 0
      };
      var blob = item._blob || null;
      if (typeof blob === "string") {
        dataUrlToBlob(blob).then(function (b) {
          sendResponse({ item: copy, blob: b });
        }).catch(function () {
          sendResponse({ item: copy, blob: null });
        });
        return;
      }
      sendResponse({ item: copy, blob: blob });
    });
    return true;
  }
  if (msg.type === "openShortcuts") {
    openShortcuts();
    sendResponse({ ok: true });
  }
  if (msg.type === "togglePin") {
    togglePin();
    sendResponse({ ok: true });
  }
  if (msg.type === "cycleTab") {
    cycleTab(msg.dir);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "tabSpinStart") {
    setTabSpin(true, function () { cycleTab(msg.dir); });
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "tabSpinStop") {
    setTabSpin(false);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "tabAction") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab) {
        sendResponse({ ok: false });
        return;
      }
      var act = msg.action;
      if (act === "info") {
        sendResponse({ ok: true, pinned: !!tab.pinned, id: tab.id });
        return;
      }
      if (act === "reload") chrome.tabs.reload(tab.id);
      else if (act === "close") chrome.tabs.remove(tab.id);
      else if (act === "dup") chrome.tabs.duplicate(tab.id);
      else if (act === "pin") {
        chrome.tabs.update(tab.id, { pinned: !tab.pinned });
        sendResponse({ ok: true, pinned: !tab.pinned });
        return;
      } else if (act === "back") {
        try { chrome.tabs.goBack(tab.id, function () {}); } catch (e) {}
      } else if (act === "fwd") {
        try { chrome.tabs.goForward(tab.id, function () {}); } catch (e) {}
      }
      sendResponse({ ok: true, pinned: !!tab.pinned });
    });
    return true;
  }
  if (msg.type === "incCounter") {
    getSettings().then(function (s) {
      var n = (s.downloadCounter || 1) + 1;
      setSettings({ downloadCounter: n }).then(function () {
        sendResponse({ next: n });
      });
    });
    return true;
  }
});

awLog("start", "worker up v" + (chrome.runtime.getManifest().version || ""));
