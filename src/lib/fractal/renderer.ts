/**
 * Canvas renderer for fractal
 * Optimized for smooth pan/zoom with overscan rendering
 */

import type { FractalParams, Viewport, RenderQuality, WorkerRequest, TileResponse } from './types';

export class FractalRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private worker: Worker;
  private currentRequestId = 0;

  // Overscan buffer - renders larger area than viewport
  private overscanCanvas: HTMLCanvasElement;
  private overscanCtx: CanvasRenderingContext2D;
  private overscanViewport: Viewport | null = null;
  private overscanFactor = 1.5; // Render 1.5x the viewport size

  // Persistent high-quality background layer
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private backgroundViewport: Viewport | null = null;

  // State
  private viewport: Viewport;
  private params: FractalParams;
  private isInteracting = false;
  private interactionTimeout?: number;

  // Zoom limits
  private readonly minZoom = 0.5;
  private readonly maxZoom = 1e12; // Limit to prevent excessive pixelation from floating point precision

  // Quality settings
  private readonly lowQuality: RenderQuality = {
    maxIterations: 64,
    tileSize: 64,
    tilesPerFrame: 8
  };

  private readonly highQuality: RenderQuality = {
    maxIterations: 256,
    tileSize: 32,
    tilesPerFrame: 4
  };

  // Store iteration data for fast color remapping
  private iterationData: Float32Array | null = null;
  private iterationDataWidth = 0;
  private iterationDataHeight = 0;

  // Resolution multiplier
  private resolutionMultiplier = 1;

  constructor(
    canvas: HTMLCanvasElement,
    worker: Worker,
    initialViewport: Viewport,
    initialParams: FractalParams
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })!;
    this.worker = worker;
    this.viewport = initialViewport;
    this.params = initialParams;

    // Create overscan buffer
    this.overscanCanvas = document.createElement('canvas');
    this.overscanCtx = this.overscanCanvas.getContext('2d', { alpha: false })!;

    // Create persistent background buffer
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCtx = this.backgroundCanvas.getContext('2d', { alpha: false })!;

    // Set black background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.setupWorker();
  }

  private setupWorker() {
    this.worker.onmessage = (e: MessageEvent<TileResponse>) => {
      const response = e.data;

      if (response.requestId !== this.currentRequestId) {
        return; // Stale tile, ignore
      }

      // Draw tile to overscan buffer
      this.overscanCtx.putImageData(
        response.tile.imageData,
        response.tile.x,
        response.tile.y
      );

      // Copy visible portion to main canvas
      this.updateMainCanvas();

      // If this is the final tile and high quality, save to background
      if (response.isComplete && !this.isInteracting) {
        this.saveToBackground();
      }
    };
  }

  /**
   * Save current overscan render to persistent background
   */
  saveToBackground() {
    if (this.overscanCanvas.width === 0 || this.overscanCanvas.height === 0) {
      return; // Nothing to save
    }

    this.backgroundCanvas.width = this.overscanCanvas.width;
    this.backgroundCanvas.height = this.overscanCanvas.height;
    this.backgroundCtx.drawImage(this.overscanCanvas, 0, 0);
    this.backgroundViewport = this.overscanViewport ? { ...this.overscanViewport } : null;
  }

  /**
   * Copy the visible portion of overscan buffer to main canvas
   */
  private updateMainCanvas() {
    if (!this.overscanViewport) return;

    const offsetX = (this.overscanCanvas.width - this.canvas.width) / 2;
    const offsetY = (this.overscanCanvas.height - this.canvas.height) / 2;

    this.ctx.drawImage(
      this.overscanCanvas,
      offsetX, offsetY,
      this.canvas.width, this.canvas.height,
      0, 0,
      this.canvas.width, this.canvas.height
    );
  }

  /**
   * Update canvas size
   */
  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    // Clear to black
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    this.render();
  }

  /**
   * Start interaction mode (low quality)
   */
  startInteraction() {
    this.isInteracting = true;

    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
  }

  /**
   * End interaction mode (triggers high quality render immediately)
   */
  endInteraction() {
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }

    // Switch to high quality and render
    this.isInteracting = false;
    this.render();
  }

  /**
   * Pan the viewport by pixel delta
   */
  pan(dx: number, dy: number) {
    const scale = 4 / this.viewport.zoom;
    const aspectRatio = this.canvas.width / this.canvas.height;
    this.viewport.centerX -= (dx / this.canvas.width) * scale * aspectRatio;
    this.viewport.centerY += (dy / this.canvas.height) * scale;

    // Always render during panning for real-time feedback
    if (this.isInteracting) {
      // During interaction, always render with low quality
      this.render();
    } else {
      // Not interacting - check if we need to re-render
      if (this.needsRerender()) {
        this.render();
      } else {
        // Just update the visible portion from overscan buffer
        this.updateMainCanvas();
      }
    }
  }

  /**
   * Check if current viewport is outside the overscan area
   */
  private needsRerender(): boolean {
    if (!this.overscanViewport) return true;

    const scale = 4 / this.viewport.zoom;
    const overscanScale = 4 / this.overscanViewport.zoom;

    // Check if zoom changed significantly
    if (Math.abs(this.viewport.zoom - this.overscanViewport.zoom) > this.viewport.zoom * 0.01) {
      return true;
    }

    // Check if panned too far from overscan center
    const dx = Math.abs(this.viewport.centerX - this.overscanViewport.centerX);
    const dy = Math.abs(this.viewport.centerY - this.overscanViewport.centerY);
    const threshold = scale * 0.2; // Re-render if panned 20% of viewport

    return dx > threshold || dy > threshold;
  }

  /**
   * Zoom at a specific point
   */
  zoom(factor: number, mouseX?: number, mouseY?: number) {
    const oldZoom = this.viewport.zoom;

    // Apply zoom limits
    const newZoom = this.viewport.zoom * factor;
    if (newZoom < this.minZoom || newZoom > this.maxZoom) {
      return; // Don't zoom beyond limits
    }

    // If mouse position given, zoom towards that point
    if (mouseX !== undefined && mouseY !== undefined) {
      const scale = 4 / this.viewport.zoom;
      const aspectRatio = this.canvas.width / this.canvas.height;

      const mouseXNorm = mouseX / this.canvas.width - 0.5;
      const mouseYNorm = 0.5 - mouseY / this.canvas.height;

      const worldX = this.viewport.centerX + mouseXNorm * scale * aspectRatio;
      const worldY = this.viewport.centerY + mouseYNorm * scale;

      this.viewport.zoom *= factor;

      const newScale = 4 / this.viewport.zoom;
      this.viewport.centerX = worldX - mouseXNorm * newScale * aspectRatio;
      this.viewport.centerY = worldY - mouseYNorm * newScale;
    } else {
      this.viewport.zoom *= factor;
    }

    // Render immediately during interaction for smooth zooming
    if (this.isInteracting) {
      this.render();
    } else {
      this.render();
    }
  }

  /**
   * Update fractal parameters
   */
  updateParams(params: Partial<FractalParams>) {
    const oldParams = { ...this.params };
    this.params = { ...this.params, ...params };

    // If only color changed, use fast recolor
    if (params.colorHue !== undefined &&
        Object.keys(params).length === 1 &&
        this.iterationData) {
      this.recolor(params.colorHue);
    } else {
      this.render();
    }
  }

  /**
   * Fast recolor without re-computing fractal
   */
  private recolor(newHue: number) {
    if (!this.iterationData ||
        this.iterationDataWidth !== this.overscanCanvas.width ||
        this.iterationDataHeight !== this.overscanCanvas.height) {
      // No iteration data, do full render
      this.render();
      return;
    }

    const imageData = this.overscanCtx.createImageData(
      this.overscanCanvas.width,
      this.overscanCanvas.height
    );
    const data = imageData.data;

    const saturation = 0.85;

    for (let i = 0; i < this.iterationData.length; i++) {
      const smoothIter = this.iterationData[i];
      const pixelIndex = i * 4;

      if (smoothIter < 0) {
        // Inside set - black
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 255;
      } else {
        // Outside set - apply new color
        const maxIterations = this.isInteracting ? 64 : 256;
        const t = Math.sqrt(smoothIter / maxIterations);
        const hue = (newHue + t * 360) % 360;
        const value = 0.5 + t * 0.5;

        const [r, g, b] = this.hsvToRgb(hue, saturation, value);

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255;
      }
    }

    this.overscanCtx.putImageData(imageData, 0, 0);
    this.updateMainCanvas();
  }

  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
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
   * Trigger a render with overscan
   */
  render() {
    // Cancel previous render
    this.currentRequestId++;

    const cancelRequest: WorkerRequest = {
      type: 'cancel',
      requestId: this.currentRequestId - 1
    };
    this.worker.postMessage(cancelRequest);

    // Calculate overscan size
    const overscanWidth = Math.floor(this.canvas.width * this.overscanFactor);
    const overscanHeight = Math.floor(this.canvas.height * this.overscanFactor);

    // Save the old overscan canvas content before resizing
    const oldOverscanCanvas = document.createElement('canvas');
    const hadPreviousRender = this.overscanCanvas.width > 0 && this.overscanCanvas.height > 0;
    if (hadPreviousRender) {
      oldOverscanCanvas.width = this.overscanCanvas.width;
      oldOverscanCanvas.height = this.overscanCanvas.height;
      const oldOverscanCtx = oldOverscanCanvas.getContext('2d')!;
      oldOverscanCtx.drawImage(this.overscanCanvas, 0, 0);
    }

    // Resize overscan canvas
    this.overscanCanvas.width = overscanWidth;
    this.overscanCanvas.height = overscanHeight;

    // Instead of clearing to black, use background layer or old content
    // This prevents black borders during pan/zoom

    // First, try to use the persistent background layer
    if (this.backgroundViewport && this.backgroundCanvas.width > 0) {
      const bgViewport = this.backgroundViewport;
      const newViewport = this.viewport;

      const scaleChange = newViewport.zoom / bgViewport.zoom;
      const newScale = 4 / newViewport.zoom;
      const aspectRatio = overscanWidth / overscanHeight;

      const dx = (newViewport.centerX - bgViewport.centerX) / newScale / aspectRatio * overscanWidth;
      const dy = -(newViewport.centerY - bgViewport.centerY) / newScale * overscanHeight;

      // Fill with black first
      this.overscanCtx.fillStyle = '#000';
      this.overscanCtx.fillRect(0, 0, overscanWidth, overscanHeight);

      // Transform and draw background
      this.overscanCtx.save();
      this.overscanCtx.translate(overscanWidth / 2, overscanHeight / 2);
      this.overscanCtx.scale(scaleChange, scaleChange);
      this.overscanCtx.translate(-overscanWidth / 2 + dx, -overscanHeight / 2 + dy);
      this.overscanCtx.drawImage(this.backgroundCanvas, 0, 0);
      this.overscanCtx.restore();
    } else if (hadPreviousRender && this.overscanViewport) {
      // Fallback to old overscan if no background available
      const oldViewport = this.overscanViewport;
      const newViewport = this.viewport;

      const scaleChange = newViewport.zoom / oldViewport.zoom;
      const newScale = 4 / newViewport.zoom;
      const aspectRatio = overscanWidth / overscanHeight;

      const dx = (newViewport.centerX - oldViewport.centerX) / newScale / aspectRatio * overscanWidth;
      const dy = -(newViewport.centerY - oldViewport.centerY) / newScale * overscanHeight;

      // Fill with black first
      this.overscanCtx.fillStyle = '#000';
      this.overscanCtx.fillRect(0, 0, overscanWidth, overscanHeight);

      // Transform and draw old canvas
      this.overscanCtx.save();
      this.overscanCtx.translate(overscanWidth / 2, overscanHeight / 2);
      this.overscanCtx.scale(scaleChange, scaleChange);
      this.overscanCtx.translate(-overscanWidth / 2 + dx, -overscanHeight / 2 + dy);
      this.overscanCtx.drawImage(oldOverscanCanvas, 0, 0);
      this.overscanCtx.restore();
    } else {
      // First render - clear to black
      this.overscanCtx.fillStyle = '#000';
      this.overscanCtx.fillRect(0, 0, overscanWidth, overscanHeight);
    }

    // Store overscan viewport
    this.overscanViewport = { ...this.viewport };

    // Choose quality
    const quality = this.isInteracting ? this.lowQuality : this.highQuality;

    // Adaptive max iterations
    if (!this.isInteracting) {
      const zoomLevel = Math.log2(this.viewport.zoom);
      quality.maxIterations = Math.min(512, Math.floor(128 + zoomLevel * 32));
    }

    const renderRequest: WorkerRequest = {
      type: 'render',
      canvasWidth: overscanWidth,
      canvasHeight: overscanHeight,
      viewport: { ...this.viewport },
      params: { ...this.params },
      quality,
      requestId: this.currentRequestId,
      storeIterations: true // Request iteration data for fast recoloring
    };

    this.worker.postMessage(renderRequest);

    // Prepare to receive iteration data
    this.iterationDataWidth = overscanWidth;
    this.iterationDataHeight = overscanHeight;
  }

  /**
   * Store iteration data for fast recoloring
   */
  storeIterationData(data: Float32Array) {
    this.iterationData = data;
  }

  /**
   * Set resolution multiplier
   */
  setResolution(multiplier: number) {
    this.resolutionMultiplier = multiplier;

    // Adjust both iterations and tile size based on resolution
    const baseIterations = 256;
    this.highQuality.maxIterations = Math.floor(baseIterations * multiplier);
    this.lowQuality.maxIterations = Math.floor(64 * multiplier);

    // Higher resolution = smaller tiles for more detail
    this.highQuality.tileSize = Math.max(16, Math.floor(32 / multiplier));
    this.lowQuality.tileSize = Math.max(32, Math.floor(64 / multiplier));

    if (!this.isInteracting) {
      this.render();
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.worker.terminate();

    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
  }
}
