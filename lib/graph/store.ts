import { create } from 'zustand';
import type { GraphState, LogEntry, UndoState, ViewSettings, CameraState, GeneratorMode } from './types';

interface GraphStore {
  // Current state
  graph: GraphState | null;
  viewSettings: ViewSettings;
  camera: CameraState;

  // History
  undoStack: UndoState[];
  operationLog: LogEntry[];

  // UI state
  selectedMode: GeneratorMode;
  isGenerating: boolean;
  error: string | null;

  // Actions
  setGraph: (graph: GraphState, logEntry: LogEntry) => void;
  resetGraph: () => void;
  undo: () => void;
  setViewSettings: (settings: Partial<ViewSettings>) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  setSelectedMode: (mode: GeneratorMode) => void;
  setError: (error: string | null) => void;
  clearLog: () => void;
}

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  z: 5,
  zoom: 1,
  rotationX: 0,
  rotationY: 0,
};

const DEFAULT_VIEW: ViewSettings = {
  is3D: false,
  glowEnabled: true,
  showGrid: false,
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  graph: null,
  viewSettings: DEFAULT_VIEW,
  camera: DEFAULT_CAMERA,
  undoStack: [],
  operationLog: [],
  selectedMode: 'lattice',
  isGenerating: false,
  error: null,

  setGraph: (graph, logEntry) => {
    const currentGraph = get().graph;
    const newUndoStack = currentGraph
      ? [...get().undoStack, { graph: currentGraph, log: get().operationLog[get().operationLog.length - 1] }]
      : get().undoStack;

    set({
      graph,
      undoStack: newUndoStack.slice(-20), // Keep last 20 states
      operationLog: [...get().operationLog, logEntry],
      error: null,
    });
  },

  resetGraph: () => {
    set({
      graph: null,
      undoStack: [],
      operationLog: [],
      error: null,
      camera: DEFAULT_CAMERA,
    });
  },

  undo: () => {
    const { undoStack, operationLog } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    set({
      graph: previousState.graph,
      undoStack: undoStack.slice(0, -1),
      operationLog: operationLog.slice(0, -1),
    });
  },

  setViewSettings: (settings) => {
    set({ viewSettings: { ...get().viewSettings, ...settings } });
  },

  setCamera: (camera) => {
    set({ camera: { ...get().camera, ...camera } });
  },

  setSelectedMode: (mode) => {
    set({ selectedMode: mode, error: null });
  },

  setError: (error) => {
    set({ error });
  },

  clearLog: () => {
    set({ operationLog: [] });
  },
}));
