/**
 * Web Worker for fractal computation
 * Computes tiles progressively and sends them back to main thread
 */

import type { WorkerRequest, RenderRequest, TileResponse, Tile, FractalParams, Viewport } from './types';

let currentRequestId = -1;

// Mandelbrot interior tests for performance
function isInCardioid(x: number, y: number): boolean {
  const q = (x - 0.25) * (x - 0.25) + y * y;
  return q * (q + (x - 0.25)) < 0.25 * y * y;
}

function isInPeriod2Bulb(x: number, y: number): boolean {
  return (x + 1) * (x + 1) + y * y < 0.0625;
}

/**
 * Compute fractal for a single pixel
 * Returns smooth iteration count (or -1 if inside set)
 */
function computePixel(
  x0: number,
  y0: number,
  params: FractalParams,
  maxIterations: number,
  useJulia: boolean
): number {
  // For Mandelbrot, check interior shortcuts
  if (!useJulia) {
    if (isInCardioid(x0, y0) || isInPeriod2Bulb(x0, y0)) {
      return -1; // Inside set
    }
  }

  // Choose c based on mode
  const cr = useJulia ? params.realC : x0;
  const ci = useJulia ? params.imagC : y0;

  // Initialize z
  let zr = useJulia ? x0 : params.realZ0;
  let zi = useJulia ? y0 : params.imagZ0;

  let zrSq = zr * zr;
  let ziSq = zi * zi;
  let iteration = 0;

  // Main iteration loop
  while (iteration < maxIterations) {
    // Early escape check
    if (zrSq + ziSq > 4) {
      // Smooth coloring using continuous escape time
      const log_zn = Math.log(zrSq + ziSq) / 2;
      const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
      return iteration + 1 - nu;
    }

    // Calculate z^k where k = a + bi
    if (params.exponent === 2 && params.imagExponent === 0) {
      // Optimized for standard Mandelbrot/Julia (exponent = 2)
      const zrTemp = zrSq - ziSq + cr;
      zi = 2 * zr * zi + ci;
      zr = zrTemp;
    } else if (params.imagExponent === 0) {
      // Real exponent only (faster path)
      const r = Math.sqrt(zrSq + ziSq);
      const theta = Math.atan2(zi, zr);
      const rk = Math.pow(r, params.exponent);
      const thetaK = theta * params.exponent;

      zr = rk * Math.cos(thetaK) + cr;
      zi = rk * Math.sin(thetaK) + ci;
    } else {
      // Complex exponent k = a + bi
      // z^k = r^a * e^(-b*θ) * [cos(a*θ + b*ln(r)) + i*sin(a*θ + b*ln(r))]
      const r = Math.sqrt(zrSq + ziSq);

      // Avoid log(0)
      if (r < 1e-10) {
        return -1; // Treat as inside set
      }

      const theta = Math.atan2(zi, zr);
      const lnR = Math.log(r);

      const a = params.exponent;
      const b = params.imagExponent;

      const magnitude = Math.pow(r, a) * Math.exp(-b * theta);
      const angle = a * theta + b * lnR;

      // Check for overflow/NaN
      if (!isFinite(magnitude) || !isFinite(angle)) {
        return iteration; // Escaped
      }

      zr = magnitude * Math.cos(angle) + cr;
      zi = magnitude * Math.sin(angle) + ci;

      // Check for NaN
      if (!isFinite(zr) || !isFinite(zi)) {
        return iteration; // Escaped
      }
    }

    // Reuse squares
    zrSq = zr * zr;
    ziSq = zi * zi;
    iteration++;
  }

  return -1; // Inside set
}

/**
 * Convert HSV to RGB (for vivid colors)
 */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

/**
 * Compute a single tile
 */
function computeTile(
  tileX: number,
  tileY: number,
  tileWidth: number,
  tileHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  viewport: Viewport,
  params: FractalParams,
  maxIterations: number
): Tile {
  const imageData = new ImageData(tileWidth, tileHeight);
  const data = imageData.data;

  const aspectRatio = canvasWidth / canvasHeight;
  const scale = 4 / viewport.zoom;

  // Determine mode based on parameters:
  // - Julia set: c is fixed (non-default), z0 varies across screen
  // - Mandelbrot: c varies across screen, z0 is fixed (usually 0)
  const isJuliaSet = (Math.abs(params.realC - 0) > 0.001 || Math.abs(params.imagC) > 0.001) &&
                     (Math.abs(params.realZ0) < 0.001 && Math.abs(params.imagZ0) < 0.001);

  // Use Julia mode if we have a non-zero c and zero z0
  const useJulia = isJuliaSet;

  // High saturation for vivid colors
  const saturation = 0.85;

  for (let py = 0; py < tileHeight; py++) {
    for (let px = 0; px < tileWidth; px++) {
      const screenX = tileX + px;
      const screenY = tileY + py;

      // Map pixel to complex plane
      const x0 = viewport.centerX + ((screenX / canvasWidth - 0.5) * scale * aspectRatio);
      const y0 = viewport.centerY - ((screenY / canvasHeight - 0.5) * scale);

      const smoothIter = computePixel(x0, y0, params, maxIterations, useJulia);

      const pixelIndex = (py * tileWidth + px) * 4;

      if (smoothIter < 0) {
        // Inside set - pure black
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 255;
      } else {
        // Outside set - vivid colors
        // Map smooth iteration to color
        const t = Math.sqrt(smoothIter / maxIterations);

        // Create continuous color based on hue parameter
        const hue = (params.colorHue + t * 360) % 360;
        const value = 0.5 + t * 0.5; // Brightness

        const [r, g, b] = hsvToRgb(hue, saturation, value);

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255;
      }
    }
  }

  return {
    x: tileX,
    y: tileY,
    width: tileWidth,
    height: tileHeight,
    imageData
  };
}

/**
 * Handle render request - compute tiles progressively
 */
function handleRenderRequest(request: RenderRequest) {
  const { canvasWidth, canvasHeight, viewport, params, quality, requestId } = request;

  currentRequestId = requestId;

  const tileSize = quality.tileSize;
  const tilesX = Math.ceil(canvasWidth / tileSize);
  const tilesY = Math.ceil(canvasHeight / tileSize);
  const totalTiles = tilesX * tilesY;

  let tilesComputed = 0;

  // Compute tiles in a spiral pattern from center
  const tiles: Array<{ x: number; y: number }> = [];
  const centerTileX = Math.floor(tilesX / 2);
  const centerTileY = Math.floor(tilesY / 2);

  // Generate all tile coordinates
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      tiles.push({ x: tx, y: ty });
    }
  }

  // Sort by distance from center
  tiles.sort((a, b) => {
    const distA = Math.sqrt(Math.pow(a.x - centerTileX, 2) + Math.pow(a.y - centerTileY, 2));
    const distB = Math.sqrt(Math.pow(b.x - centerTileX, 2) + Math.pow(b.y - centerTileY, 2));
    return distA - distB;
  });

  // Process tiles in batches
  let tileIndex = 0;

  function processBatch() {
    if (currentRequestId !== requestId) {
      // Request was cancelled
      return;
    }

    const batchSize = quality.tilesPerFrame;
    const batchEnd = Math.min(tileIndex + batchSize, tiles.length);

    for (let i = tileIndex; i < batchEnd; i++) {
      if (currentRequestId !== requestId) return;

      const { x: tx, y: ty } = tiles[i];
      const tileX = tx * tileSize;
      const tileY = ty * tileSize;
      const tileWidth = Math.min(tileSize, canvasWidth - tileX);
      const tileHeight = Math.min(tileSize, canvasHeight - tileY);

      const tile = computeTile(
        tileX,
        tileY,
        tileWidth,
        tileHeight,
        canvasWidth,
        canvasHeight,
        viewport,
        params,
        quality.maxIterations
      );

      tilesComputed++;

      const response: TileResponse = {
        type: 'tile',
        tile,
        requestId,
        isComplete: tilesComputed === totalTiles
      };

      self.postMessage(response, { transfer: [tile.imageData.data.buffer] });
    }

    tileIndex = batchEnd;

    if (tileIndex < tiles.length && currentRequestId === requestId) {
      // Schedule next batch
      setTimeout(processBatch, 0);
    }
  }

  processBatch();
}

// Listen for messages from main thread
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const request = e.data;

  if (request.type === 'cancel') {
    currentRequestId = -1;
  } else if (request.type === 'render') {
    handleRenderRequest(request);
  }
};

export {};
