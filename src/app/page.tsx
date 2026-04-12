'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/95 backdrop-blur-sm border-b border-[#e5e2dc]">
        <div className="flex items-center justify-between px-5 py-3 max-w-6xl mx-auto">
          <Link href="/" className="text-xl font-serif font-bold tracking-tight">
            Maningo Method
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/schedule" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Schedule</Link>
            <Link href="#about" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">About</Link>
            <Link href="#pricing" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Pricing</Link>
            <Link href="#faq" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">FAQ</Link>
            <Link href="#contact" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors hidden sm:inline">
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Join Now
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
            <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase mb-3">
              Pilates on the Edge of the Hamptons
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-4 max-w-xl">
              A lifestyle of strength, grace & balance
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-md">
              Small-group classes designed to strengthen, lengthen, and restore. Your body will thank you.
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
        <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase text-center mb-3">
          What We Offer
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Classes for Every Body
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ClassTypeCard
            image="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600&q=80"
            title="Mat Pilates"
            description="Build core strength and flexibility using your body weight on the mat. Perfect for all levels."
          />
          <ClassTypeCard
            image="https://images.unsplash.com/photo-1562088287-bde35a1ea917?w=600&q=80"
            title="Reformer Pilates"
            description="Dynamic resistance training on the reformer for deeper muscle engagement and faster results."
          />
          <ClassTypeCard
            image="https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80"
            title="Private Sessions"
            description="One-on-one instruction tailored to your goals. Ideal for recovery, prenatal, or accelerated progress."
          />
        </div>
      </section>

      {/* About / Meet Chelsea */}
      <section id="about" className="relative">
        <div className="grid lg:grid-cols-2">
          <div className="relative h-[400px] lg:h-auto min-h-[400px]">
            <Image
              src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80"
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
            <p className="text-white/80 leading-relaxed mb-4">
              Chelsea is a certified Pilates instructor with a passion for helping people move better and feel stronger.
              With years of experience in both mat and reformer Pilates, she brings precision, warmth, and a deep
              understanding of body mechanics to every session.
            </p>
            <p className="text-white/80 leading-relaxed mb-6">
              Her approach blends classical Pilates principles with modern movement science, creating classes that
              challenge your body while respecting its limits. Whether you&apos;re a complete beginner or a seasoned
              practitioner, Chelsea meets you where you are and helps you grow.
            </p>
            <p className="text-[#c9a96e] font-medium italic">
              &ldquo;Pilates isn&apos;t about perfection — it&apos;s about showing up, moving with intention, and
              leaving stronger than you came.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-5 py-16 sm:py-20 max-w-6xl mx-auto">
        <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase text-center mb-3">
          Getting Started
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Book in Seconds
        </h2>
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {[
            { step: '01', title: 'Browse Classes', desc: 'Check the schedule and find a class that fits your day.' },
            { step: '02', title: 'Reserve Your Spot', desc: 'Subscribers book instantly. Drop-ins pay $35 at checkout.' },
            { step: '03', title: 'Show Up & Move', desc: 'Small classes, personal attention, real results.' },
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
          <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase text-center mb-3">
            Class Packs
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            No Contracts, No Hidden Fees
          </h2>
          <p className="text-center text-[#6b6b6b] mb-12 max-w-md mx-auto">
            Buy a pack and book at your pace. The more you commit, the more you save.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <PricingCard label="Intro Class" price="$20" per="/first class" note="Try us out" highlight />
            <PricingCard label="Single Class" price="$40" per="/class" note="Drop in anytime" />
            <PricingCard label="4-Pack" price="$140" per="$35/class" note="Save $20" />
            <PricingCard label="8-Pack" price="$240" per="$30/class" note="Save $80" popular />
            <PricingCard label="12-Pack" price="$320" per="$26.67/class" note="Save $160" />
            <GiftCardOption />
          </div>

          <p className="text-center text-sm text-[#6b6b6b]">
            All packs never expire. <Link href="/register" className="text-[#c9a96e] font-medium hover:underline">Create an account</Link> to purchase.
          </p>
        </div>
      </section>

      {/* Testimonial / Image Strip */}
      <section className="relative h-[300px] sm:h-[400px]">
        <Image
          src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1920&q=80"
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
        <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase text-center mb-3">
          Common Questions
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">FAQ</h2>
        <div className="space-y-3">
          <FAQItem
            question="Do I need experience to take a class?"
            answer="Not at all! Our classes welcome all levels. Chelsea provides modifications for beginners and progressions for advanced students, so everyone gets an effective workout."
          />
          <FAQItem
            question="What should I bring?"
            answer="Just yourself and comfortable clothing you can move in. We provide all equipment — mats, props, and reformers. Grippy socks are recommended but not required."
          />
          <FAQItem
            question="How do I cancel a booking?"
            answer="You can cancel directly from your dashboard up until class time. Your spot will be released so someone else can book."
          />
          <FAQItem
            question="What's the cancellation policy for subscriptions?"
            answer="You can cancel your monthly subscription at any time through your account. There are no cancellation fees or long-term contracts."
          />
          <FAQItem
            question="How many students are in each class?"
            answer="We keep classes intentionally small — typically 8 to 16 students — so Chelsea can give personalized attention and corrections."
          />
          <FAQItem
            question="Can I try a class before subscribing?"
            answer="Absolutely! Book a drop-in class for $35 to experience the studio. If you love it (you will), you can subscribe anytime."
          />
          <FAQItem
            question="Do you offer private sessions?"
            answer="Yes! Private one-on-one sessions are available for personalized instruction. Use the inquiry form below to get started."
          />
        </div>
      </section>

      {/* Private Session Inquiry */}
      <section id="contact" className="px-5 py-16 sm:py-20 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase text-center mb-3">
            One-on-One Training
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Private Session Inquiry
          </h2>
          <p className="text-center text-[#6b6b6b] mb-10 max-w-md mx-auto">
            Interested in personalized instruction? Fill out the form and Chelsea will reach out within 24 hours.
          </p>
          <InquiryForm />
        </div>
      </section>

      {/* Location */}
      <section className="px-5 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#c9a96e] text-sm font-medium tracking-[0.2em] uppercase mb-3">
            Find Us
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">Visit the Studio</h2>
          <div className="inline-flex flex-col items-center rounded-2xl border border-[#e5e2dc] bg-white p-8 sm:p-10">
            <p className="font-serif font-bold text-xl mb-2">Maningo Method</p>
            <p className="text-[#6b6b6b]">295 Montauk Highway, Suite 7</p>
            <p className="text-[#6b6b6b]">Speonk, NY 11972</p>
            <a
              href="https://maps.google.com/?q=295+Montauk+Highway+Suite+7+Speonk+NY+11972"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#c9a96e] hover:underline"
            >
              Get Directions
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative h-[350px] sm:h-[400px]">
        <Image
          src="https://images.unsplash.com/photo-1607962837359-5e7e89f86776?w=1920&q=80"
          alt="Pilates studio"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#1a1a1a]/65 flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to start your practice?
          </h2>
          <p className="text-white/80 mb-8 max-w-md">
            Join the Maningo Method community. Your first class is just a few taps away.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-10 rounded-full bg-[#c9a96e] text-white text-base font-medium hover:bg-[#b8955d] transition-colors"
          >
            Create Your Account
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
                Pilates classes in Speonk, NY. Building strength, grace, and balance — one class at a time.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Quick Links</p>
              <div className="flex flex-col gap-2 text-sm text-white/60">
                <Link href="/schedule" className="hover:text-white transition-colors">Schedule</Link>
                <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
                <Link href="#contact" className="hover:text-white transition-colors">Private Sessions</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Studio</p>
              <p className="text-sm text-white/60">295 Montauk Highway, Suite 7</p>
              <p className="text-sm text-white/60">Speonk, NY 11972</p>
              <a href="mailto:hello@maningomethod.com" className="text-sm text-[#c9a96e] hover:underline mt-2 block">
                hello@maningomethod.com
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

function ClassTypeCard({ image, title, description }: { image: string; title: string; description: string }) {
  return (
    <div className="group rounded-2xl overflow-hidden border border-[#e5e2dc] bg-white">
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
      </div>
    </div>
  );
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
        <label htmlFor="inquiry-phone" className="block text-sm font-medium mb-1.5">Phone (optional)</label>
        <input
          id="inquiry-phone"
          name="phone"
          type="tel"
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

function CheckIcon() {
  return (
    <svg className="w-4 h-4 mt-0.5 text-[#c9a96e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PricingCard({ label, price, per, note, highlight, popular }: {
  label: string; price: string; per: string; note: string; highlight?: boolean; popular?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 sm:p-6 relative ${
      popular
        ? 'border-2 border-[#c9a96e] bg-[#faf9f6]'
        : highlight
          ? 'border-2 border-[#2d2d2d] bg-[#2d2d2d] text-white'
          : 'border border-[#e5e2dc] bg-[#faf9f6]'
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
      <p className={`text-xs ${highlight ? 'text-[#c9a96e]' : 'text-[#c9a96e]'} font-medium`}>{note}</p>
    </div>
  );
}

function GiftCardOption() {
  const [amount, setAmount] = useState('');

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-5 sm:p-6 flex flex-col">
      <p className="text-xs font-medium uppercase tracking-wider text-[#6b6b6b] mb-2">Gift Card</p>
      <p className="text-sm text-[#6b6b6b] mb-3">Give the gift of Pilates</p>
      <div className="mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">$</span>
          <input
            type="number"
            min="10"
            step="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full h-10 px-3 text-base rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
          />
        </div>
        <button
          disabled={!amount || Number(amount) < 10}
          className="w-full mt-2 h-9 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Purchase
        </button>
      </div>
    </div>
  );
}
