import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ServiceGrid } from "@/components/ServiceGrid";
import { HeroIllustration } from "@/components/HeroIllustration";
import { ListIcon, PackageIcon, ReceiptIcon, WalletIcon } from "@/components/icons";

const stepIcons = [ListIcon, ReceiptIcon, WalletIcon, PackageIcon];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50/60 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="text-center md:text-left">
            {/* ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงห่อแต่ละวลีไว้ไม่ให้ตัดกลางวลี */}
            <h1 className="text-3xl leading-tight font-bold md:text-5xl">
              {dict.home.heroTitle.split(" ").map((part, i) => (
                <span key={i} className="inline-block">{part}&nbsp;</span>
              ))}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-600">{dict.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link href={`/${locale}/quote`} className="btn-primary">{dict.home.ctaQuote}</Link>
              <Link href={`/${locale}/calculator`} className="btn-secondary">{dict.home.ctaCalc}</Link>
            </div>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-[260px] md:max-w-md" />
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
            {dict.home.steps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <li key={step.title} className="rounded-xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-2xl font-bold text-gray-200">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
