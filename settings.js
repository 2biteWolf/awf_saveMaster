/* AWF_saveMaster shared defaults + helpers (classic script, importScripts-safe) */
var AW = AW || {};

AW.DEFAULTS = {
  enabled: true,
  highlightEnabled: true,
  blockAlt: true,
  saveAsPng: false,
  customPathEnabled: false,
  customPath: "AW_Media",
  renameEnabled: false,
  renameTemplate: "media_{date}_{counter}",
  copyMediaFile: true,
  interceptImages: true,
  fitMode: "none",
  background: "#000000",
  toastMs: 5000,
  toastPos: "bottom-right",
  historySize: 50,
  holdMenuMs: 1000,
  altHoldMode: "x2",
  zoomHoldMs: 1000,
  altMenuScale: 100,
  downloadCounter: 1,
  pierceMode: "auto"
};

AW.PRESET_COUNT = 10;
AW.MODES = ["none", "vertical", "fill", "horizontal"];
AW.MODE_LABELS = {
  none: "1 original",
  vertical: "2 fit height",
  fill: "3 stretch",
  horizontal: "4 fit width"
};

AW.MEDIA_EXT = [
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
  ".mp4", ".webm", ".avi", ".mov", ".mkv", ".ogv"
];

AW.merge = function (items) {
  var out = {};
  var k;
  for (k in AW.DEFAULTS) out[k] = AW.DEFAULTS[k];
  if (items) for (k in items) out[k] = items[k];
  return out;
};

AW.cleanFolder = function (name) {
  var s = String(name || "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\.+$/, "")
    .trim();
  return s || "AW_Media";
};

AW.cleanFile = function (name) {
  return String(name || "media").replace(/[<>:"/\\|?*]/g, "_");
};

AW.isMediaUrl = function (url) {
  if (!url) return false;
  var lower = String(url).toLowerCase();
  if (lower.indexOf("data:image/") === 0) return true;
  if (lower.indexOf("data:video/") === 0) return true;
  var i;
  for (i = 0; i < AW.MEDIA_EXT.length; i++) {
    if (lower.indexOf(AW.MEDIA_EXT[i]) !== -1) return true;
  }
  return false;
};

AW.extFromUrl = function (url, fallback) {
  if (!url) return fallback || ".jpg";
  var m = String(url).match(/^data:(image|video)\/([a-zA-Z0-9+.-]+)/);
  if (m) {
    var mime = m[2].toLowerCase();
    if (mime === "jpeg") return ".jpg";
    if (mime === "svg+xml") return ".svg";
    return "." + mime;
  }
  var path = String(url).split("?")[0].split("#")[0];
  var dot = path.lastIndexOf(".");
  if (dot !== -1) {
    var ext = path.slice(dot).toLowerCase();
    if (ext.length <= 5) return ext;
  }
  return fallback || ".jpg";
};

AW.sniffMime = function (data) {
  var u = null;
  if (!data) return "";
  if (data instanceof ArrayBuffer) u = new Uint8Array(data);
  else if (typeof Uint8Array !== "undefined" && data instanceof Uint8Array) u = data;
  if (!u || u.length < 4) return "";
  if (u[0] === 0xFF && u[1] === 0xD8 && u[2] === 0xFF) return "image/jpeg";
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47) return "image/png";
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return "image/gif";
  if (u[0] === 0x42 && u[1] === 0x4D) return "image/bmp";
  if (u.length > 11 && u[0] === 0x52 && u[1] === 0x49 && u[8] === 0x57 && u[9] === 0x45) return "image/webp";
  if (u.length > 11 && u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && u[8] === 0x41 && u[9] === 0x56 && u[10] === 0x49) return "video/x-msvideo";
  if (u.length > 11 && u[4] === 0x66 && u[5] === 0x74 && u[6] === 0x79 && u[7] === 0x70) return "video/mp4";
  if (u[0] === 0x1A && u[1] === 0x45 && u[2] === 0xDF && u[3] === 0xA3) return "video/webm";
  return "";
};

AW.extForMime = function (mime) {
  var map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/x-msvideo": ".avi"
  };
  return map[mime] || "";
};

AW.FORMATS = [
  { id: "png", mime: "image/png", label: "PNG" },
  { id: "jpg", mime: "image/jpeg", label: "JPG" },
  { id: "webp", mime: "image/webp", label: "WEBP" },
  { id: "gif", mime: "image/gif", label: "GIF" },
  { id: "mp4", mime: "video/mp4", label: "MP4" },
  { id: "webm", mime: "video/webm", label: "WEBM" },
  { id: "avi", mime: "video/x-msvideo", label: "AVI" }
];

AW.formatById = function (id) {
  var i;
  for (i = 0; i < AW.FORMATS.length; i++) if (AW.FORMATS[i].id === id) return AW.FORMATS[i];
  return null;
};

AW.kindOf = function (mime) {
  mime = String(mime || "");
  if (mime === "image/gif") return "gif";
  if (mime.indexOf("video/") === 0) return "video";
  if (mime.indexOf("image/") === 0) return "still";
  return "";
};

AW.idForMime = function (mime) {
  var i;
  for (i = 0; i < AW.FORMATS.length; i++) if (AW.FORMATS[i].mime === mime) return AW.FORMATS[i].id;
  var kind = AW.kindOf(mime);
  if (kind === "video") return "mp4";
  if (kind === "gif") return "gif";
  return "png";
};

AW.defaultFormat = function (mime) {
  var kind = AW.kindOf(mime);
  if (kind === "gif") return "gif";
  if (kind === "video") return AW.idForMime(mime);
  return "png";
};

AW.pickFormat = function (mime, wanted) {
  var kind = AW.kindOf(mime);
  var srcId = AW.idForMime(mime);
  if (kind === "still" && (wanted === "png" || wanted === "jpg" || wanted === "webp")) return wanted;
  if (kind === "gif") return "gif";
  if (kind === "video") return (wanted === srcId) ? wanted : (srcId || "mp4");
  if (kind === "still") return "png";
  return "png";
};

AW.isMotion = function (mime) {
  return mime === "image/gif" || String(mime || "").indexOf("video/") === 0;
};

AW.imageBlob = function (data, mime) {
  if (!data || typeof Blob === "undefined") return null;
  if (data instanceof Blob && data.size > 64 && data.type && (data.type.indexOf("image/") === 0 || data.type.indexOf("video/") === 0)) return data;
  var raw = data;
  if (data && data.b) raw = data.b;
  var sniffed = AW.sniffMime(raw);
  if (!sniffed) return null;
  try { return new Blob([raw], { type: sniffed }); } catch (e) { return null; }
};

AW.bufToB64 = function (buf) {
  var bytes = new Uint8Array(buf);
  var bin = "";
  var step = 0x4000;
  var i;
  for (i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
};

AW.b64ToBuf = function (b64) {
  var bin = atob(b64 || "");
  var bytes = new Uint8Array(bin.length);
  var i;
  for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

AW.filenameFromUrl = function (url) {
  try {
    if (String(url).indexOf("data:") === 0) {
      return "image" + AW.extFromUrl(url, ".png");
    }
    var path = new URL(url).pathname;
    var name = decodeURIComponent(path.substring(path.lastIndexOf("/") + 1));
    if (!name || name === "/" || name.indexOf(".") === -1) {
      return "media_" + Date.now() + AW.extFromUrl(url, ".jpg");
    }
    return AW.cleanFile(name);
  } catch (e) {
    return "media_" + Date.now() + ".jpg";
  }
};

AW.NAME_TAGS = [
  { tag: "{original}", hint: "original filename, no extension" },
  { tag: "{ext}", hint: "original extension: jpg png webp gif" },
  { tag: "{counter}", hint: "incrementing number 1, 2, 3…" },
  { tag: "{n}", hint: "same number, 3 digits: 001" },
  { tag: "{date}", hint: "date YYYY-MM-DD" },
  { tag: "{time}", hint: "local time HH-MM-SS" },
  { tag: "{ymd}", hint: "compact date 20260831" },
  { tag: "{timestamp}", hint: "unix time in milliseconds" },
  { tag: "{host}", hint: "site hostname, e.g. perchance.org" },
  { tag: "{rand}", hint: "4 random chars, unique-ish" }
];

AW.legendHtml = function () {
  return AW.NAME_TAGS.map(function (t) {
    return '<div class="aw-tag"><code>' + t.tag + "</code><span>" + t.hint + "</span></div>";
  }).join("");
};

AW.applyTemplate = function (originalName, template, counter, extra) {
  extra = extra || {};
  var now = new Date();
  var timestamp = String(now.getTime());
  var date = now.toISOString().split("T")[0];
  var time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  var ymd = date.replace(/-/g, "");
  var n = String(counter || 1);
  var padded = ("000" + n).slice(-3);
  var rand = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(2, 6);
  if (rand.length < 4) rand = (rand + "xxxx").slice(0, 4);
  var host = extra.host || "";
  if (!host && extra.url) {
    try { host = new URL(extra.url).hostname; } catch (e) { host = ""; }
  }
  var base = originalName;
  var ext = "jpg";
  var dot = originalName.lastIndexOf(".");
  if (dot !== -1) {
    base = originalName.slice(0, dot);
    ext = originalName.slice(dot + 1);
  }
  var name = String(template || "media_{counter}")
    .replace(/\{timestamp\}/g, timestamp)
    .replace(/\{counter\}/g, n)
    .replace(/\{n\}/g, padded)
    .replace(/\{date\}/g, date)
    .replace(/\{time\}/g, time)
    .replace(/\{ymd\}/g, ymd)
    .replace(/\{original\}/g, base)
    .replace(/\{ext\}/g, ext.toLowerCase())
    .replace(/\{host\}/g, host || "local")
    .replace(/\{rand\}/g, rand);
  name = AW.cleanFile(name);
  return name + "." + ext.toLowerCase();
};

AW.keyCombo = function (e) {
  var keys = [];
  if (e.ctrlKey) keys.push("Ctrl");
  if (e.metaKey) keys.push("Cmd");
  if (e.altKey) keys.push("Alt");
  if (e.shiftKey) keys.push("Shift");
  if (["Control", "Shift", "Alt", "Meta"].indexOf(e.key) === -1) {
    if (e.key.length === 1) keys.push(e.key.toUpperCase());
    else keys.push(e.key.replace("Arrow", ""));
  }
  return keys.join("+");
};
