import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { site } from "@/config/site";

export default async function ExchangePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).exchange;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <p className="mt-2 text-gray-600">{t.subtitle}</p>
      <div className="my-8 rounded-xl bg-brand-50 p-8 text-center">
        <p className="text-xl font-semibold text-brand-700">{t.rateOnRequest}</p>
        <p className="mt-2 text-gray-600">LINE: {site.lineId}</p>
        <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6">
          {t.cta}
        </a>
      </div>
      <h2 className="mb-3 text-lg font-semibold">{t.stepsTitle}</h2>
      <ol className="list-decimal space-y-1 pl-6 text-gray-700">
        {t.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p className="mt-6 text-sm text-gray-500">{t.note}</p>
    </section>
  );
}
