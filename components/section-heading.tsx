type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-clay">{eyebrow}</p> : null}
      <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-5 text-ink/70 sm:leading-6">{description}</p> : null}
    </div>
  );
}
