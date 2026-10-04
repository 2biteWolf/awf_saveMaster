/* Redgifs player: the overlay sits on a hidden poster jpg. The file is the sibling mp4. */
(function () {
  "use strict";
  function posterToMp4(src) {
    if (!src) return "";
    var u = String(src).split("?")[0].split("#")[0];
    if (u.indexOf("media.redgifs.com") === -1) return "";
    u = u.replace(/-(mobile|poster|small|medium|large|thumbnail|preview|static)\.(jpe?g|webp|png|gif)$/i, ".mp4");
    if (/\.(jpe?g|webp|png|gif)$/i.test(u)) u = u.replace(/\.(jpe?g|webp|png|gif)$/i, ".mp4");
    if (!/\.mp4$/i.test(u)) return "";
    return u;
  }

  function httpsVideo(video) {
    if (!video) return "";
    var list = [];
    try { if (video.currentSrc) list.push(video.currentSrc); } catch (e) {}
    try { if (video.src) list.push(video.src); } catch (e2) {}
    var i;
    var sources = video.querySelectorAll ? video.querySelectorAll("source") : [];
    for (i = 0; i < sources.length; i++) {
      if (sources[i].src) list.push(sources[i].src);
    }
    for (i = 0; i < list.length; i++) {
      var u = list[i];
      if (/^https?:/i.test(u) && /\.(mp4|webm|m3u8)(\?|$)/i.test(u)) return u.split("?")[0];
    }
    return "";
  }

  function playerRoot(el) {
    if (!el || !el.closest) return null;
    var videoCard = el.closest(".GifPreview_isVideo") || el.closest(".Player");
    if (videoCard) return videoCard;
    return null;
  }

  function resolve(el) {
    var root = playerRoot(el);
    if (!root) return null;
    var video = null;
    var poster = null;
    try { video = root.querySelector("video"); } catch (e) {}
    try { poster = root.querySelector("img.Player-Poster, img[src*='media.redgifs.com'], img[src*='redgifs.com']"); } catch (e2) {}
    var url = httpsVideo(video);
    if (!url && poster) url = posterToMp4(poster.currentSrc || poster.getAttribute("src") || "");
    if (!url) return null;
    var box = root.querySelector(".Player") || root;
    return { url: url, video: video, root: box, poster: poster };
  }

  window.AW_RG = { resolve: resolve, posterToMp4: posterToMp4 };
})();
