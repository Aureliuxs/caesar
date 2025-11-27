export default function BackgroundFallback() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-30">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-slate-900" />

      {/* Subtle cyan gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-900" />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Central highlight */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-400/10 via-transparent to-transparent" />
    </div>
  );
}