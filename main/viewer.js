/* AWF_saveMaster viewer — persistent history, back = previous closed image */
(function () {
  var params = new URLSearchParams(location.search);
  var hid = params.get("hid") || "";
  var img = document.getElementById("img");
  var vid = document.getElementById("vid");
  var toastEl = document.getElementById("toast");
  var list = [];
  var index = 0;
  var item = null;
  var mode = "none";
  var bg = "#000000";
  var settings = AW.merge(null);

  function toast(text, ms) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 2400);
  }

  function shown() {
    return vid.style.display === "block" ? vid : img;
  }

  function applyMode(m) {
    mode = m;
    var root = document.documentElement;
    var body = document.body;
    var media = shown();
    root.style.cssText = "margin:0;padding:0;width:100%;height:100%;background:" + bg + ";";
    body.style.cssText = "margin:0;padding:0;background:" + bg + ";";
    var base = "border:0;padding:0;background:transparent;";
    img.style.cssText = base + "display:none;cursor:default;";
    vid.style.cssText = base + "display:none;";
    media.style.display = "block";
    if (m === "none") {
      body.style.minHeight = "100vh";
      body.style.display = "flex";
      body.style.alignItems = "center";
      body.style.justifyContent = "center";
      media.style.width = "auto";
      media.style.height = "auto";
      media.style.maxWidth = "100vw";
      media.style.maxHeight = "100vh";
    } else if (m === "vertical") {
      media.style.height = "100vh";
      media.style.width = "auto";
      media.style.margin = "0 auto";
    } else if (m === "fill") {
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
      media.style.width = "100vw";
      media.style.height = "100vh";
      media.style.objectFit = "fill";
    } else if (m === "horizontal") {
      media.style.width = "100vw";
      media.style.height = "auto";
      media.style.objectFit = "contain";
    }
    var w = media.naturalWidth || media.videoWidth || "?";
    var h = media.naturalHeight || media.videoHeight || "?";
    toast(w + "x" + h + " · " + (AW.MODE_LABELS[m] || m) + " · " + (index + 1) + "/" + list.length);
  }

  function srcOf(it) {
    if (!it) return "";
    if (it._blobUrl) return it._blobUrl;
    if (it.dataUrl && it.dataUrl.length > 80) return it.dataUrl;
    return "";
  }

  function usable(it) {
    return !!(it && (it._blobUrl || it.dataUrl || it.hasBlob || (it.url && it.url.indexOf("http") === 0)));
  }

  function attachBlob(it, blob) {
    if (!it || !blob) return it;
    if (it._blobUrl) {
      try { URL.revokeObjectURL(it._blobUrl); } catch (e) {}
      it._blobUrl = "";
    }
    if (typeof blob === "string") {
      if (blob.indexOf("data:") === 0) it.dataUrl = blob;
      else it._blobUrl = blob;
      return it;
    }
    var typed = AW.imageBlob(blob, it.mime);
    if (!typed) return it;
    it.mime = typed.type || it.mime;
    it._blobUrl = URL.createObjectURL(typed);
    return it;
  }

  function idbGetLocal(id) {
    return new Promise(function (resolve) {
      if (!id) return resolve(null);
      var req = indexedDB.open("aw_saveMaster", 1);
      req.onerror = function () { resolve(null); };
      req.onsuccess = function () {
        try {
          var db = req.result;
          if (!db.objectStoreNames.contains("blobs")) return resolve(null);
          var tx = db.transaction("blobs", "readonly");
          var g = tx.objectStore("blobs").get(id);
          g.onsuccess = function () { resolve(g.result || null); };
          g.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      };
    });
  }

  function refetch(it) {
    var page = it && it.url;
    if (!page || page.indexOf("http") !== 0) return Promise.resolve(it);
    return fetch(page).then(function (r) {
      if (!r.ok) throw new Error("http");
      return r.blob();
    }).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
      var mime = AW.sniffMime(buf);
      if (!mime) return it;
      attachBlob(it, new Blob([buf], { type: mime }));
      chrome.runtime.sendMessage({
        type: "putHistoryBlob",
        id: it.id,
        b64: AW.bufToB64(buf),
        mime: mime
      }, function () {});
      return it;
    }).catch(function () { return it; });
  }

  function hydrate(it) {
    if (!it) return Promise.resolve(it);
    if (srcOf(it)) return Promise.resolve(it);
    if (AW.kindOf && AW.kindOf(it.mime) === "video" && it.url && it.url.indexOf("http") === 0) return Promise.resolve(it);
    return idbGetLocal(it.id).then(function (data) {
      if (typeof data === "string" && data.indexOf("data:image/") === 0) {
        it.dataUrl = data;
        return it;
      }
      if (data && AW.imageBlob(data, it.mime)) return attachBlob(it, data);
      return refetch(it);
    });
  }

  function isVideoItem(it, src) {
    if (it && AW.kindOf && AW.kindOf(it.mime) === "video") return true;
    return /\.(mp4|webm|avi)(\?|#|$)/i.test(String(src || ""));
  }

  function paint(it) {
    var src = srcOf(it);
    if (!src && it.url && it.url.indexOf("http") === 0) src = it.url;
    if (!src) {
      toast("No data for this entry");
      img.removeAttribute("src");
      vid.removeAttribute("src");
      return;
    }
    var video = isVideoItem(it, src);
    if (video) {
      img.removeAttribute("src");
      vid.onloadeddata = function () { applyMode(mode); };
      vid.onerror = function () {
        toast((it.mime === "video/x-msvideo") ? "AVI preview is not supported in this window" : "Load failed");
      };
      vid.src = src;
      vid.style.display = "block";
      img.style.display = "none";
    } else {
      try { vid.pause(); } catch (e) {}
      vid.removeAttribute("src");
      vid.style.display = "none";
      img.style.display = "block";
      img.onload = function () { applyMode(mode); };
      img.onerror = function () {
        if (it.url && it.url !== src && it.url.indexOf("http") === 0) {
          img.onerror = function () { toast("Load failed"); };
          img.src = it.url;
          return;
        }
        toast("Load failed");
      };
      img.src = src;
    }
    paintFmt(it);
    var url = "viewer.html?hid=" + encodeURIComponent(it.id);
    if (paint._push) history.pushState({ hid: it.id, i: index }, "", url);
    else history.replaceState({ hid: it.id, i: index }, "", url);
  }

  function showIndex(i, push) {
    if (!list.length) {
      toast("History empty");
      return;
    }
    if (i < 0) i = 0;
    if (i >= list.length) i = list.length - 1;
    index = i;
    item = list[i];
    paint._push = !!push;
    renderDrawer();
    toast("Loading…", 1200);
    hydrate(item).then(function (it) {
      list[i] = it;
      item = it;
      paint(it);
    });
  }

  function renderDrawer() {
    var box = document.getElementById("histList");
    if (!box) return;
    box.innerHTML = "";
    list.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hist-item" + (i === index ? " current" : "");
      var im;
      if (it && AW.kindOf && AW.kindOf(it.mime) === "video") {
        im = document.createElement("video");
        im.muted = true;
        im.preload = "metadata";
      } else {
        im = document.createElement("img");
      }
      im.alt = String(i + 1);
      var src = srcOf(it);
      if (src) im.src = src;
      else {
        hydrate(it).then(function (done) {
          list[i] = done;
          var s = srcOf(done);
          if (s && im.isConnected) im.src = s;
        });
      }
      b.appendChild(im);
      b.addEventListener("click", function (e) {
        e.preventDefault();
        showIndex(i, true);
      });
      box.appendChild(b);
    });
  }

  var drawer = document.getElementById("histDrawer");
  var histBtn = document.getElementById("histToggle");
  histBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var on = drawer.classList.toggle("open");
    histBtn.textContent = on ? "‹" : "›";
  });

  function anchorSave(blob, name) {
    var file = String(name || "image.jpg").split("/").pop();
    var u = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = u;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 60000);
    toast("Saved: " + (name || file), 3000);
  }

  function chosenFmt(it) {
    var mime = (it && it.mime) || "";
    var saved = it && it.exportFmt;
    if (saved && AW.pickFormat(mime, saved) === saved) return saved;
    return AW.defaultFormat(mime);
  }

  function paintFmt(it) {
    var btn = document.getElementById("saveAsBtn");
    var menu = document.getElementById("fmtMenu");
    if (!btn || !menu) return;
    var cur = chosenFmt(it || item);
    var spec = AW.formatById(cur);
    btn.textContent = "save as " + (spec ? spec.label : "PNG");
    var buttons = menu.querySelectorAll("button");
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].className = buttons[i].getAttribute("data-fmt") === cur ? "on" : "";
    }
  }

  function encodeStill(blob, mime) {
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
            if (!out || out.size < 64) reject(new Error("encode"));
            else resolve(out);
          }, mime, 0.92);
        } catch (e2) {
          try { URL.revokeObjectURL(u); } catch (e3) {}
          reject(e2);
        }
      };
      im.onerror = function () {
        try { URL.revokeObjectURL(u); } catch (e4) {}
        reject(new Error("encode"));
      };
      im.src = u;
    });
  }

  function saveAsFormat(fmtId) {
    var src = srcOf(item) || ((item && item.url && item.url.indexOf("http") === 0) ? item.url : "");
    if (!src) {
      toast("No data for this entry");
      return;
    }
    fetch(src).then(function (r) {
      if (!r.ok) throw new Error("http");
      return r.blob();
    }).then(function (b) { return b.arrayBuffer().then(function (buf) { return { buf: buf, blob: b }; }); }).then(function (got) {
      var mime = (AW.sniffMime && AW.sniffMime(got.buf)) || (item && item.mime) || "";
      if (item && mime) item.mime = mime;
      var eff = AW.pickFormat(mime, fmtId);
      if (eff !== fmtId) toast(fmtId + " not for this file, using " + eff);
      if (item) item.exportFmt = eff;
      paintFmt(item);
      if (item && item.id) {
        chrome.runtime.sendMessage({ type: "setExportFmt", id: item.id, fmt: eff }, function () {});
      }
      var spec = AW.formatById(eff);
      var typed = new Blob([got.buf], { type: mime });
      var same = spec && spec.mime === mime;
      var next = same ? Promise.resolve(typed) : encodeStill(typed, spec.mime);
      return next.then(function (out) {
        return out.arrayBuffer().then(function (buf) {
          var outMime = (AW.sniffMime && AW.sniffMime(buf)) || out.type;
          if (buf.byteLength > 8000000 && item && item.url && item.url.indexOf("http") === 0 && same) {
            chrome.runtime.sendMessage({ type: "downloadMedia", url: item.url, filenameHint: "" }, function (r) {
              toast(r && r.ok ? ("Saved: " + (r.filename || spec.label)) : "Save failed", 3000);
            });
            return;
          }
          chrome.runtime.sendMessage({
            type: "downloadPacked",
            b64: AW.bufToB64(buf),
            mime: outMime,
            url: (item && item.url && item.url.indexOf("http") === 0) ? item.url : "",
            filenameHint: ""
          }, function (r) {
            if (chrome.runtime.lastError || !r || !r.ok) anchorSave(new Blob([buf], { type: outMime }), (r && r.filename) || ("file" + (spec ? AW.extForMime(spec.mime) : "")));
            else toast("Saved: " + (r.filename || spec.label), 3000);
          });
        });
      });
    }).catch(function () { toast("Save failed", 2000); });
  }

  function buildFmtMenu() {
    var menu = document.getElementById("fmtMenu");
    if (!menu || menu.childNodes.length) return;
    AW.FORMATS.forEach(function (f) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-fmt", f.id);
      b.textContent = f.label;
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove("open");
        saveAsFormat(f.id);
      });
      menu.appendChild(b);
    });
  }

  function saveNow() {
    var src = (item && item.url && item.url.indexOf("http") === 0 && item.url) || srcOf(item) || (img && img.currentSrc) || "";
    function fromCanvas() {
      return new Promise(function (resolve, reject) {
        if (!img || !img.naturalWidth) return reject(new Error("canvas"));
        try {
          var c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error("blob")); }, "image/png");
        } catch (e) { reject(e); }
      });
    }
    function checked(b) {
      return b.arrayBuffer().then(function (buf) {
        var mime = AW.sniffMime(buf);
        if (!mime || buf.byteLength < 64) throw new Error("bad");
        return new Blob([buf], { type: mime });
      });
    }
    var got = src
      ? fetch(src).then(function (r) {
        if (!r.ok) throw new Error("http");
        return r.blob();
      }).then(checked)
      : Promise.reject(new Error("nosrc"));
    got.catch(function () { return fromCanvas().then(checked); }).then(function (blob) {
      var motion = AW.isMotion && AW.isMotion(blob.type);
      var next = (!motion && settings.saveAsPng && blob.type !== "image/png")
        ? new Promise(function (resolve, reject) {
          var u = URL.createObjectURL(blob);
          var im = new Image();
          im.onload = function () {
            var c = document.createElement("canvas");
            c.width = im.naturalWidth;
            c.height = im.naturalHeight;
            c.getContext("2d").drawImage(im, 0, 0);
            c.toBlob(function (out) {
              try { URL.revokeObjectURL(u); } catch (e) {}
              if (!out) reject(new Error("png"));
              else resolve(out);
            }, "image/png");
          };
          im.onerror = function () { try { URL.revokeObjectURL(u); } catch (e) {} reject(new Error("png")); };
          im.src = u;
        })
        : Promise.resolve(blob);
      return next.then(function (out) { return checked(out); });
    }).then(function (blob) {
      blob.arrayBuffer().then(function (buf) {
        chrome.runtime.sendMessage({
          type: "downloadPacked",
          b64: AW.bufToB64(buf),
          mime: blob.type,
          url: (item && item.url && item.url.indexOf("http") === 0) ? item.url : "",
          filenameHint: ""
        }, function (r) {
          if (chrome.runtime.lastError || !r || !r.ok) anchorSave(blob, (r && r.filename) || "image.jpg");
          else toast("Saved: " + (r.filename || "file"), 3000);
        });
      });
    }).catch(function () { toast("Save failed", 2000); });
  }

  Promise.all([
    new Promise(function (r) { chrome.runtime.sendMessage({ type: "getSettings" }, r); }),
    new Promise(function (r) { chrome.runtime.sendMessage({ type: "getHistory" }, r); })
  ]).then(function (results) {
    settings = AW.merge(results[0]);
    list = (results[1] && results[1].list) || [];
    mode = settings.fitMode || "none";
    if (AW.MODES.indexOf(mode) === -1) mode = "none";
    bg = settings.background || "#000000";
    index = 0;
    if (hid) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === hid) { index = i; break; }
      }
    }
    if (!list.length && hid) {
      chrome.runtime.sendMessage({ type: "getHistoryItem", id: hid }, function (res) {
        if (res && res.item) {
          if (res.blob) attachBlob(res.item, res.blob);
          list = [res.item];
          showIndex(0, false);
        } else toast("Image data missing — reopen the original tab");
      });
      return;
    }
    showIndex(index, false);
  });

  img.addEventListener("click", function () {
    var i = AW.MODES.indexOf(mode);
    var next = AW.MODES[(i + 1) % AW.MODES.length];
    applyMode(next);
    try {
      chrome.storage.sync.set({ fitMode: next });
      chrome.storage.local.set({ fitMode: next });
    } catch (e) {}
  });

  window.addEventListener("popstate", function (e) {
    if (e.state && typeof e.state.i === "number") showIndex(e.state.i, false);
    else showIndex(index + 1, false);
  });

  window.addEventListener("keydown", function (e) {
    if (document.getElementById("aw-sm-root")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveNow();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "Backspace") {
      e.preventDefault();
      showIndex(index + 1, true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      showIndex(index - 1, true);
    } else if (e.key === "Escape") {
      /* stay */
    }
  }, true);

  document.getElementById("prev").addEventListener("click", function () { showIndex(index + 1, true); });
  document.getElementById("next").addEventListener("click", function () { showIndex(index - 1, true); });
  document.getElementById("savebtn").addEventListener("click", saveNow);
  buildFmtMenu();
  var saveAsBtn = document.getElementById("saveAsBtn");
  var fmtMenu = document.getElementById("fmtMenu");
  saveAsBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    paintFmt(item);
    fmtMenu.classList.toggle("open");
  });
  document.addEventListener("click", function () { fmtMenu.classList.remove("open"); });

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && (msg.type === "awSave" || msg.type === "saveImage")) saveNow();
  });
})();
