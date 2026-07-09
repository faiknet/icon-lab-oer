export function setupTabControls() {
    const tabs = {
        processor: document.getElementById('tab-processor'),
        bulk: document.getElementById('tab-bulk'),
    };
    const sections = {
        processor: document.getElementById('processor-grid'),
        bulk: document.getElementById('bulk-grid'),
    };

    function setActive(tabKey) {
        Object.keys(tabs).forEach(key => {
            const btn = tabs[key];
            btn.className = "tab";
            btn.setAttribute('aria-selected', 'false');
        });
        tabs[tabKey].className = "tab tab-active";
        tabs[tabKey].setAttribute('aria-selected', 'true');

        Object.values(sections).forEach(s => s.classList.add('hidden'));
        sections[tabKey].classList.remove('hidden');
    }

    tabs.processor.addEventListener('click', () => setActive('processor'));
    tabs.bulk.addEventListener('click', () => setActive('bulk'));

    setActive('processor');
}
