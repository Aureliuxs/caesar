import type { Node, Edge, FlowersParams } from '../types';

function createRNG(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateFlowers(params: FlowersParams, seed: number): { nodes: Node[]; edges: Edge[] } {
  const { u, v, generations, dim = 2, layout, deterministic = true } = params;

  // Validate
  if (u < 2 || v < u) {
    throw new Error('Invalid (u,v): must have u >= 2 and v >= u');
  }

  if (generations < 1) {
    throw new Error('Generations must be >= 1');
  }

  // Check if node count would exceed limit
  const projectedCount = calculateFlowersNodeCount(params);
  if (projectedCount > 100) {
    throw new Error(`Projected node count (${projectedCount}) exceeds limit of 100. Reduce generations or (u,v) values.`);
  }

  // Determine layout mode
  const layoutMode = layout || (dim === 3 ? 'concentric3d' : 'radial');

  // Build the graph structure (series-parallel)
  const graph = buildSeriesParallelGraph(u, v, generations);

  // Apply layout
  const { nodes, edges } = applyLayout(graph, layoutMode, dim, deterministic, seed);

  return { nodes, edges };
}

// ============================================================================
// SERIES-PARALLEL CONSTRUCTION (exact algorithm)
// ============================================================================

interface SPEdge {
  id: string;
  source: string;
  target: string;
  generation: number;
}

interface SPGraph {
  terminals: [string, string]; // A, B
  nodes: Set<string>;
  edges: SPEdge[];
}

function buildSeriesParallelGraph(u: number, v: number, generations: number): SPGraph {
  // Start with seed: A --e0--> B
  let nodeId = 0;
  const A = `n${nodeId++}`;
  const B = `n${nodeId++}`;

  const nodes = new Set<string>([A, B]);
  let edges: SPEdge[] = [{ id: 'e0', source: A, target: B, generation: 0 }];

  // Apply generations
  for (let gen = 1; gen <= generations; gen++) {
    const newEdges: SPEdge[] = [];

    for (const edge of edges) {
      // Replace edge (x, y) with two parallel paths:
      // Path 1: U-chain
      const uChain: string[] = [edge.source];
      for (let i = 0; i < u - 1; i++) {
        uChain.push(`n${nodeId++}`);
      }
      uChain.push(edge.target);

      for (let i = 0; i < uChain.length - 1; i++) {
        nodes.add(uChain[i]);
        nodes.add(uChain[i + 1]);
        newEdges.push({
          id: `${edge.id}_u${i}`,
          source: uChain[i],
          target: uChain[i + 1],
          generation: gen
        });
      }

      // Path 2: V-chain
      const vChain: string[] = [edge.source];
      for (let i = 0; i < v - 1; i++) {
        vChain.push(`n${nodeId++}`);
      }
      vChain.push(edge.target);

      for (let i = 0; i < vChain.length - 1; i++) {
        nodes.add(vChain[i]);
        nodes.add(vChain[i + 1]);
        newEdges.push({
          id: `${edge.id}_v${i}`,
          source: vChain[i],
          target: vChain[i + 1],
          generation: gen
        });
      }
    }

    edges = newEdges;
  }

  return { terminals: [A, B], nodes, edges };
}

// ============================================================================
// LAYOUT ALGORITHMS
// ============================================================================

function applyLayout(
  graph: SPGraph,
  layout: string,
  dim: number,
  deterministic: boolean,
  seed: number
): { nodes: Node[]; edges: Edge[] } {
  switch (layout) {
    case 'radial':
      return applyRadialLayout(graph, dim, deterministic, seed);
    case 'hierarchical':
      return applyHierarchicalLayout(graph, dim, deterministic, seed);
    case 'concentric3d':
      return applyConcentric3DLayout(graph, dim, deterministic, seed);
    default:
      return applyRadialLayout(graph, dim, deterministic, seed);
  }
}

// ----------------------------------------------------------------------------
// RADIAL LAYOUT (2D/3D)
// Concentric shells by generation; fan U/V paths above/below axis
// ----------------------------------------------------------------------------

function applyRadialLayout(
  graph: SPGraph,
  dim: number,
  deterministic: boolean,
  seed: number
): { nodes: Node[]; edges: Edge[] } {
  const rng = createRNG(seed);
  const [A, B] = graph.terminals;

  // Assign generation levels to nodes
  const nodeGen = new Map<string, number>();
  nodeGen.set(A, 0);
  nodeGen.set(B, 0);

  for (const edge of graph.edges) {
    if (!nodeGen.has(edge.source)) nodeGen.set(edge.source, edge.generation - 1);
    if (!nodeGen.has(edge.target)) nodeGen.set(edge.target, edge.generation);
  }

  const maxGen = Math.max(...Array.from(nodeGen.values()));

  // Position nodes
  const positions = new Map<string, { x: number; y: number; z: number }>();

  // Terminals on x-axis
  const baseRadius = 8;
  positions.set(A, { x: -baseRadius, y: 0, z: 0 });
  positions.set(B, { x: baseRadius, y: 0, z: 0 });

  // For each generation, place nodes on concentric shells
  for (let gen = 1; gen <= maxGen; gen++) {
    const genNodes = Array.from(nodeGen.entries())
      .filter(([, g]) => g === gen)
      .map(([id]) => id);

    const radius = baseRadius * (1 - gen / (maxGen + 2));
    const angleSpan = Math.PI; // Half circle

    genNodes.forEach((nodeId, idx) => {
      const angle = -angleSpan / 2 + (idx / (genNodes.length || 1)) * angleSpan;
      const r = radius + (deterministic ? 0 : (rng() - 0.5) * 0.5);

      if (dim === 3) {
        // 3D: place on a spherical shell
        const phi = angle;
        const theta = (idx / (genNodes.length || 1)) * 2 * Math.PI;
        positions.set(nodeId, {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi)
        });
      } else {
        // 2D: radial fan
        positions.set(nodeId, {
          x: r * Math.cos(angle),
          y: r * Math.sin(angle),
          z: 0
        });
      }
    });
  }

  // Build output
  const nodes: Node[] = Array.from(graph.nodes).map(id => {
    const pos = positions.get(id) || { x: 0, y: 0, z: 0 };
    return { id, x: pos.x, y: pos.y, z: pos.z };
  });

  const edges: Edge[] = graph.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target
  }));

  return { nodes, edges };
}

// ----------------------------------------------------------------------------
// HIERARCHICAL LAYOUT (series-parallel bands)
// U-path above, V-path below; left-to-right progression
// ----------------------------------------------------------------------------

function applyHierarchicalLayout(
  graph: SPGraph,
  dim: number,
  deterministic: boolean,
  seed: number
): { nodes: Node[]; edges: Edge[] } {
  const rng = createRNG(seed);
  const [,] = graph.terminals;

  // Topological sort to get left-to-right order
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node, 0);
    adjList.set(node, []);
  }

  for (const edge of graph.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adjList.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    topoOrder.push(node);

    for (const neighbor of adjList.get(node) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  // Assign x by topological order, y by "band" (stochastic or deterministic)
  const positions = new Map<string, { x: number; y: number; z: number }>();
  const xSpacing = 2;

  topoOrder.forEach((nodeId, idx) => {
    const x = idx * xSpacing - (topoOrder.length * xSpacing) / 2;
    const y = deterministic ? 0 : (rng() - 0.5) * 4;
    positions.set(nodeId, { x, y, z: 0 });
  });

  // Build output
  const nodes: Node[] = Array.from(graph.nodes).map(id => {
    const pos = positions.get(id) || { x: 0, y: 0, z: 0 };
    return { id, x: pos.x, y: pos.y, z: pos.z };
  });

  const edges: Edge[] = graph.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target
  }));

  return { nodes, edges };
}

// ----------------------------------------------------------------------------
// CONCENTRIC 3D LAYOUT
// A at (0,0,-R), B at (0,0,+R); concentric spheres by generation
// ----------------------------------------------------------------------------

function applyConcentric3DLayout(
  graph: SPGraph,
  dim: number,
  deterministic: boolean,
  seed: number
): { nodes: Node[]; edges: Edge[] } {
  const rng = createRNG(seed);
  const [A, B] = graph.terminals;

  // Assign generation levels to nodes
  const nodeGen = new Map<string, number>();
  nodeGen.set(A, 0);
  nodeGen.set(B, 0);

  for (const edge of graph.edges) {
    if (!nodeGen.has(edge.source)) nodeGen.set(edge.source, edge.generation - 1);
    if (!nodeGen.has(edge.target)) nodeGen.set(edge.target, edge.generation);
  }

  const maxGen = Math.max(...Array.from(nodeGen.values()));

  // Position nodes
  const positions = new Map<string, { x: number; y: number; z: number }>();

  const R = 8;
  positions.set(A, { x: 0, y: 0, z: -R });
  positions.set(B, { x: 0, y: 0, z: R });

  // For each generation, place nodes on a sphere
  for (let gen = 1; gen <= maxGen; gen++) {
    const genNodes = Array.from(nodeGen.entries())
      .filter(([, g]) => g === gen)
      .map(([id]) => id);

    const r = R * (gen / (maxGen + 1));

    genNodes.forEach((nodeId, idx) => {
      const theta = (idx / (genNodes.length || 1)) * 2 * Math.PI;
      const phi = Math.PI / 2 + (deterministic ? 0 : (rng() - 0.5) * Math.PI / 4);

      positions.set(nodeId, {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi) - R / 2
      });
    });
  }

  // Build output
  const nodes: Node[] = Array.from(graph.nodes).map(id => {
    const pos = positions.get(id) || { x: 0, y: 0, z: 0 };
    return { id, x: pos.x, y: pos.y, z: pos.z };
  });

  const edges: Edge[] = graph.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target
  }));

  return { nodes, edges };
}

// ============================================================================
// NODE COUNT CALCULATION
// ============================================================================

export function calculateFlowersNodeCount(params: FlowersParams): number {
  const { u, v, generations } = params;

  // Start with 2 terminals (A, B)
  let totalNodes = 2;
  let currentEdges = 1;

  for (let gen = 1; gen <= generations; gen++) {
    // Each edge is replaced by two paths (U and V)
    // U-path adds (u-1) intermediate nodes, V-path adds (v-1)
    const newNodes = currentEdges * ((u - 1) + (v - 1));
    totalNodes += newNodes;

    // Each old edge becomes (u + v) new edges
    currentEdges = currentEdges * (u + v);
  }

  return totalNodes;
}
