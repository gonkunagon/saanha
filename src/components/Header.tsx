import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/config/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

type Props = { locale: Locale; nav: Dictionary["nav"] };

export function Header({ locale, nav }: Props) {
  const links = [
    { href: "/services", label: nav.services },
    { href: "/calculator", label: nav.calculator },
    { href: "/track", label: nav.track },
    { href: "/kb", label: nav.kb },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={`/${locale}`} aria-label={site.name}>
          <Logo />
        </Link>
        <nav className="order-3 flex w-full gap-4 overflow-x-auto text-sm md:order-none md:w-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={`/${locale}${l.href}`}
              className="whitespace-nowrap text-gray-700 hover:text-brand-600"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <Link href={`/${locale}/quote`} className="btn-primary px-4 py-2 text-sm">
            {nav.quote}
          </Link>
        </div>
      </div>
    </header>
  );
}
