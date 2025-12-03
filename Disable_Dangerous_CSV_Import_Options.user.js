
// ==UserScript==
// @name         Infoblox: Disable Dangerous CSV Import Options
// @namespace    *
// @version      1.3
// @description  Disables all the "delete all records not in imported file" radio buttons on the CSV Import page
// @author       Julian Diehlmann, 4N IT-Solutions GmbH
// @match        https://csp.infoblox.com/*
// @match        https://csp.eu.infoblox.com/*
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/Disable_Dangerous_CSV_Import_Options.user.js
// @downloadURL  https://github.com/4N-JD/uddi-enhanced/raw/refs/heads/main/Disable_Dangerous_CSV_Import_Options.user.js
// @icon         https://www.infoblox.com/favicon.ico

// ==/UserScript==

(function() {
    'use strict';

    const dangerousPatterns = [
        'delete all records not in the imported file',
        'update existing records and delete all records not in the imported file',
        'add new records and delete all records not in the imported file',
        'add new records, update existing records and delete all records not in the imported file'
    ].map(s => s.toLowerCase());

    const MARKER_ATTR = 'data-dangerous-option-wrapped';

    const processOptions = () => {
        const radios = document.querySelectorAll('ib-radio-button');
        radios.forEach(radio => {
            if (radio.hasAttribute(MARKER_ATTR)) return;

            const text = (radio.textContent || '').trim().toLowerCase();
            if (dangerousPatterns.some(p => text.includes(p))) {
                const matRadio = radio.querySelector('mat-radio-button');
                if (matRadio) matRadio.classList.add('dangerous-option');

                const input = radio.querySelector('input[type="radio"]');
                if (input) input.disabled = true;

                const labelContent = radio.querySelector('.mat-radio-label-content');
                if (labelContent) {
                    const textSpan = labelContent.querySelector('span:nth-of-type(2)');
                    if (textSpan) {
                        textSpan.style.color = '#b30000';
                        textSpan.style.fontWeight = 'bold';
                        textSpan.textContent = '⚠ ' + textSpan.textContent;
                    }

                    const btn = document.createElement('button');
                    btn.textContent = 'I know what I\'m doing';
                    btn.className = 'ib-c-positive-action-btn'; 
                    btn.style.marginLeft = '10px'; 
                    btn.title = 'This option is extremely dangerous, be aware everything that\'s not in the import file will be deleted!';
                    btn.addEventListener('click', () => {
                        if (input) input.disabled = false;
                        btn.remove();
                    });
                    labelContent.appendChild(btn);
                }

                radio.setAttribute(MARKER_ATTR, '1');
            }
        });
    };

    const observer = new MutationObserver(() => processOptions());
    observer.observe(document.body, { childList: true, subtree: true });

    processOptions();
})();
