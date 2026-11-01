import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ServiceGrid } from "@/components/ServiceGrid";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).services;
  return { title: `${t.title} | SAANHA`, description: t.subtitle };
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader title={dict.services.title} subtitle={dict.services.subtitle} />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <ServiceGrid items={dict.services.items} />
        <div className="mt-10 text-center">
          <Link href={`/${locale}/quote`} className="btn-primary">{dict.home.ctaQuote}</Link>
        </div>
      </section>
    </>
  );
}
