import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { QuoteForm } from "@/components/QuoteForm";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).quote;
  return { title: `${t.title} | SAANHA`, description: t.subtitle };
}

export default async function QuotePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader title={dict.quote.title} subtitle={dict.quote.subtitle} width="max-w-2xl" />
      <section className="mx-auto max-w-2xl px-4 py-12">
        <QuoteForm locale={locale} t={dict.quote} cal={dict.calculator} />
      </section>
    </>
  );
}
