import Link from 'next/link';

interface FeatureCardProps {
  title: string;
  imageSrc?: string;
  imageAlt?: string;
  href?: string;
}

export default function FeatureCard({ title, imageSrc, imageAlt, href }: FeatureCardProps) {
  const content = (
    <>
      {/* Top label bar */}
      <div className="px-4 py-2 text-sm font-medium bg-black/30 text-white border-b border-white/10">
        {title}
      </div>

      {/* Image area */}
      <div className="h-44 w-full relative overflow-hidden">
        {imageSrc ? (
          <img
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={imageSrc}
            alt={imageAlt || title}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cyan-500/20 to-slate-800 flex items-center justify-center">
            {/* Network nodes SVG icon */}
            <svg
              className="w-16 h-16 text-cyan-300/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
              <path d="M6 6L12 12M18 6L12 12M6 18L12 12M18 18L12 12" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition-all duration-300 text-left w-full group block cursor-pointer">
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition-all duration-300 text-left w-full group block cursor-pointer">
      {content}
    </div>
  );
}
