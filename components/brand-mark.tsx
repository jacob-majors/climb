import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
};

export function BrandMark({ href = "/dashboard", compact = false }: BrandMarkProps) {
  const wordmark = (
    <div className="flex items-end gap-1">
      <span className={`${compact ? "text-lg" : "text-[1.6rem]"} font-black tracking-[-0.03em] text-ink`}>
        climb
      </span>
      <span
        aria-hidden="true"
        className={`${compact ? "text-xl" : "text-[2rem]"} -mb-[0.04em] font-black leading-none text-clay`}
      >
        .
      </span>
    </div>
  );

  return (
    <Link
      href={href}
      aria-label="climb."
      className="inline-flex items-center rounded-full border border-ink/12 bg-chalk/95 px-3.5 py-2 shadow-[0_8px_24px_rgba(15,36,32,0.12)] backdrop-blur transition hover:border-clay/40"
    >
      {wordmark}
    </Link>
  );
}
