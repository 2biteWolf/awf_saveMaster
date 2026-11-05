/* AWF_saveMaster - Layer Scalpel: pick a layer under the aim point by hand and save it.
   Pure UI module. content.js gives it the media test and the save pipeline (window.AW_SCALPEL.create).
   It never changes page nodes: it only adds its own #aw-sm-scalpel layer and removes it on close. */
(function () {
  "use strict";

  var ROOT_ID = "aw-sm-scalpel";
  var CSS_ID = "aw-sm-scalpel-css";
  var PURPLE = "#a050ff";

  var CSS =
    "#aw-sm-scalpel{position:fixed;inset:0;z-index:2147483647;pointer-events:none}" +
    "#aw-sm-scalpel *{box-sizing:border-box;font-family:VT323,Consolas,monospace}" +
    "#aw-sm-scalpel .sc-hl{position:fixed;display:none;outline:1px solid " + PURPLE + ";box-shadow:0 0 0 1px rgba(0,0,0,.85),inset 0 0 0 1px rgba(0,0,0,.85)}" +
    "#aw-sm-scalpel .sc-cross{position:fixed;width:0;height:0}" +
    "#aw-sm-scalpel .sc-cross i{position:absolute;background:" + PURPLE + ";box-shadow:0 0 0 1px rgba(0,0,0,.8)}" +
    "#aw-sm-scalpel .sc-cross .h{left:-14px;top:0;width:28px;height:1px}" +
    "#aw-sm-scalpel .sc-cross .v{left:0;top:-14px;width:1px;height:28px}" +
    "#aw-sm-scalpel .sc-cross .o{left:-6px;top:-6px;width:13px;height:13px;background:transparent;border:1px solid " + PURPLE + ";border-radius:50%}" +
    "#aw-sm-scalpel .sc-cross.locked .o{background:rgba(160,80,255,.35)}" +
    "#aw-sm-scalpel .sc-panel{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);pointer-events:auto;" +
    "background:#222034;border:1px solid #99e550;color:#99e550;padding:8px 10px;width:300px;user-select:none}" +
    "#aw-sm-scalpel .sc-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}" +
    "#aw-sm-scalpel .sc-title{font-size:18px;color:#f4ffe4;letter-spacing:1px}" +
    "#aw-sm-scalpel .sc-mode{font-size:13px;color:" + PURPLE + "}" +
    "#aw-sm-scalpel .sc-row{display:flex;align-items:center;gap:8px}" +
    "#aw-sm-scalpel .sc-segs{flex:1;display:flex;gap:2px;height:18px}" +
    "#aw-sm-scalpel .sc-seg{flex:1;border:1px solid #99e550;background:#1a1828;cursor:pointer;min-width:4px}" +
    "#aw-sm-scalpel .sc-seg.past{background:#3b3a52}" +
    "#aw-sm-scalpel .sc-seg.on{background:" + PURPLE + ";border-color:" + PURPLE + "}" +
    "#aw-sm-scalpel .sc-seg.media{box-shadow:inset 0 -3px 0 #99e550}" +
    "#aw-sm-scalpel .sc-check{width:22px;height:22px;border:1px solid #99e550;display:flex;align-items:center;justify-content:center;font-size:18px;color:#222034;background:transparent}" +
    "#aw-sm-scalpel .sc-check.ok{background:#99e550}" +
    "#aw-sm-scalpel .sc-info{display:flex;justify-content:space-between;gap:8px;font-size:14px;margin:6px 0;color:#9dcc78}" +
    "#aw-sm-scalpel .sc-info b{color:#f4ffe4;font-weight:400}" +
    "#aw-sm-scalpel .sc-tag{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px}" +
    "#aw-sm-scalpel .sc-btns{display:grid;grid-template-columns:1fr 1fr;gap:4px}" +
    "#aw-sm-scalpel .sc-btn{border:1px solid #99e550;background:#222034;color:#99e550;font-size:16px;font-weight:700;padding:4px;text-align:center;cursor:pointer}" +
    "#aw-sm-scalpel .sc-btn:hover{background:#2e2c42}" +
    "#aw-sm-scalpel .sc-btn.save.ready{background:#99e550;color:#222034}" +
    "#aw-sm-scalpel .sc-btn.save.off{opacity:.45;cursor:default}" +
    "#aw-sm-scalpel .sc-hint{font-size:12px;color:#6a8a4a;margin-top:6px;line-height:1.25}";

  function create(api) {
    var root = null;
    var hl = null;
    var cross = null;
    var panel = null;
    var aim = { x: 0, y: 0 };
    var locked = false;
    var stack = [];
    var depth = 0;
    var raf = 0;

    function tr(k, v) { return api.tr ? api.tr(k, v) : k; }
    function isOpen() { return !!root; }
    function own(el) {
      try { return !!(el && el.closest && el.closest("#" + ROOT_ID)); } catch (e) { return false; }
    }
    function inPanel(e) { return !!(panel && e && e.target && panel.contains(e.target)); }
    function current() { return stack[depth] || null; }

    function hits(el, x, y) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    /* Media with pointer-events: none is missing from elementsFromPoint; look for it inside each layer. */
    function hiddenMedia(el, x, y, out) {
      var found = [];
      if (!el.querySelectorAll || el === document.body) return found;
      var list = el.querySelectorAll("img,video,canvas,picture,svg");
      var k;
      for (k = 0; k < list.length && k < 60; k++) {
        var m = list[k];
        if (out.indexOf(m) === -1 && found.indexOf(m) === -1 && hits(m, x, y) && api.isMedia(m)) found.push(m);
      }
      return found;
    }

    /* Element stack under (x, y), top first. Open shadow roots are expanded in place. */
    function collect(x, y) {
      var raw = [];
      try { raw = document.elementsFromPoint(x, y) || []; } catch (e) { raw = []; }
      var out = [];
      function add(el) {
        if (!el || el.nodeType !== 1 || out.indexOf(el) !== -1) return;
        if (el === document.documentElement || own(el) || (api.isAwUi && api.isAwUi(el))) return;
        out.push(el);
      }
      var i;
      for (i = 0; i < raw.length; i++) {
        var el = raw[i];
        if (el && el.shadowRoot && el.shadowRoot.elementsFromPoint) {
          var inner = [];
          try { inner = el.shadowRoot.elementsFromPoint(x, y) || []; } catch (e2) { inner = []; }
          var j;
          for (j = 0; j < inner.length; j++) if (inner[j] !== el && raw.indexOf(inner[j]) === -1) add(inner[j]);
        }
        if (el && el !== document.documentElement) hiddenMedia(el, x, y, out).forEach(add);
        add(el);
      }
      return out;
    }

    function label(el) {
      if (!el) return tr("scEmpty");
      var s = String(el.tagName || "").toLowerCase();
      if (el.id) s += "#" + el.id;
      else if (typeof el.className === "string" && el.className.trim()) s += "." + el.className.trim().split(/\s+/)[0];
      var r = el.getBoundingClientRect();
      return s + " " + Math.round(r.width) + "x" + Math.round(r.height);
    }

    function paint() {
      raf = 0;
      if (!root) return;
      stack = collect(aim.x, aim.y);
      if (depth > stack.length - 1) depth = Math.max(0, stack.length - 1);
      var el = current();
      var media = !!(el && api.isMedia(el));
      cross.style.left = Math.round(aim.x) + "px";
      cross.style.top = Math.round(aim.y) + "px";
      cross.className = "sc-cross" + (locked ? " locked" : "");
      if (el) {
        var r = el.getBoundingClientRect();
        hl.style.display = "block";
        hl.style.left = r.left + "px";
        hl.style.top = r.top + "px";
        hl.style.width = r.width + "px";
        hl.style.height = r.height + "px";
      } else {
        hl.style.display = "none";
      }
      var html = "";
      var i;
      for (i = 0; i < stack.length; i++) {
        var cls = "sc-seg" + (i === depth ? " on" : (i < depth ? " past" : "")) + (api.isMedia(stack[i]) ? " media" : "");
        html += '<div class="' + cls + '" data-d="' + i + '"></div>';
      }
      panel.querySelector(".sc-segs").innerHTML = html;
      var check = panel.querySelector(".sc-check");
      check.className = "sc-check" + (media ? " ok" : "");
      check.textContent = media ? "\u2713" : "";
      panel.querySelector(".sc-count").textContent = tr("scLayer", { n: stack.length ? depth + 1 : 0, m: stack.length });
      panel.querySelector(".sc-tag").textContent = label(el);
      panel.querySelector(".sc-mode").textContent = locked ? tr("scLocked") : tr("scFollow");
      panel.querySelector(".sc-btn.save").className = "sc-btn save " + (media ? "ready" : "off");
    }

    function refresh() {
      if (!raf) raf = requestAnimationFrame(paint);
    }

    function setDepth(d) {
      if (!stack.length) return;
      depth = Math.max(0, Math.min(stack.length - 1, d));
      paint();
    }

    function eat(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    function onMove(e) {
      if (locked || inPanel(e)) return;
      aim.x = e.clientX;
      aim.y = e.clientY;
      refresh();
    }

    function onPointer(e) {
      if (inPanel(e)) return;
      eat(e);
      if (e.type === "click" && e.button === 0) {
        locked = !locked;
        if (!locked) { aim.x = e.clientX; aim.y = e.clientY; }
        paint();
      }
    }

    function onWheel(e) {
      eat(e);
      setDepth(depth + (e.deltaY > 0 ? 1 : -1));
    }

    function onKey(e) {
      var c = e.code;
      eat(e);
      if (e.type !== "keydown") return;
      if (c === "Escape") close();
      else if (c === "ArrowRight" || c === "ArrowDown" || c === "BracketRight") setDepth(depth + 1);
      else if (c === "ArrowLeft" || c === "ArrowUp" || c === "BracketLeft") setDepth(depth - 1);
      else if (c === "Space") { locked = !locked; paint(); }
      else if (c === "KeyS" || c === "Enter" || c === "NumpadEnter") save();
    }

    function onView() { refresh(); }

    var POINTER = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "auxclick"];
    var KEYS = ["keydown", "keyup", "keypress"];

    function listen(on) {
      var fn = on ? "addEventListener" : "removeEventListener";
      window[fn]("mousemove", onMove, true);
      window[fn]("wheel", onWheel, { capture: true, passive: false });
      window[fn]("scroll", onView, true);
      window[fn]("resize", onView, true);
      POINTER.forEach(function (t) { window[fn](t, onPointer, true); });
      KEYS.forEach(function (t) { window[fn](t, onKey, true); });
    }

    function build() {
      var css = document.getElementById(CSS_ID);
      if (!css) {
        css = document.createElement("style");
        css.id = CSS_ID;
        (document.head || document.documentElement).appendChild(css);
      }
      css.textContent = CSS;
      root = document.createElement("div");
      root.id = ROOT_ID;
      root.innerHTML =
        '<div class="sc-hl"></div>' +
        '<div class="sc-cross"><i class="h"></i><i class="v"></i><i class="o"></i></div>' +
        '<div class="sc-panel">' +
        '<div class="sc-top"><span class="sc-title"></span><span class="sc-mode"></span></div>' +
        '<div class="sc-row"><div class="sc-segs"></div><div class="sc-check"></div></div>' +
        '<div class="sc-info"><b class="sc-count"></b><span class="sc-tag"></span></div>' +
        '<div class="sc-btns"><div class="sc-btn save"></div><div class="sc-btn close"></div></div>' +
        '<div class="sc-hint"></div>' +
        "</div>";
      document.documentElement.appendChild(root);
      hl = root.querySelector(".sc-hl");
      cross = root.querySelector(".sc-cross");
      panel = root.querySelector(".sc-panel");
      panel.querySelector(".sc-title").textContent = tr("scTitle");
      panel.querySelector(".sc-btn.save").textContent = tr("scSave");
      panel.querySelector(".sc-btn.close").textContent = tr("scClose");
      panel.querySelector(".sc-hint").textContent = tr("scHint");
      panel.addEventListener("click", function (e) {
        var t = e.target;
        var seg = t.closest && t.closest(".sc-seg");
        if (seg) setDepth(parseInt(seg.getAttribute("data-d"), 10) || 0);
        else if (t.closest && t.closest(".sc-btn.save")) save();
        else if (t.closest && t.closest(".sc-btn.close")) close();
        e.preventDefault();
        e.stopPropagation();
      });
    }

    /* at: optional {x, y}; default is the middle of the window. */
    function open(at) {
      if (root) close();
      build();
      var vw = document.documentElement.clientWidth || innerWidth;
      var vh = document.documentElement.clientHeight || innerHeight;
      aim.x = at && isFinite(at.x) ? at.x : vw / 2;
      aim.y = at && isFinite(at.y) ? at.y : vh / 2;
      locked = false;
      depth = 0;
      listen(true);
      paint();
      if (api.log) api.log("scalpel-open", "Layer Scalpel opened", { steps: ["layers=" + stack.length] });
    }

    function close() {
      if (!root) return;
      listen(false);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      root.remove();
      var css = document.getElementById(CSS_ID);
      if (css) css.remove();
      root = hl = cross = panel = null;
      stack = [];
      if (api.onClose) api.onClose();
    }

    function save() {
      if (!root) return;
      paint();
      var el = current();
      if (!el || !api.isMedia(el)) {
        if (api.toast) api.toast(tr("scNoMedia"));
        return;
      }
      var info = {
        depth: depth + 1,
        layers: stack.length,
        tag: label(el),
        above: stack.slice(0, depth).map(label)
      };
      close();
      api.save(el, info);
    }

    return { open: open, close: close, isOpen: isOpen, save: save };
  }

  window.AW_SCALPEL = { create: create };
})();
