'use client';

import { useState, useRef, useEffect } from 'react';
import type { GeneratorMode, LatticeParams, SmallWorldParams, FlowersParams, LatticeType, FlowersLayout } from '@/lib/graph/types';

interface ControlStripProps {
  mode: GeneratorMode;
  onModeChange: (mode: GeneratorMode) => void;
  onGenerate: (params: unknown) => void;
  onReset: () => void;
  onUndo: () => void;
  onFitView: () => void;
  canUndo: boolean;
  nodeCount: number;
}

export default function ControlStrip({
  mode,
  onModeChange,
  onGenerate,
  onReset,
  onUndo,
  onFitView,
  canUndo,
  nodeCount,
}: ControlStripProps) {
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lattice defaults
  const [latticeParams, setLatticeParams] = useState<LatticeParams>({
    latticeType: 'square',
    dim: 2,
    size: 8,
    wrap: true,
  });

  // Small-World defaults (keep existing structure for now)
  const [swParams, setSwParams] = useState<SmallWorldParams>({
    variant: 'ws',
    latticeParams: {
      latticeType: 'square',
      dim: 2,
      size: 32,
      wrap: true,
    },
    beta_rewire: 0.05,
  });

  // Flowers defaults
  const [flowersParams, setFlowersParams] = useState<FlowersParams>({
    u: 2,
    v: 3,
    generations: 3,
    dim: 2,
    layout: 'radial',
    deterministic: true,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = () => {
    switch (mode) {
      case 'lattice':
        onGenerate(latticeParams);
        break;
      case 'small-world':
        onGenerate({ ...swParams, latticeParams: swParams.latticeParams });
        break;
      case 'flowers':
        onGenerate(flowersParams);
        break;
      case 'custom':
        onGenerate({ placement: 'random', n: 20 });
        break;
    }
  };

  const modeLabels = {
    lattice: 'Lattice',
    flowers: '(U,V) Flowers',
    'small-world': 'Small-World',
    custom: 'Custom',
  };

  // Validation
  const isValid = () => {
    if (mode === 'lattice') {
      return latticeParams.size >= 2;
    }
    if (mode === 'flowers') {
      return flowersParams.u >= 2 && flowersParams.v >= flowersParams.u && flowersParams.generations >= 1;
    }
    return true;
  };

  const getSizeLabel = () => {
    switch (latticeParams.latticeType) {
      case 'square': return 'N-square';
      case 'triangular': return 'N-triangle';
      case 'hexagonal': return 'N-hexagon';
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-slate-900/70 backdrop-blur border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap gap-4 py-3 items-center">
          {/* Network Type Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="px-4 py-2 bg-black/30 hover:bg-black/40 rounded-lg text-sm text-white border border-white/20 transition-colors flex items-center gap-2"
            >
              <span className="font-medium">Network Type:</span>
              <span className="text-cyan-300">{modeLabels[mode]}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showModeDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-slate-800/95 backdrop-blur rounded-lg border border-white/20 shadow-xl min-w-[200px] overflow-hidden z-50">
                {(['lattice', 'flowers', 'small-world', 'custom'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      onModeChange(m);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors ${
                      mode === m ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-300'
                    }`}
                  >
                    {modeLabels[m]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="flex gap-3 items-center flex-wrap">
            {mode === 'lattice' && (
              <>
                {/* Lattice Type */}
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Lattice Type:
                  <select
                    value={latticeParams.latticeType}
                    onChange={(e) => setLatticeParams({ ...latticeParams, latticeType: e.target.value as LatticeType })}
                    className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="triangular">Triangular</option>
                    <option value="square">Square</option>
                    <option value="hexagonal">Hexagonal</option>
                  </select>
                </label>

                {/* Dim */}
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Dim:
                  <select
                    value={latticeParams.dim}
                    onChange={(e) => setLatticeParams({ ...latticeParams, dim: Number(e.target.value) })}
                    className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="1">1D</option>
                    <option value="2">2D</option>
                    <option value="3">3D</option>
                  </select>
                </label>

                {/* Size (topology-specific label) */}
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  {getSizeLabel()}:
                  <input
                    type="number"
                    value={latticeParams.size}
                    onChange={(e) => setLatticeParams({ ...latticeParams, size: Math.max(2, Math.min(20, Number(e.target.value))) })}
                    className="w-16 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    min="2"
                    max="20"
                  />
                </label>

                {/* Circular/Wrap */}
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={latticeParams.wrap}
                    onChange={(e) => setLatticeParams({ ...latticeParams, wrap: e.target.checked })}
                    className="rounded"
                  />
                  Circular/Wrap
                </label>
              </>
            )}

            {mode === 'small-world' && (
              <>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Variant:
                  <select
                    value={swParams.variant}
                    onChange={(e) => setSwParams({ ...swParams, variant: e.target.value as 'ws' | 'nws' | 'kleinberg' })}
                    className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="ws">WS (Rewire)</option>
                    <option value="nws">NWS (Shortcuts)</option>
                    <option value="kleinberg">Kleinberg</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  N:
                  <input
                    type="number"
                    value={swParams.latticeParams.size}
                    onChange={(e) => setSwParams({ ...swParams, latticeParams: { ...swParams.latticeParams, size: Math.max(2, Math.min(100, Number(e.target.value))) } })}
                    className="w-16 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    min="2"
                    max="100"
                  />
                </label>
                {swParams.variant === 'ws' && (
                  <label className="text-sm text-slate-300 flex items-center gap-2">
                    β:
                    <input
                      type="number"
                      step="0.01"
                      value={swParams.beta_rewire}
                      onChange={(e) => setSwParams({ ...swParams, beta_rewire: Number(e.target.value) })}
                      className="w-16 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                      min="0"
                      max="1"
                    />
                  </label>
                )}
                {swParams.variant === 'nws' && (
                  <label className="text-sm text-slate-300 flex items-center gap-2">
                    p:
                    <input
                      type="number"
                      step="0.01"
                      value={swParams.p_shortcut || 0.03}
                      onChange={(e) => setSwParams({ ...swParams, p_shortcut: Number(e.target.value) })}
                      className="w-16 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                      min="0"
                      max="1"
                    />
                  </label>
                )}
              </>
            )}

            {mode === 'flowers' && (
              <>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  U:
                  <input
                    type="number"
                    value={flowersParams.u}
                    onChange={(e) => setFlowersParams({ ...flowersParams, u: Math.max(2, Number(e.target.value)) })}
                    className="w-12 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    min="2"
                  />
                </label>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  V:
                  <input
                    type="number"
                    value={flowersParams.v}
                    onChange={(e) => setFlowersParams({ ...flowersParams, v: Math.max(flowersParams.u, Number(e.target.value)) })}
                    className="w-12 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    min={flowersParams.u}
                  />
                </label>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Generations:
                  <input
                    type="number"
                    value={flowersParams.generations}
                    onChange={(e) => setFlowersParams({ ...flowersParams, generations: Math.max(1, Math.min(5, Number(e.target.value))) })}
                    className="w-12 bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    min="1"
                    max="5"
                  />
                </label>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Dim:
                  <select
                    value={flowersParams.dim}
                    onChange={(e) => setFlowersParams({ ...flowersParams, dim: Number(e.target.value) })}
                    className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="2">2D</option>
                    <option value="3">3D</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Layout:
                  <select
                    value={flowersParams.layout || (flowersParams.dim === 3 ? 'concentric3d' : 'radial')}
                    onChange={(e) => setFlowersParams({ ...flowersParams, layout: e.target.value as FlowersLayout })}
                    className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="radial">Radial</option>
                    <option value="hierarchical">Hierarchical</option>
                    <option value="concentric3d">3D Concentric</option>
                  </select>
                </label>
                {/* Preset Dropdown */}
                <label className="text-sm text-slate-300 flex items-center gap-2">
                  Preset:
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '2,2,5') setFlowersParams({ ...flowersParams, u: 2, v: 2, generations: 5 });
                      if (val === '2,3,5') setFlowersParams({ ...flowersParams, u: 2, v: 3, generations: 5 });
                      if (val === '2,5,4') setFlowersParams({ ...flowersParams, u: 2, v: 5, generations: 4 });
                      if (val === '3,5,4') setFlowersParams({ ...flowersParams, u: 3, v: 5, generations: 4 });
                      e.target.value = '';
                    }}
                    className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    defaultValue=""
                  >
                    <option value="">--</option>
                    <option value="2,2,5">(2,2,5)</option>
                    <option value="2,3,5">(2,3,5)</option>
                    <option value="2,5,4">(2,5,4)</option>
                    <option value="3,5,4">(3,5,4)</option>
                  </select>
                </label>
              </>
            )}
          </div>

          {/* Validation Error */}
          {!isValid() && (
            <span className="text-xs text-red-400">Invalid parameters</span>
          )}

          {/* Node/Edge Count & Warning */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">{nodeCount} / 100 nodes</span>
            {nodeCount >= 90 && (
              <span className="text-yellow-400">⚠️ Near limit</span>
            )}
          </div>

          {/* Actions - Right Side */}
          <div className="flex gap-2 ml-auto items-center">
            {/* Icon Buttons */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              data-action="undo"
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (⌘Z)"
            >
              <span className="text-lg leading-none">↺</span>
            </button>
            <button
              onClick={onReset}
              className="w-9 h-9 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
              title="Reset"
            >
              {/* Minimalist bin icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onFitView}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              title="Fit View (Double-click canvas)"
            >
              <span className="text-lg leading-none">⤢</span>
            </button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors font-medium shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={nodeCount >= 100 || !isValid()}
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
