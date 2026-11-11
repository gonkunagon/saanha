import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/config/site";
import { Logo } from "./Logo";

type Props = { locale: Locale; dict: Dictionary["footer"]; nav: Dictionary["nav"] };

// ท้ายเว็บ 3 คอลัมน์: แบรนด์ + คำโปรย + ปุ่ม LINE · เมนู · ติดต่อเรา
export function Footer({ locale, dict, nav }: Props) {
  const links = [
    { href: "/services", label: nav.services },
    { href: "/calculator", label: nav.calculator },
    { href: "/track", label: nav.track },
    { href: "/kb", label: nav.kb },
    { href: "/quote", label: nav.quote },
  ];
  return (
    <footer className="border-t-4 border-accent-400 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo markClassName="text-accent-400" textClassName="text-white" />
          <p className="mt-3 max-w-sm leading-6 text-slate-400">{dict.tagline}</p>
          {site.showAddress && <p className="mt-2">{site.address[locale]}</p>}
          <a
            href={site.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#06C755] px-4 py-2 font-semibold text-white hover:bg-[#05b34c]"
          >
            {dict.addLine} {site.lineId}
          </a>
        </div>
        <div>
          <p className="font-semibold text-white">{dict.menu}</p>
          <ul className="mt-3 space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={`/${locale}${l.href}`} className="hover:text-white hover:underline">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{dict.contact}</p>
          <ul className="mt-3 space-y-2">
            <li>
              LINE:{" "}
              <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">{site.lineId}</a>
            </li>
            <li>
              Tel:{" "}
              <a href={`tel:${site.phone.replace(/\D/g, "")}`} className="hover:text-white hover:underline">{site.phone}</a>
            </li>
            {site.showEmail && <li>Email: {site.email}</li>}
          </ul>
        </div>
      </div>
      <p className="border-t border-slate-800 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {site.name}. {dict.rights} ·{" "}
        <Link href={`/${locale}/privacy`} className="hover:text-white hover:underline">
          {dict.privacy}
        </Link>
      </p>
    </footer>
  );
}
