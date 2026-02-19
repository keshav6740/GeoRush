'use client';

import Link from 'next/link';
import {
  CalendarRange,
  ChevronRight,
  Clock3,
  Compass,
  Flag,
  Globe2,
  LandPlot,
  Route,
  Swords,
  TimerReset,
} from 'lucide-react';

const MODE_ITEMS = [
  {
    href: '/game/speed-run',
    title: 'Speed Run',
    subtitle: '60-second sprint',
    description: 'Name as many countries as possible before the timer expires.',
    icon: TimerReset,
    accent: '#1f6feb',
    glow: 'shadow-[0_16px_45px_rgba(31,111,235,0.25)]',
  },
  {
    href: '/game/neighbour-chain',
    title: 'Border Rush',
    subtitle: 'One country, all neighbors',
    description: 'Given a country, guess every bordering country without mistakes.',
    icon: Route,
    accent: '#2a9d8f',
    glow: 'shadow-[0_16px_45px_rgba(42,157,143,0.24)]',
  },
  {
    href: '/game/travel-chain',
    title: 'Travel Chain',
    subtitle: 'Pathfinding challenge',
    description: 'Travel from one country to another in as few border hops as possible. Includes Daily and Practice routes.',
    icon: Compass,
    accent: '#0ea5a8',
    glow: 'shadow-[0_16px_45px_rgba(14,165,168,0.24)]',
  },
  {
    href: '/game/world-quiz',
    title: 'World Quiz',
    subtitle: '15-minute marathon',
    description: 'Full map challenge to guess every country under pressure.',
    icon: Globe2,
    accent: '#f4a261',
    glow: 'shadow-[0_16px_45px_rgba(244,162,97,0.24)]',
  },
  {
    href: '/game/continent-quiz',
    title: 'Continent Quiz',
    subtitle: 'Sporcle-style mastery',
    description: 'Focus on one region and clear complete country sets.',
    icon: LandPlot,
    accent: '#8d6de8',
    glow: 'shadow-[0_16px_45px_rgba(141,109,232,0.24)]',
  },
  {
    href: '/game/daily',
    title: 'Daily Challenge',
    subtitle: 'One puzzle for all',
    description: 'Compete on the same global prompt refreshed every day.',
    icon: CalendarRange,
    accent: '#e76f51',
    glow: 'shadow-[0_16px_45px_rgba(231,111,81,0.24)]',
  },
  {
    href: '/game/capital-guess',
    title: 'Country to Capital',
    subtitle: 'Recall drill',
    description: 'Capitals-only mode to sharpen speed and precision memory.',
    icon: LandPlot,
    accent: '#3b82f6',
    glow: 'shadow-[0_16px_45px_rgba(59,130,246,0.24)]',
  },
  {
    href: '/game/flag-guess',
    title: 'Flag Guess',
    subtitle: 'Visual recall',
    description: 'Identify countries by their flags under timed rounds.',
    icon: Flag,
    accent: '#0ea5e9',
    glow: 'shadow-[0_16px_45px_rgba(14,165,233,0.24)]',
  },
  {
    href: '/duel',
    title: '1v1 Duel',
    subtitle: 'Private room battle',
    description: 'Create a room, share link, and race head-to-head in synchronized geography rounds.',
    icon: Swords,
    accent: '#ef476f',
    glow: 'shadow-[0_16px_45px_rgba(239,71,111,0.26)]',
  },
];

export default function ModesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-[#9fd8ff]/30 blur-3xl" />
        <div className="absolute top-1/4 -right-20 h-80 w-80 rounded-full bg-[#b9f0d2]/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#ffd5a8]/35 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <section className="mb-10 rounded-[2rem] border border-white/70 bg-white/65 p-8 md:p-10 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#d3dfec] bg-white/80 px-4 py-1.5 text-xs tracking-[0.2em] uppercase text-[#607386] mb-4">
                <Clock3 size={14} />
                Select Your Mode
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[0.9] bg-gradient-to-r from-[#0f5bd8] via-[#17a06f] to-[#f18a3d] bg-clip-text text-transparent">
                Pick Your Route
              </h1>
              <p className="text-lg text-[#516375] mt-4">
                Each mode pushes a different skill. Choose what you want to train and jump straight into the map arena.
              </p>
            </div>
            <Link href="/" className="neon-btn px-6 py-3 whitespace-nowrap">
              Back to Home
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {MODE_ITEMS.map((mode, idx) => {
            const Icon = mode.icon;
            return (
              <Link key={mode.href} href={mode.href} className="group block">
                <article
                  className={`h-full rounded-[1.5rem] border border-white/70 bg-white/80 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-0.4deg] ${mode.glow}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div
                      className="h-12 w-12 rounded-xl grid place-items-center"
                      style={{
                        background: `${mode.accent}1f`,
                        color: mode.accent,
                        border: `1px solid ${mode.accent}66`,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="text-xs rounded-full px-2.5 py-1 border" style={{ borderColor: `${mode.accent}80`, color: mode.accent }}>
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-[#1f2937] leading-tight">{mode.title}</h2>
                  <p className="text-sm font-semibold mt-1" style={{ color: mode.accent }}>
                    {mode.subtitle}
                  </p>
                  <p className="text-[#5a6b7a] mt-3 leading-relaxed">{mode.description}</p>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1f2937] group-hover:text-[#0f5bd8]">
                    Start Mode
                    <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </article>
              </Link>
            );
          })}
        </section>

        <section className="mt-10 rounded-[1.5rem] border border-white/70 bg-white/75 p-6 md:p-7 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#1f6feb1f] text-[#1f6feb] border border-[#1f6feb66] grid place-items-center">
                <Globe2 size={18} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1f2937]">Not Sure Where To Start?</h3>
                <p className="text-[#5a6b7a]">Try Speed Run first, then jump into Daily Challenge for leaderboard progression.</p>
              </div>
            </div>
            <Link href="/game/speed-run" className="neon-btn-primary px-6 py-3 whitespace-nowrap">
              Start Speed Run
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
