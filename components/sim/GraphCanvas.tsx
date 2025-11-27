'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GraphState } from '@/lib/graph/types';

interface GraphCanvasProps {
  graph: GraphState | null;
  onFitView?: () => void;
  onCameraChange?: (camera: CameraState) => void;
}

interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotationX: number; // Rotation around X axis (pitch)
  rotationY: number; // Rotation around Y axis (yaw)
}

export default function GraphCanvas({ graph, onFitView, onCameraChange }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    zoom: 1,
    rotationX: 0.3,
    rotationY: 0.3,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHint, setShowHint] = useState(true);
  const [hintDismissed, setHintDismissed] = useState(false);

  const is3D = graph?.is3D || false;

  // Fit view to show all nodes
  const fitView = useCallback(() => {
    if (!graph || graph.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    graph.nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
      if (node.z !== undefined) {
        if (node.z < minZ) minZ = node.z;
        if (node.z > maxZ) maxZ = node.z;
      }
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const margin = 0.9;
    const maxExtent = Math.max(width, height, is3D ? depth : 0) || 1;
    const zoom = Math.min((rect.width / maxExtent) * margin / 50, 5);

    setCamera({
      x: -centerX,
      y: -centerY,
      zoom: Math.max(0.1, zoom),
      rotationX: is3D ? 0.3 : 0,
      rotationY: is3D ? 0.3 : 0,
    });
  }, [graph, is3D]);

  // Expose fitView to parent
  useEffect(() => {
    if (onFitView) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__fitView = fitView;
    }
  }, [fitView, onFitView]);

  // Auto-fit on new graph
  useEffect(() => {
    if (graph) {
      fitView();
    }
  }, [graph, fitView]);

  // Project 3D point to 2D screen
  const project3D = useCallback((
    x: number,
    y: number,
    z: number,
    cam: CameraState,
    centerX: number,
    centerY: number,
    scale: number
  ): { x: number; y: number; depth: number } => {
    // Apply camera translation
    const px = x + cam.x;
    const py = y + cam.y;
    const pz = z;

    // Apply rotation (Y then X)
    // Rotate around Y axis (yaw)
    const cosY = Math.cos(cam.rotationY);
    const sinY = Math.sin(cam.rotationY);
    const x1 = px * cosY - pz * sinY;
    const z1 = px * sinY + pz * cosY;

    // Rotate around X axis (pitch)
    const cosX = Math.cos(cam.rotationX);
    const sinX = Math.sin(cam.rotationX);
    const y2 = py * cosX - z1 * sinX;
    const z2 = py * sinX + z1 * cosX;

    // Simple orthographic projection
    const screenX = centerX + x1 * scale;
    const screenY = centerY + y2 * scale;

    return { x: screenX, y: screenY, depth: z2 };
  }, []);

  // Render graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const scale = camera.zoom * 50;

    // Calculate zoom-scaled node radius (clamped)
    const baseRadius = 6;
    const nodeRadius = Math.max(2, Math.min(12, baseRadius * camera.zoom));

    // Project all nodes
    const projectedNodes = graph.nodes.map(node => {
      if (is3D) {
        return {
          ...node,
          projected: project3D(node.x, node.y, node.z || 0, camera, centerX, centerY, scale)
        };
      } else {
        return {
          ...node,
          projected: {
            x: centerX + (node.x + camera.x) * scale,
            y: centerY + (node.y + camera.y) * scale,
            depth: 0
          }
        };
      }
    });

    // Sort nodes by depth (back to front for proper rendering)
    const sortedNodes = [...projectedNodes].sort((a, b) => a.projected.depth - b.projected.depth);

    // Draw edges (with depth sorting and wrap opacity)
    const edgesWithDepth = graph.edges.map(edge => {
      const source = projectedNodes.find(n => n.id === edge.source);
      const target = projectedNodes.find(n => n.id === edge.target);
      if (!source || !target) return null;

      const avgDepth = (source.projected.depth + target.projected.depth) / 2;
      return { edge, source, target, avgDepth };
    }).filter(e => e !== null) as Array<{
      edge: typeof graph.edges[0];
      source: typeof projectedNodes[0];
      target: typeof projectedNodes[0];
      avgDepth: number;
    }>;

    edgesWithDepth.sort((a, b) => a.avgDepth - b.avgDepth);

    edgesWithDepth.forEach(({ edge, source, target }) => {
      const isWrap = edge.wrap || false;
      const opacity = (is3D && isWrap) ? 0.3 : 0.6;

      ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
      ctx.lineWidth = Math.max(0.5, 1 * camera.zoom);

      ctx.beginPath();
      ctx.moveTo(source.projected.x, source.projected.y);
      ctx.lineTo(target.projected.x, target.projected.y);
      ctx.stroke();
    });

    // Draw nodes with glow
    sortedNodes.forEach(node => {
      const x = node.projected.x;
      const y = node.projected.y;

      // Glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeRadius * 3);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.6)');
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius * 3, 0, 2 * Math.PI);
      ctx.fill();

      // Node body
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Notify parent of camera changes
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [graph, camera, is3D, project3D, onCameraChange]);

  // Prevent page scroll on wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelPrevent = (e: WheelEvent) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', handleWheelPrevent, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelPrevent);
  }, []);

  // Mouse handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Exponential zoom with reduced sensitivity
    const delta = e.deltaY * 0.001;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * Math.exp(-delta)))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setIsRotating(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    // Dismiss hint on first interaction
    if (showHint && !hintDismissed) {
      setShowHint(false);
      setHintDismissed(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isRotating && is3D) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setCamera(prev => ({
        ...prev,
        rotationY: prev.rotationY + dx * 0.005,
        rotationX: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.rotationX + dy * 0.005))
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      const dx = (e.clientX - dragStart.x) / (camera.zoom * 50);
      const dy = (e.clientY - dragStart.y) / (camera.zoom * 50);

      setCamera(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsRotating(false);
  };

  const handleDoubleClick = () => {
    fitView();
  };

  // Orb drag handlers
  const handleOrbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (showHint && !hintDismissed) {
      setShowHint(false);
      setHintDismissed(true);
    }
  };

  const handleOrbMouseMove = (e: React.MouseEvent) => {
    if (isRotating && is3D) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setCamera(prev => ({
        ...prev,
        rotationY: prev.rotationY + dx * 0.01,
        rotationX: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.rotationX + dy * 0.01))
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const undoBtn = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
        if (undoBtn && !undoBtn.disabled) {
          undoBtn.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show hint after first 3D render
  useEffect(() => {
    if (is3D && graph && !hintDismissed) {
      const timer = setTimeout(() => {
        setShowHint(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [is3D, graph, hintDismissed]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Info overlay */}
      {graph && (
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-2 rounded-lg text-xs text-slate-300">
          <div>Nodes: {graph.nodes.length} / 100</div>
          <div>Edges: {graph.edges.length}</div>
          <div>Zoom: {camera.zoom.toFixed(2)}x</div>
          {is3D && <div className="text-cyan-300 mt-1">3D Mode</div>}
        </div>
      )}

      {/* Rotation Orb Widget (bottom-left) */}
      {is3D && graph && (
        <div className="absolute bottom-4 left-4">
          <div
            ref={orbRef}
            className="w-16 h-16 bg-black/60 backdrop-blur rounded-full border-2 border-cyan-500/40 cursor-grab active:cursor-grabbing flex items-center justify-center transition-all hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
            onMouseDown={handleOrbMouseDown}
            onMouseMove={handleOrbMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            title="Drag to rotate view"
          >
            {/* Orb visual (simple sphere gradient) */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/40 to-cyan-600/40 border border-cyan-400/60" />
          </div>
        </div>
      )}

      {/* Rotation Hint (centered, fades in/out) */}
      {is3D && showHint && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 opacity-100"
          style={{ animation: 'fadeIn 0.5s ease-in' }}
        >
          <div className="bg-black/80 backdrop-blur px-6 py-3 rounded-lg border border-cyan-500/40 text-white text-sm">
            Hold <kbd className="px-2 py-1 bg-cyan-500/20 rounded border border-cyan-500/40">Ctrl</kbd> and drag to rotate
          </div>
        </div>
      )}
    </div>
  );
}
