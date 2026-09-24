import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo } from "../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import { Logo } from "../components/landing/Logo";
import { Footer } from "../components/landing/Footer";

const EVENT = {
  name: "HANBEE RC F1 Championship",
  tagline: "A radio-control Formula 1 racing tournament — precision driving, real telemetry, real trophies.",
  date: "Saturday, November 14, 2026",
  isoDate: "2026-11-14T08:00:00",
  location: "Hanbee Training Center — Main Track",
};

const DETAILS = [
  { label: "Format", value: "Qualifying heats → knockout finals", accent: "var(--rc-indigo)" },
  { label: "Classes", value: "1/10 scale RC F1, open ECU", accent: "var(--rc-cyan)" },
  { label: "Entry", value: "School teams, all skill levels", accent: "var(--rc-gold)" },
];

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

function getTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const secs = Math.floor(diff / 1000);
  return {
    days: Math.floor(secs / 86400),
    hours: Math.floor((secs % 86400) / 3600),
    mins: Math.floor((secs % 3600) / 60),
    secs: secs % 60,
  };
}

function CountdownTimer({ target }: { target: string }) {
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units: [string, number][] = [
    ["Days", time.days],
    ["Hours", time.hours],
    ["Mins", time.mins],
    ["Secs", time.secs],
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4" role="timer" aria-label="Time remaining until race day">
      {units.map(([label, value], i) => (
        <div key={label} className="flex items-center gap-3 sm:gap-4">
          <div className="rc-glass flex flex-col items-center rounded-2xl px-4 py-3 sm:px-6 sm:py-4">
            <span className="font-mono text-2xl font-semibold tabular-nums text-(--color-ink) sm:text-3xl">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-mist)">{label}</span>
          </div>
          {i < units.length - 1 && <span className="font-display text-xl text-(--color-line)">:</span>}
        </div>
      ))}
    </div>
  );
}

const SCHEDULE = [
  { time: "8:00 AM", item: "Track walk & scrutineering" },
  { time: "9:30 AM", item: "Qualifying heats" },
  { time: "1:00 PM", item: "Knockout rounds" },
  { time: "4:30 PM", item: "Grand final & podium" },
];

function HeaderBar() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rc-theme rc-glass fixed inset-x-0 top-0 z-50 border-b bg-(--color-paper)"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link to="/" aria-label="HanbeeLms home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden text-sm font-medium text-(--color-ink-soft) transition-colors hover:text-(--color-ink) sm:block">
            ← Back to HanbeeLms
          </Link>
          <Link
            to="/login"
            className="hidden text-sm font-medium text-(--color-ink-soft) transition-colors hover:text-(--color-ink) sm:block"
          >
            Sign in
          </Link>
          <Link
            to="/register-school"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, var(--rc-crimson), var(--rc-gold))" }}
          >
            Register your school
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

export function TournamentPage() {
  return (
    <div className="rc-theme bg-(--color-paper)">
      <Seo
        title="HANBEE RC F1 Tournament"
        description="The HANBEE RC F1 Championship: a radio-control Formula 1 racing tournament. Schools enter teams through HanbeeLms."
        path="/tournament"
      />
      <HeaderBar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-40 pb-24 lg:px-10 lg:pt-48 lg:pb-32">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--rc-crimson) 18%, transparent), transparent)",
            }}
          />
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span className="rc-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-(--color-slate)">
                {EVENT.date} · {EVENT.location}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-(--color-ink) sm:text-6xl lg:text-7xl">
                {EVENT.name}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-(--color-slate)">{EVENT.tagline}</p>
            </Reveal>
            <Reveal delay={0.22} className="mt-10">
              <CountdownTimer target={EVENT.isoDate} />
            </Reveal>
            <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register-school"
                className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_var(--rc-crimson)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--rc-crimson), var(--rc-gold))" }}
              >
                Register your school →
              </Link>
              <Link
                to="/login"
                className="rc-glass inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
              >
                Sign in
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Event details */}
        <section className="border-t border-(--color-line) px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {DETAILS.map((d) => (
                <StaggerItem key={d.label} className="rc-glass rounded-2xl p-6">
                  <span
                    className="inline-flex h-2 w-2 rounded-full"
                    style={{ background: d.accent }}
                    aria-hidden="true"
                  />
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">{d.label}</p>
                  <p className="mt-1.5 font-display text-lg font-semibold text-(--color-ink)">{d.value}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* Schedule */}
        <section className="border-t border-(--color-line) px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Race day schedule</h2>
            </Reveal>
            <StaggerGroup className="rc-glass mt-8 flex flex-col divide-y divide-(--color-line) rounded-2xl">
              {SCHEDULE.map((row) => (
                <StaggerItem key={row.time} className="flex items-center gap-6 px-6 py-4">
                  <span className="w-24 shrink-0 font-mono text-sm text-(--color-mist)">{row.time}</span>
                  <span className="text-sm font-medium text-(--color-ink)">{row.item}</span>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* How to enter */}
        <section id="register" className="border-t border-(--color-line) px-6 py-24 text-center lg:px-10">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink) sm:text-4xl">
              Entries come through schools
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-(--color-slate)">
              Students race as part of a school team. Register your school, invite your students, and form a team inside
              HanbeeLms. Students already invited by their school can sign in.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register-school"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-ink) px-7 py-3.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              Register your school
            </Link>
            <Link
              to="/login"
              className="rc-glass inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
            >
              Sign in
            </Link>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
