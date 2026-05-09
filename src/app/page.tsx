'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { BackButton } from '@/components/layout/BackButton';
import { UpcomingClassesPanel } from '@/components/schedule/UpcomingClassesPanel';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/95 backdrop-blur-sm border-b border-[#e5e2dc]">
        <div className="relative flex items-center justify-center px-5 py-3 min-h-[64px] max-w-6xl mx-auto">
          <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2">
            <BackButton />
          </div>
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
          <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-9 px-3 sm:px-5 rounded-full bg-[#c9a96e] text-white text-xs sm:text-sm font-medium hover:bg-[#b8955d] transition-colors"
            >
              Members
            </Link>
            <Link
              href="/schedule"
              className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Book Class
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16">
        <div className="relative h-[85vh] min-h-[500px] max-h-[800px] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1920&q=80"
            alt="Pilates studio session"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/70 via-[#1a1a1a]/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 lg:p-16 max-w-6xl mx-auto">
            <span className="inline-block bg-[#1a1a1a]/70 backdrop-blur-sm text-[#c9a96e] text-xs sm:text-sm font-medium tracking-[0.2em] uppercase mb-3 px-3 py-1.5 rounded-full">
              Pilates on the Edge of the Hamptons
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-5 max-w-2xl">
              Full Body Mat Pilates <span className="text-[#c9a96e]">&#9670;</span> Sculpt Classes
            </h1>
            <span className="inline-block bg-[#1a1a1a]/70 backdrop-blur-sm text-[#c9a96e] text-[11px] sm:text-sm font-medium tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-4 px-3 py-1.5 rounded-full">
              Strength &times; Control &times; Mindful Movement &times; Music
            </span>
            <p className="text-white/80 text-lg mb-8 max-w-xl leading-relaxed">
              A high-energy mat pilates experience designed for all levels. Challenge your body, clear your mind, and leave feeling stronger and empowered.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/schedule"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c9a96e] text-white text-base font-medium hover:bg-[#b8955d] transition-colors"
              >
                View Schedule
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white/15 backdrop-blur-sm text-white border border-white/30 text-base font-medium hover:bg-white/25 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Class Types */}
      <section className="px-5 py-16 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center mb-3">
          <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full">
            What We Offer
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Classes for Every Body
        </h2>
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <ClassTypeCard
            image="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600&q=80"
            title="Mat Pilates/Sculpt"
            description="Full body mat Pilates class in a high-energy group setting. Expect strength-focused, low-impact movement, upbeat music, and a strong mind-body connection. All levels welcome."
            href="/schedule"
          />
          <ClassTypeCard
            image="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600&q=80"
            title="Private Sessions"
            description="One-on-one instruction tailored to your goals."
            href="/#contact"
          />
        </div>
      </section>

      {/* About / Meet Chelsea */}
      <section id="about" className="relative">
        <div className="grid lg:grid-cols-2">
          <div className="relative h-[400px] lg:h-auto min-h-[400px]">
            <Image
              src="/chelsea_about-me.jpg"
              alt="Chelsea - Pilates instructor"
              fill
              className="object-cover"
            />
          </div>
          <div className="bg-[#2d2d2d] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase mb-3">
              Your Instructor
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Meet Chelsea
            </h2>
            <p className="text-white/80 leading-relaxed mb-6">
              My classes are rooted in my background as a lacrosse coach—I teach Pilates the way I coach: with energy, clarity, and purpose. Expect a modern, athletic style that challenges your strength while sharpening your mindset, all set to fun, motivating music. With experience teaching both reformer and mat, I bring a well-rounded intentional approach to every class. We finish with a grounding mindfulness reset, because how you think is just as important as how you move. This is a space where every body is welcome, and every person is capable of getting stronger.
            </p>
            <p className="text-[#c9a96e] font-medium italic">
              &ldquo;It feels hard because it is hard, but YOU CAN DO HARD THINGS.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-5 py-16 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center mb-3">
          <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full">
            Getting Started
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Book in Seconds
        </h2>
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {[
            { step: '01', title: 'Browse Classes', desc: 'Check the schedule and find a class that fits your day.' },
            { step: '02', title: 'Reserve Your Spot', desc: 'Members book with credits. Drop-ins pay $25 at checkout.' },
            { step: '03', title: 'Show Up & Move', desc: 'Energetic group classes, motivating music, real results.' },
          ].map((item) => (
            <div key={item.step}>
              <span className="text-4xl font-bold text-[#c9a96e]/30">{item.step}</span>
              <h3 className="font-semibold text-lg mt-2 mb-2">{item.title}</h3>
              <p className="text-sm text-[#6b6b6b]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-5 py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-3">
            <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full">
              Class Packs
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            No Contracts, No Hidden Fees
          </h2>
          <p className="text-center text-[#6b6b6b] mb-12 max-w-md mx-auto">
            Buy a pack and book at your pace. The more you commit, the more you save.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            <PricingCard label="Drop-In" price="$25" per="/class" note="Try a class" packType="single" highlight />
            <PricingCard label="5-Pack" price="$112" per="$22.40/class" note="Save 10%" packType="5pack" />
            <PricingCard label="10-Pack" price="$200" per="$20/class" note="Save 20%" packType="10pack" popular />
            <GiftCardOption />
          </div>

          <p className="text-center text-sm text-[#6b6b6b]">
            All packs never expire. <Link href="/register" className="text-[#c9a96e] font-medium hover:underline">Create an account</Link> to purchase.
          </p>
          <p className="text-center text-xs text-[#6b6b6b] mt-2">
            Card payments include a 3% service fee. Pay with Cash, Zelle, or Venmo to skip it &mdash;
            credits apply once Chelsea confirms.
          </p>

          <div className="mt-12 max-w-3xl mx-auto">
            <UpcomingClassesPanel
              title="What's coming up"
              subtitle="Tap a class to see the full schedule"
            />
          </div>
        </div>
      </section>

      {/* Testimonial / Image Strip */}
      <section className="relative h-[300px] sm:h-[400px]">
        <Image
          src="/banner_bg_image_mm.jpg"
          alt="Pilates class in session"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#1a1a1a]/60 flex items-center justify-center px-6">
          <blockquote className="text-center max-w-2xl">
            <p className="text-white text-xl sm:text-2xl font-serif italic leading-relaxed">
              &ldquo;The Maningo Method has completely transformed how I feel in my body.
              Chelsea&apos;s attention to detail makes every class feel personal.&rdquo;
            </p>
            <cite className="text-[#c9a96e] text-sm mt-4 block not-italic font-medium">
              — Sarah J., Member since 2024
            </cite>
          </blockquote>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-16 sm:py-20 max-w-3xl mx-auto">
        <div className="text-center mb-3">
          <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full">
            Common Questions
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">FAQ</h2>
        <div className="space-y-3">
          <FAQItem
            question="What do I need to bring?"
            answer="Just your mat and a small towel — that's it. We've got props, extras, and even spare mats if you forget. Wear grippy socks or just go barefoot, whatever feels right."
          />
          <FAQItem
            question="How do I cancel a class?"
            answer="Pop into your dashboard and cancel anytime up to 12 hours before class — your credit goes right back. Inside that 12-hour window? Shoot me a text or email if it's an emergency, I'm a real person."
          />
          <FAQItem
            question="What's the cancellation policy?"
            answer="Cancel up to 12 hours before class and you're all set. Life happens — if something genuinely comes up last-minute, message me and I'll usually refund your credit. Just please don't ghost a full class."
          />
          <FAQItem
            question="How big are the classes?"
            answer="Capped at 20 spots. Big enough to feel the energy of a group class, small enough that I see you and can dial in your form."
          />
          <FAQItem
            question="Never tried Pilates before — should I still come?"
            answer="Yes. Honestly. All levels welcome and I'll meet you where you are. Grab a $25 drop-in for your first class and see how it feels — no commitment. If you love it, the 5- and 10-packs save you a chunk."
          />
          <FAQItem
            question="Do you offer private sessions?"
            answer="Yep. One-on-one is the fastest way to dial in form, work around an injury, or train for something specific. Fill out the inquiry form below and I'll be in touch within a day."
          />
          <FAQItem
            question="Where is the studio?"
            answer="Inside Host Hampton at 295 Montauk Highway, Suite 7, Speonk — easy parking, easy in-and-out, right on the way to or from town."
          />
        </div>
      </section>

      {/* Inquiry */}
      <section id="contact" className="px-5 py-16 sm:py-20 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-3">
            <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full">
              Get in Touch
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Send Chelsea a Note
          </h2>
          <p className="text-center text-[#6b6b6b] mb-3 max-w-lg mx-auto">
            Whatever you&rsquo;re thinking &mdash; private 1-on-1, a private group with friends or co-workers, a session at the studio, or Chelsea coming to your home or somewhere local of your choosing &mdash; this is the right place.
          </p>
          <p className="text-center text-[#6b6b6b] mb-10 max-w-lg mx-auto">
            Fill out the form below or call/text <a href="tel:+16312525227" className="text-[#c9a96e] hover:underline whitespace-nowrap">(631) 252-5227</a>. Chelsea will get back to you within 24 hours.
          </p>
          <InquiryForm />
        </div>
      </section>

      {/* Find Classes */}
      <section className="px-5 py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-3">
              Find Classes By
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">Maningo Method</h2>
            <p className="text-sm text-[#6b6b6b] mt-3 max-w-xl mx-auto">
              Classes are held inside Host Hampton, a beautiful multi-use studio in Speonk, NY.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] overflow-hidden grid md:grid-cols-[260px_1fr]">
            <div className="relative bg-white aspect-square md:aspect-auto md:min-h-[260px] flex items-center justify-center p-6">
              <Image
                src="/hh-logo-1200-sq.png"
                alt="Host Hampton"
                width={400}
                height={400}
                className="w-full h-auto max-w-[220px] object-contain"
              />
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c9a96e] mb-2">Studio Partner</p>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Host Hampton</h3>
              <p className="text-sm text-[#6b6b6b] leading-relaxed mb-4">
                Beyond Pilates, Host Hampton offers a full slate of community-focused services.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                {[
                  'Kids theme parties',
                  'Mobile party services',
                  'Private studio rental',
                  'DIY parties',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#2d2d2d]">
                    <span className="text-[#c9a96e] mt-0.5">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://hosthampton.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  Visit hosthampton.com &rarr;
                </a>
                <a
                  href="https://maps.google.com/?q=295+Montauk+Highway+Suite+7+Speonk+NY+11972"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-[#e5e2dc] bg-white text-[#2d2d2d] text-sm font-medium hover:border-[#c9a96e] transition-colors"
                >
                  Get directions
                </a>
              </div>
              <p className="text-xs text-[#6b6b6b] mt-4">295 Montauk Highway, Suite 7 &middot; Speonk, NY 11972</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative h-[350px] sm:h-[400px]">
        <Image
          src="/mat-pilates-banner-bg.jpg"
          alt="Mat Pilates class"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#1a1a1a]/65 flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to move with intention?
          </h2>
          <p className="text-white/80 mb-8 max-w-md">
            Join the Maningo Method community. Your first class is just a few taps away.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-10 rounded-full bg-[#c9a96e] text-white text-base font-medium hover:bg-[#b8955d] transition-colors"
          >
            Become A Member
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2d2d2d] text-white px-5 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="font-serif font-bold text-lg mb-3">Maningo Method</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Mat Pilates/Sculpt all levels class in Speonk, NY.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Quick Links</p>
              <div className="flex flex-col gap-2 text-sm text-white/60">
                <Link href="/schedule" className="hover:text-white transition-colors">Schedule</Link>
                <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
                <Link href="#contact" className="hover:text-white transition-colors">Private Sessions</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Studio</p>
              <p className="text-sm text-white/60">295 Montauk Highway, Suite 7</p>
              <p className="text-sm text-white/60">Speonk, NY 11972</p>
              <a href="tel:+16312525227" className="text-sm text-white/80 hover:text-white mt-2 block">
                (631) 252-5227
              </a>
              <a href="mailto:chelsea@maningomethod.com" className="text-sm text-[#c9a96e] hover:underline mt-1 block">
                chelsea@maningomethod.com
              </a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm text-white/40">
            &copy; {new Date().getFullYear()} Maningo Method. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ClassTypeCard({
  image,
  title,
  description,
  href,
}: {
  image: string;
  title: string;
  description: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="relative h-56 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1.5">{title}</h3>
        <p className="text-sm text-[#6b6b6b] leading-relaxed">{description}</p>
        {href && (
          <p className="text-xs text-[#c9a96e] font-medium mt-3 group-hover:underline">
            {href === '/schedule' ? 'See the schedule →' : 'Inquire →'}
          </p>
        )}
      </div>
    </>
  );

  const cls =
    'group block rounded-2xl overflow-hidden border border-[#e5e2dc] bg-white hover:border-[#c9a96e] transition-colors';
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={title}>
        {inner}
      </Link>
    );
  }
  return <div className={cls.replace(' hover:border-[#c9a96e]', '')}>{inner}</div>;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#e5e2dc] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left min-h-[44px]"
      >
        <span className="font-medium pr-4">{question}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-[#6b6b6b] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

function InquiryForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="text-center py-12 px-6 rounded-2xl border border-[#e5e2dc] bg-[#faf9f6]">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-xl font-bold mb-2">Inquiry Sent!</h3>
        <p className="text-[#6b6b6b]">Chelsea will reach out within 24 hours.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="inquiry-name" className="block text-sm font-medium mb-1.5">Name</label>
          <input
            id="inquiry-name"
            name="name"
            required
            className="w-full h-12 px-4 text-base rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="inquiry-email" className="block text-sm font-medium mb-1.5">Email</label>
          <input
            id="inquiry-email"
            name="email"
            type="email"
            required
            inputMode="email"
            className="w-full h-12 px-4 text-base rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="inquiry-phone" className="block text-sm font-medium mb-1.5">Phone</label>
        <input
          id="inquiry-phone"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          className="w-full h-12 px-4 text-base rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
          placeholder="(631) 555-1234"
        />
      </div>
      <div>
        <label htmlFor="inquiry-goals" className="block text-sm font-medium mb-1.5">What are your goals?</label>
        <textarea
          id="inquiry-goals"
          name="goals"
          rows={4}
          className="w-full px-4 py-3 text-base rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent resize-none"
          placeholder="Tell Chelsea about your experience level, any injuries, and what you'd like to achieve..."
        />
      </div>
      <button
        type="submit"
        className="w-full h-12 rounded-full bg-[#2d2d2d] text-white font-medium hover:bg-[#1a1a1a] transition-colors"
      >
        Send Inquiry
      </button>
    </form>
  );
}

function PricingCard({ label, price, per, note, highlight, popular, packType }: {
  label: string; price: string; per: string; note: string; highlight?: boolean; popular?: boolean; packType: string;
}) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    window.location.href = `/checkout/pay?kind=pack&pack=${packType}`;
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-2xl p-5 sm:p-6 relative text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 ${
      popular
        ? 'border-2 border-[#c9a96e] bg-[#faf9f6]'
        : highlight
          ? 'border-2 border-[#2d2d2d] bg-[#2d2d2d] text-white'
          : 'border border-[#e5e2dc] bg-[#faf9f6] hover:border-[#c9a96e]'
    }`}>
      {popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#c9a96e] text-white text-[10px] font-bold px-3 py-0.5 rounded-full tracking-wider">
          MOST POPULAR
        </div>
      )}
      <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${highlight ? 'text-[#c9a96e]' : 'text-[#6b6b6b]'}`}>
        {label}
      </p>
      <p className="text-3xl font-bold mb-0.5">{price}</p>
      <p className={`text-sm mb-2 ${highlight ? 'text-white/70' : 'text-[#6b6b6b]'}`}>{per}</p>
      <p className="text-xs text-[#c9a96e] font-medium">{note}</p>
      {loading && <p className="text-xs mt-1 animate-pulse">Redirecting to checkout...</p>}
    </button>
  );
}

type GiftOption = 'single' | '5pack' | '10pack' | 'custom';

const GIFT_PRESETS: Record<Exclude<GiftOption, 'custom'>, { label: string; amount: number; sublabel: string }> = {
  single: { label: 'Single', amount: 25, sublabel: '1 class' },
  '5pack': { label: '5-Pack', amount: 112, sublabel: '5 classes' },
  '10pack': { label: '10-Pack', amount: 200, sublabel: '10 classes' },
};

function GiftCardOption() {
  const [option, setOption] = useState<GiftOption>('5pack');
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const isPreset = option !== 'custom';
  const total = isPreset
    ? GIFT_PRESETS[option as Exclude<GiftOption, 'custom'>].amount
    : Number(customAmount) || 0;
  const canPurchase = isPreset ? true : total >= 10;

  function handlePurchase() {
    if (!canPurchase) return;
    setLoading(true);
    if (isPreset) {
      window.location.href = `/gift/new?pack=${option}`;
    } else {
      window.location.href = `/gift/new?pack=custom`;
    }
  }

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-4 sm:p-5 flex flex-col">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#6b6b6b] mb-0.5">Gift Pack</p>
      <p className="text-xs text-[#6b6b6b] mb-3 leading-snug">Give the gift of Pilates</p>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {(['single', '5pack', '10pack', 'custom'] as GiftOption[]).map((opt) => {
          const active = option === opt;
          const label = opt === 'custom' ? 'Custom' : GIFT_PRESETS[opt as Exclude<GiftOption, 'custom'>].label;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setOption(opt)}
              className={`h-8 px-1.5 rounded-full text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-[#2d2d2d] text-white border-2 border-[#2d2d2d]'
                  : 'bg-white border border-[#e5e2dc] text-[#6b6b6b] hover:border-[#c9a96e]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {option === 'custom' ? (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-lg font-bold">$</span>
          <input
            type="number"
            min="10"
            step="5"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Amount"
            className="w-full h-9 px-2 text-sm rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
          />
        </div>
      ) : (
        <div className="mb-2">
          <p className="text-2xl font-bold leading-none">${GIFT_PRESETS[option].amount}</p>
          <p className="text-[11px] text-[#6b6b6b] mt-0.5">{GIFT_PRESETS[option].sublabel}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handlePurchase}
        disabled={!canPurchase || loading}
        className="w-full mt-auto h-9 rounded-full bg-[#c9a96e] text-white text-xs font-medium hover:bg-[#b8955d] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : 'Purchase Gift'}
      </button>
    </div>
  );
}
