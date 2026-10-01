export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="max-w-[640px]">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.04em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[28px] font-bold leading-9 tracking-[-0.02em] md:text-[32px] md:leading-10">
        {title}
      </h2>
      {children && (
        <p className="mt-3 text-base leading-[26px] text-text-muted">
          {children}
        </p>
      )}
    </div>
  )
}
