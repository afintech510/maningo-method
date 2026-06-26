export function BenchworksAttribution() {
  return (
    <div className="border-t border-[var(--border)] bg-[var(--muted)] py-4 px-4">
      <a
        href="https://benchworksai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 text-center text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] transition-colors"
      >
        <span className="text-[13px] font-semibold tracking-wide">Built by Benchworks</span>
        <span className="text-[12px]">Multiply your team&apos;s time with AI. Let us show you how.</span>
        <span className="text-[12px]">Office Automation · High Conversion Websites · AI Coaching · Fractional CTO</span>
        <span className="text-[12px] mt-0.5">benchworksai.com</span>
      </a>
    </div>
  );
}
