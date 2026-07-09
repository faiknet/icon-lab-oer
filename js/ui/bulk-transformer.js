// Bulk Transformer – up to 20 SVGs
import { AppState } from "../app-state.js";
import { SVGUtils } from "../utils/svg-utils.js";
import { generateCssFilterString } from "../utils/color-mix.js";

export function setupBulkTransformer() {
  const dropZone = document.getElementById("bulk-drop-zone");
  const fileInput = document.getElementById("bulk-file-input");
  const fillColorPicker = document.getElementById("bulk-color-picker");
  const fillHexText = document.getElementById("bulk-hex-text");
  const fillColorPreview = document.getElementById("bulk-color-preview");

  const btnProcess = document.getElementById("btn-process-bulk");
  const btnDownloadAll = document.getElementById("btn-download-all-bulk");
  const resultsGrid = document.getElementById("bulk-results-grid");
  const resultsEmpty = document.getElementById("bulk-results-empty");
  const fileListDiv = document.getElementById("bulk-file-list");
  const fileItemsDiv = document.getElementById("bulk-file-items");
  const fileCountSpan = document.getElementById("bulk-file-count");

  const outputFormatRadios = document.querySelectorAll(
    'input[name="bulk-output-format"]',
  );
  const qualitySlider = document.getElementById("bulk-jpeg-quality");
  const qualityValue = document.getElementById("bulk-quality-value");
  const jpegWrapper = document.getElementById("jpeg-quality-wrapper");
  const pngScaleSlider = document.getElementById("bulk-png-scale");
  const pngScaleValue = document.getElementById("bulk-png-scale-value");
  const pngScaleWrapper = document.getElementById("bulk-png-scale-wrapper");
  // Ensure format-specific controls are hidden on load
  jpegWrapper.classList.add("hidden");
  pngScaleWrapper.classList.add("hidden");

  AppState.bulkColor = "#E02726";
  fillColorPicker.value = "#E02726";
  fillHexText.value = "E02726";
  fillColorPreview.style.backgroundColor = "#E02726";

  let outputFormat = "svg";
  let jpegQuality = 0.95;
  let pngScale = 4;

  outputFormatRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      outputFormat = e.target.value;
      const isJpeg = outputFormat === "jpeg";
      const isPng = outputFormat === "png";
      qualitySlider.disabled = !isJpeg;
      jpegWrapper.classList.toggle("hidden", !isJpeg);
      pngScaleSlider.disabled = !isPng;
      pngScaleWrapper.classList.toggle("hidden", !isPng);
    });
  });

  qualitySlider.addEventListener("input", () => {
    jpegQuality = parseFloat(qualitySlider.value);
    qualityValue.textContent = `${Math.round(jpegQuality * 100)}%`;
  });

  pngScaleSlider.addEventListener("input", () => {
    pngScale = parseInt(pngScaleSlider.value);
    pngScaleValue.textContent = `${pngScale}x`;
  });

  // Fill color controls
  fillColorPicker.addEventListener("input", (e) => {
    AppState.bulkColor = e.target.value;
    fillHexText.value = e.target.value.slice(1).toUpperCase();
    fillColorPreview.style.backgroundColor = e.target.value;
  });
  fillHexText.addEventListener("input", (e) => {
    const val = e.target.value.trim().toUpperCase();
    if (/^[0-9A-F]{6}$/i.test(val)) {
      fillColorPicker.value = `#${val}`;
      AppState.bulkColor = `#${val}`;
      fillColorPreview.style.backgroundColor = `#${val}`;
    }
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    }),
  );
  dropZone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files).filter(isValidFile);
    addBulkFiles(files);
  });

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files).filter(isValidFile);
    addBulkFiles(files);
    fileInput.value = "";
  });

  btnProcess.addEventListener("click", processBulk);
  btnDownloadAll.addEventListener("click", downloadAll);

  function isValidFile(file) {
    return file.name.endsWith(".svg") && file.type === "image/svg+xml";
  }

  function addBulkFiles(newFiles) {
    const remaining = 20 - AppState.bulkFiles.length;
    if (remaining <= 0)
      return alert("Maximum 20 files allowed. Remove some first.");
    const toAdd = newFiles.slice(0, remaining);
    const readers = toAdd.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          const isSvg = file.type === "image/svg+xml";
          reader.onload = (e) => {
            if (isSvg) {
              resolve({
                name: file.name,
                svgText: e.target.result,
                dataUrl: URL.createObjectURL(
                  new Blob([e.target.result], { type: "image/svg+xml" }),
                ),
                type: file.type,
                isSvg: true,
              });
            } else {
              resolve({
                name: file.name,
                dataUrl: e.target.result,
                type: file.type,
                isSvg: false,
              });
            }
          };
          reader.onerror = () => reject(file.name);
          if (isSvg) reader.readAsText(file);
          else reader.readAsDataURL(file);
        }),
    );
    Promise.all(readers)
      .then((results) => {
        results.forEach((r) => AppState.bulkFiles.push(r));
        renderFileList();
      })
      .catch((fname) => alert(`Failed to read file: ${fname}`));
  }

  function removeFile(index) {
    if (
      AppState.bulkFiles[index].svgText &&
      AppState.bulkFiles[index].dataUrl
    ) {
      URL.revokeObjectURL(AppState.bulkFiles[index].dataUrl);
    }
    AppState.bulkFiles.splice(index, 1);
    renderFileList();
    AppState.bulkResults = [];
    resultsGrid.classList.add("hidden");
    resultsEmpty.classList.remove("hidden");
    btnDownloadAll.classList.add("hidden");
    resultsGrid.innerHTML = "";
  }

  function renderFileList() {
    if (AppState.bulkFiles.length === 0) {
      fileListDiv.classList.add("hidden");
      return;
    }
    fileListDiv.classList.remove("hidden");
    fileCountSpan.textContent = AppState.bulkFiles.length;
    fileItemsDiv.innerHTML = "";
    AppState.bulkFiles.forEach((f, idx) => {
      const div = document.createElement("div");
      div.className =
        "flex items-center justify-between bg-surface-alt p-xs rounded text-xs text-mono";
      div.innerHTML = `<span class="truncate mr-xs">${f.name}</span><button class="text-error hover:text-on-error-container material-symbols-outlined text-[16px] cursor-pointer" data-index="${idx}">close</button>`;
      div
        .querySelector("button")
        .addEventListener("click", () => removeFile(idx));
      fileItemsDiv.appendChild(div);
    });
  }

  async function processBulk() {
    if (AppState.bulkFiles.length === 0)
      return alert("Please upload at least one image file.");
    const color = AppState.bulkColor;
    const filter = generateCssFilterString(color);

    const promises = AppState.bulkFiles.map(async (file) => {
      let dims;
      if (file.isSvg) {
        dims = SVGUtils.getDimensions(file.svgText);
      } else {
        dims = await getImageDimensions(file.dataUrl);
      }
      if (!dims || !dims.width || !dims.height) {
        throw new Error(`Could not determine dimensions for: ${file.name}`);
      }
      const { width, height } = dims;

      const colorSuffix = `_${color.slice(1)}`;

      if (outputFormat === "svg") {
        if (file.isSvg) {
          const coloredSVG = await SVGUtils.changeSVGColor(file.svgText, color);
          return {
            originalName: file.name,
            dataUrl: file.dataUrl,
            svgContent: coloredSVG,
            filename: file.name.replace(/\.svg$/i, `${colorSuffix}.svg`),
            isSvg: true,
          };
        } else {
          const svgString = SVGUtils.createFilteredImageSVG(file.dataUrl, width, height, color);
          return {
            originalName: file.name,
            dataUrl: file.dataUrl,
            svgContent: svgString,
            filename: file.name.replace(/\.[^.]+$/, `${colorSuffix}.svg`),
            isSvg: true,
          };
        }
      } else {
        let svgForRaster;
        if (file.isSvg) {
          svgForRaster = await SVGUtils.changeSVGColor(file.svgText, color);
        } else {
          svgForRaster = SVGUtils.createFilteredImageSVG(file.dataUrl, width, height, color);
        }
        let rasterBlob;
        if (outputFormat === "png") {
          const scaledW = width * pngScale;
          const scaledH = height * pngScale;
          rasterBlob = await SVGUtils.svgToPng(svgForRaster, scaledW, scaledH);
        } else {
          rasterBlob = await SVGUtils.svgToJpeg(svgForRaster, width, height, jpegQuality);
        }

        return {
          originalName: file.name,
          dataUrl: file.dataUrl,
          blob: rasterBlob,
          filename: file.name.replace(/\.[^.]+$/, `${colorSuffix}.${outputFormat}`),
          isSvg: false,
        };
      }
    });

    try {
      AppState.bulkResults = await Promise.all(promises);
      renderResults(filter);
    } catch (err) {
      alert("Error processing images: " + err.message);
    }
  }

  function renderResults(filter) {
    resultsGrid.innerHTML = "";
    AppState.bulkResults.forEach((result, idx) => {
      const card = document.createElement("div");
      card.className =
        "bulk-preview-card";

      const img = document.createElement("img");
      img.src = result.dataUrl;
      img.style.filter = filter;
      img.style.width = "48px";
      img.style.height = "48px";
      img.style.objectFit = "contain";
      img.alt = result.originalName;
      card.appendChild(img);

      const label = document.createElement("span");
      label.className =
        "text-xs text-center text-mono truncate max-w-full";
      label.title = result.filename;
      label.textContent = result.originalName;
      card.appendChild(label);

      const downloadBtn = document.createElement("button");
      downloadBtn.className =
        "material-symbols-outlined text-[16px] text-primary cursor-pointer p-xs rounded-full transition-colors";
      downloadBtn.textContent = "download";
      downloadBtn.addEventListener("click", () => {
        if (result.isSvg) {
          SVGUtils.downloadFile(
            result.svgContent,
            result.filename,
            "image/svg+xml",
          );
        } else {
          SVGUtils.downloadBlob(result.blob, result.filename);
        }
      });
      card.appendChild(downloadBtn);

      resultsGrid.appendChild(card);
    });

    resultsGrid.classList.remove("hidden");
    resultsEmpty.classList.add("hidden");
    btnDownloadAll.classList.remove("hidden");
  }

  function downloadAll() {
    if (AppState.bulkResults.length === 0) return;

    // Single file – direct download
    if (AppState.bulkResults.length === 1) {
      const result = AppState.bulkResults[0];
      if (result.isSvg) {
        SVGUtils.downloadFile(
          result.svgContent,
          result.filename,
          "image/svg+xml",
        );
      } else {
        SVGUtils.downloadBlob(result.blob, result.filename);
      }
      return;
    }

    // Multiple files – create a zip
    const zip = new JSZip();
    AppState.bulkResults.forEach((result) => {
      if (result.isSvg) {
        zip.file(result.filename, result.svgContent);
      } else {
        zip.file(result.filename, result.blob);
      }
    });

    zip.generateAsync({ type: "blob" }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_icons.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

}
