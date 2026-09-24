import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/landing/Logo";
import { Reveal } from "../components/ui/Reveal";
import { CoursesIcon, EnrollmentIcon, MessagingIcon, SchedulingIcon } from "../components/landing/icons";

const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;

const RAIL_ICONS = [CoursesIcon, EnrollmentIcon, SchedulingIcon, MessagingIcon];

interface AuthLayoutProps {
  children: ReactNode;
  panelIcon: typeof CoursesIcon;
  panelTitle: string;
  panelDescription: string;
  accent?: "--color-violet" | "--color-teal" | "--color-amber";
  /** A slightly wider form column for longer forms. */
  wide?: boolean;
}

export function AuthLayout({
  wide = false,
  children,
  panelIcon: PanelIcon,
  panelTitle,
  panelDescription,
  accent = "--color-violet",
}: AuthLayoutProps) {
  return (
    <div className="rc-theme grid min-h-screen bg-(--color-paper) lg:grid-cols-2">
      <div className="relative flex flex-col justify-center px-6 py-20 sm:px-10 lg:px-16">
        <Link to="/" className="absolute left-6 top-8 sm:left-10 lg:left-16" aria-label="HanbeeLms home">
          <Logo />
        </Link>
        <div className={`mx-auto w-full ${wide ? "max-w-md" : "max-w-sm"}`}>
          <Reveal>{children}</Reveal>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-(--color-cloud) lg:flex lg:items-center lg:justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-20 opacity-80 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse 55% 55% at 30% 20%, color-mix(in oklch, var(--rc-crimson) 22%, transparent), transparent 65%), radial-gradient(ellipse 50% 45% at 80% 85%, color-mix(in oklch, var(--rc-cyan) 20%, transparent), transparent 65%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE_OUT_STRONG }}
          className="rc-glass relative w-full max-w-sm rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)]"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 border-b border-(--color-line) px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--rc-crimson)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--rc-gold)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--rc-indigo)" }} />
            <span className="ml-3 font-mono text-[11px] tracking-tight text-(--color-mist)">hanbeelms.app</span>
          </div>

          <div className="flex">
            <div className="flex flex-col items-center gap-5 border-r border-(--color-line) px-3 py-8">
              {RAIL_ICONS.map((Icon, i) => (
                <span
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    Icon === PanelIcon ? "bg-(--color-ink) text-(--color-paper)" : "text-(--color-mist)"
                  }`}
                >
                  <Icon />
                </span>
              ))}
            </div>

            <div className="flex-1 space-y-4 p-6">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  color: `var(${accent})`,
                  background: `color-mix(in oklch, var(${accent}) 16%, transparent)`,
                }}
              >
                <PanelIcon />
              </span>
              <p className="font-display text-lg font-semibold leading-snug text-(--color-ink)">{panelTitle}</p>
              <p className="text-sm leading-relaxed text-(--color-slate)">{panelDescription}</p>
              <p className="pt-2 text-xs italic leading-relaxed text-(--color-mist)">
                "Schools, students and the HANBEE team on one platform: the RC F1 tournament and the courses behind
                it."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
