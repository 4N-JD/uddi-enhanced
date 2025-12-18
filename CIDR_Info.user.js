
// ==UserScript==
// @name         Infoblox Portal: CIDR Info Button
// @namespace    *
// @version      1.0
// @description  Adds useful information to CIDR elements in UDDI
// @author       Julian Diehlmann, 4N IT-Solutions GmbH
// @match        https://csp.infoblox.com/*
// @match        https://portal.infoblox.com/*
// @match        https://csp.eu.infoblox.com/*
// @match        https://portal.eu.infoblox.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/CIDR_Info.user.js
// @downloadURL  https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/CIDR_Info.user.js
// @icon         https://www.infoblox.com/favicon.ico
// ==/UserScript==
(function () {
  'use strict';

  // -------------------- Config --------------------
  var DEBUG = false;
  var LOG_PREFIX = '[4n-cidr-info]';
  var INFO_BTN_CLASS = '_4n_info_btn';
  var DS_FLAG = 'cidrInfoBound';

  // Cell selectors
  var SELECTOR = 'td,th,.ib-next-table-cell,.ib-c-text-overflow,.ib-long-short-cell-container,.ib-table-cell-tooltip-target';

  // Exclusions
  var EXCLUDE_CLASSES = ['ib-navigation-header-title'];

  var MAX_REVERSE_ZONES = 4096;

  // Ignore own classes
  var NO_BTN_SELECTOR = '._4n-title, ._4n-row';

  // -------------------- Logging --------------------
  function log() { if (!DEBUG) return; var a=Array.prototype.slice.call(arguments); a.unshift(LOG_PREFIX); try{console.log.apply(console,a);}catch(e){} }

  // -------------------- Styles --------------------
  injectStyle();
  function injectStyle() {
    var btnCss =
      '.' + INFO_BTN_CLASS + ' {' +
      ' display:inline-flex; align-items:center; justify-content:center;' +
      ' margin-left:6px; padding:0 6px; height:18px; line-height:18px;' +
      ' font-size:12px; font-weight:600;' +
      ' border:1px solid rgba(0,0,0,0.15); border-radius:4px;' +
      ' background: rgba(255,255,255,0.85); color:#444;' +
      ' box-shadow: 0 1px 2px rgba(0,0,0,0.08);' +
      ' cursor:pointer; user-select:none;' +
      ' opacity:0; transition: opacity .15s ease, background .15s ease, color .15s ease;' +
      '}' +
      '.' + INFO_BTN_CLASS + ':hover { background:#f0f0f0; color:#222; }' +
      '.' + INFO_BTN_CLASS + ':active { background:#e5e5e5; }' +

      'td:hover .' + INFO_BTN_CLASS + ', th:hover .' + INFO_BTN_CLASS + ' { opacity:1; }' +
      '.ib-next-table-cell:hover .' + INFO_BTN_CLASS + ' { opacity:1; }' +
      '.ib-c-text-overflow:hover .' + INFO_BTN_CLASS + ' { opacity:1; }' +
      '.ib-long-short-cell-container:hover .' + INFO_BTN_CLASS + ' { opacity:1; }' +
      '.ib-c-text-overflow .' + INFO_BTN_CLASS + ', .ib-long-short-cell-container .' + INFO_BTN_CLASS + ' { flex:0 0 auto; }' +

      '.ib-c-text-overflow:hover + .' + INFO_BTN_CLASS + ' { opacity:1; }' +
      '.ib-long-short-cell-container:hover + .' + INFO_BTN_CLASS + ' { opacity:1; }' +

      '@media (prefers-color-scheme: dark) {' +
      ' .' + INFO_BTN_CLASS + ' { background: rgba(40,40,40,0.85); color:#ddd; border-color: rgba(255,255,255,0.15); }' +
      ' .' + INFO_BTN_CLASS + ':hover { background: rgba(60,60,60,0.85); color:#fff; }' +
      ' .' + INFO_BTN_CLASS + ':active { background: rgba(75,75,75,0.85); }' +
      '}' +

      '#_4n_info_panel {' +
      ' position: fixed; z-index: 99999;' +
      ' background: rgba(24,24,24,0.97); color: #f0f0f0;' +
      ' border: 1px solid rgba(255,255,255,0.12);' +
      ' padding: 12px 14px; border-radius: 8px;' +
      ' box-shadow: 0 8px 24px rgba(0,0,0,0.35);' +
      ' font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;' +
      ' max-width: 700px; max-height: 360px; overflow: auto;' +
      '}' +
      '#_4n_info_panel ._4n-title { font-weight: 600; margin-bottom: 8px; color:#fff; }' +
      '#_4n_info_panel ._4n-row { display:flex; gap:10px; justify-content:space-between; }' +
      '#_4n_info_panel ._4n-k { color:#bdbdbd; }' +
      '#_4n_info_panel ._4n-v { color:#fff; font-variant-numeric: tabular-nums; cursor:pointer; }' +
      '#_4n_info_panel ._4n-v-list { width: 160px; text-align: right; }' +
      '#_4n_info_panel ._4n-close { position: sticky; top: 0; float: right; cursor: pointer; color:#bbb; }' +
      '#_4n_info_backdrop { position: fixed; inset: 0; background: transparent; z-index: 99998; }' +
      '@media (prefers-color-scheme: light) {' +
      ' #_4n_info_panel { background:#fff; color:#222; border-color:rgba(0,0,0,0.15); }' +
      ' #_4n_info_panel ._4n-k { color:#555; }' +
      ' #_4n_info_panel ._4n-v { color:#111; }' +
      ' #_4n_info_panel ._4n-v-list { text-align: right; }' +
      ' #_4n_info_panel ._4n-close { color:#666; }' +
      '}';

    var style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(btnCss));
    (document.head || document.documentElement).appendChild(style);
  }

  // -------------------- IPv4 Helpers --------------------
  var CIDR4_REGEX = /\b(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\/(3[0-2]|[12]?\d)\b/;
  function parseCIDRv4(text) {
    var m = text.match(CIDR4_REGEX);
    if (!m) return null;
    var a = parseInt(m[1],10), b = parseInt(m[2],10), c = parseInt(m[3],10), d = parseInt(m[4],10);
    var p = parseInt(m[5],10);
    var ip = ((a<<24)>>>0) + (b<<16) + (c<<8) + d;
    return { kind:'v4', ip: ip>>>0, prefix: p, text: m[0] };
  }
  function maskFromPrefix4(p){ return p===0 ? 0>>>0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function ip4ToStr(n){ return (((n>>>24)&255)) + '.' + (((n>>>16)&255)) + '.' + (((n>>>8)&255)) + '.' + (n&255); }
  function netInfo4(ip, pfx){
    var mask = maskFromPrefix4(pfx)>>>0;
    var wildcard = (~mask)>>>0;
    var net = (ip & mask)>>>0;
    var bcast = (net | wildcard)>>>0;
    var total = (pfx===32)?1:Math.pow(2,32-pfx);
    var hostIPs, firstHost, lastHost;
    if (pfx <= 30) { hostIPs = Math.max(0,total-2); firstHost=(net+1)>>>0; lastHost=(bcast-1)>>>0; }
    else if (pfx === 31) { hostIPs=2; firstHost=net; lastHost=bcast; }
    else { hostIPs=1; firstHost=ip; lastHost=ip; }
    return { mask:mask>>>0, wildcard:wildcard>>>0, net:net>>>0, bcast:bcast>>>0, addresses:total, hostIPs:hostIPs, firstHost:firstHost>>>0, lastHost:lastHost>>>0 };
  }
  function nextSubnet4(net,pfx){ var step=(pfx===32)?1:Math.pow(2,32-pfx); return (net+step)>>>0; }
  function listReverseZones4(net, pfx) {
    var a = (net>>>24)&255;
    if (pfx >= 24) {
      if (pfx === 24) { var b=(net>>>16)&255, c=(net>>>8)&255; return [ c+'.'+b+'.'+a+'.in-addr.arpa' ]; }
      var size = Math.pow(2,32-pfx), b2=(net>>>16)&255, c2=(net>>>8)&255, d2=net&255;
      var start=d2, end=d2+size-1; return [ start+'-'+end+'.'+c2+'.'+b2+'.'+a+'.in-addr.arpa' ];
    }
    if (pfx > 16 && pfx < 24) {
      var startIP=net>>>0, endIP=(net+Math.pow(2,32-pfx)-1)>>>0;
      var zones=[], base=startIP & 0xFFFFFF00, endBase=endIP & 0xFFFFFF00, count=0;
      while (base <= endBase) {
        var b3=(base>>>16)&255, c3=(base>>>8)&255;
        zones.push(c3+'.'+b3+'.'+a+'.in-addr.arpa');
        base=(base+256)>>>0; count++;
        if (count > MAX_REVERSE_ZONES) { zones.push('… ('+MAX_REVERSE_ZONES+' shown)'); break; }
      }
      return zones;
    }
    if (pfx >= 8 && pfx <= 16) {
      var size16=Math.pow(2,16-pfx), startSecond=(net>>>16)&255, z=[];
      for (var i=0;i<size16;i++){ var bVal=startSecond+i; if (bVal>255) break;
        z.push(bVal+'.'+a+'.in-addr.arpa'); if (z.length>MAX_REVERSE_ZONES){ z.push('… ('+MAX_REVERSE_ZONES+' shown)'); break; }
      }
      return z;
    }
    return [ a+'.in-addr.arpa' ];
  }

  // -------------------- IPv6 Helpers --------------------
  var CIDR6_PREFIX = /\/(12[0-8]|1[01]\d|\d?\d)\b/;
  function parseCIDRv6(text) {
    if (text.indexOf(':') === -1) return null;
    var pm = text.match(CIDR6_PREFIX); if (!pm) return null;
    var p = parseInt(pm[1],10);
    var addr = text.split('/')[0].trim();
    var blocks = expandIPv6(addr); if (!blocks) return null;
    var u32 = blocksToU32(blocks);
    return { kind:'v6', ip:u32, prefix:p, text: addr + '/' + p };
  }
  function expandIPv6(addr) {
    var parts = addr.split('::'); if (parts.length>2) return null;
    var head = parts[0] ? parts[0].split(':') : [];
    var tail = parts.length===2 ? (parts[1] ? parts[1].split(':') : []) : [];
    if (head.length>8 || tail.length>8) return null;
    var missing = 8 - (head.length + tail.length); if (missing<0) return null;
    var out=[], i; for(i=0;i<head.length;i++) out.push(parseHex16(head[i]));
    for(i=0;i<missing;i++) out.push(0);
    for(i=0;i<tail.length;i++) out.push(parseHex16(tail[i]));
    return out.length===8?out:null;
  }
  function parseHex16(s){ var v=parseInt(s||'0',16); return (!isNaN(v)&&v>=0&&v<=0xFFFF)? v:0; }
  function blocksToU32(b){ return [((b[0]<<16)|b[1])>>>0, ((b[2]<<16)|b[3])>>>0, ((b[4]<<16)|b[5])>>>0, ((b[6]<<16)|b[7])>>>0]; }
  function u32ToBlocks(u){ return [(u[0]>>>16)&0xFFFF,u[0]&0xFFFF,(u[1]>>>16)&0xFFFF,u[1]&0xFFFF,(u[2]>>>16)&0xFFFF,u[2]&0xFFFF,(u[3]>>>16)&0xFFFF,u[3]&0xFFFF]; }
  function compressBlocks6(blocks){
    var s=[], i;
    for(i=0;i<8;i++){ var x=blocks[i].toString(16).replace(/^0+/,''); if(x==='') x='0'; s.push(x); }
    var bestStart=-1,bestLen=0,curStart=-1,curLen=0;
    for(i=0;i<8;i++){
      if(s[i]==='0'){ if(curStart===-1){curStart=i;curLen=1;} else{curLen++;} }
      else { if(curLen>bestLen){bestLen=curLen;bestStart=curStart;} curStart=-1; curLen=0; }
    }
    if(curLen>bestLen){bestLen=curLen;bestStart=curStart;}
    if(bestLen>=2){
      var left=s.slice(0,bestStart).join(':'), right=s.slice(bestStart+bestLen).join(':');
      if(left==='' && right==='') return '::';
      if(left==='') return '::'+right;
      if(right==='') return left+'::';
      return left+'::'+right;
    }
    return s.join(':');
  }
  function maskFromPrefix6(p){ var m=[0,0,0,0],i; for(i=0;i<p;i++){ var seg=Math.floor(i/32), bit=31-(i%32); m[seg]=(m[seg]|(1<<bit))>>>0; } return m; }
  function and128(a,b){ return [(a[0]&b[0])>>>0,(a[1]&b[1])>>>0,(a[2]&b[2])>>>0,(a[3]&b[3])>>>0]; }
  function or128(a,b){ return [(a[0]|b[0])>>>0,(a[1]|b[1])>>>0,(a[2]|b[2])>>>0,(a[3]|b[3])>>>0]; }
  function not128(a){ return [(~a[0])>>>0,(~a[1])>>>0,(~a[2])>>>0,(~a[3])>>>0]; }
  function add128(a,b){ var r=[0,0,0,0],carry=0,i; for(i=3;i>=0;i--){ var s=(a[i]>>>0)+(b[i]>>>0)+carry; r[i]=s>>>0; carry=(s>0xFFFFFFFF)?1:0; } return r; }
  function stepForPrefix6(p){ var h=128-p; if(h<=0) return [0,0,0,0]; var seg=Math.floor(h/32), pos=h%32, inc=[0,0,0,0]; inc[3-seg]=(1<<pos)>>>0; return inc; }
  function netInfo6(ip,p){ var mask=maskFromPrefix6(p), wc=not128(mask), net=and128(ip,mask), last=or128(net,wc); return { net:net, last:last }; }
  function nextSubnet6(net,p){ return add128(net, stepForPrefix6(p)); }
  function ip6ToStr(u32){ return compressBlocks6(u32ToBlocks(u32)); }

  // -------------------- DOM Utils --------------------
  function hasClassInAncestors(el, className) {
    var node = el;
    while (node && node.nodeType === 1) {
      var cls = (node.className || '').toString();
      if (cls.indexOf(className) !== -1) return true;
      node = node.parentNode;
    }
    return false;
  }
  function isExcluded(el) {
    for (var i=0; i<EXCLUDE_CLASSES.length; i++) {
      if (hasClassInAncestors(el, EXCLUDE_CLASSES[i])) return true;
    }
    return false;
  }
  function getText(el){ return (el.innerText || el.textContent || '').trim(); }
  function isInNoButtonArea(el){ return !!(el && el.closest && el.closest(NO_BTN_SELECTOR)); }

  function getCellRoot(el) {
    var node = el;
    while (node && node.nodeType === 1) {
      var tag = (node.tagName || '').toLowerCase();
      if (tag === 'td' || tag === 'th' || (node.classList && node.classList.contains('ib-next-table-cell'))) {
        return node;
      }
      node = node.parentNode;
    }
    return el;
  }

  // Disable Infoblox tooltip
  function disableNativeTooltip(start){
    var node=start, limit=0;
    while(node && node.nodeType===1 && limit<10){
      if (node.classList && node.classList.contains('ib-table-cell-tooltip-target')) node.classList.remove('ib-table-cell-tooltip-target');
      if (node.hasAttribute && node.hasAttribute('title')) node.removeAttribute('title');
      var tag=(node.tagName||'').toLowerCase();
      if (tag==='td' || tag==='th') break;
      node=node.parentNode; limit++;
    }
  }

  // -------------------- Panel Lifecycle + Copy-on-Value --------------------
  var panelEl = null, backdropEl = null;
  function ensurePanel() {
    if (!panelEl) {
      panelEl = document.createElement('div');
      panelEl.id = '_4n_info_panel';
      document.body.appendChild(panelEl);
      panelEl.addEventListener('click', function (e) {
        var valEl = e.target && e.target.closest && e.target.closest('._4n-v');
        if (!valEl || !panelEl.contains(valEl)) return;
        var oldHTML = valEl.innerHTML;
        var text = valEl.innerText || valEl.textContent || '';
        copyToClipboard(text).then(function () {
          valEl.textContent = 'Copied!';
          setTimeout(function(){ valEl.innerHTML = oldHTML; }, 1200);
        });
      });
    }
    if (!backdropEl) {
      backdropEl = document.createElement('div');
      backdropEl.id = '_4n_info_backdrop';
      backdropEl.style.display = 'none';
      document.body.appendChild(backdropEl);
      backdropEl.addEventListener('click', hidePanel);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePanel(); });
    }
    return panelEl;
  }
  function showPanelNear(el, html) {
    var p = ensurePanel();
    p.innerHTML = '<div class="_4n-close" title="Close">✕</div>' + html;
    p.querySelector('._4n-close').addEventListener('click', hidePanel);
    try {
      var r = el.getBoundingClientRect(), pad = 8;
      var top = r.bottom + pad, left = r.left + pad;
      p.style.display = 'block'; backdropEl.style.display = 'block';
      var maxLeft = window.innerWidth - p.offsetWidth - 10; if (left > maxLeft) left = Math.max(10, maxLeft);
      var maxTop = window.innerHeight - p.offsetHeight - 10; if (top > maxTop) top = Math.max(10, r.top - p.offsetHeight - pad);
      p.style.top = Math.max(0, top) + 'px'; p.style.left = Math.max(0, left) + 'px';
    } catch (e) {}
  }
  function hidePanel(){ if (panelEl) panelEl.style.display='none'; if (backdropEl) backdropEl.style.display='none'; }

  // Clipboard helper (modern + Fallback)
  function copyToClipboard(text) {
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { fallback(); });
          return;
        }
      } catch (e) {}
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
          var ok = false; try { ok = document.execCommand('copy'); } catch (e2) {}
          document.body.removeChild(ta);
          resolve(ok);
        } catch (e3) { resolve(false); }
      }
    });
  }

  // -------------------- Binding --------------------
  function matchesSelector(el, css) {
    if (!el || el.nodeType !== 1) return false;
    var tag = (el.tagName||'').toLowerCase();
    var cls = (el.className||'').toString();
    if (tag === 'td' || tag === 'th') return true;
    if (cls.indexOf('ib-next-table-cell') !== -1) return true;
    if (cls.indexOf('ib-c-text-overflow') !== -1) return true;
    if (cls.indexOf('ib-long-short-cell-container') !== -1) return true;
    if (cls.indexOf('ib-table-cell-tooltip-target') !== -1) return true;
    return false;
  }

  function bindCIDRInfoButton(el){
    if (!el || el.nodeType!==1) return;
    if (isInNoButtonArea(el)) return;
    if (!matchesSelector(el, SELECTOR)) return;
    if (isExcluded(el)) return;

    var cellRoot = getCellRoot(el);
    if (cellRoot.dataset && cellRoot.dataset[DS_FLAG]) return;

    var target=null;
    try { target=el.querySelector('.ib-c-text-overflow'); } catch(e){}
    if(!target){ try{ target=el.querySelector('.ib-long-short-cell-container'); }catch(e2){} }
    if(!target) target=el;
    if (isInNoButtonArea(target)) return;

    var txt=getText(target);
    if(!txt) return;
    var v4=parseCIDRv4(txt);
    var v6=v4?null:parseCIDRv6(txt);
    if(!v4 && !v6) return; // nur CIDR-Zellen

    disableNativeTooltip(target);

    var existing =
      target.querySelector('.' + INFO_BTN_CLASS) ||
      (target.nextElementSibling &&
       target.nextElementSibling.classList &&
       target.nextElementSibling.classList.contains(INFO_BTN_CLASS)) ||
      (target.parentNode && target.parentNode.querySelector(':scope > .' + INFO_BTN_CLASS));
    if (existing) {
      cellRoot.dataset[DS_FLAG] = '1';
      return;
    }

    var btn = document.createElement('button');
    btn.className = INFO_BTN_CLASS;
    btn.type = 'button';
    btn.title = 'Show CIDR details';
    btn.textContent = 'ⓘ';
    btn.addEventListener('click', function (ev) {
      try { ev.stopPropagation(); } catch (e) {}
      disableNativeTooltip(target);
      var html = buildPanelHtml(v4, v6);
      showPanelNear(target, html);
    });

    if (target && target.parentNode) {
      target.parentNode.insertBefore(btn, target.nextSibling);
    } else {
      // Fallback 
      target.appendChild(btn);
    }

    cellRoot.dataset[DS_FLAG] = '1';

    log('Info button bound:', txt);
  }

  function buildPanelHtml(v4, v6) {
    var html = '';
    if (v4) {
      var ni = netInfo4(v4.ip, v4.prefix);
      var next = nextSubnet4(ni.net, v4.prefix);
      var zones = listReverseZones4(ni.net, v4.prefix);
      html += '<div class="_4n-title _4n-v">' + esc(v4.text) + '</div>';
      html += row('Mask', ip4ToStr(ni.mask));
      html += row('Wildcard', ip4ToStr(ni.wildcard));
      html += row('Network', ip4ToStr(ni.net));
      html += row('Broadcast', (v4.prefix<=30)? ip4ToStr(ni.bcast) : '—');
      html += row('Addresses', String(ni.addresses));
      html += row('Host IPs', (v4.prefix<=30)? String(ni.hostIPs) : (v4.prefix===31 ? '2 (RFC 3021)' : '1'));
      html += row('First Host', (v4.prefix<=30)? ip4ToStr(ni.firstHost) : (v4.prefix===31 ? ip4ToStr(ni.firstHost) : ip4ToStr(v4.ip)));
      html += row('Last Host', (v4.prefix<=30)? ip4ToStr(ni.lastHost) : (v4.prefix===31 ? ip4ToStr(ni.lastHost) : ip4ToStr(v4.ip)));
      html += row('Next Subnet', ip4ToStr(next) + '/' + v4.prefix);
      if (zones && zones.length) {
        html += '<div class="_4n-row"><div class="_4n-k">Reverse Zones</div><div class="_4n-v-list">';
        for (var i=0;i<zones.length;i++){ html += '<div class="_4n-v">' + esc(zones[i]) + '</div>'; }
        html += '</div></div>';
      }
    } else if (v6) {
      var ni6 = netInfo6(v6.ip, v6.prefix);
      var next6 = nextSubnet6(ni6.net, v6.prefix);
      html += '<div class="_4n-title">' + esc(v6.text) + '</div>';
      html += row('Prefix', '/' + v6.prefix);
      html += row('Network', ip6ToStr(ni6.net)); 
      html += row('First Address', ip6ToStr(ni6.net));
      html += row('Last Address', ip6ToStr(ni6.last));
      html += row('Addresses', '2^' + (128 - v6.prefix));
      html += row('Host IPs', '—');
      html += row('Next Subnet', ip6ToStr(next6) + '/' + v6.prefix);
    }
    return html;
  }
  function row(k,v){ return '<div class="_4n-row"><div class="_4n-k">' + esc(k) + '</div><div class="_4n-v">' + esc(v) + '</div></div>'; }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

  // -------------------- Scan & Observe --------------------
  function scanExisting(){
    var nodes=[]; try{ nodes=document.querySelectorAll(SELECTOR); }catch(e){ nodes=[]; }
    for (var i=0;i<nodes.length;i++){
      if (isInNoButtonArea(nodes[i])) continue;
      bindCIDRInfoButton(nodes[i]);
    }
  }
  function observeDom(){
    var target=document.body || document.documentElement; if(!target) return;
    try{
      var mo=new MutationObserver(function(mutations){
        for(var m=0;m<mutations.length;m++){
          var mu=mutations[m];
          for(var j=0;j<mu.addedNodes.length;j++){
            var node=mu.addedNodes[j]; if(!node || node.nodeType!==1) continue;
            if (matchesSelector(node, SELECTOR) && !isInNoButtonArea(node)) {
              bindCIDRInfoButton(node);
            }
            if(node.querySelectorAll){
              var inner=[]; try{ inner=node.querySelectorAll(SELECTOR); }catch(e){ inner=[]; }
              for(var k=0;k<inner.length;k++){ if (!isInNoButtonArea(inner[k])) bindCIDRInfoButton(inner[k]); }
            }
          }
        }
      });
      mo.observe(target, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    }catch(e){}
  }

  // -------------------- Init --------------------
  scanExisting();
  observeDom();
})();
