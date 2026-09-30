// ==UserScript==
// @name         VPN Helper GP Interceptor
// @namespace    http://vpn-helper.local/
// @version      1.0
// @description  Intercept GlobalProtect SSO Callback and send to VPN Helper local API
// @match        https://*.bps.go.id/*
// @match        http://127.0.0.1:8765/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==UserScript==

(function() {
    'use strict';

    function checkAndIntercept(url) {
        if (!url || typeof url !== 'string') return;
        if (url.includes('globalprotectcallback:')) {
            console.log('[VPN Helper] Callback GP terdeteksi:', url);
            var rawB64 = url.split('globalprotectcallback:')[1] || '';
            rawB64 = rawB64.replace(/^\/+/, '').split('"')[0].split("'")[0].split('>')[0].split('&')[0];

            var payload = new URLSearchParams();
            payload.append('token', rawB64);
            payload.append('source', 'Tampermonkey Userscript');

            GM_xmlhttpRequest({
                method: 'POST',
                url: 'http://127.0.0.1:8765/api/gp/callback',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: payload.toString(),
                onload: function(res) {
                    console.log('[VPN Helper] Token berhasil dikirim ke VPN Helper API');
                }
            });
        }
    }

    // Monitor DOM for links/redirects containing globalprotectcallback
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    var href = node.getAttribute && node.getAttribute('href');
                    var src = node.getAttribute && node.getAttribute('src');
                    if (href && href.includes('globalprotectcallback:')) checkAndIntercept(href);
                    if (src && src.includes('globalprotectcallback:')) checkAndIntercept(src);
                }
            });
        });
    });
    if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    checkAndIntercept(window.location.href);
})();

