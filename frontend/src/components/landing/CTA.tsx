import { Link } from "react-router-dom";
import { Reveal } from "../ui/Reveal";

export function CTA() {
  return (
    <section id="get-started" aria-labelledby="cta-heading" className="px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-(--color-ink-fixed) px-8 py-16 text-center text-(--color-paper-fixed) sm:px-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-0 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse 60% 60% at 50% 0%, oklch(0.55 0.21 288 / 0.35), transparent 70%)",
              }}
            />
            <h2 id="cta-heading" className="relative font-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Race, learn, or teach — one login for all of it
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-lg text-(--color-paper-fixed)/75">
              Register for the RC F1 tournament, start an Academy course, or set up your staff
              account — free to start, no experience required.
            </p>
            <div className="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/tournament"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-(--color-paper-fixed) px-7 py-3.5 text-base font-semibold text-(--color-ink-fixed) transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
              >
                Enter RC Racing Arena
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-(--color-paper-fixed)/25 px-7 py-3.5 text-base font-semibold text-(--color-paper-fixed) transition-colors duration-300 hover:border-(--color-paper-fixed)/60"
              >
                Create a staff account
              </Link>
              <Link
                to="/apply"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-(--color-paper-fixed)/25 px-7 py-3.5 text-base font-semibold text-(--color-paper-fixed) transition-colors duration-300 hover:border-(--color-paper-fixed)/60"
              >
                Apply to a course
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
