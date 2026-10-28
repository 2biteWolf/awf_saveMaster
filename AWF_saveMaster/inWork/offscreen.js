/* This page can build a blob URL. It only has chrome.runtime, not chrome.downloads. */
var heldUrls = [];

function dropUrl(url) {
  if (!url) return;
  var i = heldUrls.indexOf(url);
  if (i >= 0) heldUrls.splice(i, 1);
  try { URL.revokeObjectURL(url); } catch (e) {}
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg) return;
  if (msg.type === "offscreenRevoke") {
    dropUrl(msg.url);
    sendResponse({ ok: true });
    return;
  }
  if (msg.type !== "offscreenDownload") return;
  try {
    var raw = msg.b64 && AW && AW.b64ToBuf ? AW.b64ToBuf(msg.b64) : msg.buffer;
    if (!raw) {
      sendResponse({ ok: false, error: "empty bytes" });
      return;
    }
    var mime = msg.mime || "application/octet-stream";
    var blob = new Blob([raw], { type: mime });
    if (blob.size < 64) {
      sendResponse({ ok: false, error: "file too small" });
      return;
    }
    var url = "";
    try { url = URL.createObjectURL(blob) || ""; } catch (eUrl) { url = ""; }
    if (!url) {
      sendResponse({ ok: false, error: "no blob url" });
      return;
    }
    heldUrls.push(url);
    setTimeout(function () { dropUrl(url); }, 600000);
    sendResponse({ ok: true, url: url, bytes: blob.size });
  } catch (e) {
    sendResponse({ ok: false, error: (e && e.message) || "offscreen" });
  }
  return true;
});
