import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GiftNewClient } from './client';

export default function GiftNewPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6]">
      <header className="border-b border-[#e5e2dc] bg-white">
        <div className="relative flex items-center justify-center px-5 py-3 min-h-[64px]">
          <Link href="/" aria-label="Maningo Method home" className="block">
            <Image
              src="/maningo-method_logo_600.png"
              alt="Maningo Method"
              width={600}
              height={180}
              priority
              className="h-10 sm:h-12 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]"
          >
            &larr; Home
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 sm:py-12">
        <Suspense fallback={null}>
          <GiftNewClient />
        </Suspense>
      </main>

      <footer className="bg-[#2d2d2d] text-white px-5 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="font-serif font-bold">Maningo Method</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-white/70">
            <a href="tel:+16312525227" className="hover:text-white">(631) 252-5227</a>
            <a href="mailto:chelsea@maningomethod.com" className="hover:text-white">chelsea@maningomethod.com</a>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
