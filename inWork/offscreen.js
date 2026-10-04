/* Blob URL lives in this extension page so chrome.downloads can write Folder/file.ext. */
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== "offscreenDownload") return;
  try {
    var raw = msg.b64 && AW && AW.b64ToBuf ? AW.b64ToBuf(msg.b64) : msg.buffer;
    if (!raw) {
      sendResponse({ ok: false });
      return;
    }
    var mime = msg.mime || "application/octet-stream";
    var blob = new Blob([raw], { type: mime });
    if (blob.size < 64) {
      sendResponse({ ok: false });
      return;
    }
    var filename = String(msg.filename || "image.jpg").replace(/\\/g, "/").replace(/^\/+/, "");
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({ url: url, saveAs: false }, function (id) {
        var err = chrome.runtime.lastError;
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 120000);
        if (err || !id) {
          sendResponse({ ok: false, error: err && err.message });
          return;
        }
        sendResponse({ ok: true, id: id });
      }
    );
  } catch (e) {
    sendResponse({ ok: false });
  }
  return true;
});
