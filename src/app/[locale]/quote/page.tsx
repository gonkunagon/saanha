import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { QuoteForm } from "@/components/QuoteForm";

export default async function QuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">{dict.quote.title}</h1>
      <p className="mt-2 mb-8 text-gray-600">{dict.quote.subtitle}</p>
      <QuoteForm locale={locale} t={dict.quote} cal={dict.calculator} />
    </section>
  );
}
