import { Fragment } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedWords } from "../ui/AnimatedWords";
import { CountUp } from "../ui/CountUp";
import { HeroVisual } from "./HeroVisual";

const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;
const HEADLINE_WORDS = ["Master", "the", "Track.", "Build", "the", "Future."];

const HEADLINE_ACCENTS: Record<string, string> = {
  "Track.": "text-transparent bg-clip-text text-glow-crimson",
  "Future.": "text-transparent bg-clip-text text-glow-indigo",
};

function AnimatedHeadline() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <h1
      className="font-display text-balance text-[clamp(2rem,2.6vw+1.1rem,3.75rem)] font-semibold leading-[1.08] tracking-tight text-(--color-ink)"
      aria-label={HEADLINE_WORDS.join(" ")}
    >
      {HEADLINE_WORDS.map((word, i) => (
        <Fragment key={word + i}>
          <span className="inline-block overflow-hidden pb-1 align-bottom">
            <motion.span
              className={`inline-block ${HEADLINE_ACCENTS[word] ?? ""}`}
              initial={{ y: shouldReduceMotion ? 0 : "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.032, ease: EASE_OUT_STRONG }}
            >
              {word}
            </motion.span>
          </span>
          {/* A real space text node — not just CSS margin — so copy/paste and
              crawler-read text content don't run words together. */}
          {i < HEADLINE_WORDS.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </h1>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden px-6 pb-24 pt-40 lg:px-10 lg:pt-48"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[-10%] -z-10 h-[720px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 25% 20%, color-mix(in oklch, var(--rc-crimson) 20%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 10%, color-mix(in oklch, var(--rc-indigo) 22%, transparent), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-[90rem]">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT_STRONG }}
              className="rc-glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-sans text-[13px] font-medium text-(--color-ink-soft)"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rc-crimson)" }} />
              HANBEE RC × Academy — one platform, two arenas
            </motion.p>

            <div id="hero-heading">
              <AnimatedHeadline />
            </div>

            <AnimatedWords
              text="Schools enter teams in the HANBEE RC F1 Championship and take Academy courses on the same platform. Register your school, invite your students, and follow their progress."
              delay={0.45}
              className="mt-8 max-w-xl text-lg leading-relaxed text-(--color-slate) sm:text-xl"
            />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.05, ease: EASE_OUT_STRONG }}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <Link
                to="/register-school"
                className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-[0_10px_40px_-10px_var(--rc-crimson)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  // Darkened (60% brand color / 40% black) so the white label text
                  // clears WCAG AA 4.5:1 across the whole gradient — the shared
                  // --rc-crimson/--rc-gold tokens are untouched (still used at full
                  // brightness elsewhere), only this button's own background is
                  // adjusted, per the project's established "fix only what's
                  // failing" contrast-audit practice.
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--rc-crimson) 60%, black), color-mix(in srgb, var(--rc-gold) 60%, black))",
                }}
              >
                Register your school
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </Link>
              <Link
                to="/login"
                className="rc-glass inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-(--color-ink-soft) transition-colors duration-300 hover:text-(--color-ink)"
              >
                Sign in
              </Link>
            </motion.div>
          </div>

          <HeroVisual />
        </div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.15, ease: EASE_OUT_STRONG }}
          className="mt-20 grid grid-cols-2 gap-8 border-t border-(--color-line) pt-8 sm:flex sm:items-start sm:justify-between sm:gap-0"
        >
          {[
            ["2", "arenas — racing league and tech academy"],
            ["1:10", "scale RC F1, open ECU class"],
            ["6", "core LMS workflows, start to finish"],
            ["24/7", "always-on course & event access"],
          ].map(([value, label], i) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-3xl font-semibold text-(--color-ink)">
                <CountUp value={value} delay={1.3 + i * 0.1} />
              </dd>
              <p className="mt-1 text-sm text-(--color-mist)">{label}</p>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
