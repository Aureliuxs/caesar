interface SectionProps {
  id: string;
  overlay?: "light" | "dark";
  children: React.ReactNode;
}

export default function Section({ id, overlay, children }: SectionProps) {
  const overlayClass = overlay === "light" ? "bg-black/30" : overlay === "dark" ? "bg-black/55" : "";

  return (
    <section id={id} className="relative py-24 sm:py-32">
      {/* Overlay */}
      {overlay && (
        <div className={`absolute inset-0 ${overlayClass} z-0`} />
      )}

      {/* Content */}
      <div className="container relative z-10">
        {children}
      </div>
    </section>
  );
}