/* Block Opera GX Alt menu. Does not eat Alt+letter combos — only the Alt key itself. */
(function () {
  window.__AW_AG_GEN = (window.__AW_AG_GEN || 0) + 1;
  var myGen = window.__AW_AG_GEN;
  function mine() { return myGen === window.__AW_AG_GEN; }
  var blockAlt = true;

  try {
    chrome.storage.sync.get(AW.DEFAULTS, function (items) {
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
    });
  } catch (e) {}

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
