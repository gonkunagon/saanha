import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { exchange } from "@/config/rates";
import { ExchangeConverter } from "@/components/ExchangeConverter";

export default async function ExchangePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).exchange;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <div className="my-8 rounded-xl bg-brand-50 p-8 text-center">
        <p className="text-gray-600">{t.rateLabel}</p>
        <p className="text-5xl font-bold text-brand-700">{exchange.thbPerCny.toFixed(2)} ฿</p>
        <p className="mt-2 text-sm text-gray-500">{t.updated}: {exchange.updatedAt}</p>
      </div>
      <ExchangeConverter t={t} rate={exchange.thbPerCny} />
      <p className="mt-6 text-sm text-gray-500">{t.note}</p>
    </section>
  );
}
