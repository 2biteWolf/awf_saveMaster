/* Block Opera GX Alt menu. Does not eat Alt+letter combos — only the Alt key itself. */
(function () {
  window.__AW_AG_GEN = (window.__AW_AG_GEN || 0) + 1;
  var myGen = window.__AW_AG_GEN;
  function mine() { return myGen === window.__AW_AG_GEN; }
  var blockAlt = true;
  var keys = {
    keySave: "Ctrl+K",
    keySave2: "Alt+C",
    keyPin: "Alt+Z",
    keyOpen: "Alt+Q",
    keyCopy: "Alt+V",
    holdMenuMs: 1000,
    enabled: true
  };
  window.__AW_KEYS = keys;

  function readKeys(items) {
    items = items || {};
    keys.keySave = items.keySave || "Ctrl+K";
    keys.keySave2 = items.keySave2 || "Alt+C";
    keys.keyPin = items.keyPin || "Alt+Z";
    keys.keyOpen = items.keyOpen || "Alt+Q";
    keys.keyCopy = items.keyCopy || "Alt+V";
    keys.holdMenuMs = items.holdMenuMs || 1000;
    keys.enabled = items.enabled !== false;
    keys.lang = items.lang || "";
    window.__AW_KEYS = keys;
  }

  try {
    chrome.storage.sync.get(AW.DEFAULTS, function (items) {
      readKeys(items);
      blockAlt = items.blockAlt !== false && items.enabled !== false;
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync") return;
      if (changes.blockAlt) blockAlt = changes.blockAlt.newValue !== false;
      if (changes.enabled && changes.enabled.newValue === false) blockAlt = false;
      if (changes.enabled && changes.enabled.newValue === true) {
        chrome.storage.sync.get(AW.DEFAULTS, function (items) {
          blockAlt = items.blockAlt !== false;
        });
      }
      var watch = ["keySave", "keySave2", "keyPin", "keyOpen", "keyCopy", "holdMenuMs", "enabled", "lang"];
      var touched = false;
      var i;
      for (i = 0; i < watch.length; i++) if (changes[watch[i]]) touched = true;
      if (touched) {
        chrome.storage.sync.get(AW.DEFAULTS, function (items) { readKeys(items); });
      }
    });
  } catch (e) {}

  function eat(e) {
    try { e.preventDefault(); } catch (err) {}
    try { e.stopPropagation(); } catch (err2) {}
    try { e.stopImmediatePropagation(); } catch (err3) {}
  }

  function fire(detail) {
    try { document.dispatchEvent(new CustomEvent("aw-sm-key", { detail: detail })); } catch (err) {}
  }

  function saveHit(e) {
    if (!e) return false;
    if (window.AW && AW.eventMatches) {
      return AW.eventMatches(e, keys.keySave) || AW.eventMatches(e, keys.keySave2);
    }
    if (e.code === "KeyK" && e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) return true;
    if (e.code === "KeyC" && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) return true;
    return false;
  }

  function keyLine(e) {
    var tag = "";
    var id = "";
    var editable = false;
    try {
      var t = e.target;
      tag = (t && t.tagName) || "";
      id = (t && t.id) || "";
      editable = !!(t && (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"));
    } catch (err) {}
    return (e.code || e.key || "?")
      + " ctrl=" + !!e.ctrlKey
      + " alt=" + !!e.altKey
      + " shift=" + !!e.shiftKey
      + " meta=" + !!e.metaKey
      + " repeat=" + !!e.repeat
      + " defaultBefore=" + !!e.defaultPrevented
      + " target=" + tag + (id ? "#" + id : "")
      + " editable=" + editable
      + " save=" + (keys.keySave || "")
      + " save2=" + (keys.keySave2 || "");
  }

  function logKey(code, why, e) {
    var line = e ? keyLine(e) : "";
    var page = "";
    try { page = String(location.href || "").slice(0, 300); } catch (err) {}
    try {
      chrome.runtime.sendMessage({
        type: "devLog",
        action: "key",
        code: code,
        where: "alt-guard",
        why: why,
        key: line,
        written: false,
        page: page,
        steps: [why, line, "defaultPreventedAfter=" + !!(e && e.defaultPrevented)]
      }, function () { try { void chrome.runtime.lastError; } catch (err2) {} });
    } catch (err3) {}
  }

  var holdTimer = null;
  var holdCode = "";
  var holdDown = 0;

  function onKeyDown(e) {
    if (!mine()) return;
    if (!keys.enabled) {
      if (saveHit(e)) logKey("key-disabled", "extension is off, combo was not eaten, the address bar can take it", e);
      return;
    }
    if (saveHit(e)) {
      if (e.repeat) {
        eat(e);
        return;
      }
      var before = !!e.defaultPrevented;
      eat(e);
      logKey("key-eaten", before
        ? "save combo already cancelled by the page; eaten again so it cannot reach the address bar"
        : "save combo eaten on the page so the address bar does not take it", e);
      holdCode = e.code;
      holdDown = e.timeStamp || Date.now();
      clearTimeout(holdTimer);
      fire({ kind: "down", code: e.code, t: holdDown });
      holdTimer = setTimeout(function () {
        fire({ kind: "hold", code: holdCode, t: Date.now() });
      }, keys.holdMenuMs || 1000);
      return;
    }
    var omnibox = (e.ctrlKey || e.metaKey) && !e.altKey && (e.code === "KeyK" || e.code === "KeyE" || e.code === "KeyL");
    if (omnibox && !e.repeat) {
      logKey("key-not-ours", "address-bar combo reached the page and does not match the saved key, so it was left for the browser", e);
    }
    if (!window.AW || !AW.eventMatches || e.repeat) return;
    if (AW.eventMatches(e, keys.keyPin)) { eat(e); fire({ kind: "pin" }); }
    else if (AW.eventMatches(e, keys.keyOpen)) { eat(e); fire({ kind: "open" }); }
    else if (AW.eventMatches(e, keys.keyCopy)) { eat(e); fire({ kind: "copy" }); }
  }

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keypress", function (e) {
    if (!mine() || !keys.enabled || !saveHit(e)) return;
    eat(e);
  }, true);

  window.addEventListener("keyup", function (e) {
    if (!mine() || !holdCode || e.code !== holdCode) return;
    clearTimeout(holdTimer);
    holdTimer = null;
    var t = e.timeStamp || Date.now();
    var held = t - holdDown;
    holdCode = "";
    fire({ kind: "up", code: e.code, t: t, down: holdDown });
    eat(e);
    logKey("key-up", "save key released after " + Math.round(held) + "ms", e);
  }, true);

  function isBareAlt(e) {
    return (
      (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.metaKey
    );
  }

  document.addEventListener(
    "keydown",
    function (e) {
      if (!mine()) return;
      if (!blockAlt || !isBareAlt(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
    true
  );

  document.addEventListener(
    "keyup",
    function (e) {
      if (!mine()) return;
      if (!blockAlt || !isBareAlt(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
    true
  );
})();
