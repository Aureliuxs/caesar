/**
 * Type definitions for the fractal renderer
 * Shared between main thread and Web Worker
 */

export interface FractalParams {
  realZ0: number;
  imagZ0: number;
  realC: number;
  imagC: number;
  exponent: number;
  imagExponent: number;
  colorHue: number;
}

export interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface RenderQuality {
  maxIterations: number;
  tileSize: number;
  tilesPerFrame: number; // How many tiles to compute per message
}

export interface Tile {
  x: number; // Pixel x position
  y: number; // Pixel y position
  width: number;
  height: number;
  imageData: ImageData;
}

export interface RenderRequest {
  type: 'render';
  canvasWidth: number;
  canvasHeight: number;
  viewport: Viewport;
  params: FractalParams;
  quality: RenderQuality;
  requestId: number; // To identify and cancel stale requests
  storeIterations?: boolean; // Whether to return iteration data for recoloring
}

export interface TileResponse {
  type: 'tile';
  tile: Tile;
  requestId: number;
  isComplete: boolean; // True when all tiles are done
  iterationData?: Float32Array; // Optional iteration data for the complete render
}

export interface CancelRequest {
  type: 'cancel';
  requestId: number;
}

export type WorkerRequest = RenderRequest | CancelRequest;
export type WorkerResponse = TileResponse;
