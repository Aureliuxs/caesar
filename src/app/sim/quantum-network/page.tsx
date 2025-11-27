'use client';

import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/lib/graph/store';
import { generateLattice } from '@/lib/graph/generators/lattice';
import { generateSmallWorld } from '@/lib/graph/generators/small-world';
import { generateFlowers, calculateFlowersNodeCount } from '@/lib/graph/generators/flowers';
import GraphCanvas from '@/components/sim/GraphCanvas';
import ControlStrip from '@/components/sim/ControlStrip';
import type { LatticeParams, SmallWorldParams, FlowersParams, LogEntry } from '@/lib/graph/types';

export default function QuantumNetworkWorkspace() {
  const router = useRouter();
  const {
    graph,
    selectedMode,
    undoStack,
    setGraph,
    resetGraph,
    undo,
    setSelectedMode,
    setError,
  } = useGraphStore();

  const handleGenerate = (params: unknown) => {
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const timestamp = Date.now();

      let nodes, edges, operation;
      let is3D = false;

      switch (selectedMode) {
        case 'lattice': {
          const p = params as LatticeParams;
          const nodeCount = p.dim === 1 ? p.size : p.dim === 2 ? p.size * p.size : p.size * p.size * p.size;
          if (nodeCount > 100) {
            setError('Node count cannot exceed 100');
            return;
          }
          ({ nodes, edges } = generateLattice(p, seed));
          is3D = p.dim === 3 || (p.dim === 2 && p.wrap); // 3D or spherical 2D
          operation = `Generate ${p.latticeType} Lattice(dim=${p.dim}, size=${p.size}, wrap=${p.wrap}, seed=${seed})`;
          break;
        }

        case 'small-world': {
          const p = params as SmallWorldParams;
          const nodeCount = p.latticeParams.size;
          if (nodeCount > 100) {
            setError('Node count cannot exceed 100');
            return;
          }
          ({ nodes, edges } = generateSmallWorld(p, seed));
          operation = `Generate Small-World ${p.variant.toUpperCase()}(n=${p.latticeParams.size}, seed=${seed})`;
          break;
        }

        case 'flowers': {
          const p = params as FlowersParams;
          const projectedCount = calculateFlowersNodeCount(p);
          if (projectedCount > 100) {
            setError(`Projected node count (${projectedCount}) exceeds 100. Reduce parameters.`);
            return;
          }
          ({ nodes, edges } = generateFlowers(p, seed));
          is3D = p.dim === 3 || p.layout === 'concentric3d';
          operation = `Generate (u,v)-Flowers(u=${p.u}, v=${p.v}, gen=${p.generations}, dim=${p.dim}, seed=${seed})`;
          break;
        }

        case 'custom': {
          // Simple random graph for custom mode
          const n = Math.min(20, 100);
          nodes = Array.from({ length: n }, (_, i) => ({
            id: `n${i}`,
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
          }));
          edges = [];
          // Random edges
          for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
              if (Math.random() < 0.1) {
                edges.push({
                  id: `e${i}-${j}`,
                  source: `n${i}`,
                  target: `n${j}`,
                });
              }
            }
          }
          operation = `Generate Custom Random(n=${n}, seed=${seed})`;
          break;
        }

        default:
          setError('Unknown mode');
          return;
      }

      const graphState = {
        nodes,
        edges,
        directed: false,
        is3D,
        metadata: {
          seed,
          mode: selectedMode,
          params,
          timestamp,
        },
      };

      const logEntry: LogEntry = {
        id: `log-${timestamp}`,
        timestamp,
        operation,
        params: params as Record<string, unknown>,
        seed,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      };

      setGraph(graphState, logEntry);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Generation failed');
    }
  };

  // Export handler (disabled for now)
  // const handleExport = (format: 'json' | 'gexf' | 'graphml') => {
  //   if (!graph) return;
  //   let content = '';
  //   let filename = '';
  //   if (format === 'json') {
  //     content = JSON.stringify({
  //       nodes: graph.nodes,
  //       edges: graph.edges,
  //       metadata: graph.metadata,
  //       log: operationLog,
  //     }, null, 2);
  //     filename = `graph-${Date.now()}.json`;
  //   }
  //   const blob = new Blob([content], { type: 'application/json' });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = filename;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  const handleFitView = () => {
    // Trigger fit view via the exposed function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).__fitView === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__fitView();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Top bar (matches home) */}
      <header className="sticky top-0 z-50 backdrop-blur bg-slate-900/70 supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
        <div className="container">
          <div className="flex h-16 items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="focus-ring text-xl font-bold text-white hover:text-slate-200 transition-colors"
            >
              ← Caesar
            </button>
            <div className="text-slate-400 text-sm">
              / Quantum Network Communication
            </div>
          </div>
        </div>
      </header>

      {/* Control Strip */}
      <ControlStrip
        mode={selectedMode}
        onModeChange={setSelectedMode}
        onGenerate={handleGenerate}
        onReset={resetGraph}
        onUndo={undo}
        onFitView={handleFitView}
        canUndo={undoStack.length > 0}
        nodeCount={graph?.nodes.length || 0}
      />

      {/* Canvas */}
      <div className="fixed inset-0 top-32">
        <GraphCanvas graph={graph} onFitView={handleFitView} />
      </div>

      {/* Operation Log - Hidden per requirements */}

      {/* Welcome message */}
      {!graph && (
        <div className="fixed inset-0 top-32 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Quantum Network Builder
            </h1>
            <p className="text-slate-400 text-lg max-w-md">
              Select a generation mode and configure parameters to create interactive network topologies.
            </p>
            <p className="text-slate-500 text-sm mt-4">
              Use the controls above to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
