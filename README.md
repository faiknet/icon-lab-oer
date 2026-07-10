# Icon Lab — OER Design Studio

A browser-based tool for recoloring SVGs and images in Pressbooks HTML content. Built for the OER Design Studio at Fanshawe College.

## Features

- **HTML Icon Mass Injector** — Paste raw Pressbooks HTML, pick a target hex color and image types (SVG/PNG/JPEG), and inject inline CSS filter rules that recolor all matching images.
- **Bulk Transformer** — Upload up to 20 SVGs, pick a target fill color, and batch-convert them to SVG, PNG, or JPEG output. Download individually or as a ZIP.

## Usage

1. Open `index.html` in a browser (no server required).
2. Use the tabs to switch between the two tools:
   - **HTML Icon Mass Injector**: Paste HTML into the left textarea, select a color and image types, click **Transform**. Copy the output from the right textarea.
   - **Bulk Transformer**: Drag & drop or select SVG files, pick a fill color and output format, click **Transform**. Download results individually or all at once.

## Project structure

```
css/styles.css       — Styles
js/
  main.js            — Entry point
  app-state.js       — Shared state
  ui/
    tab-controller.js
    html-injector.js
    bulk-transformer.js
  utils/
    svg-utils.js     — SVG parsing, recoloring, rasterization
    color-mix.js     — CSS filter string generation (SPSA solver)
index.html           — Single-page app
```

## Tech

Vanilla HTML/CSS/JS with ES modules. Uses [JSZip](https://stuk.github.io/jszip/) for batch downloads. No build step required.

## License

Made by Faik Meta for the OER Design Studio at Fanshawe College. Open source and made available under the MIT License.
