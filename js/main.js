import { setupTabControls } from './ui/tab-controller.js';
import { setupHtmlInjector } from './ui/html-injector.js';
import { setupBulkTransformer } from './ui/bulk-transformer.js';

document.addEventListener('DOMContentLoaded', () => {
    setupTabControls();
    setupHtmlInjector();
    setupBulkTransformer();
});