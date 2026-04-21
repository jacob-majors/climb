import Link from "next/link";
import clsx from "clsx";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
};

type BrandGlyphProps = {
  className?: string;
};

export function BrandGlyph({ className }: BrandGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "relative inline-flex overflow-hidden rounded-[1.15rem] border border-ink/10 shadow-[0_14px_28px_rgba(16,20,24,0.22)]",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="climb-glyph-bg" x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#29433A" />
            <stop offset="1" stopColor="#101418" />
          </linearGradient>
          <linearGradient id="climb-glyph-glow" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F1E8" stopOpacity="0.28" />
            <stop offset="1" stopColor="#F5F1E8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="1" y="1" width="62" height="62" rx="18" fill="url(#climb-glyph-bg)" />
        <path d="M8 10C15 6 23 4 32 4C41 4 49 6 56 10V24H8V10Z" fill="url(#climb-glyph-glow)" />
        <path
          d="M15 41C20 36 25 34 29 29C33 25 37 21 44 21H48"
          stroke="#F5F1E8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="26" r="3" fill="#D7C5A6" />
        <circle cx="30" cy="20" r="2.5" fill="#D7C5A6" />
        <circle cx="38" cy="31" r="2.5" fill="#D7C5A6" />
        <circle cx="48.5" cy="47.5" r="7.5" fill="#9A5F44" />
        <circle cx="48.5" cy="47.5" r="4.5" fill="#D7C5A6" fillOpacity="0.22" />
      </svg>
    </span>
  );
}

export function BrandMark({ href = "/", compact = false }: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label="climb."
      className="group inline-flex items-center rounded-full border border-ink/12 bg-chalk/95 px-4 py-2 shadow-[0_10px_28px_rgba(15,36,32,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:border-clay/40"
    >
      <span
        className={clsx(
          "font-black lowercase leading-none tracking-tight text-ink",
          compact ? "text-[0.95rem]" : "text-[1.1rem]",
        )}
      >
        climb<span className="text-clay" style={{ letterSpacing: "-0.02em" }}>.</span>
      </span>
    </Link>
  );
}
