import { generateCssFilterString } from '../utils/color-mix.js';

export function setupHtmlInjector() {
    const colorPicker = document.getElementById('html-color-picker');
    const hexText = document.getElementById('html-hex-text');
    const colorPreview = document.getElementById('html-color-preview');
    const btnProcess = document.getElementById('btn-process-html');
    const btnCopyHtml = document.getElementById('btn-copy-html');

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
    document.getElementById('btn-clear-html').addEventListener('click', () => {
        document.getElementById('html-output-markup').value = '';
    });

    function processHTML() {
        const input = document.getElementById('html-input-markup').value;
        const fillColor = colorPicker.value;
        const targetSVG = document.getElementById('checkbox-target-svg').checked;
        const targetPNG = document.getElementById('checkbox-target-png').checked;
        const targetJPEG = document.getElementById('checkbox-target-jpeg').checked;

        if (!input.trim()) return alert('Please paste your HTML code first.');
        if (!targetSVG && !targetPNG && !targetJPEG) return alert('Please select at least one image type.');

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
                    if (path.endsWith('.svg')) type = 'svg';
                    else if (path.endsWith('.png')) type = 'png';
                    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) type = 'jpeg';
                }

                if (excludeFigures && tag === 'img' && (el.closest('figure') || captionImageSrcs.has(el.getAttribute('src')))) return;

                if ((type === 'svg' && targetSVG) || (type === 'png' && targetPNG) || (type === 'jpeg' && targetJPEG)) {
                    if (type === 'svg' && tag === 'svg') el.setAttribute('style', svgStyle);
                    else el.setAttribute('style', `filter: ${imgFilter};`);
                    count++;
                }
            });

            if (count === 0) return alert('No matching elements found for the selected image types.');
            document.getElementById('html-output-markup').value = doc.body.innerHTML;
        } catch (err) {
            alert('Error parsing markup: ' + err.message);
        }
    }

    function copyText(elementId, button) {
        const ta = document.getElementById(elementId);
        if (!ta.value) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(ta.value);
        } else {
            ta.select();
            document.execCommand('copy');
        }
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = 'Copy', 2000);
    }

}
