(function () {
  if (typeof AW === "undefined") return;
  var BOOLS = [
    "blockAlt",
    "highlightEnabled",
    "saveAsPng",
    "customPathEnabled",
    "renameEnabled",
    "copyMediaFile",
    "interceptImages"
  ];

  function setFlag(el, on) {
    if (!el) return;
    el.textContent = on ? "ON" : "OFF";
    el.className = on ? "on" : "off";
  }

  function load() {
    var path = document.getElementById("customPath");
    var tpl = document.getElementById("renameTemplate");
    var toastMs = document.getElementById("toastMs");
    var vToast = document.getElementById("v-toastMs");
    var holdEl = document.getElementById("holdMenuMs");
    var vHold = document.getElementById("v-holdMenuMs");
    chrome.storage.sync.get(AW.DEFAULTS, function (s) {
      s = s || {};
      BOOLS.forEach(function (k) {
        var span = document.getElementById("v-" + k);
        if (span) setFlag(span, !!s[k]);
      });
      if (path) path.value = s.customPath || "";
      if (tpl) tpl.value = s.renameTemplate || "";
      if (toastMs) toastMs.value = s.toastMs || 5000;
      if (vToast) vToast.textContent = String(s.toastMs || 5000);
      var hold = s.holdMenuMs || 1000;
      if (holdEl) holdEl.value = hold;
      if (vHold) vHold.textContent = (hold / 1000).toFixed(2) + "s";
      var alt = s.altMenuScale || 100;
      var altEl = document.getElementById("altMenuScale");
      var vAlt = document.getElementById("v-altMenuScale");
      if (altEl) altEl.value = alt;
      if (vAlt) vAlt.textContent = alt + "%";
      var zHold = s.zoomHoldMs || hold;
      var zEl = document.getElementById("zoomHoldMs");
      var vZ = document.getElementById("v-zoomHoldMs");
      if (zEl) zEl.value = zHold;
      if (vZ) vZ.textContent = (zHold / 1000).toFixed(2) + "s";
      paintMode("altHoldMode", s.altHoldMode || "x2");
      paintMode("pierceMode", (s.pierceMode === "off") ? "off" : "auto");
    });
  }

  function paintMode(id, val) {
    var box = document.getElementById(id);
    if (!box) return;
    var btns = box.querySelectorAll("button");
    var i;
    for (i = 0; i < btns.length; i++) {
      btns[i].className = btns[i].getAttribute("data-v") === val ? "on" : "";
    }
  }

  function status(text) {
    var el = document.getElementById("status");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  BOOLS.forEach(function (k) {
    var row = document.querySelector('.row[data-key="' + k + '"]');
    if (!row) return;
    row.addEventListener("click", function () {
      chrome.storage.sync.get(AW.DEFAULTS, function (s) {
        var next = !s[k];
        var patch = {};
        patch[k] = next;
        chrome.storage.sync.set(patch, function () {
          setFlag(document.getElementById("v-" + k), next);
          status(k + " → " + (next ? "ON" : "OFF"));
        });
      });
    });
  });

  var toastMsEl = document.getElementById("toastMs");
  if (toastMsEl) toastMsEl.addEventListener("input", function () {
    var v = document.getElementById("v-toastMs");
    if (v) v.textContent = this.value;
    chrome.storage.sync.set({ toastMs: parseInt(this.value, 10) || 5000 });
  });

  var holdMenuEl = document.getElementById("holdMenuMs");
  if (holdMenuEl) holdMenuEl.addEventListener("input", function () {
    var v = parseInt(this.value, 10) || 1000;
    var lab = document.getElementById("v-holdMenuMs");
    if (lab) lab.textContent = (v / 1000).toFixed(2) + "s";
    chrome.storage.sync.set({ holdMenuMs: v });
  });

  var altScaleEl = document.getElementById("altMenuScale");
  if (altScaleEl) altScaleEl.addEventListener("input", function () {
    var v = parseInt(this.value, 10) || 100;
    var lab = document.getElementById("v-altMenuScale");
    if (lab) lab.textContent = v + "%";
    chrome.storage.sync.set({ altMenuScale: v });
  });

  var zoomHoldEl = document.getElementById("zoomHoldMs");
  if (zoomHoldEl) zoomHoldEl.addEventListener("input", function () {
    var v = parseInt(this.value, 10) || 1000;
    var lab = document.getElementById("v-zoomHoldMs");
    if (lab) lab.textContent = (v / 1000).toFixed(2) + "s";
    chrome.storage.sync.set({ zoomHoldMs: v });
  });

  var pierceBox = document.getElementById("pierceMode");
  if (pierceBox) {
    pierceBox.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("button[data-v]") : null;
      if (!btn) return;
      var v = btn.getAttribute("data-v") || "auto";
      if (v !== "off") v = "auto";
      chrome.storage.sync.set({ pierceMode: v }, function () {
        paintMode("pierceMode", v);
        status("pierce → " + v);
      });
    });
  }

  function repair(type, label) {
    chrome.runtime.sendMessage({ type: type }, function (res) {
      try { void chrome.runtime.lastError; } catch (e) {}
      if (!res || !res.ok) status(label + " failed");
      else status(label + " " + (res.fixed || 0) + " / " + (res.n || 0));
    });
  }
  var fixHist = document.getElementById("fixHistory");
  if (fixHist) fixHist.addEventListener("click", function () { repair("repairHistory", "history"); });
  var fixFmt = document.getElementById("fixFormat");
  if (fixFmt) fixFmt.addEventListener("click", function () { repair("repairHistory", "format"); });
  var altHoldBox = document.getElementById("altHoldMode");
  if (altHoldBox) {
    altHoldBox.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("button[data-v]") : null;
      if (!btn) return;
      var v = btn.getAttribute("data-v") || "x2";
      chrome.storage.sync.set({ altHoldMode: v }, function () {
        paintMode("altHoldMode", v);
        status("2nd hold → " + v);
      });
    });
  }

  var saveBtn = document.getElementById("save");
  if (saveBtn) saveBtn.addEventListener("click", function () {
    var data = {
      customPath: ((document.getElementById("customPath") || {}).value || "AW_Media").trim() || "AW_Media",
      renameTemplate: ((document.getElementById("renameTemplate") || {}).value || "media_{date}_{counter}").trim(),
      toastMs: parseInt((document.getElementById("toastMs") || {}).value, 10) || 5000,
      holdMenuMs: parseInt((document.getElementById("holdMenuMs") || {}).value, 10) || 1000,
      zoomHoldMs: parseInt((document.getElementById("zoomHoldMs") || {}).value, 10) || 1000,
      altMenuScale: parseInt((document.getElementById("altMenuScale") || {}).value, 10) || 100,
      altHoldMode: (function () {
        var on = document.querySelector("#altHoldMode button.on");
        return (on && on.getAttribute("data-v")) || "x2";
      })()
    };
    chrome.storage.sync.set(data, function () {
      status("Saved");
    });
  });

  var restoreBtn = document.getElementById("restore");
  if (restoreBtn) restoreBtn.addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "restoreViewers" }, function (res) {
      try { void chrome.runtime.lastError; } catch (e) {}
      status(res && res.n ? "Reopened " + res.n : "Nothing to restore");
    });
  });

  var shortcutsBtn = document.getElementById("shortcuts");
  if (shortcutsBtn) shortcutsBtn.addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "openShortcuts" });
  });

  var devBtn = document.getElementById("devLogs");
  if (devBtn) devBtn.addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "saveDevLogs" }, function (res) {
      try { void chrome.runtime.lastError; } catch (e) {}
      status(res && res.ok ? "AWF-sm-logs.txt" : "log save failed");
    });
  });

  var exportBtn = document.getElementById("exportSet");
  if (exportBtn) exportBtn.addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "exportSettings" }, function (res) {
      try { void chrome.runtime.lastError; } catch (e) {}
      status(res && res.ok ? "awfSM_settingData.json" : "export failed");
    });
  });

  var importBtn = document.getElementById("importSet");
  var importFile = document.getElementById("importFile");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", function () { importFile.click(); });
    importFile.addEventListener("change", function () {
      var file = importFile.files && importFile.files[0];
      importFile.value = "";
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var data = null;
        try { data = JSON.parse(String(reader.result || "")); } catch (e) { status("not a settings file"); return; }
        chrome.runtime.sendMessage({ type: "importSettings", data: data }, function (res) {
          try { void chrome.runtime.lastError; } catch (e2) {}
          if (res && res.ok) { status("settings loaded"); load(); }
          else status("import failed");
        });
      };
      reader.readAsText(file);
    });
  }

  load();
  var legend = document.getElementById("tagLegend");
  var tagBtn = document.getElementById("tagToggle");
  if (legend && AW.NAME_TAGS) {
    AW.NAME_TAGS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "aw-tag";
      var code = document.createElement("code");
      code.textContent = t.tag;
      var span = document.createElement("span");
      span.textContent = t.hint;
      b.appendChild(code);
      b.appendChild(span);
      b.addEventListener("click", function () {
        var input = document.getElementById("renameTemplate");
        if (!input) return;
        var next = (input.value || "") + t.tag;
        if (next.length > 80) next = next.slice(0, 80);
        input.value = next;
        chrome.storage.sync.set({ renameTemplate: next });
        status(t.tag);
      });
      legend.appendChild(b);
    });
  }
  if (tagBtn && legend) {
    tagBtn.addEventListener("click", function () {
      legend.classList.toggle("open");
    });
  }
})();
