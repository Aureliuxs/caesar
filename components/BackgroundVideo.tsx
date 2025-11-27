'use client';

import { useState, useEffect } from 'react';

export default function BackgroundVideo() {
  const [hasError, setHasError] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setShouldRender(!prefersReducedMotion);
  }, []);

  if (!shouldRender || hasError) {
    return null;
  }

  const handleVideoError = () => {
    setHasError(true);
  };

  return (
    <video
      className="fixed inset-0 -z-20 h-full w-full object-cover pointer-events-none"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onError={handleVideoError}
      src="/bg/network-loop.mp4"
    />
  );
}