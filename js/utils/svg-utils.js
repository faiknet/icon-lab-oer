// ==========================================
// SVG utility functions – pure, no DOM side effects
// ==========================================
export const SVGUtils = {
  getDimensions(svgString) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    const svg = svgDoc.documentElement;
    if (svgDoc.getElementsByTagName("parsererror").length > 0)
      throw new Error("Invalid SVG file");

    const width = parseFloat(svg.getAttribute("width") || "");
    const height = parseFloat(svg.getAttribute("height") || "");
    if (Number.isFinite(width) && Number.isFinite(height))
      return { width, height };

    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.trim().split(/[ ,]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite))
        return { width: parts[2], height: parts[3] };
    }
    return { width: 24, height: 24 };
  },

  async changeSVGColor(svgString, newColor) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    const svg = svgDoc.documentElement;
    if (svgDoc.getElementsByTagName("parsererror").length > 0)
      throw new Error("Invalid SVG file");

    svg.setAttribute("fill", newColor);
    svg.removeAttribute("stroke");
    svg.removeAttribute("stroke-width");

    const SKIP = new Set(["none"]);
    svg.querySelectorAll("*").forEach((el) => {
      const fill = el.getAttribute("fill");
      if (fill !== null && !SKIP.has(fill)) el.setAttribute("fill", newColor);
      if (el.style.fill && el.style.fill !== "none") el.style.fill = newColor;
      el.removeAttribute("stroke");
      el.removeAttribute("stroke-width");
      if (el.style.stroke) el.style.stroke = "";
      if (el.style.strokeWidth) el.style.strokeWidth = "";
    });
    return new XMLSerializer().serializeToString(svg);
  },

  async svgToPng(svgString, width, height) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not get canvas context"));

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert to PNG"));
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Failed to load SVG image"));
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      img.src = URL.createObjectURL(blob);
    });
  },

  async svgToJpeg(svgString, width, height, quality = 0.95) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not get canvas context"));
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to convert to JPEG"));
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Failed to load SVG image"));
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      img.src = URL.createObjectURL(blob);
    });
  },

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  createFilteredImageSVG(dataUrl, width, height, color) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="colorize">
      <feFlood flood-color="${color}" result="flood"/>
      <feComposite in="flood" in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>
  <image x="0" y="0" width="${width}" height="${height}" xlink:href="${dataUrl}" filter="url(#colorize)"/>
</svg>`;
  },
};
