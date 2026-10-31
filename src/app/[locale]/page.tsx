import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ServiceGrid } from "@/components/ServiceGrid";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold md:text-5xl">{dict.home.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{dict.home.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}/quote`} className="btn-primary">{dict.home.ctaQuote}</Link>
            <Link href={`/${locale}/calculator`} className="btn-secondary">{dict.home.ctaCalc}</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">{dict.services.title}</h2>
        <ServiceGrid items={dict.services.items} />
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">{dict.home.stepsTitle}</h2>
          <ol className="grid gap-6 md:grid-cols-4">
            {dict.home.steps.map((step, i) => (
              <li key={step.title} className="rounded-xl bg-white p-6 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
