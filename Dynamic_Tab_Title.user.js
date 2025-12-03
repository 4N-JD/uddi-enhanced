
// ==UserScript==
// @name         Infoblox Portal: Dynamic Tab Title
// @namespace    *
// @version      1.7
// @description  Dynamically update tab title based on Infoblox breadcrumbs
// @author       You
// @match        https://csp.infoblox.com/*
// @match        https://portal.infoblox.com/*
// @match        https://csp.eu.infoblox.com/*
// @match        https://portal.eu.infoblox.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/Dynamic_Tab_Title.user.js
// @downloadURL  https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/Dynamic_Tab_Title.user.js
// @icon         https://www.infoblox.com/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    function updateTitle() {
        let prefixParts = [];
        let breadcrumbText = '';

        // 1. Collect all active tabs, ignoring those with ib-hide
        const activeTabs = document.querySelectorAll('.ib-active-tab');
        activeTabs.forEach(tab => {
            if (!tab.classList.contains('ib-hide')) {
                const text = tab.textContent.trim();
                if (text) prefixParts.push(text);
            }
        });

        // 2. Get last breadcrumb text from .ib-breadcrumb-last
        const breadcrumbElements = document.querySelectorAll('.ib-breadcrumb-last');
        if (breadcrumbElements.length > 0) {
            const lastElement = breadcrumbElements[breadcrumbElements.length - 1];

            // Find inner <span> without attributes (actual breadcrumb text)
            const innerSpans = lastElement.querySelectorAll('span:not([class]):not([data-custom-tooltip])');
            if (innerSpans.length > 0) {
                breadcrumbText = innerSpans[innerSpans.length - 1].textContent.trim();
            }
        }

        // 3. Build new title
        let newTitle = breadcrumbText;
        if (prefixParts.length > 0) {
            newTitle = `${prefixParts.join(' | ')}${breadcrumbText ? ' | ' + breadcrumbText : ''}`;
        }

        // 4. Update if changed
        if (newTitle && document.title !== newTitle) {
            document.title = newTitle;
        }
    }

    // MutationObserver for dynamic changes
    const observer = new MutationObserver(updateTitle);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run
    updateTitle();
})();
