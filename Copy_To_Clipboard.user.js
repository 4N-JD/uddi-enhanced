
// ==UserScript==
// @name         Infoblox Portal: Copy Button in Table Cells
// @namespace    *
// @version      1.1
// @description  Add a copy button to table cells
// @author       Julian Diehlmann, 4N IT-Solutions GmbH
// @match        https://csp.infoblox.com/*
// @match        https://portal.infoblox.com/*
// @match        https://csp.eu.infoblox.com/*
// @match        https://portal.eu.infoblox.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/Copy_To_Clipboard.user.js
// @downloadURL  https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/Copy_To_Clipboard.user.js
// @icon         https://www.infoblox.com/favicon.ico
// ==/UserScript==

(function () {
  'use strict';

  // ---------------- Config ----------------
  var DEBUG = false;
  var LOG_PREFIX = '[4n-copy]';
  var BTN_CLASS = '_4n_copy_btn';
  var DS_FLAG = 'copyBtnBound';
  var EXCLUDE_CLASSES = [
    'ib-navigation-header-title',
    'ib-sub-item-title',
    'ib-quick-filter-dropdown-value',
  ];

  // ---------------- Log Helpers ----------------
  function log() {
    if (!DEBUG) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift(LOG_PREFIX);
    try { console.log.apply(console, args); } catch (e) {}
  }
  function warn() {
    if (!DEBUG) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift(LOG_PREFIX);
    try { console.warn.apply(console, args); } catch (e) {}
  }

  // ---------------- Styles ----------------
  function injectStyle() {
    var css = ''
      + '.' + BTN_CLASS + ' {'
      + '  display:inline-flex; align-items:center; justify-content:center;'
      + '  margin-left:6px;'
      + '  padding:0 6px; height:18px; line-height:18px;'
      + '  font-size:12px; font-weight:600;'
      + '  border:1px solid rgba(0,0,0,0.15); border-radius:4px;'
      + '  background: rgba(255,255,255,0.85); color:#444;'
      + '  box-shadow: 0 1px 2px rgba(0,0,0,0.08);'
      + '  cursor:pointer; user-select:none;'
      + '  opacity:0; transition: opacity .15s ease, background .15s ease, color .15s ease;'
      + '}'
      + '.' + BTN_CLASS + ':hover { background:#f0f0f0; color:#222; }'
      + '.' + BTN_CLASS + ':active { background:#e5e5e5; }'
      + 'td:hover .' + BTN_CLASS + ', th:hover .' + BTN_CLASS + ' { opacity:1; }'
      + '.ib-next-table-cell:hover .' + BTN_CLASS + ' { opacity:1; }'
      + '.ib-c-text-overflow:hover .' + BTN_CLASS + ' { opacity:1; }'
      + '.ib-long-short-cell-container:hover .' + BTN_CLASS + ' { opacity:1; }'
      + '.ib-c-text-overflow .' + BTN_CLASS + ', .ib-long-short-cell-container .' + BTN_CLASS + ' { flex:0 0 auto; }'
      + '@media (prefers-color-scheme: dark) {'
      + '  .' + BTN_CLASS + ' { background: rgba(40,40,40,0.85); color:#ddd; border-color: rgba(255,255,255,0.15); }'
      + '  .' + BTN_CLASS + ':hover { background: rgba(60,60,60,0.85); color:#fff; }'
      + '  .' + BTN_CLASS + ':active { background: rgba(75,75,75,0.85); }'
      + '}';
    var style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  // ---------------- Helpers ----------------
  function hasClassInAncestors(el, className) {
    var node = el;
    while (node && node.nodeType === 1) {
      var cls = (node.className || '').toString();
      if (cls.indexOf(className) !== -1) return true;
      node = node.parentNode;
    }
    return false;
  }

  function isExcludedByBlacklist(el) {
    for (var i = 0; i < EXCLUDE_CLASSES.length; i++) {
      if (hasClassInAncestors(el, EXCLUDE_CLASSES[i])) return true;
    }
    return false;
  }

  function truncate(s, n) {
    if (typeof n !== 'number') n = 80;
    if (!s) return '';
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function getCellText(node) {
    var clone = node.cloneNode(true);
    var existing = [];
    try { existing = clone.querySelectorAll('.' + BTN_CLASS); } catch (e) { existing = []; }
    for (var i = 0; i < existing.length; i++) {
      var p = existing[i].parentNode;
      if (p) p.removeChild(existing[i]);
    }
    var txt = clone.innerText || clone.textContent || '';
    return (txt || '').trim();
  }

  function hasCopyableText(node) {
    var text = getCellText(node);
    return text.length > 0;
  }

  function copyToClipboard(text) {
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { resolve(true); }, function (err) {
            warn('Clipboard API error:', err); fallback();
          });
          return;
        }
      } catch (e) { warn('Clipboard API exception:', e); }
      fallback();
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.top = '-1000px';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e2) { warn('execCommand error:', e2); }
          document.body.removeChild(ta);
          resolve(ok);
        } catch (e3) { warn('Fallback error:', e3); resolve(false); }
      }
    });
  }

  // ---------------- Candidate detection ----------------
  function isCellCandidate(el) {
    if (!el || el.nodeType !== 1) return false;

    if (isExcludedByBlacklist(el)) return false;

    var t = (el.tagName || '').toLowerCase();
    if (t === 'td' || t === 'th') return true;

    var cls = (el.className || '').toString();
    if (cls.indexOf('ib-next-table-cell') !== -1) return true;
    if (cls.indexOf('ib-long-short-cell-container') !== -1) return true;

    return false;
  }

  // ---------------- Button factory ----------------
  function createCopyButton(targetForText) {
    var btn = document.createElement('button');
    btn.className = BTN_CLASS;
    btn.type = 'button';
    btn.title = 'Copy to Clipboard';
    btn.textContent = '⧉';

    btn.addEventListener('click', function (ev) {
      try { ev.stopPropagation(); } catch (e) {}
      var text = getCellText(targetForText);
      copyToClipboard(text).then(function (ok) {
        var old = btn.textContent;
        btn.textContent = ok ? '✓' : '✗';
        setTimeout(function () { btn.textContent = old; }, 900);
      });
    });

    return btn;
  }

  // ---------------- Attach ----------------
  function attachButton(el) {
    if (!isCellCandidate(el)) return;

    try { if (el.querySelector('.' + BTN_CLASS)) return; } catch (e) {}

    var textContainer = null;

    if (!textContainer) { try { textContainer = el.querySelector('.ib-long-short-cell-container'); } catch (e2) {} }
    if (!textContainer) textContainer = el;

    if (isExcludedByBlacklist(textContainer)) return;

    var isEditable = false;
    try { if (textContainer.matches && textContainer.matches('input,textarea')) isEditable = true; } catch (e3) {}
    try { if (textContainer.isContentEditable) isEditable = true; } catch (e4) {}
    if (isEditable) return;

    if (!hasCopyableText(textContainer)) return;

    var btn = createCopyButton(textContainer);

    try { textContainer.appendChild(btn); } catch (e5) { warn('Append failed:', e5); }

  }

  // ---------------- Scan & Observe ----------------
  var SELECTOR = '.ib-next-table-cell';

  function scanExisting(origin) {
    var nodes = [];
    try { nodes = document.querySelectorAll(SELECTOR); } catch (e) { nodes = []; }
    for (var i = 0; i < nodes.length; i++) attachButton(nodes[i]);
  }

  function observeDom() {
    var target = document.body || document.documentElement;
    if (!target) return;
    try {
      var observer = new MutationObserver(function (mutations) {
        for (var m = 0; m < mutations.length; m++) {
          var mu = mutations[m];
          for (var j = 0; j < mu.addedNodes.length; j++) {
            var node = mu.addedNodes[j];
            if (!node || node.nodeType !== 1) continue;
            if (isCellCandidate(node)) attachButton(node);
            if (node.querySelectorAll) {
              var inner = [];
              try { inner = node.querySelectorAll(SELECTOR); } catch (e) { inner = []; }
              for (var k = 0; k < inner.length; k++) attachButton(inner[k]);
            }
          }
          var tgt = mu.target;
          if (tgt && tgt.nodeType === 1 && isCellCandidate(tgt)) attachButton(tgt);
        }
      });
      observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    } catch (e) { warn('Observer error:', e); }
  }

  function observeSpaUrl() {
    var last = location.href;
    setInterval(function () {
      if (location.href !== last) {
        last = location.href;
        scanExisting('Rescan');
      }
    }, 1000);
  }

  // ---------------- Init ----------------
  injectStyle();
  scanExisting('Initial');
  observeDom();
  observeSpaUrl();

})();
