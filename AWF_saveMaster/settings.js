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
  pierceMode: "auto",
  lang: "",
  keySave: "Ctrl+K",
  keySave2: "Alt+C",
  keyPin: "Alt+Z",
  keyOpen: "Alt+Q",
  keyCopy: "Alt+V"
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
  if (u.length > 11 && u[4] === 0x66 && u[5] === 0x74 && u[6] === 0x79 && u[7] === 0x70) {
    var brand = AW._ascii(u, 8, 4).toLowerCase();
    var compat = u.length > 16 ? AW._ascii(u, 16, Math.min(24, u.length - 16)).toLowerCase() : "";
    var box = brand + compat;
    if (box.indexOf("avif") !== -1 || box.indexOf("avis") !== -1) return "image/avif";
    if (box.indexOf("heic") !== -1 || box.indexOf("heix") !== -1 || box.indexOf("heif") !== -1 || box.indexOf("mif1") !== -1) return "image/heic";
    if (brand === "qt  ") return "video/quicktime";
    if (brand.indexOf("mp4") !== -1 || brand === "isom" || brand === "iso2" || brand === "iso5" || brand === "iso6" || brand === "avc1" || brand === "dash" || brand === "msnv" || brand === "m4v " || brand === "f4v " || brand === "mp71") return "video/mp4";
    return "";
  }
  if (u[0] === 0x1A && u[1] === 0x45 && u[2] === 0xDF && u[3] === 0xA3) return "video/webm";
  if (u[0] === 0xFF && u[1] === 0x0A) return "image/jxl";
  if (u.length > 11 && u[4] === 0x4A && u[5] === 0x58 && u[6] === 0x4C && u[7] === 0x20) return "image/jxl";
  var head = AW._ascii(u, 0, Math.min(160, u.length)).replace(/^\s+/, "").toLowerCase();
  if (head.indexOf("<svg") === 0) return "image/svg+xml";
  if (head.indexOf("<?xml") === 0 && head.indexOf("<svg") !== -1) return "image/svg+xml";
  return "";
};

AW._ascii = function (u, start, n) {
  var s = "";
  var i;
  var end = Math.min(u.length, start + n);
  for (i = start; i < end; i++) s += String.fromCharCode(u[i]);
  return s;
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
    "video/x-msvideo": ".avi",
    "video/quicktime": ".mov",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/jxl": ".jxl",
    "image/svg+xml": ".svg"
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
  { tag: "{original}", hint: "tagOriginal" },
  { tag: "{ext}", hint: "tagExt" },
  { tag: "{counter}", hint: "tagCounter" },
  { tag: "{n}", hint: "tagN" },
  { tag: "{date}", hint: "tagDate" },
  { tag: "{time}", hint: "tagTime" },
  { tag: "{ymd}", hint: "tagYmd" },
  { tag: "{timestamp}", hint: "tagStamp" },
  { tag: "{host}", hint: "tagHost" },
  { tag: "{rand}", hint: "tagRand" }
];

AW.legendHtml = function (lang) {
  return AW.NAME_TAGS.map(function (t) {
    return '<div class="aw-tag"><code>' + t.tag + "</code><span>" + AW.T(lang, t.hint) + "</span></div>";
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
  return AW.comboFromEvent(e);
};

AW.uiLang = function (s) {
  var l = s && s.lang;
  if (l === "ru" || l === "en") return l;
  try {
    var n = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (n.indexOf("ru") === 0) return "ru";
  } catch (e) {}
  return "en";
};

AW.T = function (lang, key, vars) {
  var pack = AW.STRINGS[lang === "ru" ? "ru" : "en"] || AW.STRINGS.en;
  var s = (pack && pack[key]) || (AW.STRINGS.en && AW.STRINGS.en[key]) || key;
  if (vars) {
    var k;
    for (k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        s = s.split("{" + k + "}").join(String(vars[k]));
      }
    }
  }
  return s;
};

AW.eventMatches = function (e, combo) {
  if (!e || !combo) return false;
  var parts = String(combo).split("+");
  var want = { ctrl: false, alt: false, shift: false, meta: false, code: "" };
  var i;
  var p;
  for (i = 0; i < parts.length; i++) {
    p = parts[i].replace(/^\s+|\s+$/g, "");
    if (!p) continue;
    if (/^ctrl$/i.test(p)) want.ctrl = true;
    else if (/^alt$/i.test(p)) want.alt = true;
    else if (/^shift$/i.test(p)) want.shift = true;
    else if (/^(cmd|meta)$/i.test(p)) want.meta = true;
    else if (p.length === 1) want.code = "Key" + p.toUpperCase();
    else want.code = p;
  }
  if (!want.code) return false;
  if (!!e.ctrlKey !== want.ctrl) return false;
  if (!!e.altKey !== want.alt) return false;
  if (!!e.shiftKey !== want.shift) return false;
  if (!!e.metaKey !== want.meta) return false;
  return e.code === want.code;
};

AW.isSaveEvent = function (e, s) {
  s = s || {};
  return AW.eventMatches(e, s.keySave || AW.DEFAULTS.keySave) || AW.eventMatches(e, s.keySave2 || AW.DEFAULTS.keySave2);
};

AW.comboFromEvent = function (e) {
  if (!e) return "";
  var bare = e.key === "Control" || e.key === "Alt" || e.key === "Shift" || e.key === "Meta";
  if (bare) return "";
  var keys = [];
  if (e.ctrlKey) keys.push("Ctrl");
  if (e.altKey) keys.push("Alt");
  if (e.shiftKey) keys.push("Shift");
  if (e.metaKey) keys.push("Cmd");
  var main = "";
  if (e.code && e.code.indexOf("Key") === 0 && e.code.length === 4) main = e.code.slice(3);
  else if (e.code && e.code.indexOf("Digit") === 0) main = e.code.slice(5);
  else if (e.key && e.key.length === 1) main = e.key.toUpperCase();
  else main = e.code || "";
  if (!main) return "";
  keys.push(main);
  if (keys.length < 2) return "";
  return keys.join("+");
};

AW.STRINGS = {
  en: {
    secKeys: "Keys",
    secPath: "Where to save",
    secHow: "Behavior",
    secService: "Tools",
    keySave: "Save",
    keySave2: "Save, second key",
    keyPin: "Pin tab",
    keyOpen: "Open",
    keyCopy: "Copy",
    pathPh: "subfolder name",
    tplPh: "file name template",
    nameTags: "Name tags",
    blockAlt: "Do not open the Opera menu on Alt",
    highlight: "Highlight the picture under the cursor",
    png: "Save pictures as PNG",
    subfolder: "Put files in a subfolder",
    rename: "Rename files",
    copyFile: "Copy the file itself",
    intercept: "Take over a tab that is just a picture",
    toastMs: "How long the note stays",
    holdMs: "Hold to open the menu",
    tabSize: "Tab menu size",
    zoomHold: "Hold the wheel to zoom",
    hold2: "Second hold opens the tab menu",
    pierceAuto: "Look under overlays",
    pierceOff: "Do not look under overlays",
    repairHist: "Fix pictures that will not open",
    repairFmt: "Fix files that lost their type",
    shortcuts: "Open the browser key list",
    restore: "Open the pictures that were open",
    save: "Save settings",
    devLogs: "Save a debug log",
    importSet: "Load a settings file",
    exportSet: "Download a settings file",
    on: "ON",
    off: "OFF",
    recording: "Press the keys. Esc cancels.",
    saved: "Saved",
    logOk: "AWF-sm-logs.txt",
    logFail: "Could not write the log",
    tagOriginal: "original file name, no extension",
    tagExt: "extension, such as jpg or png",
    tagCounter: "a number that goes up: 1, 2, 3",
    tagN: "the same number, three digits: 001",
    tagDate: "date YYYY-MM-DD",
    tagTime: "local time HH-MM-SS",
    tagYmd: "compact date",
    tagStamp: "time in milliseconds",
    tagHost: "site name",
    tagRand: "four random letters",
    saveFail: "Not saved: {why}",
    savedFile: "Saved: {name}",
    savedFolderMiss: "Saved in Downloads. The browser skipped the folder.",
    savedLocal: "Saved: {name}",
    noMedia: "No picture under the cursor",
    noSelected: "Nothing selected",
    opened: "Opened in the viewer",
    openFail: "Could not open it",
    copied: "File copied",
    urlCopied: "Link copied",
    urlCopiedFail: "Link copied. The file itself did not copy.",
    copyFail: "Could not copy",
    pinned: "Tab pinned",
    unpinned: "Tab unpinned",
    wasd: "Menu keys are on",
    hotkeys: "Opening the key page",
    historyEmpty: "History is empty",
    histStart: "Start of history",
    histEnd: "End of history",
    reloaded: "Reloaded",
    duplicated: "Duplicated",
    wentBack: "Back",
    wentFwd: "Forward",
    presetSaved: "Preset {n} saved",
    presetEmpty: "Preset {n} is empty",
    presetFail: "Could not save the preset",
    presetLoaded: "Preset {n}",
    folderSet: "Folder: {v}",
    templateSaved: "Name template saved",
    pathModeSub: "Files go to the subfolder",
    pathModeRoot: "Files go to Downloads",
    renameOn: "Rename is on",
    renameOff: "Rename is off",
    pngOn: "Pictures save as PNG",
    pngOff: "Pictures keep their own type",
    pierceSaved: "This site will be looked under overlays",
    whyHttp: "the site did not give the file",
    whyFormat: "this is not a picture or a video",
    whyTiny: "the file is empty",
    whyBig: "the file is too large to pass along",
    whyUnknown: "it could not be written",
    whyCanvas: "the picture was not on screen",
    whyVideo: "the video file was not found",
    spinExit: "TAB SPIN · wheel changes tabs · click or the save key exits",
    qLab: "presets",
    wLab: "open",
    aLab: "copy",
    sLab: "save",
    dLab: "keys",
    s1: "folder: {v}",
    s2: "subfolder name",
    s3: "rename files: {v}",
    s4: "name template",
    s5: "save as PNG: {v}",
    enterEsc: "Enter saves · Esc cancels",
    subHint: "Name of the subfolder inside Downloads",
    empty: "empty",
    downloads: "Downloads",
    originalName: "original name",
    vSave: "save",
    vSaveAs: "save as",
    vPrev: "← prev",
    vNext: "next →",
    vFail: "Not saved: {why}",
    vNoData: "This entry has no file"
  },
  ru: {
    secKeys: "Клавиши",
    secPath: "Куда класть файл",
    secHow: "Поведение",
    secService: "Инструменты",
    keySave: "Сохранить",
    keySave2: "Сохранить, вторая клавиша",
    keyPin: "Закрепить вкладку",
    keyOpen: "Открыть",
    keyCopy: "Копировать",
    pathPh: "имя подпапки",
    tplPh: "шаблон имени файла",
    nameTags: "Метки имени",
    blockAlt: "Не открывать меню Opera на Alt",
    highlight: "Подсвечивать картинку под курсором",
    png: "Класть картинки в PNG",
    subfolder: "Класть в подпапку",
    rename: "Переименовывать файлы",
    copyFile: "Копировать сам файл",
    intercept: "Перехватывать вкладку-картинку",
    toastMs: "Сколько висит заметка",
    holdMs: "Удержание открывает меню",
    tabSize: "Размер меню вкладок",
    zoomHold: "Удержание колеса для зума",
    hold2: "Второе удержание открывает меню вкладок",
    pierceAuto: "Смотреть под накладками",
    pierceOff: "Не смотреть под накладками",
    repairHist: "Починить картинки, которые не открываются",
    repairFmt: "Починить файлы без типа",
    shortcuts: "Открыть список клавиш браузера",
    restore: "Открыть картинки, которые были открыты",
    save: "Сохранить настройки",
    devLogs: "Сохранить журнал отладки",
    importSet: "Загрузить файл настроек",
    exportSet: "Скачать файл настроек",
    on: "ВКЛ",
    off: "ВЫКЛ",
    recording: "Нажмите клавиши. Esc отменяет.",
    saved: "Записано",
    logOk: "AWF-sm-logs.txt",
    logFail: "Лог не записался",
    tagOriginal: "исходное имя, без расширения",
    tagExt: "расширение, например jpg или png",
    tagCounter: "номер по порядку: 1, 2, 3",
    tagN: "тот же номер, три цифры: 001",
    tagDate: "дата ГГГГ-ММ-ДД",
    tagTime: "местное время ЧЧ-ММ-СС",
    tagYmd: "короткая дата",
    tagStamp: "время в миллисекундах",
    tagHost: "имя сайта",
    tagRand: "четыре случайные буквы",
    saveFail: "Не сохранилось: {why}",
    savedFile: "Сохранено: {name}",
    savedFolderMiss: "Сохранено в Загрузки. Браузер пропустил папку.",
    savedLocal: "Сохранено: {name}",
    noMedia: "Под курсором нет картинки",
    noSelected: "Ничего не выбрано",
    opened: "Открыто в просмотре",
    openFail: "Не открылось",
    copied: "Файл скопирован",
    urlCopied: "Ссылка скопирована",
    urlCopiedFail: "Ссылка скопирована. Сам файл не скопировался.",
    copyFail: "Не скопировалось",
    pinned: "Вкладка закреплена",
    unpinned: "Вкладка откреплена",
    wasd: "Клавиши меню включены",
    hotkeys: "Открываю страницу клавиш",
    historyEmpty: "История пустая",
    histStart: "Начало истории",
    histEnd: "Конец истории",
    reloaded: "Обновлено",
    duplicated: "Вкладка скопирована",
    wentBack: "Назад",
    wentFwd: "Вперёд",
    presetSaved: "Набор {n} записан",
    presetEmpty: "Набор {n} пустой",
    presetFail: "Набор не записался",
    presetLoaded: "Набор {n}",
    folderSet: "Папка: {v}",
    templateSaved: "Шаблон имени записан",
    pathModeSub: "Файлы идут в подпапку",
    pathModeRoot: "Файлы идут в Загрузки",
    renameOn: "Переименование включено",
    renameOff: "Переименование выключено",
    pngOn: "Картинки кладутся в PNG",
    pngOff: "Картинки остаются в своём типе",
    pierceSaved: "На этом сайте будем смотреть под накладками",
    whyHttp: "сайт не отдал файл",
    whyFormat: "это не картинка и не видео",
    whyTiny: "файл пустой",
    whyBig: "файл слишком большой, чтобы передать",
    whyUnknown: "не удалось записать",
    whyCanvas: "картинки на экране не было",
    whyVideo: "файл видео не нашёлся",
    spinExit: "КОЛЕСО ВКЛАДОК · колесо листает · клик или клавиша сохранения закрывает",
    qLab: "наборы",
    wLab: "открыть",
    aLab: "копия",
    sLab: "сейв",
    dLab: "клавиши",
    s1: "папка: {v}",
    s2: "имя подпапки",
    s3: "переименовывать: {v}",
    s4: "шаблон имени",
    s5: "класть в PNG: {v}",
    enterEsc: "Enter записывает · Esc отменяет",
    subHint: "Имя подпапки внутри Загрузок",
    empty: "пусто",
    downloads: "Загрузки",
    originalName: "исходное имя",
    vSave: "сохранить",
    vSaveAs: "сохранить как",
    vPrev: "← назад",
    vNext: "вперёд →",
    vFail: "Не сохранилось: {why}",
    vNoData: "У этой записи нет файла"
  }
};
