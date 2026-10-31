import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/config/site";

type Props = { locale: Locale; dict: Dictionary["footer"] };

export function Footer({ locale, dict }: Props) {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm md:grid-cols-2">
        <div>
          <p className="text-lg font-bold text-brand-600">{site.name}</p>
          <p className="mt-2 text-gray-600">{site.address[locale]}</p>
        </div>
        <div>
          <p className="font-semibold">{dict.contact}</p>
          <ul className="mt-2 space-y-1 text-gray-600">
            <li>LINE: {site.lineId}</li>
            <li>Tel: {site.phone}</li>
            <li>Email: {site.email}</li>
          </ul>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {site.name}. {dict.rights} ·{" "}
        <Link href={`/${locale}/privacy`} className="hover:text-brand-600 hover:underline">
          {dict.privacy}
        </Link>
      </p>
    </footer>
  );
}
