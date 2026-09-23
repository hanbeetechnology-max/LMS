import { Link } from "react-router-dom";
import { Logo } from "./landing/Logo";
import { Reveal } from "./ui/Reveal";

interface StaticContentPageProps {
  title: string;
  children: React.ReactNode;
}

export function StaticContentPage({ title, children }: StaticContentPageProps) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 lg:px-0">
      <Link to="/" aria-label="HanbeeLms home">
        <Logo />
      </Link>
      <Reveal className="mt-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink) sm:text-4xl">{title}</h1>
        <div className="prose-content mt-6 flex flex-col gap-4 text-[15px] leading-relaxed text-(--color-slate)">
          {children}
        </div>
        <Link
          to="/"
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)"
        >
          ← Back to home
        </Link>
      </Reveal>
    </div>
  );
}
