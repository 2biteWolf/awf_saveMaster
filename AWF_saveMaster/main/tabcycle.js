/* Always-on: wheel cycles tabs on quiet image pages (data:image, viewer, image docs). Not a mode. */
(function () {
  "use strict";
  if (window !== window.top) return;
  if (window.__AW_TABCYCLE_CS) return;
  window.__AW_TABCYCLE_CS = true;

  var last = 0;

  function alive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  }

  function href() {
    try { return String(location.href || ""); } catch (e) { return ""; }
  }

  function isDataImage() {
    return /^data:image\//i.test(href());
  }

  function isImageLike() {
    var u = href();
    if (isDataImage()) return true;
    if (/^blob:/i.test(u)) return true;
    if (/viewer\.html/i.test(u)) return true;
    try {
      if (document.contentType && document.contentType.indexOf("image/") === 0) return true;
    } catch (e) {}
    var path = "";
    try { path = (location.pathname || "").split("#")[0].split("?")[0]; } catch (e2) {}
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
  }

  function pageScrolls() {
    try {
      var el = document.scrollingElement || document.documentElement;
      if (!el) return false;
      return el.scrollHeight > el.clientHeight + 12 || el.scrollWidth > el.clientWidth + 12;
    } catch (e) {
      return false;
    }
  }

  function blocked() {
    try {
      if (document.getElementById("aw-tabspin-root")) return true;
      if (document.getElementById("aw-sm-root")) return true;
      if (document.getElementById("aw-sm-zoom")) return true;
    } catch (e) {}
    return false;
  }

  function shouldCycle() {
    if (!isImageLike()) return false;
    if (isDataImage()) return true;
    if (pageScrolls()) return false;
    return true;
  }

  document.addEventListener(
    "wheel",
    function (e) {
      if (!alive()) return;
      if (blocked()) return;
      if (!shouldCycle()) return;
      e.preventDefault();
      e.stopPropagation();
      var now = performance.now();
      if (now - last < 40) return;
      last = now;
      try {
        chrome.runtime.sendMessage(
          { type: "cycleTab", dir: e.deltaY < 0 ? 1 : -1 },
          function () {
            try { void chrome.runtime.lastError; } catch (err) {}
          }
        );
      } catch (err) {}
    },
    { capture: true, passive: false }
  );
})();
