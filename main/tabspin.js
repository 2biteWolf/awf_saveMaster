/* Browser-wide tab-spin overlay. Independent of the HUD. */
(function () {
  "use strict";
  if (window !== window.top) return;
  if (window.__AW_TABSPIN_CS) return;
  window.__AW_TABSPIN_CS = true;

  var on = false;
  var root = null;
  var last = 0;

  function alive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  }

  function send(msg) {
    if (!alive()) return;
    try {
      chrome.runtime.sendMessage(msg, function () {
        try { void chrome.runtime.lastError; } catch (e) {}
      });
    } catch (e) {}
  }

  function eat(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function isSaveCombo(e) {
    if (e.code === "KeyC" && e.altKey && !e.ctrlKey && !e.metaKey) return true;
    if (e.code === "KeyK" && e.ctrlKey && !e.altKey && !e.metaKey) return true;
    return false;
  }

  function show() {
    if (root) return;
    root = document.createElement("div");
    root.id = "aw-tabspin-root";
    root.innerHTML = '<div class="aw-tabspin-bar">TAB SPIN · wheel = tabs · click or Alt+C exits</div>';
    var s = document.createElement("style");
    s.textContent =
      "#aw-tabspin-root{position:fixed;inset:0;z-index:2147483646;background:transparent;cursor:default;pointer-events:auto}" +
      "#aw-tabspin-root .aw-tabspin-bar{position:fixed;left:50%;top:10px;transform:translateX(-50%);pointer-events:none;" +
      "background:#222034;color:#99e550;border:1px solid #99e550;font:14px VT323,Consolas,monospace;padding:6px 12px;" +
      "letter-spacing:1px;box-shadow:0 0 0 1px #222034,0 0 0 2px #99e550}";
    root.appendChild(s);
    (document.documentElement || document.body).appendChild(root);
  }

  function hide() {
    if (!root) return;
    try { root.remove(); } catch (e) {}
    root = null;
  }

  function setOn(v) {
    on = !!v;
    if (on) show();
    else hide();
  }

  function stop() {
    if (!on) return;
    setOn(false);
    send({ type: "tabSpinStop" });
  }

  function onWheel(e) {
    if (!on) return;
    eat(e);
    var now = performance.now();
    if (now - last < 35) return;
    last = now;
    send({ type: "cycleTab", dir: e.deltaY < 0 ? 1 : -1 });
  }

  function onPointer(e) {
    if (!on) return;
    if (e.type === "contextmenu" || e.button === 2) return;
    if (e.button !== 0) {
      eat(e);
      return;
    }
    eat(e);
    stop();
  }

  function onKey(e) {
    if (!on) return;
    eat(e);
    if (e.type === "keydown" && isSaveCombo(e)) stop();
  }

  ["wheel"].forEach(function (ev) {
    document.addEventListener(ev, onWheel, { capture: true, passive: false });
  });
  ["mousedown", "mouseup", "click", "auxclick", "pointerdown"].forEach(function (ev) {
    document.addEventListener(ev, onPointer, true);
  });
  ["keydown", "keyup", "keypress"].forEach(function (ev) {
    document.addEventListener(ev, onKey, true);
  });

  try {
    chrome.storage.local.get(["awTabSpin"], function (res) {
      setOn(!!(res && res.awTabSpin));
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local" || !changes.awTabSpin) return;
      setOn(!!changes.awTabSpin.newValue);
    });
    chrome.runtime.onMessage.addListener(function (msg) {
      if (!msg || msg.type !== "tabSpinPaint") return;
      setOn(!!msg.on);
    });
  } catch (e) {}
})();
