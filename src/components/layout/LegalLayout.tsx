import Link from 'next/link';

export function LegalLayout({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <nav className="bg-[#faf9f6]/95 backdrop-blur-sm border-b border-[#e5e2dc] sticky top-0 z-40">
        <div className="flex items-center justify-between px-5 py-3 max-w-4xl mx-auto">
          <Link href="/" className="text-xl font-serif font-bold tracking-tight">Maningo Method</Link>
          <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">&larr; Back to home</Link>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-5 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-[#6b6b6b] mb-10">Last updated: {lastUpdated}</p>
        <div className="prose prose-sm sm:prose-base max-w-none text-[#2d2d2d] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-[#c9a96e] [&_a]:underline">
          {children}
        </div>
      </article>
    </div>
  );
}
