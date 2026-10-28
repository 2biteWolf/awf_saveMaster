/* AWF_saveMaster content — hover, radial menu, image-doc, toasts */
(function () {
  "use strict";
  window.__AW_SM_GEN = (window.__AW_SM_GEN || 0) + 1;
  var myGen = window.__AW_SM_GEN;
  function mine() { return myGen === window.__AW_SM_GEN; }
  try {
    var oldRoot = document.getElementById("aw-sm-root");
    if (oldRoot) oldRoot.remove();
    var oldHl = document.getElementById("aw-sm-hl");
    if (oldHl) oldHl.remove();
    var oldZ = document.getElementById("aw-sm-zoom");
    if (oldZ) oldZ.remove();
  } catch (e0) {}

  var settings = AW.merge(null);
  var currentEl = null;
  var currentUrl = null;
  var currentOpaque = null;
  var overlay = null;
  var toastEl = null;
  var menuRoot = null;
  var menuOpen = false;
  var subOpen = false;
  var qOpen = false;
  var tildeOn = false;
  var inputOpen = false;
  var inputMode = null;
  var holdTimer = null;
  var holdArmed = false;
  var holdCode = null;
  var holdOpened = false;
  var holdAt = 0;
  var holdId = 0;
  var holdAltTimer = null;
  var altOpen = false;
  var zoomRoot = null;
  var zoomOn = false;
  var zoomSrcEl = null;
  var zoomLock = { x: 0, y: 0 };
  var zoomPct = 100;
  var zoomFit = 4;
  var zoomInspect = 100;
  var zoomPan = { x: 0, y: 0 };
  var zoomDrag = null;
  var zoomNat = { w: 1, h: 1 };
  var midArmed = false;
  var midTimer = null;
  var midId = 0;
  var imageDoc = false;
  var imgEl = null;
  var currentMode = "none";
  var lastMouse = { x: innerWidth / 2, y: innerHeight / 2 };
  var presetSlots = [];
  (function () {
    var n = AW.PRESET_COUNT || 10;
    var i;
    for (i = 0; i < n; i++) presetSlots.push(null);
  })();

  function alive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  }

  function sendMsg(msg, cb) {
    if (!alive()) {
      if (cb) cb(null, "extension unloaded");
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, function (res) {
        var err = "";
        try {
          if (chrome.runtime.lastError) err = chrome.runtime.lastError.message || "message failed";
        } catch (e) {}
        if (cb) cb(res, err);
      });
    } catch (e) {
      if (cb) cb(null, (e && e.message) || "message failed");
    }
  }

  function loadSettings(cb) {
    var once = false;
    function done() {
      if (once) return;
      once = true;
      if (cb) cb();
    }
    try {
      sendMsg({ type: "getSettings" }, function (s) {
        if (chrome.runtime.lastError) s = null;
        settings = AW.merge(s);
        done();
        if (imageDoc && imgEl) {
          currentMode = settings.fitMode || "none";
          if (!AW.MODES || AW.MODES.indexOf(currentMode) === -1) currentMode = "none";
          applyMode(currentMode, true);
        }
      });
    } catch (e) {
      done();
      return;
    }
    setTimeout(done, 400);
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    try {
      if (!mine() || !alive()) return;
      if (area !== "sync" && area !== "local") return;
      var k;
      for (k in changes) {
        if (k === "awTabSpin") continue;
        if (changes[k] && "newValue" in changes[k]) settings[k] = changes[k].newValue;
      }
      if (changes.fitMode && imageDoc && imgEl) {
        currentMode = settings.fitMode || "none";
        if (!AW.MODES || AW.MODES.indexOf(currentMode) === -1) currentMode = "none";
        applyMode(currentMode, true);
      }
    } catch (e) {}
  });

  function toast(text, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "aw-sm-toast";
      (document.documentElement || document.body).appendChild(toastEl);
    }
    var pos = settings.toastPos || "bottom-right";
    toastEl.className = "aw-sm-toast " + pos;
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () {
      toastEl.style.opacity = "0";
    }, ms || settings.toastMs || 5000);
  }

  function tr(key, vars) {
    if (window.AW && AW.T) return AW.T(AW.uiLang(settings), key, vars);
    return key;
  }

  function shortUrl(u) {
    u = String(u || "");
    if (!u) return "";
    if (u.indexOf("data:") === 0) return u.slice(0, 24) + " len=" + u.length;
    if (u.length > 180) return u.slice(0, 180);
    return u;
  }

  function whyText(code) {
    var c = String(code || "");
    if (!c) return tr("whyUnknown");
    if (c === "canvas" || c.indexOf("frame") === 0 || c.indexOf("canvas") !== -1) return tr("whyCanvas");
    if (c.indexOf("video-no") === 0 || c.indexOf("video-blob") === 0 || c === "nosrc") return tr("whyVideo");
    if (c === "http" || c.indexOf("http ") === 0 || c === "pull" || c === "nourl" || c === "download" || c === "video-http") return tr("whyHttp");
    if (c === "format" || c === "notmedia" || c === "text" || c.indexOf("sniff") === 0) return tr("whyFormat");
    if (c === "tiny") return tr("whyTiny");
    if (c === "huge" || c.indexOf("message") !== -1 || c.indexOf("too large") !== -1) return tr("whyBig");
    if (c.length > 90) return tr("whyUnknown");
    return tr("whyUnknown");
  }

  var lastHits = [];

  function hit(label, url, verdict, why) {
    var u = String(url || "");
    var show = "(empty)";
    if (u.indexOf("data:") === 0) show = "data len=" + u.length;
    else if (u.indexOf("blob:") === 0) show = u.slice(0, 64);
    else if (u) show = u.length > 160 ? u.slice(0, 160) + "…" : u;
    lastHits.push(label + " | " + verdict + " | " + show + (why ? " | " + why : ""));
    if (lastHits.length > 24) lastHits = lastHits.slice(-24);
  }

  function pageLog(action, code, why, extra) {
    extra = extra || {};
    var page = "";
    var frame = "top";
    try { page = String(location.href || "").slice(0, 300); } catch (e) {}
    try { if (window !== window.top) frame = "inner"; } catch (e2) { frame = "inner"; }
    var steps = extra.steps ? extra.steps.slice() : [];
    if (!steps.length || String(steps[0]).indexOf("frame=") !== 0) steps.unshift("frame=" + frame);
    sendMsg({
      type: "devLog",
      action: action || "save failed",
      code: code || "",
      where: extra.where || "content",
      why: why || "",
      page: extra.page || page,
      tag: extra.tag || "",
      url: extra.url || "",
      file: extra.file || "",
      key: extra.key || "",
      written: extra.written === true,
      hits: extra.hits || [],
      steps: steps,
      detail: extra.detail || ""
    }, function () {});
  }

  var lastActAt = { save: 0, open: 0, copy: 0 };
  var saveBusy = false;
  function actOnce(kind) {
    var now = Date.now();
    if (now - (lastActAt[kind] || 0) < 450) return false;
    lastActAt[kind] = now;
    return true;
  }

  function injectCss() {
    var s = document.getElementById("aw-sm-css");
    if (!s) {
      s = document.createElement("style");
      s.id = "aw-sm-css";
      (document.documentElement || document.head).appendChild(s);
    }
    s.textContent =
      ".aw-sm-toast{position:fixed;z-index:2147483646;background:#222034;color:#99e550;border:1px solid #99e550;" +
      "font:14px/1.3 VT323,Consolas,monospace;padding:8px 12px;max-width:min(92vw,360px);pointer-events:none;" +
      "opacity:0;transition:opacity .15s;image-rendering:pixelated;box-shadow:0 0 0 1px #222034,0 0 0 2px #99e550}" +
      ".aw-sm-toast.bottom-right{right:14px;bottom:14px}.aw-sm-toast.bottom-left{left:14px;bottom:14px}" +
      ".aw-sm-toast.top-right{right:14px;top:14px}.aw-sm-toast.top-left{left:14px;top:14px}" +
      "#aw-sm-hl{position:fixed;pointer-events:none!important;z-index:2147483645;border:2px solid #99e550;box-shadow:0 0 8px #99e550;display:none}" +
      "#aw-sm-root{position:fixed;inset:0;z-index:2147483647;pointer-events:auto;background:transparent}" +
      "#aw-sm-root *{box-sizing:border-box;image-rendering:pixelated;font-family:VT323,Consolas,monospace}" +
      ".aw-cluster{position:absolute;pointer-events:auto;padding:14px}" +
      ".aw-cross{display:grid;grid-template-columns:54px 54px 54px;grid-template-rows:44px 44px;gap:4px}" +
      ".aw-cross .c-q{grid-column:1;grid-row:1}.aw-cross .c-w{grid-column:2;grid-row:1}" +
      ".aw-cross .c-a{grid-column:1;grid-row:2}.aw-cross .c-s{grid-column:2;grid-row:2}.aw-cross .c-d{grid-column:3;grid-row:2}" +
      ".aw-cell{background:#222034;border:1px solid #99e550;color:#99e550;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-size:16px;font-weight:700;cursor:pointer;user-select:none;letter-spacing:1px}" +
      ".aw-cell .d{font-size:11px;font-weight:400;letter-spacing:0;opacity:.85;margin-top:2px}" +
      ".aw-cell:hover,.aw-cell.active{background:#2e2c42}" +
      ".aw-sub{pointer-events:auto;background:#222034;border:1px solid #99e550;min-width:280px;max-height:70vh;overflow:auto;padding:4px;margin-top:6px}" +
      ".aw-row{display:flex;align-items:stretch;margin:2px 0;cursor:pointer;color:#99e550}" +
      ".aw-row:hover{background:#2e2c42}" +
      ".aw-num{width:28px;border:1px solid #99e550;display:flex;align-items:center;justify-content:center;margin-right:4px;flex-shrink:0}" +
      ".aw-lab{flex:1;border:1px solid #99e550;padding:4px 8px;font-size:13px;min-height:22px;line-height:1.2;white-space:normal}" +
      ".aw-inputbox{pointer-events:auto;background:#222034;border:1px solid #99e550;padding:8px;min-width:260px;margin-top:6px}" +
      ".aw-inputbox input{width:100%;background:#2e2c42;color:#99e550;border:1px solid #99e550;padding:6px 8px;font:16px VT323,monospace;outline:none}" +
      ".aw-legend{color:#6a8a4a;font-size:12px;margin-top:6px;line-height:1.35}" +
      ".aw-tag{display:flex;gap:8px;font-size:12px;line-height:1.3;margin:2px 0}" +
      ".aw-tag code{color:#99e550;min-width:108px;font-family:inherit}" +
      ".aw-tag span{color:#6a8a4a}" +
      ".aw-tilde{width:22px;height:22px;border:1px solid #99e550;background:#222034;color:#99e550;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:2px 0 6px;font-size:14px;user-select:none}" +
      ".aw-tilde.on{background:#99e550;color:#222034}" +
      ".aw-alt{display:grid;grid-template-columns:1fr 1fr;gap:4px;width:calc(208px * var(--aw-alt-scale,1))}" +
      ".aw-alt .aw-cell{min-height:calc(28px * var(--aw-alt-scale,1));font-size:calc(12px * var(--aw-alt-scale,1));padding:calc(4px * var(--aw-alt-scale,1)) calc(6px * var(--aw-alt-scale,1))}" +
      ".aw-alt .aw-cell .d{font-size:calc(9px * var(--aw-alt-scale,1));margin-top:1px}" +
      ".aw-alt .span2{grid-column:1/-1}" +
      "#aw-sm-zoom{position:fixed;inset:0;z-index:2147483646;background:rgba(13,11,18,.88);pointer-events:auto}" +
      "#aw-sm-zoom .aw-zoom-media{position:fixed;display:block;margin:0;padding:0;border:0;max-width:none;max-height:none;object-fit:contain;background:#0d0b12;cursor:grab;" +
      "transition:left .18s ease,top .18s ease,width .18s ease,height .18s ease}" +
      "#aw-sm-zoom .aw-zoom-media.dragging{cursor:grabbing;transition:none}" +
      "#aw-sm-zoom .aw-zoom-ui{position:fixed;right:8px;top:50%;transform:translateY(-50%);z-index:2;display:flex;flex-direction:row;align-items:center;gap:6px;" +
      "padding:10px 8px;background:#222034;border:1px solid #99e550;pointer-events:auto}" +
      "#aw-sm-zoom .aw-zoom-ui input[type=range]{writing-mode:vertical-lr;direction:rtl;width:22px;height:min(42vh,240px);accent-color:#99e550;background:transparent}" +
      "#aw-sm-zoom .aw-zoom-pct{color:#99e550;font:13px VT323,Consolas,monospace;min-width:2.6em;text-align:center}" +
      "#aw-sm-zoom .aw-zoom-ticks{display:flex;flex-direction:column;justify-content:space-between;height:min(42vh,240px);color:#6a8a4a;font:10px VT323,monospace;line-height:1}";
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "aw-sm-hl";
    (document.documentElement || document.body).appendChild(overlay);
    return overlay;
  }

  function hideHl() {
    if (overlay) overlay.style.display = "none";
  }

  function showHl(el) {
    if (!settings.highlightEnabled || !el) return hideHl();
    var r = absRect(el);
    if (!r || r.width < 4 || r.height < 4) return hideHl();
    var o = ensureOverlay();
    o.style.position = "fixed";
    o.style.pointerEvents = "none";
    o.style.zIndex = "2147483645";
    o.style.border = "2px solid #99e550";
    o.style.boxShadow = "0 0 8px #99e550";
    o.style.display = "block";
    o.style.left = r.left - 2 + "px";
    o.style.top = r.top - 2 + "px";
    o.style.width = r.width + 4 + "px";
    o.style.height = r.height + 4 + "px";
  }

  function isInteractive(el) {
    if (!el || el.nodeType !== 1) return false;
    if (isAwUi(el)) return false;
    var tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "OPTION" || tag === "LABEL") return true;
    if (el.isContentEditable) return true;
    try {
      if (el.closest && el.closest("input, textarea, select, button, label, option, [contenteditable='true']")) return true;
    } catch (e) {}
    return false;
  }

  function isMediaEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.id && String(el.id).indexOf("aw-sm") === 0) return false;
    var tag = el.tagName;
    if (tag === "IMG") {
      var w = 0;
      var h = 0;
      try { w = el.naturalWidth || 0; h = el.naturalHeight || 0; } catch (e) {}
      if (w > 2 && h > 2) return true;
      if (el.complete && w === 0) return false;
      if (el.hasAttribute("src") || el.hasAttribute("srcset")) {
        try {
          var box = el.getBoundingClientRect();
          return box.width > 16 && box.height > 16;
        } catch (e2) { return true; }
      }
      return false;
    }
    if (tag === "VIDEO") {
      try { if ((el.videoWidth || 0) > 2) return true; } catch (e) {}
      return !!(el.hasAttribute("src") || (el.querySelector && el.querySelector("source")));
    }
    if (tag === "SOURCE" && el.src && AW.isMediaUrl(el.src)) return true;
    if (tag === "A" && el.href && AW.isMediaUrl(el.href)) return true;
    if (tag === "CANVAS" && el.width && el.height) return true;
    return false;
  }

  function lightUrl(el) {
    if (!el) return "";
    if (el.id === "resultImgEl") return "";
    try {
      if (el.tagName === "A") {
        var href = el.getAttribute("href") || "";
        if (!href || href.length > 2048 || href.indexOf("data:") === 0) return "";
        return /^https?:/i.test(href) ? el.href : "";
      }
      if (el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "SOURCE") {
        var node = el.getAttributeNode && el.getAttributeNode("src");
        var attr = node && node.value ? node.value : "";
        if (!attr || attr.indexOf("data:") === 0 || attr.indexOf("blob:") === 0 || attr.length > 2048) {
          var poster = el.getAttribute && el.getAttribute("poster");
          if (poster && poster.indexOf("data:") !== 0 && poster.length < 2048 && /^https?:/i.test(poster)) return poster;
          return "";
        }
        var cur = "";
        try { cur = el.currentSrc || ""; } catch (e2) { cur = ""; }
        if (cur && cur.indexOf("data:") !== 0 && cur.indexOf("blob:") !== 0 && cur.length < 2048) return cur;
        return attr;
      }
    } catch (e) {}
    return "";
  }

  function absHttp(raw) {
    if (!raw || raw.indexOf("data:") === 0 || raw.length > 2048) return "";
    try { return new URL(raw, location.href).href; } catch (e) { return ""; }
  }

  function largestSrcset(el) {
    var raw = "";
    try { raw = el.getAttribute("srcset") || ""; } catch (e) {}
    if (!raw || raw.length > 4000) return "";
    var parts = raw.split(",");
    var best = "";
    var bestW = -1;
    var i;
    for (i = 0; i < parts.length; i++) {
      var bits = parts[i].replace(/^\s+|\s+$/g, "").split(/\s+/);
      var url = bits[0] || "";
      var w = 0;
      if (bits[1] && /w$/i.test(bits[1])) w = parseInt(bits[1], 10) || 0;
      if (url && url.indexOf("data:") !== 0 && w >= bestW) {
        bestW = w;
        best = url;
      }
    }
    return absHttp(best);
  }

  function lazyUrl(el) {
    if (!el || !el.getAttribute) return "";
    var names = ["data-src", "data-original", "data-lazy-src", "data-url", "data-full-url", "data-href"];
    var i;
    for (i = 0; i < names.length; i++) {
      var v = el.getAttribute(names[i]) || "";
      if (!v || v.length > 2048 || v.indexOf("data:") === 0) continue;
      var abs = absHttp(v);
      if (abs && /^https?:/i.test(abs)) return abs;
    }
    return "";
  }

  function bgUrl(el) {
    var node = el;
    var hop = 0;
    while (node && hop < 3) {
      var bg = "";
      try { bg = getComputedStyle(node).backgroundImage || ""; } catch (e) {}
      var m = /url\((['"]?)(.*?)\1\)/.exec(bg || "");
      if (m && m[2] && m[2] !== "none" && m[2].indexOf("data:") !== 0) {
        var abs = absHttp(m[2]);
        if (abs) return abs;
      }
      node = node.parentElement;
      hop += 1;
    }
    return "";
  }

  function pageHost() {
    try { return String(location.hostname || ""); } catch (e) { return ""; }
  }

  function fnOrigFile() {
    if (pageHost().indexOf("rule34") === -1) return "";
    var links = [];
    try { links = document.querySelectorAll(".link-list a"); } catch (e) { links = []; }
    var i;
    for (i = 0; i < links.length; i++) {
      var text = String(links[i].textContent || "").toLowerCase();
      var href = links[i].href || "";
      if (text.indexOf("original") !== -1 && /^https?:/i.test(href)) return href;
    }
    return "";
  }

  function stillFile(url) {
    return /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(String(url || ""));
  }

  function videoRank(url) {
    url = String(url || "");
    if (!/^https?:/i.test(url) || stillFile(url)) return 0;
    if (/\.mp4(\?|#|$)/i.test(url)) return 50;
    if (/\.m4v(\?|#|$)/i.test(url)) return 40;
    if (/\.webm(\?|#|$)/i.test(url)) return 30;
    if (/\.mov(\?|#|$)/i.test(url)) return 20;
    if (/\.avi(\?|#|$)/i.test(url)) return 15;
    if (/\.m3u8(\?|#|$)/i.test(url)) return 10;
    return 1;
  }

  function videoElFrom(el) {
    if (el && el.tagName === "VIDEO") return el;
    try {
      if (el && el.closest) {
        var up = el.closest("video");
        if (up) return up;
        var box = el.closest("#gelcomVideoPlayer");
        if (box) {
          if (box.tagName === "VIDEO") return box;
          var inner = box.querySelector && box.querySelector("video");
          if (inner) return inner;
        }
      }
    } catch (e) {}
    if (el) return null;
    var list = [];
    try { list = document.getElementsByTagName("video"); } catch (e2) { list = []; }
    var i;
    var best = null;
    var bestArea = 0;
    for (i = 0; i < list.length; i++) {
      var r;
      try { r = list[i].getBoundingClientRect(); } catch (e3) { continue; }
      if (r.width < 64 || r.height < 64) continue;
      if (lastMouse.x < r.left || lastMouse.x > r.right || lastMouse.y < r.top || lastMouse.y > r.bottom) continue;
      var area = r.width * r.height;
      if (area > bestArea) { best = list[i]; bestArea = area; }
    }
    return best;
  }

  function pickVideoUrl(el, doLog) {
    function add(url, from) {
      url = String(url || "").replace(/^\s+|\s+$/g, "");
      if (!url) {
        if (doLog) hit(from, "", "reject", "empty");
        return "";
      }
      if (url.indexOf("blob:") === 0) {
        if (doLog) hit(from, url, "reject", "blob is not a file address");
        return "";
      }
      if (url.indexOf("data:") === 0) {
        if (doLog) hit(from, url, "reject", "data url skipped");
        return "";
      }
      var abs = /^https?:/i.test(url) ? url.split("#")[0] : absHttp(url);
      if (!abs) {
        if (doLog) hit(from, url, "reject", "not an http address");
        return "";
      }
      abs = abs.split("#")[0];
      if (stillFile(abs)) {
        if (doLog) hit(from, abs, "reject", "still image, not the video file");
        return "";
      }
      var rank = videoRank(abs);
      if (!rank) {
        if (doLog) hit(from, abs, "reject", "not a video file");
        return "";
      }
      if (doLog) hit(from, abs, "keep", "rank=" + rank);
      return abs;
    }
    var node = videoElFrom(el);
    if (!node) {
      if (doLog) hit("video element", "", "reject", "no video under the pointer");
      return "";
    }
    if (doLog) {
      var shown = "";
      try { shown = node.currentSrc || ""; } catch (eShown) {}
      hit("video element", shown || node.id || "video", "keep", "id=" + (node.id || "") + " w=" + (node.videoWidth || 0) + " h=" + (node.videoHeight || 0) + " ready=" + (node.readyState || 0));
    }
    var found = [];
    function keep(url, from) {
      var abs = add(url, from);
      if (!abs) return;
      var n;
      for (n = 0; n < found.length; n++) if (found[n].url === abs) return;
      found.push({ url: abs, rank: videoRank(abs), from: from });
    }
    try { keep(node.currentSrc || "", "currentSrc"); } catch (e) {}
    try { keep(node.getAttribute("src") || "", "attr-src"); } catch (e2) {}
    var sources = [];
    try { sources = node.querySelectorAll("source"); } catch (e3) { sources = []; }
    var i;
    for (i = 0; i < sources.length; i++) {
      keep(sources[i].getAttribute("src") || sources[i].src || "", "source[" + i + "] " + (sources[i].type || ""));
    }
    var webm = "";
    for (i = 0; i < found.length; i++) {
      if (found[i].rank === 30) webm = found[i].url;
    }
    if (webm && doLog) {
      var sib = webm.split("?")[0].replace(/\.webm$/i, ".mp4");
      if (webm.indexOf("?") >= 0) sib += webm.slice(webm.indexOf("?"));
      var haveMp4 = false;
      for (i = 0; i < found.length; i++) if (found[i].rank >= 40) haveMp4 = true;
      if (!haveMp4 && sib !== webm) hit("mp4-sibling", sib, "reject", "not listed in the player, webm on the page is used instead");
    }
    if (!found.length) {
      var entries = [];
      try { entries = performance.getEntriesByType("resource") || []; } catch (e4) { entries = []; }
      var seenRes = 0;
      for (i = entries.length - 1; i >= 0 && seenRes < 8; i--) {
        var name = entries[i].name || "";
        if (!/\.(mp4|webm|m3u8|mov|m4v|avi)(\?|#|$)/i.test(name)) continue;
        seenRes += 1;
        keep(name, "resource-timing");
      }
      if (doLog && !seenRes) hit("resource-timing", "", "reject", "no mp4/webm/mov request recorded in this frame");
      var a = null;
      try { a = node.closest ? node.closest("a[href]") : null; } catch (e5) {}
      if (a) keep(a.href, "nearest-link");
      else if (doLog) hit("nearest-link", "", "reject", "video is not inside a link");
      if (pageHost().indexOf("rule34") !== -1) {
        var links = [];
        try { links = document.querySelectorAll(".link-list a"); } catch (e6) { links = []; }
        var seenLink = 0;
        for (i = 0; i < links.length; i++) {
          var href = links[i].href || "";
          if (!/\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(href)) continue;
          seenLink += 1;
          keep(href, "page-link " + String(links[i].textContent || "").replace(/\s+/g, " ").slice(0, 40));
        }
        if (doLog && !seenLink) hit("page-link", "", "reject", "no video link next to the post");
      }
    }
    var best = "";
    var bestRank = 0;
    var bestFrom = "";
    for (i = 0; i < found.length; i++) {
      if (found[i].rank > bestRank) {
        bestRank = found[i].rank;
        best = found[i].url;
        bestFrom = found[i].from;
      }
    }
    if (doLog) {
      if (best) hit("chosen", best, "KEEP", bestFrom + " rank=" + bestRank);
      else hit("chosen", "", "reject", "no http video file");
    }
    return best;
  }

  function fnVideoFile(el) {
    return pickVideoUrl(el, false);
  }

  function blobVideoUrl(el) {
    return pickVideoUrl(el, false);
  }

  function largerUnder(x, y, el) {
    if (!el || !el.getBoundingClientRect) return el;
    var r;
    try { r = el.getBoundingClientRect(); } catch (e) { return el; }
    if (r.width * r.height > 180 * 180) return el;
    var out = { el: null, area: 0, opaque: [] };
    walkFrameMedia(document, 0, 0, x, y, out);
    if (out.el && out.area > Math.max(r.width * r.height * 2, 200 * 200)) return out.el;
    return el;
  }

  function isDirectVideo(url) {
    return /^https?:/i.test(url || "") && /\.(mp4|webm|m3u8|mov|m4v)(\?|$)/i.test(url);
  }

  function posterHit(el) {
    var api = window.AW_POSTER || window.AW_RG;
    if (!api || !api.resolve) return null;
    try { return api.resolve(el); } catch (e) { return null; }
  }

  function onVideoEl(el) {
    if (!el) return false;
    try {
      return el.tagName === "VIDEO" || el.id === "gelcomVideoPlayer" || !!(el.closest && el.closest("video, #gelcomVideoPlayer"));
    } catch (e) {
      return el.tagName === "VIDEO";
    }
  }

  function bestUrl(el) {
    var poster = posterHit(el);
    if (poster && poster.url && !onVideoEl(el)) return poster.url;
    if (!el) return "";
    if (el.id === "resultImgEl") return "";
    if (onVideoEl(el)) {
      var early = fnVideoFile(el);
      if (early) return early;
    }
    var full = fnOrigFile();
    if (full && onVideoEl(el) && !stillFile(full)) return full;
    if (full && !onVideoEl(el) && (el.id === "image" || el.tagName === "IMG" || (el.closest && el.closest("#image, .link-list")))) return full;
    var fromSet = largestSrcset(el);
    var light = lightUrl(el);
    if (fromSet && (!light || fromSet.length > light.length)) return fromSet;
    if (light) return light;
    var lazy = lazyUrl(el);
    if (lazy) return lazy;
    if (el.tagName === "VIDEO") {
      var source = el.querySelector && el.querySelector("source");
      var su = source ? absHttp(source.getAttribute("src") || source.src || "") : "";
      if (su) return su;
      var poster = absHttp(el.getAttribute("poster") || "");
      if (poster) return poster;
    }
    return bgUrl(el);
  }

  function hlTarget(el) {
    try {
      var hit = posterHit(el);
      if (hit && hit.root) return hit.root;
    } catch (e) {}
    return el;
  }

  function absRect(el) {
    var r;
    try { r = el.getBoundingClientRect(); } catch (e) { return null; }
    if (!el.ownerDocument || el.ownerDocument === document) {
      return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    }
    var x = r.left;
    var y = r.top;
    var w = r.width;
    var h = r.height;
    try {
      var win = el.ownerDocument.defaultView;
      var f = win && win.frameElement;
      var hop = 0;
      while (f && hop < 8) {
        var fr = f.getBoundingClientRect();
        x += fr.left;
        y += fr.top;
        try {
          win = f.ownerDocument.defaultView;
          f = win && win.frameElement;
        } catch (e2) { break; }
        hop += 1;
      }
    } catch (e) {}
    return { left: x, top: y, width: w, height: h, right: x + w, bottom: y + h };
  }

  function isAwUi(el) {
    if (!el) return false;
    if (el.id && String(el.id).indexOf("aw-sm") === 0) return true;
    return !!(el.closest && (el.closest("#aw-sm-root") || el.closest("#aw-sm-zoom") || el.closest("#aw-sm-hl")));
  }

  function pointInEl(el, x, y) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function queryMedia(root) {
    if (!root || !root.querySelector) return null;
    var list = root.querySelectorAll("img, video, canvas");
    var i;
    for (i = 0; i < list.length; i++) {
      if (isAwUi(list[i])) continue;
      if (isMediaEl(list[i])) return list[i];
    }
    return null;
  }

  var lastOpaque = null;

  function walkFrameMedia(doc, ox, oy, x, y, out) {
    if (!doc || !out) return;
    var i;
    var el;
    var r;
    var list;
    var frames;
    try { list = doc.querySelectorAll("img, video, canvas"); } catch (e) { list = []; }
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (isAwUi(el) || !isMediaEl(el)) continue;
      try { r = el.getBoundingClientRect(); } catch (e2) { continue; }
      var L = r.left + ox;
      var T = r.top + oy;
      if (x >= L && x <= L + r.width && y >= T && y <= T + r.height) {
        var area = r.width * r.height;
        if (area > out.area) {
          out.el = el;
          out.area = area;
        }
      }
    }
    try { el = doc.getElementById("resultImgEl"); } catch (e3) { el = null; }
    if (el && isMediaEl(el)) {
      try { r = el.getBoundingClientRect(); } catch (e4) { r = null; }
      if (r) {
        var L2 = r.left + ox;
        var T2 = r.top + oy;
        if (x >= L2 && x <= L2 + r.width && y >= T2 && y <= T2 + r.height) {
          var a2 = r.width * r.height;
          if (a2 >= out.area) {
            out.el = el;
            out.area = a2;
          }
        }
      }
    }
    try { frames = doc.querySelectorAll("iframe"); } catch (e5) { frames = []; }
    for (i = 0; i < frames.length; i++) {
      var fr = frames[i];
      var br;
      try { br = fr.getBoundingClientRect(); } catch (e6) { continue; }
      var fox = ox + br.left;
      var foy = oy + br.top;
      if (x < fox - 2 || x > fox + br.width + 2 || y < foy - 2 || y > foy + br.height + 2) continue;
      var innerDoc = null;
      try { innerDoc = fr.contentDocument; } catch (e7) { innerDoc = null; }
      if (innerDoc) walkFrameMedia(innerDoc, fox, foy, x, y, out);
      else out.opaque.push(fr);
    }
  }

  function pickFromPoint(x, y) {
    lastOpaque = null;
    var topEl = null;
    try { topEl = document.elementFromPoint(x, y); } catch (e) {}
    if (isInteractive(topEl)) return null;
    var stack;
    var i;
    var el;
    var inner;
    try { stack = document.elementsFromPoint(x, y); } catch (e) { stack = []; }
    for (i = 0; i < stack.length; i++) {
      el = stack[i];
      if (!el || el.nodeType !== 1) continue;
      if (isAwUi(el)) continue;
      if (isInteractive(el)) return null;
      if (el.shadowRoot) {
        var sh = null;
        try { sh = el.shadowRoot.elementFromPoint(x, y); } catch (eSh) {}
        if (sh && isMediaEl(sh)) return sh;
      }
      if (el.tagName === "IFRAME") continue;
      if (isMediaEl(el)) return el;
      inner = queryMedia(el);
      if (inner && pointInEl(inner, x, y)) return inner;
    }
    var out = { el: null, area: 0, opaque: [] };
    walkFrameMedia(document, 0, 0, x, y, out);
    if (out.el) return out.el;
    if (out.opaque.length) lastOpaque = out.opaque[0];
    return null;
  }

  var saveMiss = {};

  function missKey(x, y) {
    return Math.round(x / 64) + ":" + Math.round(y / 64);
  }

  function pierceHostOn() {
    var host = "";
    try { host = location.hostname || ""; } catch (e) {}
    return !!(host && settings.pierceHosts && settings.pierceHosts[host]);
  }

  function rememberPierceHost() {
    var host = "";
    try { host = location.hostname || ""; } catch (e) {}
    if (!host) return;
    var map = settings.pierceHosts || {};
    if (map[host]) return;
    map[host] = true;
    settings.pierceHosts = map;
    try { chrome.storage.local.set({ pierceHosts: map }); } catch (e2) {}
    toast(tr("pierceSaved"));
  }

  function pierceAt(x, y) {
    var disabled = [];
    var found = null;
    var hop;
    for (hop = 0; hop < 8 && !found; hop++) {
      var top = null;
      try { top = document.elementFromPoint(x, y); } catch (e) { break; }
      if (!top || top.nodeType !== 1 || isAwUi(top)) break;
      if (isMediaEl(top)) { found = top; break; }
      var inner = queryMedia(top);
      if (inner) { found = inner; break; }
      var parent = top.parentElement;
      if (parent && !isAwUi(parent)) {
        var sib = queryMedia(parent);
        if (sib && pointInEl(sib, x, y)) { found = sib; break; }
      }
      try {
        disabled.push([top, top.style.pointerEvents]);
        top.style.pointerEvents = "none";
      } catch (e2) { break; }
    }
    var i;
    for (i = 0; i < disabled.length; i++) {
      try { disabled[i][0].style.pointerEvents = disabled[i][1]; } catch (e3) {}
    }
    return found;
  }

  function pickMedia(x, y, fromSave) {
    var el = pickFromPoint(x, y);
    if (el) return el;
    var mode = settings.pierceMode || "auto";
    if (mode === "on") mode = "auto";
    if (mode === "off") return null;
    var key = missKey(x, y);
    if (fromSave) saveMiss[key] = (saveMiss[key] || 0) + 1;
    var deep = mode === "on" || pierceHostOn() || (fromSave && saveMiss[key] >= 3);
    if (!deep) return null;
    el = pierceAt(x, y);
    if (el && fromSave && saveMiss[key] >= 3) rememberPierceHost();
    return el;
  }

  document.addEventListener(
    "mousemove",
    function (e) {
      if (!mine()) return;
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
      try {
        if (zoomOn) return;
        if (menuOpen || !settings.enabled) return;
        var hit = null;
        try { hit = document.elementFromPoint(e.clientX, e.clientY); } catch (e2) {}
        if (isInteractive(hit)) {
          currentEl = null;
          currentUrl = null;
          currentOpaque = null;
          lastOpaque = null;
          hideHl();
          return;
        }
        var el = pickMedia(e.clientX, e.clientY, false);
        currentOpaque = lastOpaque;
        if (el !== currentEl) {
          currentEl = el;
          currentUrl = bestUrl(el);
          if (el) showHl(hlTarget(el));
          else hideHl();
        } else if (el) showHl(el);
      } catch (err) {}
    },
    true
  );

  function isImageDoc() {
    if (window !== window.top) return false;
    try {
      if (document.contentType && document.contentType.indexOf("image/") === 0) return true;
    } catch (e) {}
    var href = "";
    try { href = String(location.href || ""); } catch (e) { return false; }
    if (/viewer\.html/i.test(href)) return false;
    var path = "";
    try { path = (location.pathname || "").split("#")[0].split("?")[0]; } catch (e) {}
    var urlLooks = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path) || /^data:image\//i.test(href) || /^blob:/i.test(href);
    var imgs = document.getElementsByTagName("img");
    if (imgs.length !== 1) return false;
    var img = imgs[0];
    var w = img.naturalWidth || 0;
    var h = img.naturalHeight || 0;
    if (w < 64 || h < 64) return false;
    var body = document.body;
    if (!body) return false;
    if (body.children.length > 3) return false;
    if (!urlLooks && document.querySelector("nav, header, main, article, form, input, textarea, button")) return false;
    if (body.innerText && body.innerText.trim().length > 80 && !urlLooks) return false;
    return urlLooks || (body.innerText && body.innerText.trim().length < 40);
  }

  function applyMode(mode, quiet) {
    if (!imgEl) return;
    var root = document.documentElement;
    var body = document.body;
    var bg = settings.background || "#000000";
    currentMode = mode;
    root.style.setProperty("background", bg, "important");
    root.style.setProperty("margin", "0", "important");
    root.style.setProperty("padding", "0", "important");
    body.style.setProperty("background", bg, "important");
    body.style.setProperty("margin", "0", "important");
    body.style.setProperty("padding", "0", "important");
    imgEl.style.setProperty("display", "block", "important");
    imgEl.style.setProperty("border", "0", "important");
    imgEl.removeAttribute("width");
    imgEl.removeAttribute("height");
    if (mode === "none") {
      body.style.setProperty("display", "flex", "important");
      body.style.setProperty("align-items", "center", "important");
      body.style.setProperty("justify-content", "center", "important");
      body.style.setProperty("min-height", "100vh", "important");
      imgEl.style.setProperty("width", "auto", "important");
      imgEl.style.setProperty("height", "auto", "important");
      imgEl.style.setProperty("max-width", "none", "important");
      imgEl.style.setProperty("max-height", "none", "important");
      imgEl.style.removeProperty("object-fit");
    } else if (mode === "vertical") {
      body.style.setProperty("display", "block", "important");
      imgEl.style.setProperty("height", "100vh", "important");
      imgEl.style.setProperty("width", "auto", "important");
      imgEl.style.setProperty("margin-left", "auto", "important");
      imgEl.style.setProperty("margin-right", "auto", "important");
      imgEl.style.removeProperty("object-fit");
    } else if (mode === "fill") {
      root.style.setProperty("overflow", "hidden", "important");
      body.style.setProperty("overflow", "hidden", "important");
      imgEl.style.setProperty("width", "100vw", "important");
      imgEl.style.setProperty("height", "100vh", "important");
      imgEl.style.setProperty("object-fit", "fill", "important");
    } else if (mode === "horizontal") {
      imgEl.style.setProperty("width", "100vw", "important");
      imgEl.style.setProperty("height", "auto", "important");
      imgEl.style.setProperty("object-fit", "contain", "important");
    }
    if (!quiet) toast((imgEl.naturalWidth || "?") + "x" + (imgEl.naturalHeight || "?") + " · " + AW.MODE_LABELS[mode], 2200);
  }

  function snapshotImg(img) {
    return new Promise(function (resolve, reject) {
      if (!img) return reject(new Error("no img"));
      var w = img.naturalWidth || img.videoWidth || img.width || 0;
      var h = img.naturalHeight || img.videoHeight || img.height || 0;
      if (!w || !h) return reject(new Error("size"));
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      try {
        c.getContext("2d").drawImage(img, 0, 0);
      } catch (e) {
        return reject(e);
      }
      var big = w * h > 1600000;
      c.toBlob(function (b) { b ? resolve(b) : reject(new Error("blob")); }, big ? "image/jpeg" : "image/png", big ? 0.92 : 0.95);
    });
  }

  function setupImageDoc() {
    if (window !== window.top) return;
    if (/viewer\.html/i.test(location.pathname)) return;
    if (!settings.interceptImages) return;
    if (!isImageDoc()) return;
    imgEl = document.querySelector("img");
    if (!imgEl) return;
    var first = !imageDoc;
    imageDoc = true;
    currentEl = imgEl;
    currentUrl = lightUrl(imgEl);
    currentMode = settings.fitMode || "none";
    if (!AW.MODES || AW.MODES.indexOf(currentMode) === -1) currentMode = "none";
    function run() { applyMode(currentMode); }
    if (imgEl.complete) run();
    else imgEl.addEventListener("load", run);
    if (!first) return;
    window.addEventListener("resize", run);
    imgEl.addEventListener("click", function () {
      if (!mine()) return;
      if (menuOpen) return;
      var modes = AW.MODES || ["none"];
      var i = modes.indexOf(currentMode);
      currentMode = modes[(i + 1) % modes.length];
      applyMode(currentMode);
      try {
        chrome.storage.sync.set({ fitMode: currentMode });
        chrome.storage.local.set({ fitMode: currentMode });
      } catch (e) {}
    });
    function sendSnap() {
      if (!imgEl.naturalWidth) return;
      snapshotImg(imgEl).then(function (blob) {
        return blob.arrayBuffer().then(function (buf) {
          sendMsg({
            type: "adoptImageTab",
            url: /^https?:/i.test(location.href) ? location.href : "",
            mime: blob.type,
            w: imgEl.naturalWidth,
            h: imgEl.naturalHeight,
            buffer: buf
          });
        });
      }).catch(function () {
        if (/^https?:/i.test(location.href)) {
          sendMsg({ type: "adoptImageTab", url: location.href });
        }
      });
    }
    if (imgEl.complete && imgEl.naturalWidth) sendSnap();
    else imgEl.addEventListener("load", sendSnap);
    window.addEventListener("popstate", function () {
      galleryNav(-1);
    });
    window.addEventListener("keydown", function (e) {
      if (menuOpen) return;
      if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        galleryNav(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        galleryNav(1);
      }
    }, true);
  }

  function galleryNav(dir) {
    sendMsg({ type: "getHistory" }, function (res) {
      var list = (res && res.list) || [];
      if (!list.length) {
        toast(tr("historyEmpty"));
        return;
      }
      var url = currentUrl || location.href;
      var idx = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url || list[i].id === (location.search.match(/hid=([^&]+)/) || [])[1]) {
          idx = i;
          break;
        }
      }
      var ni = idx - dir;
      if (ni < 0 || ni >= list.length) {
        toast(dir < 0 ? tr("histStart") : tr("histEnd"));
        return;
      }
      var item = list[ni];
      var target = chrome.runtime.getURL("main/viewer.html") + "?hid=" + encodeURIComponent(item.id);
      location.href = target;
    });
  }

  function isHeavyUrl(url) {
    if (!url) return false;
    return url.indexOf("data:") === 0 || url.indexOf("blob:") === 0;
  }

  function httpUrlOf(url) {
    var u = String(url || "");
    if (/^https?:\/\//i.test(u)) return u;
    return "";
  }

  function nameHintFromEl(el) {
    if (!el) return "";
    var t = "";
    try { t = el.getAttribute("title") || el.getAttribute("alt") || ""; } catch (e) {}
    var seed = String(t).match(/seed=(\d+)/);
    if (seed) return "seed_" + seed[1] + ".jpg";
    if (el.id === "resultImgEl") return "image.jpg";
    return "";
  }

  function grabBytes(el, url) {
    if (el && (el.tagName === "IMG" || el.tagName === "CANVAS" || el.tagName === "VIDEO")) {
      return snapshotImg(el).catch(function () {
        var u = lightUrl(el) || url;
        if (!u || isHeavyUrl(u)) return Promise.reject(new Error("no src"));
        return fetch(u).then(function (r) { return r.blob(); });
      });
    }
    if (url && isHeavyUrl(url)) {
      return fetch(url).then(function (r) { return r.blob(); });
    }
    return Promise.resolve(null);
  }

  function cropRectFor(el) {
    var r = absRect(el);
    if (!r || r.width < 8 || r.height < 8) return null;
    return {
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      dpr: window.devicePixelRatio || 1
    };
  }

  function captureAndSend(kind, hint) {
    var el = currentOpaque || lastOpaque;
    var r = el ? cropRectFor(el) : null;
    if (!r) {
      toast(kind === "open" ? tr("noSelected") : tr("noMedia"));
      return false;
    }
    hideHl();
    requestAnimationFrame(function () {
      sendMsg({
        type: kind === "open" ? "captureOpen" : "captureSave",
        rect: r,
        filenameHint: hint || "capture.jpg"
      }, function (res) {
        if (res && res.ok) {
          toast(kind === "open" ? tr("opened") : tr("savedFile", { name: String(res.filename || "file").split(/[/\\]/).pop() }));
        } else {
          toast(kind === "open" ? tr("openFail") : tr("saveFail", { why: whyText((res && res.error) || "") }));
        }
      });
    });
    return true;
  }

  function doSave() {
    if (saveBusy) {
      pageLog("save failed", "save-busy", "a save in this frame is already running", {
        where: "doSave",
        written: false,
        steps: ["saveBusy=true", "this press was dropped before a file"]
      });
      return true;
    }
    var el = currentEl || imgEl;
    if (!el) el = pickMedia(lastMouse.x, lastMouse.y, true);
    var big = largerUnder(lastMouse.x, lastMouse.y, el);
    if (big) el = big;
    var onVid = onVideoEl(el);
    if (!el) {
      var pointed = videoElFrom(null);
      if (pointed) { el = pointed; onVid = true; }
    }
    var url = bestUrl(el) || currentUrl || "";
    if (!url && el) url = lightUrl(el);
    lastHits = [];
    if (onVid) {
      var played = pickVideoUrl(el, true);
      if (played) url = played;
      else if (!url || stillFile(url) || url.indexOf("blob:") === 0 || url.indexOf("data:") === 0) {
        hit("fallback", url, "reject", "video target had no file, still or blob fallback dropped");
        url = "";
      }
    } else {
      hit("video", "", "reject", "pointer is not on a video");
    }
    var steps = [];
    var page = "";
    try { page = String(location.href || "").slice(0, 300); } catch (ePage) {}
    function note(s) { steps.push(s); }
    function report(ok, why) {
      saveBusy = false;
      pageLog(ok ? "saved" : "save failed", ok ? "saved" : (why || "unknown"), why || "", {
        where: "doSave",
        page: page,
        tag: el ? (el.tagName || "") : "",
        url: shortUrl(url),
        written: !!ok,
        hits: lastHits.slice(),
        steps: steps.slice(),
        file: ok ? (why || "written") : ""
      });
    }
    note("start tag=" + (el ? el.tagName : "none") + " onVideo=" + onVid);

    if (!el && !url) {
      if (window !== window.top) {
        pageLog("save failed", "inner-empty", "this frame has no media under the pointer", {
          where: "doSave",
          written: false,
          hits: lastHits.slice(),
          steps: ["no element", "no url", "href=" + page]
        });
        return false;
      }
      if (!actOnce("save")) {
        pageLog("save failed", "dedup-frame", "this frame already started a save within 450ms", {
          where: "doSave",
          written: false,
          steps: ["actOnce blocked the empty-target path"]
        });
        return true;
      }
      saveBusy = true;
      if (currentOpaque || lastOpaque) {
        note("inner frame, ask it first");
        sendMsg({ type: "relay", payload: { type: "awSave" } }, function (r) {
          if (r && r.ok) {
            note("inner frame accepted");
            saveBusy = false;
            pageLog("save", "relay-inner", "a covered frame took the save", {
              where: "doSave",
              page: page,
              hits: lastHits.slice(),
              steps: steps.slice(),
              written: false
            });
            return;
          }
          note("inner frame had nothing");
          if (!captureAndSend("save", "capture.jpg")) {
            report(false, "no media");
            toast(tr("noMedia"));
          } else {
            note("crop sent because no file address");
            saveBusy = false;
            pageLog("save", "crop-sent", "no file address, asked for a visible crop", {
              where: "doSave",
              page: page,
              hits: lastHits.slice(),
              steps: steps.slice(),
              written: false
            });
          }
        });
        return true;
      }
      note("relay");
      sendMsg({ type: "relay", payload: { type: "awSave" } }, function (r) {
        if (!r || !r.ok) {
          report(false, "no media");
          toast(tr("noMedia"));
        } else {
          note("another frame accepted");
          report(true, "relay");
        }
      });
      return true;
    }

    if (!actOnce("save")) {
      pageLog("save failed", "dedup-frame", "this frame already started a save within 450ms", {
        where: "doSave",
        tag: el ? el.tagName : "",
        url: shortUrl(url),
        written: false,
        hits: lastHits.slice(),
        steps: ["actOnce blocked before download"]
      });
      return false;
    }
    saveBusy = true;

    function fail(why) {
      var raw = why || "unknown";
      note("fail: " + raw);
      report(false, raw);
      toast(tr("saveFail", { why: whyText(raw) }));
    }

    function saveLocalFile(blob, name) {
      var file = String(name || "image.jpg").split("/").pop();
      var u = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = u;
      a.download = file;
      document.documentElement.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 60000);
      if (settings.customPathEnabled) toast(tr("savedFolderMiss"));
      else toast(tr("savedFile", { name: file }));
    }

    function asMedia(b) {
      return new Promise(function (resolve, reject) {
        if (!b || b.size < 64) return reject(new Error("tiny"));
        if (b.type && (b.type.indexOf("text/") === 0 || b.type.indexOf("html") !== -1)) return reject(new Error("text"));
        b.arrayBuffer().then(function (buf) {
          var mime = AW.sniffMime ? AW.sniffMime(buf) : "";
          if (mime) return resolve(new Blob([buf], { type: mime }));
          if (typeof createImageBitmap !== "function") return reject(new Error("format"));
          createImageBitmap(new Blob([buf])).then(function (bmp) {
            try { if (bmp.close) bmp.close(); } catch (eBmp) {}
            var hinted = (b.type && b.type.indexOf("image/") === 0) ? b.type : "image/png";
            resolve(new Blob([buf], { type: hinted }));
          }, function () { reject(new Error("format")); });
        }, reject);
      });
    }

    function toPngBlob(blob) {
      return new Promise(function (resolve, reject) {
        var u = URL.createObjectURL(blob);
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement("canvas");
            c.width = im.naturalWidth || im.width;
            c.height = im.naturalHeight || im.height;
            c.getContext("2d").drawImage(im, 0, 0);
            c.toBlob(function (out) {
              try { URL.revokeObjectURL(u); } catch (e) {}
              if (!out || out.size < 64) reject(new Error("png"));
              else resolve(out);
            }, "image/png");
          } catch (e2) {
            try { URL.revokeObjectURL(u); } catch (e3) {}
            reject(e2);
          }
        };
        im.onerror = function () {
          try { URL.revokeObjectURL(u); } catch (e4) {}
          reject(new Error("png"));
        };
        im.src = u;
      });
    }

    function ship(blob) {
      var motion = AW.isMotion && AW.isMotion(blob.type);
      var next = (!motion && settings.saveAsPng && blob.type !== "image/png")
        ? toPngBlob(blob)
        : Promise.resolve(blob);
      next.then(function (out) {
        return out.arrayBuffer().then(function (buf) {
          var mime = (AW.sniffMime && AW.sniffMime(buf)) || out.type;
          if (!mime) throw new Error("format");
          var packed = new Blob([buf], { type: mime });
          if (!AW.isMotion(mime)) {
            sendMsg({
              type: "pushHistory",
              url: httpUrlOf(url),
              b64: AW.bufToB64(buf),
              mime: mime
            }, function () {});
          }
          if (buf.byteLength > 2 * 1024 * 1024) {
            if (/^https?:/i.test(url)) {
              note("over 2MB, direct download");
              directDownload("huge", packed);
              return;
            }
            note("over 2MB without a link, local file");
            report(true, "local");
            saveLocalFile(packed, hint || "file");
            return;
          }
          note("packed bytes=" + buf.byteLength + " mime=" + mime);
          sendMsg({
            type: "downloadPacked",
            b64: AW.bufToB64(buf),
            mime: mime,
            filenameHint: hint || "",
            url: httpUrlOf(url),
            page: page,
            tag: el ? el.tagName : ""
          }, function (r, err) {
            if (r && r.dedup) {
              note("worker dedup");
              saveBusy = false;
              pageLog("save failed", "dedup-worker", "worker already took a save within 450ms", {
                where: "downloadPacked",
                page: page,
                url: shortUrl(url),
                tag: el ? el.tagName : "",
                hits: lastHits.slice(),
                steps: steps.slice(),
                written: false
              });
              return;
            }
            var why = err || (r && r.error) || "";
            note("download ok=" + !!(r && r.ok) + " name=" + ((r && r.filename) || "") + " folderMiss=" + !!(r && r.folderMiss) + (why ? " error=" + why : ""));
            if (err || !r || !r.ok) {
              note("browser download missed");
              report(true, why || "download");
              saveLocalFile(packed, (r && r.filename) || hint || "file");
            } else if (r.folderMiss) {
              report(true, "folder ignored");
              toast(tr("savedFolderMiss"));
            } else {
              report(true, "");
              toast(tr("savedFile", { name: String(r.filename || "file").split(/[/\\]/).pop() }));
            }
          });
        });
      }).catch(fail);
    }

    var hint = nameHintFromEl(el);
    function directDownload(why, blob) {
      if (!/^https?:/i.test(url)) {
        if (blob) {
          note("local file");
          report(true, why || "local");
          saveLocalFile(blob, hint || "file");
          return;
        }
        fail(why || "nourl");
        return;
      }
      note("direct download after " + (why || "chain"));
      sendMsg({ type: "downloadMedia", url: url, filenameHint: hint || "", page: page, tag: el ? el.tagName : "" }, function (r, err) {
        if (r && r.dedup) {
          note("worker dedup");
          saveBusy = false;
          pageLog("save failed", "dedup-worker", "worker already took a save within 450ms", {
            where: "directDownload",
            page: page,
            url: shortUrl(url),
            tag: el ? el.tagName : "",
            hits: lastHits.slice(),
            steps: steps.slice(),
            written: false
          });
          return;
        }
        if (err || !r || !r.ok) {
          var missed = (r && r.error) || err || why || "download";
          if (blob) {
            note("direct missed: " + missed);
            report(true, missed);
            saveLocalFile(blob, (r && r.filename) || hint || "file");
            return;
          }
          if (onVid || (el && el.tagName === "VIDEO")) {
            note("worker missed (" + missed + "), page fetches the playing file");
            fetch(url, { credentials: "include", cache: "force-cache" }).then(function (res) {
              if (!res.ok) throw new Error("http " + res.status);
              return res.blob();
            }).then(function (b) {
              if (!b || b.size < 64) throw new Error("tiny");
              var tail = String(url || "").split("?")[0].split("/").pop() || "video.mp4";
              note("page file bytes=" + b.size);
              saveBusy = false;
              pageLog("saved", "saved-local", missed, {
                where: "directDownload",
                page: page,
                tag: el ? el.tagName : "VIDEO",
                url: shortUrl(url),
                written: true,
                hits: lastHits.slice(),
                steps: steps.slice(),
                file: "anchor in Downloads"
              });
              saveLocalFile(b, (r && r.filename) || hint || tail);
            }).catch(function (eFetch) {
              fail(missed + " | page " + ((eFetch && eFetch.message) || "fetch"));
            });
            return;
          }
          if (el && el.tagName !== "VIDEO") {
            note("visible crop after " + missed);
            if (captureAndSend("save", hint || "capture.jpg")) {
              saveBusy = false;
              pageLog("save", "crop-after-download", missed, {
                where: "directDownload",
                page: page,
                url: shortUrl(url),
                hits: lastHits.slice(),
                steps: steps.slice(),
                written: false
              });
              return;
            }
          }
          fail(missed);
        } else {
          note("direct ok name=" + ((r && r.filename) || ""));
          report(true, r && r.filename ? String(r.filename) : "");
          toast(tr("savedFile", { name: String(r.filename || "file").split(/[/\\]/).pop() }));
        }
      });
    }
    if (onVid && /^https?:/i.test(url)) {
      note("video http file, browser download, canvas skipped");
      directDownload("video-http");
    } else if (onVid) {
      note("video has no http file");
      var blobSrc = "";
      try {
        var vn = videoElFrom(el);
        blobSrc = (vn && vn.currentSrc) || "";
      } catch (eBlob) {}
      if (blobSrc.indexOf("blob:") === 0) {
        hit("blob-src", blobSrc, "keep", "same-frame blob");
        note("fetch blob url");
        fetch(blobSrc).then(asMedia).then(ship).catch(function (err) {
          fail("video-blob " + ((err && err.message) || "fetch"));
        });
      } else {
        hit("blob-src", blobSrc, "reject", blobSrc ? "not a blob url" : "currentSrc empty");
        fail("video-no-src");
      }
    } else {
    var fetched = /^https?:/i.test(url)
      ? fetch(url, { credentials: "include", cache: "force-cache" }).then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        note("page fetch " + r.status);
        return r.blob();
      }).then(asMedia)
      : Promise.reject(new Error("nourl"));

    fetched.catch(function (e1) {
      note("page fetch missed: " + ((e1 && e1.message) || "no"));
      if (isDirectVideo(url) || (el && el.tagName === "VIDEO") || /\.gif(\?|#|$)/i.test(url || "")) {
        return Promise.reject(new Error("motion"));
      }
      return grabBytes(el, url).then(function (b) {
        note("canvas or page bytes");
        return asMedia(b);
      });
    }).catch(function (e2) {
      note("bytes missed: " + ((e2 && e2.message) || "no"));
      if (!/^https?:/i.test(url)) return Promise.reject(e2 || new Error("no"));
      return new Promise(function (resolve, reject) {
        sendMsg({ type: "pullMediaB64", url: url }, function (res, err) {
          if (err || !res || !res.b64) return reject(new Error((res && res.error) || err || "pull"));
          try {
            var buf = AW.b64ToBuf(res.b64);
            var mime = (AW.sniffMime && AW.sniffMime(buf)) || res.mime || "";
            if (!mime) return reject(new Error("format"));
            note("worker fetch " + mime);
            resolve(new Blob([buf], { type: mime }));
          } catch (e) { reject(e); }
        });
      });
    }).then(ship).catch(function (e3) {
      var why = (e3 && e3.message) || "no";
      note("chain end: " + why);
      if (/^https?:/i.test(url) && (isDirectVideo(url) || (el && el.tagName === "VIDEO") || why === "motion" || why === "huge")) directDownload(why);
      else if (el) {
        currentEl = el;
        note("visible crop");
        if (!captureAndSend("save", hint || "capture.jpg")) fail(why);
        else {
          saveBusy = false;
          note("crop sent after " + why);
          pageLog("save", "crop-after-" + why, "no file written by the chain, visible crop sent", {
            where: "doSave",
            page: page,
            url: shortUrl(url),
            tag: el ? el.tagName : "",
            hits: lastHits.slice(),
            steps: steps.slice(),
            written: false
          });
        }
      } else fail(why);
    });
    }

    holdArmed = false;
    holdOpened = false;
    holdCode = null;
    clearTimeout(holdTimer);
    cancelAltHold();
    try { window.focus(); } catch (e) {}
    return true;
  }

  function doOpen() {
    if (!actOnce("open")) return true;
    var el = currentEl || imgEl;
    var url = currentUrl || lightUrl(el);
    if (!el) el = pickMedia(lastMouse.x, lastMouse.y, false);
    if (el && !url) url = lightUrl(el);
    url = bestUrl(el) || url;
    if (onVideoEl(el)) {
      lastHits = [];
      var playedOpen = pickVideoUrl(el, true);
      if (playedOpen) url = playedOpen;
    }

    if (!el && !url) {
      if (window !== window.top) return false;
      if (currentOpaque || lastOpaque) {
        sendMsg({ type: "relay", payload: { type: "awOpen" } }, function (r) {
          if (r && r.ok) return;
          if (!captureAndSend("open", "capture.jpg")) toast(tr("noSelected"));
        });
        return true;
      }
      sendMsg({ type: "relay", payload: { type: "awOpen" } }, function (r) {
        if (!r || !r.ok) toast(tr("noSelected"));
      });
      return true;
    }

    var hint = nameHintFromEl(el);
    if (el && String(el.tagName || "").toUpperCase() === "VIDEO" || isDirectVideo(url)) {
      var vurl = httpUrlOf(url);
      if (!vurl) {
        pageLog("save failed", "video-no-src", "open found a video with no http file", {
          where: "doOpen",
          tag: "VIDEO",
          url: shortUrl(url),
          hits: lastHits.slice(),
          written: false,
          steps: ["open video", "no http address"]
        });
        toast(tr("openFail"));
        return true;
      }
      var vmime = "video/mp4";
      if (/\.webm(\?|#|$)/i.test(vurl)) vmime = "video/webm";
      else if (/\.avi(\?|#|$)/i.test(vurl)) vmime = "video/x-msvideo";
      sendMsg({ type: "openInViewer", url: vurl, mime: vmime }, function () {});
      toast(tr("opened"));
      return true;
    }
    function send(payload) {
      sendMsg(payload, function () {});
      toast(tr("opened"));
    }

    grabBytes(el, url).then(function (blob) {
      if (blob && blob.size > 32) {
        return blob.arrayBuffer().then(function (buf) {
          var mime = (AW.sniffMime && AW.sniffMime(buf)) || "";
          if (!mime) {
            if (url && !isHeavyUrl(url)) send({ type: "openInViewer", url: url });
            else toast(tr("openFail"));
            return;
          }
          send({
            type: "openInViewer",
            b64: AW.bufToB64(buf),
            mime: mime,
            url: httpUrlOf(url)
          });
        });
      }
      if (url && !isHeavyUrl(url)) {
        send({ type: "openInViewer", url: url });
        return;
      }
      toast(tr("openFail"));
    }).catch(function () {
      if (url && !isHeavyUrl(url)) send({ type: "openInViewer", url: url });
      else toast(tr("openFail"));
    });
    return true;
  }

  function blobFromEl(el) {
    return new Promise(function (resolve, reject) {
      if (!el) return reject(new Error("no el"));
      if (el.tagName === "CANVAS") {
        try {
          el.toBlob(function (b) { b ? resolve(b) : reject(new Error("canvas")); }, "image/png");
        } catch (e) { reject(e); }
        return;
      }
      if (el.tagName !== "IMG" && el.tagName !== "VIDEO") return reject(new Error("type"));
      var w = el.naturalWidth || el.videoWidth || 0;
      var h = el.naturalHeight || el.videoHeight || 0;
      if (!w || !h) return reject(new Error("size"));
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      try {
        c.getContext("2d").drawImage(el, 0, 0, w, h);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("taint")); }, "image/png");
      } catch (e) { reject(e); }
    });
  }

  function pngBlobFromUrl(url) {
    return new Promise(function (resolve, reject) {
      if (!url) return reject(new Error("no url"));
      sendMsg({ type: "copyPng", url: url }, function (res) {
        if (chrome.runtime.lastError || !res || !res.ok || !res.dataUrl) {
          return reject(new Error((res && res.error) || "fetch"));
        }
        fetch(res.dataUrl).then(function (r) { return r.blob(); }).then(resolve, reject);
      });
    });
  }

  function writePngBlob(blob) {
    if (!navigator.clipboard || typeof navigator.clipboard.write !== "function") {
      return Promise.reject(new Error("no clipboard"));
    }
    if (typeof ClipboardItem === "undefined") return Promise.reject(new Error("no ClipboardItem"));
    var item = new ClipboardItem({ "image/png": blob });
    return navigator.clipboard.write([item]);
  }

  function copyText(text) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        return navigator.clipboard.writeText(String(text || ""));
      }
    } catch (e) {}
    return Promise.reject(new Error("no clipboard"));
  }

  function doCopy() {
    if (!actOnce("copy")) return true;
    var el = currentEl || imgEl;
    var url = currentUrl || lightUrl(el);
    if (!url && !el) {
      toast(tr("noSelected"));
      return false;
    }
    if (!settings.copyMediaFile) {
      if (!url) {
        toast(tr("noSelected"));
        return false;
      }
      copyText(url).then(function () { toast(tr("urlCopied")); }).catch(function () { toast(tr("copyFail")); });
      return true;
    }

    var pngPromise = blobFromEl(el).catch(function () { return pngBlobFromUrl(url); });

    function ok() { toast(tr("copied")); }
    function fail() {
      pngPromise.then(writePngBlob).then(ok).catch(function () {
        if (url) copyText(url).then(function () { toast(tr("urlCopiedFail")); }).catch(function () { toast(tr("copyFail")); });
        else toast(tr("copyFail"));
      });
    }

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.write !== "function" || typeof ClipboardItem === "undefined") {
        fail();
        return true;
      }
      var payload = {};
      payload["image/png"] = pngPromise;
      navigator.clipboard.write([new ClipboardItem(payload)]).then(ok, fail);
    } catch (e) {
      fail();
    }
    return true;
  }

  function closeMenu() {
    menuOpen = false;
    subOpen = false;
    qOpen = false;
    tildeOn = false;
    inputOpen = false;
    inputMode = null;
    altOpen = false;
    clearTimeout(holdAltTimer);
    holdAltTimer = null;
    if (menuRoot) {
      menuRoot.remove();
      menuRoot = null;
    }
  }

  var tabSpinOnce = false;

  function tabSpinDir(e) {
    return e.deltaY < 0 ? 1 : -1;
  }

  function resetTabSpinOnce() {
    tabSpinOnce = false;
  }

  function onTabSpinWheel(e) {
    if (!settings.enabled) return false;
    if (!menuOpen) return false;
    var persist = altOpen;
    if (!persist && tabSpinOnce) return false;
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    if (persist) sendMsg({ type: "tabSpinStart", dir: tabSpinDir(e) });
    else {
      tabSpinOnce = true;
      sendMsg({ type: "cycleTab", dir: tabSpinDir(e) });
    }
    return true;
  }

  function blockKeys(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function sItems() {
    return [
      { n: "1", id: "pathMode", lab: tr("s1", { v: settings.customPathEnabled ? tr("on") : tr("off") }) },
      { n: "2", id: "pathName", lab: tr("s2") },
      { n: "3", id: "renameOn", lab: tr("s3", { v: settings.renameEnabled ? tr("on") : tr("off") }) },
      { n: "4", id: "renameTpl", lab: tr("s4") },
      { n: "5", id: "png", lab: tr("s5", { v: settings.saveAsPng ? tr("on") : tr("off") }) }
    ];
  }

  function patchSetting(key, value, label) {
    var data = {};
    data[key] = value;
    sendMsg({ type: "saveSettings", data: data }, function () {
      settings[key] = value;
      toast(label);
      closeMenu();
    });
  }

  function openInput(mode, title, value, legend) {
    cancelAltHold();
    inputOpen = true;
    inputMode = mode;
    subOpen = false;
    var box = menuRoot.querySelector(".aw-inputbox");
    var inp = box.querySelector("input");
    var leg = box.querySelector(".aw-legend");
    box.style.display = "block";
    var sub = menuRoot.querySelector(".aw-sub");
    if (sub) sub.style.display = "none";
    inp.value = value || "";
    inp.placeholder = title;
    if (mode === "renameTpl" && AW.legendHtml) {
      leg.innerHTML = AW.legendHtml(AW.uiLang(settings));
    } else {
      leg.textContent = legend || tr("enterEsc");
    }
    inp.onblur = function () {
      if (inputOpen && menuRoot) {
        setTimeout(function () { if (inputOpen && inp) inp.focus(); }, 0);
      }
    };
    inp.focus();
    inp.select();
  }

  function commitInput() {
    var box = menuRoot.querySelector(".aw-inputbox");
    var inp = box.querySelector("input");
    var v = (inp.value || "").trim();
    if (inputMode === "pathName") {
      if (!v) v = "AW_Media";
      patchSetting("customPath", v, "Folder: " + v);
    } else if (inputMode === "renameTpl") {
      if (!v) v = "media_{date}_{counter}";
      patchSetting("renameTemplate", v, "Template saved");
    }
  }

  function runS(id) {
    if (id === "pathMode") {
      patchSetting("customPathEnabled", !settings.customPathEnabled,
        "Save to: " + (!settings.customPathEnabled ? "subfolder" : "Downloads"));
    } else if (id === "pathName") {
      openInput("pathName", "subfolder name", settings.customPath,
        "Name of subfolder inside Downloads · Enter to save");
    } else if (id === "renameOn") {
      patchSetting("renameEnabled", !settings.renameEnabled,
        "Rename files: " + (!settings.renameEnabled ? "ON" : "OFF"));
    } else if (id === "renameTpl") {
      openInput("renameTpl", "rename template", settings.renameTemplate,
        "{timestamp}  {counter}  {date}  {time}  {original}");
    } else if (id === "png") {
      patchSetting("saveAsPng", !settings.saveAsPng,
        "Save as PNG: " + (!settings.saveAsPng ? "ON" : "OFF"));
    }
  }

  function markCell(k) {
    if (!menuRoot) return;
    var cells = menuRoot.querySelectorAll(".aw-cell");
    for (var i = 0; i < cells.length; i++) {
      var on = cells[i].getAttribute("data-k") === k;
      cells[i].classList.toggle("active", on);
    }
  }

  function cancelAltHold() {
    clearTimeout(holdAltTimer);
    holdAltTimer = null;
  }

  function openSub() {
    cancelAltHold();
    qOpen = false;
    subOpen = true;
    markCell("S");
    var sub = menuRoot.querySelector(".aw-sub");
    sub.innerHTML = "";
    var items = sItems();
    items.forEach(function (it) {
      var row = document.createElement("div");
      row.className = "aw-row";
      row.dataset.id = it.id;
      row.innerHTML = '<div class="aw-num">' + it.n + '</div><div class="aw-lab">' + it.lab + "</div>";
      row.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        runS(it.id);
      });
      sub.appendChild(row);
    });
    sub.style.display = "block";
  }

  function runKey(k) {
    cancelAltHold();
    if (k === "W") {
      doOpen();
      closeMenu();
    } else if (k === "A") {
      doCopy();
      closeMenu();
    } else if (k === "D") {
      sendMsg({ type: "openShortcuts" });
      toast(tr("hotkeys"));
      closeMenu();
    } else if (k === "S") {
      openSub();
    } else if (k === "Q") {
      openQ();
    }
  }

  function loadPresets(cb) {
    sendMsg({ type: "getPresets" }, function (res) {
      if (chrome.runtime.lastError) {
        if (cb) cb(presetSlots);
        return;
      }
      if (res && res.slots && res.slots.length) presetSlots = res.slots;
      if (cb) cb(presetSlots);
    });
  }

  function snapshotPreset() {
    return {
      renameTemplate: settings.renameTemplate || "media_{date}_{counter}",
      customPath: settings.customPath || "AW_Media",
      customPathEnabled: !!settings.customPathEnabled,
      renameEnabled: !!settings.renameEnabled,
      saveAsPng: !!settings.saveAsPng
    };
  }

  function paintTilde() {
    if (!menuRoot) return;
    var t = menuRoot.querySelector(".aw-tilde");
    if (!t) return;
    t.className = "aw-tilde" + (tildeOn ? " on" : "");
  }

  function renderQList() {
    if (!menuRoot) return;
    var sub = menuRoot.querySelector(".aw-sub");
    if (!sub) return;
    sub.innerHTML = "";
    var tilde = document.createElement("div");
    tilde.className = "aw-tilde" + (tildeOn ? " on" : "");
    tilde.textContent = "~";
    tilde.title = "on = save to slot · off = load slot";
    tilde.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      tildeOn = !tildeOn;
      paintTilde();
    });
    sub.appendChild(tilde);
    var i;
    for (i = 0; i < (AW.PRESET_COUNT || 10); i++) {
      var p = presetSlots[i];
      var row = document.createElement("div");
      row.className = "aw-row";
      var folder = !p ? "empty" : (p.customPathEnabled ? (p.customPath || "AW_Media") : "Downloads");
      var file = !p ? "" : (p.renameEnabled ? (p.renameTemplate || "media") : "original name");
      var extra = p && p.saveAsPng ? " · png" : "";
      row.innerHTML = '<div class="aw-num">' + (i + 1) + '</div><div class="aw-lab"><div>' + folder + "</div><div>" + file + extra + "</div></div>";
      row.addEventListener("click", (function (idx) {
        return function (e) {
          e.preventDefault();
          e.stopPropagation();
          runPreset(idx);
        };
      })(i));
      sub.appendChild(row);
    }
    sub.style.display = "block";
  }

  function openQ() {
    cancelAltHold();
    qOpen = true;
    subOpen = false;
    inputOpen = false;
    markCell("Q");
    var box = menuRoot.querySelector(".aw-inputbox");
    if (box) box.style.display = "none";
    renderQList();
    loadPresets(function () { if (qOpen) renderQList(); });
  }

  function runPreset(idx) {
    if (idx < 0 || idx >= (AW.PRESET_COUNT || 10)) return;
    if (tildeOn) {
      var snap = snapshotPreset();
      sendMsg({ type: "savePreset", index: idx, preset: snap }, function (res) {
        if (chrome.runtime.lastError || !res || !res.ok) {
          toast(tr("presetFail"));
          return;
        }
        presetSlots = res.slots || presetSlots;
        presetSlots[idx] = snap;
        toast(tr("presetSaved", { n: idx + 1 }));
        closeMenu();
      });
      return;
    }
    var p = presetSlots[idx];
    if (!p) {
      loadPresets(function (slots) {
        p = slots[idx];
        if (!p) {
          toast(tr("presetEmpty", { n: idx + 1 }));
          return;
        }
        applyPreset(idx, p);
      });
      return;
    }
    applyPreset(idx, p);
  }

  function applyPreset(idx, p) {
    var data = {
      renameTemplate: p.renameTemplate,
      customPath: p.customPath,
      customPathEnabled: p.customPathEnabled,
      renameEnabled: p.renameEnabled,
      saveAsPng: p.saveAsPng
    };
    sendMsg({ type: "saveSettings", data: data }, function () {
      settings.renameTemplate = data.renameTemplate;
      settings.customPath = data.customPath;
      settings.customPathEnabled = data.customPathEnabled;
      settings.renameEnabled = data.renameEnabled;
      settings.saveAsPng = data.saveAsPng;
      toast(tr("presetLoaded", { n: idx + 1 }));
      closeMenu();
    });
  }

  function showMenu(x, y) {
    injectCss();
    closeMenu();
    menuOpen = true;
    hideHl();
    menuRoot = document.createElement("div");
    menuRoot.id = "aw-sm-root";
    menuRoot.innerHTML =
      '<div class="aw-cluster">' +
      '<div class="aw-cross">' +
      '<div class="aw-cell c-q" data-k="Q"><span>Q</span><span class="d">' + tr("qLab") + '</span></div>' +
      '<div class="aw-cell c-w" data-k="W"><span>W</span><span class="d">' + tr("wLab") + '</span></div>' +
      '<div class="aw-cell c-a" data-k="A"><span>A</span><span class="d">' + tr("aLab") + '</span></div>' +
      '<div class="aw-cell c-s" data-k="S"><span>S</span><span class="d">' + tr("sLab") + '</span></div>' +
      '<div class="aw-cell c-d" data-k="D"><span>D</span><span class="d">' + tr("dLab") + '</span></div>' +
      "</div>" +
      '<div class="aw-sub" style="display:none"></div>' +
      '<div class="aw-inputbox" style="display:none"><input type="text" maxlength="80"><div class="aw-legend"></div></div>' +
      "</div>";
    document.documentElement.appendChild(menuRoot);
    var cluster = menuRoot.querySelector(".aw-cluster");
    var w = 186;
    var h = 118;
    var left = x - w / 2;
    var top = y - h / 2;
    if (left < 4) left = 4;
    if (top < 4) top = 4;
    if (left + w > innerWidth - 4) left = innerWidth - w - 4;
    if (top + h > innerHeight - 4) top = innerHeight - h - 4;
    cluster.style.left = left + "px";
    cluster.style.top = top + "px";
    var cells = menuRoot.querySelectorAll(".aw-cell");
    for (var i = 0; i < cells.length; i++) {
      cells[i].addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        runKey(this.getAttribute("data-k"));
      });
    }
    menuRoot.addEventListener("mousedown", function (e) {
      if (e.button === 0 && e.target === menuRoot) closeMenu();
    });
    menuRoot.tabIndex = -1;
    cluster.tabIndex = -1;
    toast(tr("wasd"), 2200);
    resetTabSpinOnce();
    scheduleAltMenu();
  }

  function holdMs() {
    return settings.holdMenuMs || 1000;
  }

  function altHoldMs() {
    var base = holdMs();
    var mode = settings.altHoldMode || "x2";
    if (mode === "x1") return base;
    if (mode === "x1.5") return Math.round(base * 1.5);
    if (mode === "plus1500") return base + 1500;
    return base * 2;
  }

  function zoomHoldDelay() {
    return settings.zoomHoldMs || holdMs();
  }

  function scheduleAltMenu() {
    cancelAltHold();
    if (!holdArmed) return;
    var id = holdId;
    holdAltTimer = setTimeout(function () {
      if (id !== holdId || !holdArmed) return;
      if (!menuOpen || altOpen || subOpen || qOpen || inputOpen) return;
      showAltMenu();
    }, altHoldMs());
  }

  function placeCluster(cluster, w, h, x, y, under) {
    var left = x - w / 2;
    var top = under ? y + 10 : y - h / 2;
    if (left < 4) left = 4;
    if (top < 4) top = 4;
    if (left + w > innerWidth - 4) left = Math.max(4, innerWidth - w - 4);
    if (top + h > innerHeight - 4) top = Math.max(4, innerHeight - h - 4);
    cluster.style.left = left + "px";
    cluster.style.top = top + "px";
  }

  function showAltMenu() {
    if (!menuRoot) return;
    altOpen = true;
    subOpen = false;
    qOpen = false;
    inputOpen = false;
    var cluster = menuRoot.querySelector(".aw-cluster");
    if (!cluster) return;
    var scale = (settings.altMenuScale || 100) / 100;
    if (scale < 0.4) scale = 0.4;
    if (scale > 1.5) scale = 1.5;
    cluster.style.setProperty("--aw-alt-scale", String(scale));
    var items = [
      { act: "back", lab: "←", d: "back" },
      { act: "fwd", lab: "→", d: "fwd" },
      { act: "save", lab: "save", d: "file" },
      { act: "open", lab: "open", d: "viewer" },
      { act: "reload", lab: "reload", d: "" },
      { act: "close", lab: "close", d: "tab" },
      { act: "pin", lab: '<span class="pin-lab">pin</span>', d: "" },
      { act: "dup", lab: "duplicate", d: "" }
    ];
    var html = '<div class="aw-alt">';
    var i;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var span = items.length % 2 === 1 && i === items.length - 1 ? " span2" : "";
      html += '<div class="aw-cell' + span + '" data-act="' + it.act + '"><span>' + it.lab + "</span>";
      if (it.d) html += '<span class="d">' + it.d + "</span>";
      html += "</div>";
    }
    html += "</div>";
    cluster.innerHTML = html;
    var w = Math.round(216 * scale);
    var h = Math.round(140 * scale);
    placeCluster(cluster, w, h, lastMouse.x, lastMouse.y, true);
    sendMsg({ type: "tabAction", action: "info" }, function (info) {
      var lab = cluster.querySelector(".pin-lab");
      if (lab && info && info.ok) lab.textContent = info.pinned ? "unpin" : "pin";
    });
    var cells = cluster.querySelectorAll("[data-act]");
    for (i = 0; i < cells.length; i++) {
      cells[i].addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        runTabAct(this.getAttribute("data-act"));
      });
    }
  }

  function runTabAct(act) {
    if (!act) return;
    if (act === "save") {
      doSave();
      closeMenu();
      return;
    }
    if (act === "open") {
      doOpen();
      closeMenu();
      return;
    }
    sendMsg({ type: "tabAction", action: act }, function (res) {
      if (act === "pin") {
        toast(res && res.pinned ? tr("pinned") : tr("unpinned"));
      } else if (act === "reload") toast(tr("reloaded"));
      else if (act === "dup") toast(tr("duplicated"));
      else if (act === "back") toast(tr("wentBack"));
      else if (act === "fwd") toast(tr("wentFwd"));
      if (act !== "close") closeMenu();
    });
  }

  function isSaveCombo(e) {
    if (window.AW && AW.isSaveEvent) return AW.isSaveEvent(e, settings);
    if (e.code === "KeyC" && e.altKey && !e.ctrlKey && !e.metaKey) return true;
    if (e.code === "KeyK" && e.ctrlKey && !e.altKey && !e.metaKey) return true;
    return false;
  }

  document.addEventListener("aw-sm-key", function (ev) {
    if (!mine() || !settings.enabled) return;
    var d = ev.detail || {};
    if (d.kind === "down") {
      sendMsg({ type: "saveHold" }, function () {});
      pageLog("key", "key-page-down", "page saw the save key", {
        where: "aw-sm-key",
        written: false,
        key: "code=" + (d.code || ""),
        steps: [
          "saveHold sent",
          menuOpen ? "menu was open, closed, no file" : (zoomOn ? "zoom is open, tap waits" : "armed for a tap or a hold")
        ]
      });
      if (menuOpen) {
        closeMenu();
        return;
      }
      if (zoomOn) return;
      holdId += 1;
      holdArmed = true;
      holdOpened = false;
      holdCode = d.code || "";
      holdAt = d.t || performance.now();
      cancelAltHold();
      return;
    }
    if (d.kind === "hold") {
      if (!holdArmed) {
        pageLog("key", "key-hold-unarmed", "hold fired but this frame was not armed, no menu and no file", {
          where: "aw-sm-key",
          written: false,
          key: "code=" + (d.code || "")
        });
        return;
      }
      holdOpened = true;
      pageLog("key", "key-hold-menu", "hold opened the menu, a file is not written on hold", {
        where: "aw-sm-key",
        written: false,
        key: "code=" + (d.code || "")
      });
      showMenu(lastMouse.x, lastMouse.y);
      return;
    }
    if (d.kind === "up") {
      if (!holdArmed) {
        pageLog("key", "key-up-unarmed", "keyup but this frame was not waiting, no file", {
          where: "aw-sm-key",
          written: false,
          key: "code=" + (d.code || "")
        });
        return;
      }
      var opened = holdOpened;
      var heldFor = (d.t || performance.now()) - holdAt;
      holdArmed = false;
      holdOpened = false;
      holdCode = null;
      cancelAltHold();
      if (opened || menuOpen) {
        pageLog("key", "key-up-menu", "keyup while the menu is open, no file", {
          where: "aw-sm-key",
          written: false,
          key: "heldMs=" + Math.round(heldFor)
        });
        return;
      }
      pageLog("key", "key-up-save", "tap released, save starts", {
        where: "aw-sm-key",
        written: false,
        key: "heldMs=" + Math.round(heldFor),
        steps: ["heldMs=" + Math.round(heldFor)]
      });
      doSave();
      return;
    }
    if (d.kind === "open") doOpen();
    if (d.kind === "copy") doCopy();
    if (d.kind === "pin") sendMsg({ type: "togglePin" }, function () {});
  });

  function armHold(e) {
    if (e.repeat && holdArmed) return;
    holdId += 1;
    var id = holdId;
    holdArmed = true;
    holdOpened = false;
    holdCode = e.code;
    holdAt = e.timeStamp || performance.now();
    cancelAltHold();
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () {
      if (id !== holdId || !holdArmed) return;
      holdOpened = true;
      showMenu(lastMouse.x, lastMouse.y);
    }, holdMs());
  }

  function releaseHold(e) {
    if (!holdArmed) return;
    if (holdCode && e.code !== holdCode) return;
    if (e.timeStamp && holdAt && e.timeStamp < holdAt) return;
    var id = holdId;
    clearTimeout(holdTimer);
    cancelAltHold();
    var opened = holdOpened;
    var heldFor = (e.timeStamp || performance.now()) - holdAt;
    holdArmed = false;
    holdCode = null;
    holdOpened = false;
    if (id !== holdId) return;
    if (opened || menuOpen) {
      pageLog("key", "key-up-menu", "keyup while the menu is open, no file", {
        where: "releaseHold",
        written: false,
        key: "heldMs=" + Math.round(heldFor)
      });
      return;
    }
    pageLog("key", "key-up-save", "tap released, save starts", {
      where: "releaseHold",
      written: false,
      key: "heldMs=" + Math.round(heldFor)
    });
    doSave();
  }

  function digitFromCode(code) {
    var map = {
      Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
      Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4
    };
    return map.hasOwnProperty(code) ? map[code] : -1;
  }

  function inMenuInput(e) {
    var t = e.target;
    return !!(inputOpen && t && t.closest && t.closest(".aw-inputbox"));
  }

  function handleMenuKey(e) {
    if (inMenuInput(e)) {
      if (e.type !== "keydown") return;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        commitInput();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeMenu();
      }
      return;
    }
    if (e.type === "keyup" && holdArmed && (isSaveCombo(e) || e.code === holdCode)) {
      holdArmed = false;
      holdOpened = false;
      holdCode = null;
      cancelAltHold();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.type !== "keydown" || e.repeat) return;
    if (isSaveCombo(e) && !holdArmed) {
      closeMenu();
      return;
    }
    var code = e.code;
    if (code === "Escape") {
      closeMenu();
      return;
    }
    if (altOpen) {
      if (code === "ArrowLeft") { runTabAct("back"); return; }
      if (code === "ArrowRight") { runTabAct("fwd"); return; }
      if (code === "KeyR") { runTabAct("reload"); return; }
      if (code === "KeyX") { runTabAct("close"); return; }
      if (code === "KeyP") { runTabAct("pin"); return; }
      if (code === "KeyD") { runTabAct("dup"); return; }
      if (code === "KeyS") { runTabAct("save"); return; }
      if (code === "KeyW" || code === "KeyO") { runTabAct("open"); return; }
      return;
    }
    if (code === "KeyW") { runKey("W"); return; }
    if (code === "KeyA") { runKey("A"); return; }
    if (code === "KeyS") { runKey("S"); return; }
    if (code === "KeyD") { runKey("D"); return; }
    if (code === "KeyQ") { runKey("Q"); return; }
    if (code === "Backquote" && qOpen) {
      tildeOn = !tildeOn;
      paintTilde();
      return;
    }
    var d = digitFromCode(code);
    if (d >= 0) {
      if (qOpen) runPreset(d);
      else {
        if (!subOpen) openSub();
        runS(["pathMode", "pathName", "renameOn", "renameTpl", "png"][d]);
      }
    }
  }

  ["keydown", "keyup", "keypress", "beforeinput"].forEach(function (ev) {
    document.addEventListener(
      ev,
      function (e) {
        if (!mine()) return;
        if (menuOpen) {
          handleMenuKey(e);
          return;
        }
        if (zoomOn && ev === "keydown" && e.code === "Escape") {
          blockKeys(e);
          endZoom();
          return;
        }
        if (ev !== "keydown" || !settings.enabled) return;
      },
      true
    );
  });

  function containRect(nw, nh, vw, vh) {
    if (!nw || !nh) return { left: 0, top: 0, w: vw, h: vh };
    var r = nw / nh;
    var wr = vw / vh;
    var w;
    var h;
    if (r > wr) {
      w = vw;
      h = vw / r;
    } else {
      h = vh;
      w = vh * r;
    }
    return { left: (vw - w) / 2, top: (vh - h) / 2, w: w, h: h };
  }

  function zoomTarget(el) {
    if (!el) return null;
    var tag = el.tagName;
    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") return el;
    if (tag === "SOURCE" && el.parentElement) return zoomTarget(el.parentElement);
    var inner = el.querySelector && el.querySelector("img, video, canvas");
    return inner || el;
  }

  function startZoom(el) {
    var srcEl = el;
    var forced = "";
    try {
      var hit = posterHit(el);
      if (hit && hit.url) {
        forced = hit.url;
        if (hit.root) srcEl = hit.root;
      }
    } catch (e0) {}
    el = zoomTarget(el);
    if (!el || zoomOn) return;
    hideHl();
    var r;
    try {
      r = (srcEl || el).getBoundingClientRect();
    } catch (e) {
      return;
    }
    if (!r.width || !r.height) return;
    var clone;
    var tag = el.tagName;
    try {
    if (forced) {
      clone = document.createElement("video");
      clone.className = "aw-zoom-media";
      clone.src = forced;
      clone.muted = true;
      clone.loop = true;
      clone.autoplay = true;
      clone.playsInline = true;
      clone.controls = false;
      var playRg = clone.play();
      if (playRg && playRg.catch) playRg.catch(function () {});
    } else if (tag === "VIDEO") {
      clone = el.cloneNode(true);
      clone.removeAttribute("id");
      clone.className = "aw-zoom-media";
      try { clone.src = el.currentSrc || el.src || ""; } catch (e) {}
      try { clone.currentTime = el.currentTime || 0; } catch (e) {}
      clone.muted = true;
      clone.controls = false;
      clone.loop = el.loop;
      clone.playsInline = true;
      clone.addEventListener("loadedmetadata", function () {
        try { clone.currentTime = el.currentTime || 0; } catch (e) {}
        if (!el.paused) {
          var p2 = clone.play();
          if (p2 && p2.catch) p2.catch(function () {});
        }
      });
      if (!el.paused) {
        var p = clone.play();
        if (p && p.catch) p.catch(function () {});
      }
    } else if (tag === "CANVAS") {
      clone = document.createElement("img");
      clone.alt = "";
      clone.className = "aw-zoom-media";
      try { clone.src = el.toDataURL("image/png"); } catch (e) { clone.src = currentUrl || ""; }
    } else {
      clone = document.createElement("img");
      clone.alt = "";
      clone.className = "aw-zoom-media";
      var src = lightUrl(el);
      if (src) {
        clone.src = src;
      } else {
        snapshotImg(el).then(function (blob) {
          try {
            if (typeof URL !== "undefined" && URL.createObjectURL) {
              var u = URL.createObjectURL(blob);
              clone.src = u;
              clone._awObj = u;
            }
          } catch (e3) {}
        }).catch(function () {});
      }
    }
    clone.style.left = r.left + "px";
    clone.style.top = r.top + "px";
    clone.style.width = r.width + "px";
    clone.style.height = r.height + "px";
    zoomRoot = document.createElement("div");
    zoomRoot.id = "aw-sm-zoom";
    zoomRoot.appendChild(clone);
    document.documentElement.appendChild(zoomRoot);
    zoomOn = true;
    zoomSrcEl = el;
    zoomFit = 4;
    zoomInspect = 100;
    zoomPan.x = 0;
    zoomPan.y = 0;
    zoomDrag = null;
    zoomLock.x = lastMouse.x;
    zoomLock.y = lastMouse.y;
    zoomNat.w = el.naturalWidth || el.videoWidth || r.width || 1;
    zoomNat.h = el.naturalHeight || el.videoHeight || r.height || 1;
    var ui = document.createElement("div");
    ui.className = "aw-zoom-ui";
    ui.innerHTML =
      '<div class="aw-zoom-pct">MAX</div>' +
      '<input type="range" min="0" max="4" step="1" value="4">' +
      '<div class="aw-zoom-ticks"><span>max</span><span>·</span><span>·</span><span>·</span><span>0</span></div>';
    zoomRoot.appendChild(ui);
    var slider = ui.querySelector("input");
    slider.addEventListener("input", function () {
      var v = parseInt(slider.value, 10);
      if (isNaN(v)) return;
      if (v <= 0) {
        endZoom();
        return;
      }
      zoomFit = v;
      applyZoomSize();
    });
    ui.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
    ui.addEventListener("click", function (ev) { ev.stopPropagation(); });
    clone.addEventListener("mousedown", function (ev) {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      zoomDrag = { x: ev.clientX, y: ev.clientY, px: zoomPan.x, py: zoomPan.y };
      clone.classList.add("dragging");
    });
    zoomRoot.addEventListener("mousedown", function (ev) {
      if (ev.target === zoomRoot) endZoom();
    });
    requestAnimationFrame(function () {
      applyZoomSize();
      requestAnimationFrame(function () {
        if (clone) clone.style.transition = "none";
      });
    });
    } catch (err) {
      zoomOn = false;
      zoomSrcEl = null;
      zoomDrag = null;
      if (zoomRoot) {
        try { zoomRoot.remove(); } catch (e2) {}
        zoomRoot = null;
      }
    }
  }

  function applyZoomSize() {
    if (!zoomRoot) return;
    var clone = zoomRoot.querySelector(".aw-zoom-media");
    if (!clone) return;
    var fit = containRect(zoomNat.w, zoomNat.h, innerWidth * 0.92, innerHeight * 0.92);
    var t = zoomFit / 4;
    if (t < 0.05) t = 0.05;
    var inspect = zoomInspect / 100;
    var w = fit.w * t * inspect;
    var h = fit.h * t * inspect;
    clone.style.width = w + "px";
    clone.style.height = h + "px";
    clone.style.left = (innerWidth - w) / 2 + zoomPan.x + "px";
    clone.style.top = (innerHeight - h) / 2 + zoomPan.y + "px";
    var lab = zoomRoot.querySelector(".aw-zoom-pct");
    if (lab) {
      lab.textContent = zoomInspect > 100 ? zoomInspect + "%" : (zoomFit === 4 ? "MAX" : zoomFit + "/4");
    }
    var sl = zoomRoot.querySelector(".aw-zoom-ui input");
    if (sl && String(sl.value) !== String(zoomFit)) sl.value = String(zoomFit);
  }

  function endZoom() {
    if (!zoomOn && !zoomRoot) return;
    zoomOn = false;
    zoomDrag = null;
    zoomInspect = 100;
    zoomFit = 4;
    zoomPan.x = 0;
    zoomPan.y = 0;
    if (zoomSrcEl) {
      try { zoomSrcEl.style.removeProperty("visibility"); } catch (e) {}
    }
    zoomSrcEl = null;
    if (zoomRoot) {
      var media = zoomRoot.querySelector(".aw-zoom-media");
      if (media && media._awObj) {
        try { URL.revokeObjectURL(media._awObj); } catch (e) {}
      }
      zoomRoot.remove();
      zoomRoot = null;
    }
  }

  var midStamp = 0;

  function isNativeMidOpen(e) {
    var nodes = [];
    try {
      if (e.composedPath) nodes = e.composedPath();
    } catch (err) {}
    if (!nodes || !nodes.length) {
      var n = e.target;
      while (n && n.nodeType === 1) {
        nodes.push(n);
        n = n.parentElement;
      }
    }
    var i;
    var el;
    var href;
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      if (!el || el.nodeType !== 1) continue;
      if (el.tagName === "A" || el.tagName === "AREA") {
        href = "";
        try { href = el.getAttribute("href") || ""; } catch (err2) {}
        if (href && href !== "#" && href.indexOf("javascript:") !== 0) return true;
      }
    }
    return false;
  }

  function onMidDown(e) {
    try {
      if (!mine()) return;
      if (e.button !== 1) return;
      if (!settings.enabled || menuOpen) return;
      if (e.timeStamp && midStamp && e.timeStamp - midStamp < 16) return;
      midStamp = e.timeStamp || performance.now();
      if (zoomOn) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var el = pickFromPoint(e.clientX, e.clientY);
      if (!el && e.target && e.target.closest) {
        var wrap = e.target.closest("a, area");
        if (wrap) {
          var inner = wrap.querySelector && wrap.querySelector("img, video, canvas");
          if (inner && isMediaEl(inner)) el = inner;
        }
      }
      if (!el) return;
      if (!isNativeMidOpen(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
      currentEl = el;
      currentUrl = lightUrl(el);
      showHl(el);
      midArmed = true;
      midId += 1;
      var id = midId;
      clearTimeout(midTimer);
      midTimer = setTimeout(function () {
        if (id !== midId || !midArmed) return;
        startZoom(el);
      }, zoomHoldDelay());
    } catch (err) {}
  }

  document.addEventListener("mousedown", onMidDown, true);

  document.addEventListener(
    "mousemove",
    function (e) {
      if (!mine()) return;
      if (!zoomOn || !zoomDrag) return;
      zoomPan.x = zoomDrag.px + (e.clientX - zoomDrag.x);
      zoomPan.y = zoomDrag.py + (e.clientY - zoomDrag.y);
      applyZoomSize();
    },
    true
  );

  document.addEventListener(
    "mouseup",
    function (e) {
      if (!mine()) return;
      if (e.button === 0 && zoomDrag) {
        zoomDrag = null;
        if (zoomRoot) {
          var m = zoomRoot.querySelector(".aw-zoom-media");
          if (m) m.classList.remove("dragging");
        }
      }
      if (e.button !== 1) return;
      if (!midArmed) return;
      midArmed = false;
      clearTimeout(midTimer);
    },
    true
  );

  document.addEventListener(
    "auxclick",
    function (e) {
      if (!mine()) return;
      if (e.button !== 1) return;
      if (!zoomOn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
    true
  );

  document.addEventListener(
    "wheel",
    function (e) {
      if (!mine()) return;
      if (onTabSpinWheel(e)) return;
      if (!zoomOn) return;
      e.preventDefault();
      e.stopPropagation();
      var step = e.deltaY > 0 ? -20 : 20;
      zoomInspect = Math.max(100, Math.min(300, zoomInspect + step));
      applyZoomSize();
    },
    { capture: true, passive: false }
  );

  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!mine() || !alive()) return;
      if (!msg || !msg.type) return;
      if (msg.type === "awSave" || msg.type === "saveImage") {
        sendResponse({ ok: doSave() });
        return true;
      }
      if (msg.type === "awOpen") {
        sendResponse({ ok: doOpen() });
        return true;
      }
      if (msg.type === "awCopy") {
        sendResponse({ ok: doCopy() });
        return true;
      }
      if (msg.type === "awToast") {
        toast(msg.text || "");
        sendResponse({ ok: true });
        return true;
      }
      return;
    });
  } catch (e) {}

  injectCss();
  setupImageDoc();
  loadSettings(function () {
    injectCss();
    setupImageDoc();
    loadPresets();
  });
})();
