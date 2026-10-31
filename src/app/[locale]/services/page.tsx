import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ServiceGrid } from "@/components/ServiceGrid";

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">{dict.services.title}</h1>
      <ServiceGrid items={dict.services.items} />
      <div className="mt-10 text-center">
        <Link href={`/${locale}/quote`} className="btn-primary">{dict.home.ctaQuote}</Link>
      </div>
    </section>
  );
}
