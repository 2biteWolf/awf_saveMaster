/* Injected into image tabs. Sends pixels via runtime message (not executeScript return). */
(function () {
  if (window.__awSnapOnce) return;
  window.__awSnapOnce = true;

  function send(payload) {
    try { chrome.runtime.sendMessage(payload); } catch (e) {}
  }

  function grab() {
    var img = document.querySelector("img");
    if (!img) return Promise.resolve(null);
    var w = img.naturalWidth || 0;
    var h = img.naturalHeight || 0;
    if (!w || !h) return Promise.resolve(null);
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    try {
      c.getContext("2d").drawImage(img, 0, 0);
    } catch (e) {
      return Promise.resolve(null);
    }
    var big = w * h > 1600000;
    return new Promise(function (resolve) {
      try {
        c.toBlob(function (b) {
          if (!b) return resolve(null);
          b.arrayBuffer().then(function (buf) {
            resolve({ buffer: buf, mime: b.type || (big ? "image/jpeg" : "image/png"), w: w, h: h });
          }).catch(function () { resolve(null); });
        }, big ? "image/jpeg" : "image/png", big ? 0.92 : 0.95);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function attempt(n) {
    grab().then(function (out) {
      if (out && out.buffer) {
        send({ type: "snapResult", ok: true, buffer: out.buffer, mime: out.mime, w: out.w, h: out.h });
        return;
      }
      if (n <= 0) {
        send({ type: "snapResult", ok: false });
        return;
      }
      setTimeout(function () { attempt(n - 1); }, 120);
    });
  }

  if (document.readyState === "complete") attempt(12);
  else window.addEventListener("load", function () { attempt(12); });
})();
