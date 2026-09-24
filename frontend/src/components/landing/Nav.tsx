import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "For Staff", href: "#for-staff" },
  { label: "For Students", href: "#for-students" },
  { label: "How it works", href: "#how-it-works" },
];

const TOURNAMENT_LINK = { label: "RC Tournament", href: "/tournament" };

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "rc-glass border-b" : "bg-transparent"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"
      >
        <a href="#top" aria-label="HanbeeLms home">
          <Logo />
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-(--color-slate) transition-colors hover:text-(--color-ink)"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              to={TOURNAMENT_LINK.href}
              className="text-sm font-medium text-(--color-amber-deep) transition-colors hover:text-(--color-amber)"
            >
              {TOURNAMENT_LINK.label}
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
          >
            Sign in
          </Link>
          <Link
            to="/register-school"
            className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            <span className="sm:hidden">Register</span>
            <span className="hidden sm:inline">Register your school</span>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
