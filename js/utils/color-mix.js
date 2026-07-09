// Converts a target hex color into a CSS filter string that recolors a
// source image. Uses the SPSA (Simultaneous Perturbation Stochastic
// Approximation) algorithm
//
// The output uses only standard CSS filter functions (invert, sepia, saturate,
// hue-rotate, brightness, contrast) which survive Pressbooks/WordPress
// inline-style sanitisation.

export function generateCssFilterString(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "";
  const solver = new Solver(new Color(rgb[0], rgb[1], rgb[2]));
  const result = solver.solve();
  return result.filter;
}

// --- Internals ---

//convert hex code to r g and b values
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return [
    parseInt(h.slice(0, 2), 16), //first 2 hex numbers
    parseInt(h.slice(2, 4), 16), //next 2
    parseInt(h.slice(4, 6), 16), //last 2
  ];
}

//pins every channel between 0 and 255
function clamp(val) {
  return Math.min(255, Math.max(0, val));
}

class Color {
  constructor(r, g, b) {
    this.set(r, g, b);
  }

  set(r, g, b) {
    this.r = clamp(r);
    this.g = clamp(g);
    this.b = clamp(b);
  }

  //convert to HSL for loss computation
  hsl() {
    const r = this.r / 255,
      g = this.g / 255,
      b = this.b / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  clone() {
    return new Color(this.r, this.g, this.b);
  }

  // --- Filter operation simulations ---
  // These match the browser's filter computations.

  invert(value = 1) {
    this.r = clamp(255 * value - this.r * (2 * value - 1));
    this.g = clamp(255 * value - this.g * (2 * value - 1));
    this.b = clamp(255 * value - this.b * (2 * value - 1));
  }

  sepia(value = 1) {
    const r = this.r,
      g = this.g,
      b = this.b;
    this.r = clamp(
      r * (0.393 + 0.607 * (1 - value)) +
        g * (0.769 - 0.769 * (1 - value)) +
        b * (0.189 - 0.189 * (1 - value)),
    );
    this.g = clamp(
      r * (0.349 - 0.349 * (1 - value)) +
        g * (0.686 + 0.314 * (1 - value)) +
        b * (0.168 - 0.168 * (1 - value)),
    );
    this.b = clamp(
      r * (0.272 - 0.272 * (1 - value)) +
        g * (0.534 - 0.534 * (1 - value)) +
        b * (0.131 + 0.869 * (1 - value)),
    );
  }

  saturate(value = 1) {
    const r = this.r,
      g = this.g,
      b = this.b;
    this.r = clamp(
      r * (0.213 + 0.787 * value) +
        g * (0.715 - 0.715 * value) +
        b * (0.072 - 0.072 * value),
    );
    this.g = clamp(
      r * (0.213 - 0.213 * value) +
        g * (0.715 + 0.285 * value) +
        b * (0.072 - 0.072 * value),
    );
    this.b = clamp(
      r * (0.213 - 0.213 * value) +
        g * (0.715 - 0.715 * value) +
        b * (0.072 + 0.928 * value),
    );
  }
  //converts the angle to radians, computes sin/cos,
  //then applies the hue rotation matrix in RGB space.
  //this is a 3×3 rotation around the grey vector (0.213, 0.715, 0.072) (the luminance weights)
  hueRotate(angle = 0) {
    const rad = (angle * Math.PI) / 180;
    const sin = Math.sin(rad),
      cos = Math.cos(rad);
    const r = this.r,
      g = this.g,
      b = this.b;
    this.r = clamp(
      r * (0.213 + cos * 0.787 - sin * 0.213) +
        g * (0.715 - cos * 0.715 - sin * 0.715) +
        b * (0.072 - cos * 0.072 + sin * 0.928),
    );
    this.g = clamp(
      r * (0.213 - cos * 0.213 + sin * 0.143) +
        g * (0.715 + cos * 0.285 + sin * 0.14) +
        b * (0.072 - cos * 0.072 - sin * 0.283),
    );
    this.b = clamp(
      r * (0.213 - cos * 0.213 - sin * 0.787) +
        g * (0.715 - cos * 0.715 + sin * 0.715) +
        b * (0.072 + cos * 0.928 + sin * 0.072),
    );
  }

  brightness(value = 1) {
    this.r = clamp(this.r * value);
    this.g = clamp(this.g * value);
    this.b = clamp(this.b * value);
  }

  contrast(value = 1) {
    this.r = clamp(128 + (this.r - 128) * value);
    this.g = clamp(128 + (this.g - 128) * value);
    this.b = clamp(128 + (this.b - 128) * value);
  }
}

class Solver {
  constructor(target) {
    this.target = target;
    this.targetHSL = target.hsl();
  }

  //compute loss: how far the filtered black is from the target
  //uses RGB + HSL distance for perceptual accuracy
  //applies all 6 filters in order then compares output to original colour
  loss(filters) {
    const [invert, sepia, saturate, hueRotate, brightness, contrast] = filters;
    const color = new Color(0, 0, 0);
    color.invert(invert / 100);
    color.sepia(sepia / 100);
    color.saturate(saturate / 100);
    color.hueRotate(hueRotate * 3.6);
    color.brightness(brightness / 100);
    color.contrast(contrast / 100);

    const colorHSL = color.hsl();

    return (
      Math.abs(color.r - this.target.r) +
      Math.abs(color.g - this.target.g) +
      Math.abs(color.b - this.target.b) +
      Math.abs(colorHSL[0] - this.targetHSL[0]) +
      Math.abs(colorHSL[1] - this.targetHSL[1]) +
      Math.abs(colorHSL[2] - this.targetHSL[2])
    );
  }

  //SPSA: Simultaneous Perturbation Stochastic Approximation
  //optimization algorithm
  spsa(A, a, c, values, iters) {
    const alpha = 1,
      gamma = 0.16667;

    let best = null,
      bestLoss = Infinity;
    const deltas = new Array(6);
    const highArgs = new Array(6);
    const lowArgs = new Array(6);

    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma);

      for (let i = 0; i < 6; i++) {
        deltas[i] = Math.random() > 0.5 ? 1 : -1;
        highArgs[i] = values[i] + ck * deltas[i];
        lowArgs[i] = values[i] - ck * deltas[i];
      }

      const lossDiff = this.loss(highArgs) - this.loss(lowArgs);
      const ak = a / Math.pow(A + k + 1, alpha);

      for (let i = 0; i < 6; i++) {
        values[i] -= ak * (lossDiff / (2 * ck)) * deltas[i];
      }

      // Clamp to valid ranges
      values[0] = Math.max(0, Math.min(100, values[0])); // invert
      values[1] = Math.max(0, Math.min(100, values[1])); // sepia
      values[2] = Math.max(0, Math.min(7500, values[2])); // saturate
      values[3] = Math.max(0, Math.min(100, values[3])); // hue-rotate (0-100 maps to 0-360)
      values[4] = Math.max(0, Math.min(200, values[4])); // brightness
      values[5] = Math.max(0, Math.min(200, values[5])); // contrast

      const loss = this.loss(values);
      if (loss < bestLoss) {
        best = [...values];
        bestLoss = loss;
      }
    }

    return { values: best, loss: bestLoss };
  }

  solve() {
    //phase 1: Wide search with multiple random starts
    const wide = { loss: Infinity, values: null };
    for (let i = 0; i < 15 && wide.loss > 5; i++) {
      const initial = [
        50 + Math.random() * 50, // invert (50-100, since we start from black)
        Math.random() * 100, // sepia
        Math.random() * 3000 + 500, // saturate (wide range)
        Math.random() * 100, // hue-rotate
        50 + Math.random() * 100, // brightness
        50 + Math.random() * 100, // contrast
      ];
      const result = this.spsa(5, 100, 15, initial, 1000);
      if (result.loss < wide.loss) {
        wide.loss = result.loss;
        wide.values = result.values;
      }
    }

    //phase 2: Narrow refinement from the best wide result
    const narrow = this.spsa(2, 5, 2, [...wide.values], 500);

    const values = narrow.loss < wide.loss ? narrow.values : wide.values;

    const filterStr = [
      `brightness(0) saturate(100%)`,
      `invert(${Math.round(values[0])}%)`,
      `sepia(${Math.round(values[1])}%)`,
      `saturate(${Math.round(values[2])}%)`,
      `hue-rotate(${Math.round(values[3] * 3.6)}deg)`,
      `brightness(${Math.round(values[4])}%)`,
      `contrast(${Math.round(values[5])}%)`,
    ].join(" ");

    return {
      filter: filterStr,
      loss: narrow.loss < wide.loss ? narrow.loss : wide.loss,
    };
  }
}
