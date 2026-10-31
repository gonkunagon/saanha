import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/config/site";
import { Logo } from "./Logo";

type Props = { locale: Locale; dict: Dictionary["footer"] };

export function Footer({ locale, dict }: Props) {
  return (
    <footer className="border-t-4 border-accent-400 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm md:grid-cols-2">
        <div>
          <Logo markClassName="text-accent-400" textClassName="text-white" />
          <p className="mt-2">{site.address[locale]}</p>
        </div>
        <div>
          <p className="font-semibold text-white">{dict.contact}</p>
          <ul className="mt-2 space-y-1">
            <li>LINE: {site.lineId}</li>
            <li>Tel: {site.phone}</li>
            <li>Email: {site.email}</li>
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
