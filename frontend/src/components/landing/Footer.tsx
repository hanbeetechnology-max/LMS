import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Courses & content", href: "#platform" },
      { label: "Enrollment", href: "#platform" },
      { label: "Attendance", href: "#platform" },
      { label: "Scheduling", href: "#platform" },
      { label: "Messaging", href: "#platform" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Apply now", href: "/apply" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-(--color-line) px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <a href="#top" aria-label="HanbeeLms home">
              <Logo />
            </a>
            <p className="mt-4 max-w-[22ch] text-sm leading-relaxed text-(--color-mist)">
              One LMS for staff and students. Courses, rosters, attendance, and messaging in a
              single async platform.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">{col.heading}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) =>
                  link.href.startsWith("#") ? (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-(--color-ink-soft) transition-colors hover:text-(--color-ink)">
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-(--color-ink-soft) transition-colors hover:text-(--color-ink)">
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-(--color-line) pt-8 sm:flex-row">
          <p className="text-sm text-(--color-mist)">© {new Date().getFullYear()} HanbeeLms. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
