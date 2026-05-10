import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "../components/Logo";

type LinkItem = { label: string; href: string; isRoute?: boolean };

const links: LinkItem[] = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing", isRoute: true },
  { label: "Downloads", href: "/downloads", isRoute: true },
  { label: "FAQ", href: "/faq", isRoute: true },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function NavLink({ link, onClick }: { link: LinkItem; onClick?: () => void }) {
    const active = link.isRoute && pathname === link.href;
    const cls = `link-underline text-sm font-medium transition-colors ${
      active ? "text-fg" : "text-fg-muted hover:text-fg"
    }`;
    if (link.isRoute) {
      return (
        <Link to={link.href} className={cls} onClick={onClick}>
          {link.label}
        </Link>
      );
    }
    return (
      <a href={link.href} className={cls} onClick={onClick}>
        {link.label}
      </a>
    );
  }

  return (
    <header
      id="top"
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink key={l.href} link={l} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#login"
            className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            Sign in
          </a>
          <Link
            to="/pricing"
            className="shimmer-sweep inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-700 hover:shadow-glow-brand"
          >
            Get Ava
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg hover:bg-surface-3 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-bg md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {links.map((l) => (
              <NavLink key={l.href} link={l} onClick={() => setOpen(false)} />
            ))}
            <Link
              to="/pricing"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-brand-600 px-4 py-2.5 text-center text-sm font-bold text-white"
            >
              Get Ava
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
