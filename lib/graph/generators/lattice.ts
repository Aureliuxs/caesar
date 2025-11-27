import type { Node, Edge, LatticeParams } from '../types';

// Seeded random number generator (Mulberry32)
function createRNG(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Spherical embedding helper for 2D toroidal lattices
// Maps (u,v) ∈ [0,1) × [0,1) to sphere surface
function toSpherical(u: number, v: number): { x: number; y: number; z: number } {
  const phi = Math.PI * (v - 0.5); // latitude: -π/2 to π/2
  const theta = 2 * Math.PI * u;    // longitude: 0 to 2π

  const cosPhi = Math.cos(phi);
  return {
    x: Math.cos(theta) * cosPhi,
    y: Math.sin(theta) * cosPhi,
    z: Math.sin(phi)
  };
}

export function generateLattice(params: LatticeParams, seed: number): { nodes: Node[]; edges: Edge[] } {
  const rng = createRNG(seed);

  switch (params.latticeType) {
    case 'square':
      return generateSquareLattice(params, seed, rng);
    case 'triangular':
      return generateTriangularLattice(params, seed, rng);
    case 'hexagonal':
      return generateHexagonalLattice(params, seed, rng);
    default:
      throw new Error(`Unknown lattice type: ${params.latticeType}`);
  }
}

// ============================================================================
// SQUARE LATTICE
// ============================================================================

function generateSquareLattice(params: LatticeParams, _seed: number, _rng: () => number): { nodes: Node[]; edges: Edge[] } {
  const { dim, size: N, wrap } = params;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (dim === 1) {
    // 1D: line or ring
    for (let i = 0; i < N; i++) {
      let x: number, y: number;

      if (wrap) {
        // Circular layout
        const angle = (i / N) * 2 * Math.PI;
        const radius = 5;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
      } else {
        // Linear layout
        x = i - N / 2;
        y = 0;
      }

      nodes.push({ id: `n${i}`, x, y, attrs: { index: i } });
    }

    // Edges: connect neighbors
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      if (wrap || next > i) {
        edges.push({
          id: `e${i}-${next}`,
          source: `n${i}`,
          target: `n${next}`,
          wrap: wrap && next === 0
        });
      }
    }
  } else if (dim === 2) {
    // 2D: square grid on sphere (if wrap) or plane (if not wrap)
    const scale = 8; // Sphere radius

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j;

        if (wrap) {
          // Map to sphere via toroidal coordinates
          const u = i / N;
          const v = j / N;
          const pos = toSpherical(u, v);
          nodes.push({
            id: `n${idx}`,
            x: pos.x * scale,
            y: pos.y * scale,
            z: pos.z * scale,
            attrs: { gridPos: [i, j] }
          });
        } else {
          // Planar grid
          nodes.push({
            id: `n${idx}`,
            x: (i - N / 2) * 0.8,
            y: (j - N / 2) * 0.8,
            attrs: { gridPos: [i, j] }
          });
        }
      }
    }

    // Edges: 4-neighborhood
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j;

        // Right neighbor
        const ni = (i + 1) % N;
        const isWrapI = wrap && ni === 0;
        if (wrap || ni > i) {
          const nidx = ni * N + j;
          edges.push({
            id: `e${idx}-${nidx}`,
            source: `n${idx}`,
            target: `n${nidx}`,
            wrap: isWrapI
          });
        }

        // Down neighbor
        const nj = (j + 1) % N;
        const isWrapJ = wrap && nj === 0;
        if (wrap || nj > j) {
          const nidx = i * N + nj;
          edges.push({
            id: `e${idx}-${nidx}-v`,
            source: `n${idx}`,
            target: `n${nidx}`,
            wrap: isWrapJ
          });
        }
      }
    }
  } else if (dim === 3) {
    // 3D: cubic grid
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        for (let k = 0; k < N; k++) {
          const idx = i * N * N + j * N + k;
          nodes.push({
            id: `n${idx}`,
            x: i - N / 2,
            y: j - N / 2,
            z: k - N / 2,
            attrs: { gridPos: [i, j, k] }
          });
        }
      }
    }

    // Edges: 6-neighborhood
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        for (let k = 0; k < N; k++) {
          const idx = i * N * N + j * N + k;

          // X-axis neighbor
          const ni = (i + 1) % N;
          const isWrapI = wrap && ni === 0;
          if (wrap || ni > i) {
            const nidx = ni * N * N + j * N + k;
            edges.push({
              id: `e${idx}-${nidx}`,
              source: `n${idx}`,
              target: `n${nidx}`,
              wrap: isWrapI
            });
          }

          // Y-axis neighbor
          const nj = (j + 1) % N;
          const isWrapJ = wrap && nj === 0;
          if (wrap || nj > j) {
            const nidx = i * N * N + nj * N + k;
            edges.push({
              id: `e${idx}-${nidx}-y`,
              source: `n${idx}`,
              target: `n${nidx}`,
              wrap: isWrapJ
            });
          }

          // Z-axis neighbor
          const nk = (k + 1) % N;
          const isWrapK = wrap && nk === 0;
          if (wrap || nk > k) {
            const nidx = i * N * N + j * N + nk;
            edges.push({
              id: `e${idx}-${nidx}-z`,
              source: `n${idx}`,
              target: `n${nidx}`,
              wrap: isWrapK
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

// ============================================================================
// TRIANGULAR LATTICE
// ============================================================================

function generateTriangularLattice(params: LatticeParams, seed: number, rng: () => number): { nodes: Node[]; edges: Edge[] } {
  const { dim, size: N, wrap } = params;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (dim === 1) {
    // 1D: same as square (line or ring)
    return generateSquareLattice({ ...params, latticeType: 'square' }, seed, rng);
  } else if (dim === 2) {
    // 2D: triangular tiling with 6-degree nodes
    // Use axial coordinates on an offset grid
    const scale = 8;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j;

        if (wrap) {
          // Map to sphere
          const u = i / N;
          const v = j / N;
          const pos = toSpherical(u, v);
          nodes.push({
            id: `n${idx}`,
            x: pos.x * scale,
            y: pos.y * scale,
            z: pos.z * scale,
            attrs: { gridPos: [i, j] }
          });
        } else {
          // Planar triangular grid (offset rows)
          const xOffset = (j % 2) * 0.5;
          nodes.push({
            id: `n${idx}`,
            x: (i + xOffset - N / 2) * 0.8,
            y: j * 0.7 - N / 2 * 0.7,
            attrs: { gridPos: [i, j] }
          });
        }
      }
    }

    // Edges: 6 neighbors per node (triangular tiling)
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j;

        // Even-r offset coordinates neighbors
        const neighbors = [
          [(i + 1) % N, j],
          [(i - 1 + N) % N, j],
          [i, (j + 1) % N],
          [i, (j - 1 + N) % N],
          [(i + (j % 2 === 0 ? -1 : 1) + N) % N, (j + 1) % N],
          [(i + (j % 2 === 0 ? -1 : 1) + N) % N, (j - 1 + N) % N],
        ];

        neighbors.forEach(([ni, nj], neighborIdx) => {
          const isWrap = wrap && (ni !== ((i + 1) % N) && ni !== ((i - 1 + N) % N) ? true : (ni === 0 && i === N - 1) || (ni === N - 1 && i === 0) || (nj === 0 && j === N - 1) || (nj === N - 1 && j === 0));

          if (wrap || (ni >= 0 && ni < N && nj >= 0 && nj < N)) {
            const nidxNode = ni * N + nj;
            if (nidxNode > idx || (wrap && nidxNode < idx)) { // Avoid duplicate edges
              edges.push({
                id: `e${idx}-${nidxNode}-${neighborIdx}`,
                source: `n${idx}`,
                target: `n${nidxNode}`,
                wrap: isWrap && wrap
              });
            }
          }
        });
      }
    }
  } else if (dim === 3) {
    // 3D: stacked triangular layers with interlayer connections (12-degree)
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const idx = k * N * N + i * N + j;
          const xOffset = (j % 2) * 0.5;
          nodes.push({
            id: `n${idx}`,
            x: (i + xOffset - N / 2) * 0.8,
            y: j * 0.7 - N / 2 * 0.7,
            z: k - N / 2,
            attrs: { gridPos: [i, j, k] }
          });
        }
      }
    }

    // Edges: within-layer (6) + interlayer (up to 6)
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const idx = k * N * N + i * N + j;

          // Within-layer neighbors (triangular)
          const neighbors2D = [
            [(i + 1) % N, j, k],
            [i, (j + 1) % N, k],
            [(i + (j % 2 === 0 ? -1 : 1) + N) % N, (j + 1) % N, k],
          ];

          neighbors2D.forEach(([ni, nj, nk]) => {
            const isWrap = wrap && ((ni === 0 && i === N - 1) || (nj === 0 && j === N - 1));
            if (wrap || (ni >= 0 && ni < N && nj >= 0 && nj < N)) {
              const nidxNode = nk * N * N + ni * N + nj;
              if (nidxNode !== idx) {
                edges.push({
                  id: `e${idx}-${nidxNode}-2d`,
                  source: `n${idx}`,
                  target: `n${nidxNode}`,
                  wrap: isWrap && wrap
                });
              }
            }
          });

          // Interlayer (z-axis)
          const nk = (k + 1) % N;
          const isWrapK = wrap && nk === 0;
          if (wrap || nk > k) {
            const nidxNode = nk * N * N + i * N + j;
            edges.push({
              id: `e${idx}-${nidxNode}-z`,
              source: `n${idx}`,
              target: `n${nidxNode}`,
              wrap: isWrapK
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

// ============================================================================
// HEXAGONAL LATTICE
// ============================================================================

function generateHexagonalLattice(params: LatticeParams, seed: number, rng: () => number): { nodes: Node[]; edges: Edge[] } {
  const { dim, size: N, wrap } = params;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (dim === 1) {
    // 1D: same as square
    return generateSquareLattice({ ...params, latticeType: 'square' }, seed, rng);
  } else if (dim === 2) {
    // 2D: honeycomb lattice (degree 3 vertices)
    // Use axial/cube coordinates for hex grid
    const scale = 8;

    // Generate hex grid nodes (honeycomb has 2 nodes per "cell")
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j;

        if (wrap) {
          // Map to sphere
          const u = i / N;
          const v = j / N;
          const pos = toSpherical(u, v);
          nodes.push({
            id: `n${idx}`,
            x: pos.x * scale,
            y: pos.y * scale,
            z: pos.z * scale,
            attrs: { gridPos: [i, j] }
          });
        } else {
          // Planar honeycomb
          const xOffset = (j % 2) * 0.866; // sqrt(3)/2
          nodes.push({
            id: `n${idx}`,
            x: (i * 1.5 - N * 0.75) * 0.8,
            y: (j * 0.866 + xOffset - N * 0.433) * 0.8,
            attrs: { gridPos: [i, j] }
          });
        }
      }
    }

    // Edges: honeycomb (degree 3)
    // Connect each node to 3 neighbors
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j;

        // Three neighbors forming honeycomb
        const neighbors = [
          [(i + 1) % N, j],
          [i, (j + 1) % N],
          [(i + (j % 2 === 0 ? 0 : 1)) % N, (j + 1) % N],
        ];

        neighbors.forEach(([ni, nj]) => {
          const isWrap = wrap && ((ni === 0 && i === N - 1) || (nj === 0 && j === N - 1));
          if (wrap || (ni >= 0 && ni < N && nj >= 0 && nj < N)) {
            const nidxNode = ni * N + nj;
            if (nidxNode > idx) {
              edges.push({
                id: `e${idx}-${nidxNode}`,
                source: `n${idx}`,
                target: `n${nidxNode}`,
                wrap: isWrap && wrap
              });
            }
          }
        });
      }
    }
  } else if (dim === 3) {
    // 3D: stacked hex layers (AB stacking) with interlayer links
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const idx = k * N * N + i * N + j;
          // const xOffset = (j % 2) * 0.866;
          const layerOffset = (k % 2) * 0.5; // AB stacking
          nodes.push({
            id: `n${idx}`,
            x: (i * 1.5 + layerOffset - N * 0.75) * 0.8,
            y: (j * 0.866 - N * 0.433) * 0.8,
            z: k - N / 2,
            attrs: { gridPos: [i, j, k] }
          });
        }
      }
    }

    // Edges: within-layer (3) + interlayer
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const idx = k * N * N + i * N + j;

          // Within-layer (honeycomb)
          const neighbors2D = [
            [(i + 1) % N, j, k],
            [i, (j + 1) % N, k],
          ];

          neighbors2D.forEach(([ni, nj, nk]) => {
            const isWrap = wrap && ((ni === 0 && i === N - 1) || (nj === 0 && j === N - 1));
            if (wrap || (ni >= 0 && ni < N && nj >= 0 && nj < N)) {
              const nidxNode = nk * N * N + ni * N + nj;
              edges.push({
                id: `e${idx}-${nidxNode}`,
                source: `n${idx}`,
                target: `n${nidxNode}`,
                wrap: isWrap && wrap
              });
            }
          });

          // Interlayer
          const nk = (k + 1) % N;
          const isWrapK = wrap && nk === 0;
          if (wrap || nk > k) {
            const nidxNode = nk * N * N + i * N + j;
            edges.push({
              id: `e${idx}-${nidxNode}-z`,
              source: `n${idx}`,
              target: `n${nidxNode}`,
              wrap: isWrapK
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

export function calculateLatticeNodeCount(params: LatticeParams): number {
  const { dim, size: N } = params;
  if (dim === 1) return N;
  if (dim === 2) return N * N;
  if (dim === 3) return N * N * N;
  return N;
}
