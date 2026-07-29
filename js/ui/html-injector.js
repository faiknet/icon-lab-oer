import { generateCssFilterString } from '../utils/color-mix.js';

export function setupHtmlInjector() {
    const colorPicker = document.getElementById('html-color-picker');
    const hexText = document.getElementById('html-hex-text');
    const colorPreview = document.getElementById('html-color-preview');
    const btnProcess = document.getElementById('btn-process-html');
    const btnCopyHtml = document.getElementById('btn-copy-html');

    const btnCopyCss = document.getElementById('btn-copy-css');
    const cssOutputCard = document.getElementById('css-output-card');
    const cssOutputMarkup = document.getElementById('css-output-markup');

    colorPicker.addEventListener('input', e => {
        hexText.value = e.target.value.slice(1).toUpperCase();
        colorPreview.style.backgroundColor = e.target.value;
    });
    hexText.addEventListener('input', e => {
        const val = e.target.value.trim().toUpperCase();
        if (/^[0-9A-F]{6}$/i.test(val)) {
            colorPicker.value = `#${val}`;
            colorPreview.style.backgroundColor = `#${val}`;
        }
    });

    btnProcess.addEventListener('click', processHTML);
    btnCopyHtml.addEventListener('click', () => copyText('html-output-markup', btnCopyHtml));
    if (btnCopyCss) {
        btnCopyCss.addEventListener('click', () => copyText('css-output-markup', btnCopyCss));
    }
    document.getElementById('btn-clear-html').addEventListener('click', () => {
        document.getElementById('html-output-markup').value = '';
        if (cssOutputMarkup) cssOutputMarkup.value = '';
        if (cssOutputCard) cssOutputCard.classList.add('hidden');
    });
    const btnClearCss = document.getElementById('btn-clear-css');
    if (btnClearCss) {
        btnClearCss.addEventListener('click', () => {
            if (cssOutputMarkup) cssOutputMarkup.value = '';
            if (cssOutputCard) cssOutputCard.classList.add('hidden');
        });
    }

    const btnDismissWarning = document.getElementById('btn-dismiss-warning');
    const warningBanner = document.getElementById('warning-banner');
    if (btnDismissWarning && warningBanner) {
        btnDismissWarning.addEventListener('click', () => {
            warningBanner.style.display = 'none';
        });
    }

    function processHTML() {
        const input = document.getElementById('html-input-markup').value;
        const fillColor = colorPicker.value;
        const targetSVG = document.getElementById('checkbox-target-svg').checked;
        const targetPNG = document.getElementById('checkbox-target-png').checked;
        const targetJPEG = document.getElementById('checkbox-target-jpeg').checked;
        const targetWEBP = document.getElementById('checkbox-target-webp')?.checked;

        if (!input.trim()) return alert('Please paste your HTML code first.');
        if (!targetSVG && !targetPNG && !targetJPEG && !targetWEBP) return alert('Please select at least one image type.');

        const svgStyle = `fill: ${fillColor};`;
        const imgFilter = generateCssFilterString(fillColor);
        const excludeFigures = document.getElementById('checkbox-exclude-figures').checked;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<body>${input}</body>`, 'text/html');
            const elements = doc.querySelectorAll('body img, body svg');

            const captionImageSrcs = new Set();
            if (excludeFigures) {
                const captionRegex = /\[caption[^\]]*\](.*?)\[\/caption\]/gs;
                let match;
                while ((match = captionRegex.exec(input)) !== null) {
                    const imgMatch = match[1].match(/<img[^>]+src="([^"]+)"/i);
                    if (imgMatch) captionImageSrcs.add(imgMatch[1]);
                }
            }
            let count = 0;

            elements.forEach(el => {
                const tag = el.tagName.toLowerCase();
                let type = null;

                if (tag === 'svg') {
                    type = 'svg';
                } else if (tag === 'img') {
                    const src = (el.getAttribute('src') || '').toLowerCase();
                    const path = src.split('?')[0].split('#')[0];
                    if (path.endsWith('.svg') || src.includes('f=svg') || src.includes('format=svg')) type = 'svg';
                    else if (path.endsWith('.webp') || src.includes('webp') || src.includes('f=webp') || src.includes('format=webp')) type = 'webp';
                    else if (path.endsWith('.png') || src.includes('png') || src.includes('f=png') || src.includes('format=png')) type = 'png';
                    else if (path.endsWith('.jpg') || path.endsWith('.jpeg') || src.includes('jpeg') || src.includes('jpg') || src.includes('f=jpg') || src.includes('format=jpg')) type = 'jpeg';
                    else type = 'unknown';
                }

                if (excludeFigures && tag === 'img' && (el.closest('figure') || captionImageSrcs.has(el.getAttribute('src')))) return;

                if ((type === 'svg' && targetSVG) || (type === 'png' && targetPNG) || (type === 'jpeg' && targetJPEG) || (type === 'webp' && targetWEBP) || (type === 'unknown' && (targetSVG || targetPNG || targetJPEG || targetWEBP))) {
                    if (type === 'svg' && tag === 'svg') el.setAttribute('style', svgStyle);
                    else el.setAttribute('style', `filter: ${imgFilter};`);
                    count++;
                }
            });

            // Detect Pressbooks textbox modifier classes (e.g. textbox--learning-objectives)
            const textboxClasses = new Set();
            const textboxElements = doc.querySelectorAll('[class*="textbox--"]');
            textboxElements.forEach(el => {
                el.classList.forEach(cls => {
                    if (cls.startsWith('textbox--')) {
                        textboxClasses.add(cls);
                    }
                });
            });

            if (textboxClasses.size > 0) {
                const selectors = Array.from(textboxClasses)
                    .map(cls => `.${cls} .textbox__header::before`)
                    .join(',\n');
                
                const cssSnippet = `/* Textbox Header Icon Recoloring — Paste into Pressbooks -> Appearance -> Custom Styles (Web) */\n${selectors} {\n  filter: ${imgFilter};\n}`;
                
                if (cssOutputMarkup) cssOutputMarkup.value = cssSnippet;
                if (cssOutputCard) {
                    cssOutputCard.classList.remove('hidden');
                    setTimeout(() => {
                        cssOutputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                }
            } else {
                if (cssOutputMarkup) cssOutputMarkup.value = '';
                if (cssOutputCard) cssOutputCard.classList.add('hidden');
            }

            if (count === 0 && textboxClasses.size === 0) {
                return alert('No matching image elements or textboxes found.');
            }
            document.getElementById('html-output-markup').value = doc.body.innerHTML;
        } catch (err) {
            alert('Error parsing markup: ' + err.message);
        }
    }

    async function copyText(elementId, button) {
        const ta = document.getElementById(elementId);
        if (!ta.value) return;

        let success = false;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(ta.value);
                success = true;
            } catch {
                // Fall through to execCommand fallback
            }
        }

        if (!success) {
            try {
                const temp = document.createElement('textarea');
                temp.value = ta.value;
                temp.style.position = 'fixed';
                temp.style.top = '0';
                temp.style.left = '0';
                temp.style.opacity = '0';
                document.body.appendChild(temp);
                temp.focus();
                temp.select();
                success = document.execCommand('copy');
                document.body.removeChild(temp);
            } catch {
                // Both methods failed
            }
        }

        if (success) {
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = 'Copy', 2000);
        }
    }

}
