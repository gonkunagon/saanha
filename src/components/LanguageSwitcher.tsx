"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const target: Locale = locale === "th" ? "en" : "th";
  const href = pathname.replace(/^\/(th|en)/, `/${target}`);

  return (
    <Link href={href} className="text-sm font-medium text-gray-600 hover:text-brand-600">
      {target.toUpperCase()}
    </Link>
  );
}
