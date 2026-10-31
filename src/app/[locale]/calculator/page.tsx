import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ShippingCalculator } from "@/components/ShippingCalculator";

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).calculator;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <p className="mt-2 mb-8 text-gray-600">{t.note}</p>
      <ShippingCalculator t={t} />
    </section>
  );
}
