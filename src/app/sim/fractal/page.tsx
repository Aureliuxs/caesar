'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { FractalRenderer } from '@/lib/fractal/renderer';
import type { FractalParams, Viewport } from '@/lib/fractal/types';

type ParameterPerspective = 'z0' | 'c' | 'k';

interface AnimationState {
  colorHue: boolean;
}

export default function FractalSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<FractalRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const zoomTimeoutRef = useRef<number>();

  const [headerVisible, setHeaderVisible] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [instructionsVisible, setInstructionsVisible] = useState(true);
  const [perspective, setPerspective] = useState<ParameterPerspective>('c');

  const [params, setParams] = useState<FractalParams>({
    realZ0: 0,
    imagZ0: 0,
    realC: 0,
    imagC: 0,
    exponent: 2,
    imagExponent: 0,
    colorHue: 200,
  });

  const [resolution, setResolution] = useState(1); // 0.5 to 2.0

  const [animating, setAnimating] = useState<AnimationState>({
    colorHue: false,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });

  // Get display values based on perspective
  const getDisplayValues = () => {
    switch (perspective) {
      case 'z0':
        return { real: params.realZ0, imag: params.imagZ0 };
      case 'c':
        return { real: params.realC, imag: params.imagC };
      case 'k':
        return { real: params.exponent, imag: params.imagExponent };
      default:
        return { real: 0, imag: 0 };
    }
  };

  // Update params based on perspective
  const updatePerspectiveParam = (key: 'real' | 'imag', value: number) => {
    setParams(prev => {
      const next = { ...prev };
      switch (perspective) {
        case 'z0':
          if (key === 'real') next.realZ0 = value;
          else next.imagZ0 = value;
          break;
        case 'c':
          if (key === 'real') next.realC = value;
          else next.imagC = value;
          break;
        case 'k':
          if (key === 'real') next.exponent = value;
          else next.imagExponent = value;
          break;
      }
      return next;
    });
    setInstructionsVisible(false);
  };

  // Reset non-perspective params when changing perspective
  const changePerspective = (newPerspective: ParameterPerspective) => {
    setPerspective(newPerspective);

    setParams(prev => {
      const next = { ...prev };

      // Reset all params to defaults
      if (newPerspective !== 'z0') {
        next.realZ0 = 0;
        next.imagZ0 = 0;
      }
      if (newPerspective !== 'c') {
        next.realC = 0;
        next.imagC = 0;
      }
      if (newPerspective !== 'k') {
        next.exponent = 2;
        next.imagExponent = 0;
      }

      return next;
    });
  };

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const worker = new Worker(new URL('@/lib/fractal/worker.ts', import.meta.url));

    const viewport: Viewport = {
      centerX: 0,
      centerY: 0,
      zoom: 1
    };

    const renderer = new FractalRenderer(canvas, worker, viewport, params);
    rendererRef.current = renderer;
    renderer.render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderer.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
    };
  }, []);

  // Update params when they change
  useEffect(() => {
    rendererRef.current?.updateParams(params);
  }, [params]);

  // Update resolution
  useEffect(() => {
    rendererRef.current?.setResolution(resolution);
  }, [resolution]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setParams(prev => {
        const next = { ...prev };
        const time = Date.now() / 1000;

        if (animating.colorHue) next.colorHue = (time * 30) % 360;

        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const isAnimating = Object.values(animating).some(v => v);
    if (isAnimating) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animating]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.startInteraction();

    // Reduce sensitivity: smaller zoom factor based on deltaY
    const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
    const rect = canvasRef.current?.getBoundingClientRect();
    const mouseX = rect ? e.clientX - rect.left : undefined;
    const mouseY = rect ? e.clientY - rect.top : undefined;

    renderer.zoom(zoomFactor, mouseX, mouseY);

    // Debounce the end interaction
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = window.setTimeout(() => {
      renderer.endInteraction();
    }, 150);

    setInstructionsVisible(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastPanRef.current = { x: 0, y: 0 };

    rendererRef.current?.startInteraction();
    setInstructionsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    // Calculate total delta from drag start
    const totalDx = e.clientX - dragStartRef.current.x;
    const totalDy = e.clientY - dragStartRef.current.y;

    // Calculate incremental delta since last pan
    const dx = totalDx - lastPanRef.current.x;
    const dy = totalDy - lastPanRef.current.y;

    // Update last pan position
    lastPanRef.current = { x: totalDx, y: totalDy };

    // Pan by the incremental delta
    rendererRef.current?.pan(dx, dy);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      rendererRef.current?.endInteraction();
    }
  };

  const resetView = () => {
    setPerspective('c');
    setParams({
      realZ0: 0,
      imagZ0: 0,
      realC: 0,
      imagC: 0,
      exponent: 2,
      imagExponent: 0,
      colorHue: 200,
    });
    setResolution(1);

    if (rendererRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const worker = new Worker(new URL('@/lib/fractal/worker.ts', import.meta.url));
        const viewport: Viewport = { centerX: 0, centerY: 0, zoom: 1 };
        const resetParams = {
          realZ0: 0,
          imagZ0: 0,
          realC: 0,
          imagC: 0,
          exponent: 2,
          imagExponent: 0,
          colorHue: 200,
        };
        const newRenderer = new FractalRenderer(canvas, worker, viewport, resetParams);

        rendererRef.current.destroy();
        rendererRef.current = newRenderer;
        newRenderer.render();
      }
    }
  };

  const formatComplex = (real: number, imag: number) => {
    if (imag === 0) return real.toFixed(2);
    const sign = imag >= 0 ? ' + ' : ' - ';
    return `${real.toFixed(2)}${sign}${Math.abs(imag).toFixed(2)}i`;
  };

  const displayVals = getDisplayValues();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black touch-none">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-move touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }}
      />

      {/* Header */}
      <AnimatePresence>
        {headerVisible && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 right-0 z-10"
          >
            <Header active="projects" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Header Button */}
      <button
        onClick={() => setHeaderVisible(!headerVisible)}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 transition-colors flex items-center justify-center"
        title={headerVisible ? 'Hide header' : 'Show header'}
      >
        <svg
          className={`w-5 h-5 transition-transform ${headerVisible ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Controls */}
      <div className="absolute bottom-6 left-6 z-10">
        <AnimatePresence>
          {controlsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 max-w-xs mb-3"
            >
              {/* Parameter Perspective Selector */}
              <div className="px-4 py-2.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/20">
                <p className="text-xs font-medium text-white mb-2">Parameter Perspective</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => changePerspective('z0')}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      perspective === 'z0'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    z₀
                  </button>
                  <button
                    onClick={() => changePerspective('c')}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      perspective === 'c'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    c
                  </button>
                  <button
                    onClick={() => changePerspective('k')}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      perspective === 'k'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    k
                  </button>
                </div>
              </div>

              {/* Parameter Sliders */}
              <ControlSlider
                label={`Re(${perspective})`}
                value={displayVals.real}
                onChange={(v) => updatePerspectiveParam('real', v)}
                min={perspective === 'k' ? -5 : -2}
                max={perspective === 'k' ? 5 : 2}
                step={perspective === 'k' ? 0.1 : 0.01}
              />

              <ControlSlider
                label={`Im(${perspective})`}
                value={displayVals.imag}
                onChange={(v) => updatePerspectiveParam('imag', v)}
                min={perspective === 'k' ? -5 : -2}
                max={perspective === 'k' ? 5 : 2}
                step={perspective === 'k' ? 0.1 : 0.01}
              />

              {/* Resolution Slider */}
              <div className="px-4 py-2.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">Resolution</span>
                  <span className="text-xs text-white/70 tabular-nums">{resolution.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={resolution}
                  onChange={(e) => setResolution(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/20 slider"
                />
              </div>

              {/* Color Slider */}
              <ControlSlider
                label="Color"
                value={params.colorHue}
                onChange={(v) => setParams(prev => ({ ...prev, colorHue: v }))}
                min={0}
                max={360}
                step={1}
                isAnimating={animating.colorHue}
                onToggleAnimation={() => setAnimating(prev => ({ ...prev, colorHue: !prev.colorHue }))}
                isColor
              />

              {/* Reset Button */}
              <button
                onClick={resetView}
                className="w-full px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 transition-colors text-sm font-medium"
              >
                Reset
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Controls Button */}
        <button
          onClick={() => setControlsVisible(!controlsVisible)}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 transition-colors flex items-center justify-center"
          title={controlsVisible ? 'Hide controls' : 'Show controls'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${controlsVisible ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Equation Display - directly on background, single line */}
        <div className="mt-3 text-white text-xs font-mono whitespace-nowrap">
          <span>z<sub>n+1</sub> = (z<sub>n</sub>)<sup>k</sup> + c</span>
          <span className="ml-4 text-white/70">
            z₀ = {formatComplex(params.realZ0, params.imagZ0)}
          </span>
          <span className="ml-3 text-white/70">
            c = {formatComplex(params.realC, params.imagC)}
          </span>
          <span className="ml-3 text-white/70">
            k = {formatComplex(params.exponent, params.imagExponent)}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <AnimatePresence>
        {instructionsVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 right-6 z-10 px-4 py-3 rounded-lg bg-black/50 backdrop-blur-md border border-white/20 text-white text-sm max-w-xs"
          >
            <p className="font-semibold mb-1">Controls:</p>
            <p className="text-white/70">• Scroll to zoom</p>
            <p className="text-white/70">• Click and drag to pan</p>
            <p className="text-white/70">• Use sliders to adjust parameters</p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  isAnimating?: boolean;
  onToggleAnimation?: () => void;
  isColor?: boolean;
}

function ControlSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  isAnimating,
  onToggleAnimation,
  isColor = false,
}: ControlSliderProps) {
  const gradientStyle = isColor
    ? { background: `linear-gradient(to right, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%), hsl(180, 70%, 50%), hsl(240, 70%, 50%), hsl(300, 70%, 50%), hsl(360, 70%, 50%))` }
    : {};

  const showPlayButton = onToggleAnimation !== undefined;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/20">
      {showPlayButton && (
        <button
          onClick={onToggleAnimation}
          className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors text-xs ${
            isAnimating ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/50 hover:bg-white/30'
          }`}
          title={isAnimating ? 'Stop animation' : 'Start animation'}
        >
          {isAnimating ? '❚❚' : '▶'}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-white">{label}</span>
          <span className="text-xs text-white/70 tabular-nums">{value.toFixed(2)}</span>
        </div>

        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
            style={isColor ? gradientStyle : { background: 'rgba(255, 255, 255, 0.2)' }}
          />
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
