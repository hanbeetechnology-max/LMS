import { motion } from "framer-motion";
import { Reveal } from "../ui/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Staff creates a course",
    desc: "Build modules and lessons, upload materials, then open a section for enrollment.",
  },
  {
    n: "02",
    title: "Students get invited",
    desc: "An email invite or open catalog listing brings students into the right section.",
  },
  {
    n: "03",
    title: "Class runs itself",
    desc: "Lessons, attendance, announcements, and messages all live in the same dashboard for both roles.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-(--color-line) bg-(--color-cloud) px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal direction="right">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">How it works</p>
          <h2 id="how-heading" className="mt-4 max-w-2xl font-display text-4xl font-semibold tracking-tight text-(--color-ink) sm:text-5xl">
            From empty course to full roster in three steps
          </h2>
        </Reveal>

        <ol className="relative mt-20 grid gap-14 lg:grid-cols-3 lg:gap-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-(--color-line) lg:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.15} direction="up" y={36}>
              <li className="relative">
                <motion.span
                  className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-(--color-line) bg-(--color-paper) font-mono text-sm font-medium text-(--color-ink)"
                  whileHover={{ scale: 1.08, borderColor: "var(--color-violet)" }}
                >
                  {step.n}
                </motion.span>
                <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-(--color-ink)">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-(--color-slate)">{step.desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
