import type { Node, Edge, SmallWorldParams } from '../types';
import { generateLattice } from './lattice';

function createRNG(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateSmallWorld(params: SmallWorldParams, seed: number): { nodes: Node[]; edges: Edge[] } {
  const { variant, latticeParams } = params;

  // Start with base lattice
  const { nodes, edges } = generateLattice(latticeParams, seed);
  const rng = createRNG(seed + 1000);

  switch (variant) {
    case 'ws':
      return applyWattsStrogatz(nodes, edges, params, rng);
    case 'nws':
      return applyNewmanWattsStrogatz(nodes, edges, params, rng);
    case 'kleinberg':
      return applyKleinberg(nodes, edges, params, rng);
    default:
      return { nodes, edges };
  }
}

function applyWattsStrogatz(
  nodes: Node[],
  edges: Edge[],
  params: SmallWorldParams,
  rng: () => number
): { nodes: Node[]; edges: Edge[] } {
  const { beta_rewire = 0.05 } = params;
  const newEdges: Edge[] = [];

  edges.forEach(edge => {
    if (rng() < beta_rewire) {
      // Rewire: pick a random target
      let newTarget = nodes[Math.floor(rng() * nodes.length)].id;
      let attempts = 0;
      while ((newTarget === edge.source || newTarget === edge.target) && attempts < 10) {
        newTarget = nodes[Math.floor(rng() * nodes.length)].id;
        attempts++;
      }

      newEdges.push({
        ...edge,
        target: newTarget,
        id: `e${edge.source}-${newTarget}`
      });
    } else {
      newEdges.push(edge);
    }
  });

  return { nodes, edges: newEdges };
}

function applyNewmanWattsStrogatz(
  nodes: Node[],
  edges: Edge[],
  params: SmallWorldParams,
  rng: () => number
): { nodes: Node[]; edges: Edge[] } {
  const { p_shortcut = 0.03, no_parallel = true } = params;
  const newEdges = [...edges];
  const existingEdges = new Set(edges.map(e => `${e.source}-${e.target}`));

  nodes.forEach(node => {
    if (rng() < p_shortcut) {
      // Add shortcut to random node
      let target = nodes[Math.floor(rng() * nodes.length)].id;
      let attempts = 0;

      while (attempts < 10) {
        const edgeKey = `${node.id}-${target}`;
        const reverseKey = `${target}-${node.id}`;

        if (target !== node.id && (!no_parallel || (!existingEdges.has(edgeKey) && !existingEdges.has(reverseKey)))) {
          newEdges.push({
            id: `esc${node.id}-${target}`,
            source: node.id,
            target,
            directed: params.directed_shortcuts || params.latticeParams.directed,
            attrs: { type: 'shortcut' }
          });
          existingEdges.add(edgeKey);
          break;
        }

        target = nodes[Math.floor(rng() * nodes.length)].id;
        attempts++;
      }
    }
  });

  return { nodes, edges: newEdges };
}

function applyKleinberg(
  nodes: Node[],
  edges: Edge[],
  params: SmallWorldParams,
  rng: () => number
): { nodes: Node[]; edges: Edge[] } {
  const { n_shortcuts_per_node = 1, alpha = 2 } = params;
  const newEdges = [...edges];

  nodes.forEach(source => {
    // Calculate distances to all other nodes
    const distances: Array<{ node: Node; dist: number }> = [];

    nodes.forEach(target => {
      if (source.id === target.id) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = (target.z || 0) - (source.z || 0);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0) {
        distances.push({ node: target, dist });
      }
    });

    // Create probability distribution based on distance^(-alpha)
    const probabilities = distances.map(({ dist }) => Math.pow(dist, -alpha));
    const totalProb = probabilities.reduce((sum, p) => sum + p, 0);

    // Add n shortcuts
    for (let i = 0; i < n_shortcuts_per_node; i++) {
      let rand = rng() * totalProb;
      let selectedIdx = 0;

      for (let j = 0; j < probabilities.length; j++) {
        rand -= probabilities[j];
        if (rand <= 0) {
          selectedIdx = j;
          break;
        }
      }

      const target = distances[selectedIdx].node;
      newEdges.push({
        id: `ekb${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        directed: params.directed_shortcuts || params.latticeParams.directed,
        attrs: { type: 'kleinberg-shortcut' }
      });
    }
  });

  return { nodes, edges: newEdges };
}

export function calculateSmallWorldNodeCount(params: SmallWorldParams): number {
  const { dim, size } = params.latticeParams;
  if (dim === 1) return size;
  if (dim === 2) return size * size;
  if (dim === 3) return size * size * size;
  return size;
}
