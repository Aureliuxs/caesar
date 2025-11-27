// Core graph types and interfaces

export interface Node {
  id: string;
  x: number;
  y: number;
  z?: number;
  type?: string;
  weight?: number;
  attrs?: Record<string, unknown>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  directed?: boolean;
  wrap?: boolean; // For lattice wrap edges (rendered with reduced opacity)
  attrs?: Record<string, unknown>;
}

export interface GraphState {
  nodes: Node[];
  edges: Edge[];
  directed: boolean;
  is3D: boolean;
  metadata: {
    seed?: number;
    mode: GeneratorMode;
    params: unknown;
    timestamp: number;
  };
}

export type GeneratorMode = 'custom' | 'lattice' | 'small-world' | 'flowers';

export type BoundaryType = 'torus' | 'open' | 'reflect';
export type MetricType = 'L1' | 'L2' | 'Linf';
export type LatticeType = 'square' | 'triangular' | 'hexagonal';

// Lattice parameters
export interface LatticeParams {
  latticeType: LatticeType;
  dim: number; // 1, 2, or 3
  size: number; // N-square, N-triangle, or N-hexagon depending on latticeType
  wrap: boolean; // Circular/Wrap toggle
  percolation_p?: number;
  positional_noise?: number;
  weights?: boolean;
  directed?: boolean;
}

// Small-World parameters
export type SmallWorldVariant = 'ws' | 'nws' | 'kleinberg';

export interface SmallWorldParams {
  variant: SmallWorldVariant;
  // Base lattice
  latticeParams: LatticeParams;
  // WS specific
  beta_rewire?: number;
  // NWS specific
  p_shortcut?: number;
  shortcut_length_dist?: 'geo' | 'uniform';
  no_parallel?: boolean;
  // Kleinberg specific
  n_shortcuts_per_node?: number;
  alpha?: number;
  // Common
  directed_shortcuts?: boolean;
  triadic_closure_q?: number;
}

// (u,v)-Flowers parameters
export type FlowersLayout = 'radial' | 'hierarchical' | 'concentric3d';

export interface FlowersParams {
  u: number; // >= 2
  v: number; // >= u
  generations: number; // >= 1
  dim: number; // 2 or 3
  layout?: FlowersLayout;
  seed_graph?: 'star' | 'complete' | 'cycle';
  deterministic?: boolean;
  directed?: boolean;
}

// Custom builder parameters
export type PlacementMode = 'manual' | 'grid' | 'import' | 'random';
export type EdgeOperation = 'draw' | 'knn' | 'radius' | 'degree-cap';

export interface CustomParams {
  placement: PlacementMode;
  edgeOp?: EdgeOperation;
  edgeOpParams?: Record<string, unknown>;
  modifiers: ModifierOperation[];
}

export interface ModifierOperation {
  type: 'rewire' | 'shortcuts' | 'triadic' | 'preferential' | 'percolate' | 'randomize' | 'community' | 'spatial-decay';
  params: Record<string, unknown>;
}

// Operation log entry
export interface LogEntry {
  id: string;
  timestamp: number;
  operation: string;
  params: Record<string, unknown>;
  seed?: number;
  nodeCount: number;
  edgeCount: number;
}

// Undo stack state
export interface UndoState {
  graph: GraphState;
  log: LogEntry;
}

// Export formats
export type ExportFormat = 'json' | 'gexf' | 'graphml';

// View settings
export interface ViewSettings {
  is3D: boolean;
  glowEnabled: boolean;
  showGrid: boolean;
}

// Camera state
export interface CameraState {
  x: number;
  y: number;
  z: number;
  zoom: number;
  rotationX: number;
  rotationY: number;
}
