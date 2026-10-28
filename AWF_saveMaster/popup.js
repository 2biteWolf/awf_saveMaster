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
  var BINDS = ["keySave", "keySave2", "keyPin", "keyOpen", "keyCopy"];
  var state = AW.merge(null);
  var lang = "en";
  var recording = "";

  function tr(key, vars) {
    return AW.T(lang, key, vars);
  }

  function applyI18n() {
    var nodes = document.querySelectorAll("[data-i]");
    var i;
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = tr(nodes[i].getAttribute("data-i"));
    var path = document.getElementById("customPath");
    var tpl = document.getElementById("renameTemplate");
    if (path) path.placeholder = tr("pathPh");
    if (tpl) tpl.placeholder = tr("tplPh");
    var ru = document.getElementById("lang-ru");
    var en = document.getElementById("lang-en");
    if (ru) ru.className = lang === "ru" ? "on" : "";
    if (en) en.className = lang === "en" ? "on" : "";
    paintTags();
  }

  function setFlag(el, on) {
    if (!el) return;
    el.textContent = on ? tr("on") : tr("off");
    el.className = on ? "on" : "off";
  }

  function paintBinds() {
    var i;
    for (i = 0; i < BINDS.length; i++) {
      var el = document.getElementById("k-" + BINDS[i]);
      var btn = document.querySelector('.key[data-bind="' + BINDS[i] + '"]');
      if (el) el.textContent = state[BINDS[i]] || AW.DEFAULTS[BINDS[i]] || "";
      if (btn) btn.classList.toggle("rec", recording === BINDS[i]);
    }
  }

  function paintMode(id, val) {
    var box = document.getElementById(id);
    if (!box) return;
    var btns = box.querySelectorAll("button");
    var i;
    for (i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("on", btns[i].getAttribute("data-v") === val);
    }
  }

  function status(text) {
    var el = document.getElementById("status");
    if (!el) return;
    el.textContent = text || "";
  }

  function paintTags() {
    var legend = document.getElementById("tagLegend");
    if (!legend || !AW.NAME_TAGS) return;
    legend.innerHTML = "";
    AW.NAME_TAGS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "aw-tag";
      var code = document.createElement("code");
      code.textContent = t.tag;
      var span = document.createElement("span");
      span.textContent = tr(t.hint);
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

  function load() {
    chrome.storage.sync.get(AW.DEFAULTS, function (s) {
      state = AW.merge(s || {});
      lang = AW.uiLang(state);
      applyI18n();
      BOOLS.forEach(function (k) {
        setFlag(document.getElementById("v-" + k), !!state[k]);
      });
      var path = document.getElementById("customPath");
      var tpl = document.getElementById("renameTemplate");
      if (path) path.value = state.customPath || "";
      if (tpl) tpl.value = state.renameTemplate || "";
      var toastMs = document.getElementById("toastMs");
      var holdEl = document.getElementById("holdMenuMs");
      var altEl = document.getElementById("altMenuScale");
      var zEl = document.getElementById("zoomHoldMs");
      if (toastMs) toastMs.value = state.toastMs || 5000;
      var vToast = document.getElementById("v-toastMs");
      if (vToast) vToast.textContent = String(state.toastMs || 5000);
      var hold = state.holdMenuMs || 1000;
      if (holdEl) holdEl.value = hold;
      var vHold = document.getElementById("v-holdMenuMs");
      if (vHold) vHold.textContent = (hold / 1000).toFixed(2) + "s";
      var alt = state.altMenuScale || 100;
      if (altEl) altEl.value = alt;
      var vAlt = document.getElementById("v-altMenuScale");
      if (vAlt) vAlt.textContent = alt + "%";
      var zHold = state.zoomHoldMs || hold;
      if (zEl) zEl.value = zHold;
      var vZ = document.getElementById("v-zoomHoldMs");
      if (vZ) vZ.textContent = (zHold / 1000).toFixed(2) + "s";
      paintMode("altHoldMode", state.altHoldMode || "x2");
      paintMode("pierceMode", state.pierceMode === "off" ? "off" : "auto");
      paintBinds();
    });
  }

  function setLang(next) {
    lang = next;
    state.lang = next;
    chrome.storage.sync.set({ lang: next }, function () {
      applyI18n();
      BOOLS.forEach(function (k) {
        setFlag(document.getElementById("v-" + k), !!state[k]);
      });
    });
  }

  document.getElementById("lang-ru").addEventListener("click", function () { setLang("ru"); });
  document.getElementById("lang-en").addEventListener("click", function () { setLang("en"); });

  document.querySelectorAll(".key[data-bind]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      recording = btn.getAttribute("data-bind") || "";
      paintBinds();
      status(tr("recording"));
    });
  });

  document.addEventListener("keydown", function (e) {
    var steal = (e.ctrlKey || e.metaKey) && !e.altKey && (e.code === "KeyK" || e.code === "KeyE" || e.code === "KeyL");
    if (steal) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      recording = "";
      paintBinds();
      status("");
      return;
    }
    var combo = AW.comboFromEvent(e);
    if (!combo) return;
    var patch = {};
    patch[recording] = combo;
    var which = recording;
    chrome.storage.sync.set(patch, function () {
      state[which] = combo;
      recording = "";
      paintBinds();
      status(combo);
    });
  }, true);

  BOOLS.forEach(function (k) {
    var row = document.querySelector('.row[data-key="' + k + '"]');
    if (!row) return;
    row.addEventListener("click", function () {
      chrome.storage.sync.get(AW.DEFAULTS, function (s) {
        var next = !s[k];
        var patch = {};
        patch[k] = next;
        state[k] = next;
        chrome.storage.sync.set(patch, function () {
          setFlag(document.getElementById("v-" + k), next);
          status((next ? tr("on") : tr("off")));
        });
      });
    });
  });

  function bindRange(id, key, paint) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      var v = parseInt(this.value, 10);
      paint(v);
      var patch = {};
      patch[key] = v;
      state[key] = v;
      chrome.storage.sync.set(patch);
    });
  }
  bindRange("toastMs", "toastMs", function (v) {
    var lab = document.getElementById("v-toastMs");
    if (lab) lab.textContent = String(v || 5000);
  });
  bindRange("holdMenuMs", "holdMenuMs", function (v) {
    var lab = document.getElementById("v-holdMenuMs");
    if (lab) lab.textContent = ((v || 1000) / 1000).toFixed(2) + "s";
  });
  bindRange("altMenuScale", "altMenuScale", function (v) {
    var lab = document.getElementById("v-altMenuScale");
    if (lab) lab.textContent = (v || 100) + "%";
  });
  bindRange("zoomHoldMs", "zoomHoldMs", function (v) {
    var lab = document.getElementById("v-zoomHoldMs");
    if (lab) lab.textContent = ((v || 1000) / 1000).toFixed(2) + "s";
  });

  var pierceBox = document.getElementById("pierceMode");
  if (pierceBox) {
    pierceBox.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("button[data-v]") : null;
      if (!btn) return;
      var v = btn.getAttribute("data-v") === "off" ? "off" : "auto";
      state.pierceMode = v;
      chrome.storage.sync.set({ pierceMode: v }, function () { paintMode("pierceMode", v); });
    });
  }
  var altHoldBox = document.getElementById("altHoldMode");
  if (altHoldBox) {
    altHoldBox.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("button[data-v]") : null;
      if (!btn) return;
      var v = btn.getAttribute("data-v") || "x2";
      state.altHoldMode = v;
      chrome.storage.sync.set({ altHoldMode: v }, function () { paintMode("altHoldMode", v); });
    });
  }

  function repair(type) {
    chrome.runtime.sendMessage({ type: type }, function (res) {
      var err = chrome.runtime.lastError;
      if (err || !res || !res.ok) status(tr("logFail"));
      else status((res.fixed || 0) + " / " + (res.n || 0));
    });
  }
  document.getElementById("fixHistory").addEventListener("click", function () { repair("repairHistory"); });
  document.getElementById("fixFormat").addEventListener("click", function () { repair("repairHistory"); });

  function saveFields() {
    var data = {
      customPath: ((document.getElementById("customPath") || {}).value || "AW_Media").trim() || "AW_Media",
      renameTemplate: ((document.getElementById("renameTemplate") || {}).value || "media_{date}_{counter}").trim() || "media_{date}_{counter}"
    };
    state.customPath = data.customPath;
    state.renameTemplate = data.renameTemplate;
    chrome.storage.sync.set(data, function () { status(tr("saved")); });
  }
  var fieldTimer = null;
  ["customPath", "renameTemplate"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      clearTimeout(fieldTimer);
      fieldTimer = setTimeout(saveFields, 300);
    });
    el.addEventListener("change", function () { saveFields(); });
  });

  document.getElementById("restore").addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "restoreViewers" }, function (res) {
      try { void chrome.runtime.lastError; } catch (e) {}
      status(res && res.n ? String(res.n) : tr("vNoData"));
    });
  });
  document.getElementById("shortcuts").addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "openShortcuts" });
  });
  document.getElementById("devLogs").addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "saveDevLogs" }, function (res) {
      var err = chrome.runtime.lastError;
      if (err || !res || !res.ok) status(tr("logFail") + (err ? ": " + err.message : (res && res.error ? ": " + res.error : "")));
      else status(tr("logOk"));
    });
  });
  document.getElementById("exportSet").addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "exportSettings" }, function (res) {
      var err = chrome.runtime.lastError;
      status(!err && res && res.ok ? "awfSM_settingData.json" : tr("logFail"));
    });
  });

  var importFile = document.getElementById("importFile");
  document.getElementById("importSet").addEventListener("click", function () { importFile.click(); });
  importFile.addEventListener("change", function () {
    var file = importFile.files && importFile.files[0];
    importFile.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data = null;
      try { data = JSON.parse(String(reader.result || "")); } catch (e) { status(tr("logFail")); return; }
      chrome.runtime.sendMessage({ type: "importSettings", data: data }, function (res) {
        var err = chrome.runtime.lastError;
        if (!err && res && res.ok) { status(tr("saved")); load(); }
        else status(tr("logFail"));
      });
    };
    reader.readAsText(file);
  });

  var tagBtn = document.getElementById("tagToggle");
  var legend = document.getElementById("tagLegend");
  if (tagBtn && legend) {
    tagBtn.addEventListener("click", function () { legend.classList.toggle("open"); });
  }

  load();
})();
