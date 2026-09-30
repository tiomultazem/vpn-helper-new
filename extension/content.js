(function() {
  var sent = false;

  function sendToken(rawB64) {
    if (sent || !rawB64) return;
    sent = true;
    console.log("[VPN Helper Extension] Token GP terdeteksi di halaman:", rawB64.substring(0, 30) + "...");

    var body = new URLSearchParams();
    body.append("token", rawB64);
    body.append("source", "Chrome Content Script");

    fetch("http://127.0.0.1:8765/api/gp/callback", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      console.log("[VPN Helper Extension] Callback sukses terkirim ke VPN Helper:", res);
      showNotification();
    })
    .catch(function(err) {
      console.error("[VPN Helper Extension] Gagal kirim callback ke API:", err);
    });
  }

  function scanHTML() {
    if (sent) return;
    var html = document.documentElement ? document.documentElement.innerHTML : "";

    // 1. Cari skema globalprotectcallback:
    var m = html.match(/globalprotectcallback:([A-Za-z0-9+/=]+)/);
    if (m && m[1]) {
      sendToken(m[1]);
      return;
    }

    // 2. Cari tag XML langsung jika ada prelogin-cookie atau portal-userauthcookie
    var pre = html.match(/<prelogin-cookie>([^<]+)<\/prelogin-cookie>/);
    var port = html.match(/<portal-userauthcookie>([^<]+)<\/portal-userauthcookie>/);
    if (port && port[1]) {
      sendToken(port[1]);
    } else if (pre && pre[1]) {
      sendToken(pre[1]);
    }
  }

  function showNotification() {
    var div = document.createElement("div");
    div.style.cssText = "position:fixed;top:20px;right:20px;z-index:999999;background:#10b981;color:#fff;padding:16px 24px;border-radius:12px;font-family:sans-serif;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,0.3);";
    div.innerHTML = "<strong>✓ VPN Helper:</strong> Login SSO Berhasil! Tunnel VPN sedang disiapkan.";
    document.body.appendChild(div);
    setTimeout(function() { div.remove(); }, 5000);
  }

  scanHTML();
  document.addEventListener("DOMContentLoaded", scanHTML);
  window.addEventListener("load", scanHTML);

  var observer = new MutationObserver(function() {
    scanHTML();
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

