import { Link } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { Logo } from "../components/landing/Logo";
import { Reveal } from "../components/ui/Reveal";
import { CoursesIcon } from "../components/landing/icons";

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="This page doesn't exist on HanbeeLms." path="/404" />
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Link to="/" className="absolute left-6 top-8 sm:left-10" aria-label="HanbeeLms home">
          <Logo />
        </Link>
        <Reveal>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-violet-soft) text-(--color-violet)">
            <CoursesIcon />
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-(--color-ink)">
            Page not found
          </h1>
          <p className="mt-3 max-w-sm text-[15px] text-(--color-slate)">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            ← Back to home
          </Link>
        </Reveal>
      </div>
    </>
  );
}
