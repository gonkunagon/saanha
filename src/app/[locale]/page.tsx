import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { transitDays, type ShippingMethod } from "@/config/rates";
import { site } from "@/config/site";
import { ServiceGrid } from "@/components/ServiceGrid";
import { HeroIllustration } from "@/components/HeroIllustration";
import { ShipScene, TruckScene } from "@/components/TransportScenes";
import {
  HomeIcon,
  ListIcon,
  PackageIcon,
  PinIcon,
  ReceiptIcon,
  SearchIcon,
  WalletIcon,
} from "@/components/icons";

const stepIcons = [ListIcon, ReceiptIcon, WalletIcon, PackageIcon];
const featureIcons = [PackageIcon, SearchIcon, ReceiptIcon, HomeIcon];
const methodScenes = { truck: TruckScene, sea: ShipScene };

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 text-white">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-accent-400/20" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="text-center md:text-left">
            {/* ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงห่อแต่ละวลีไว้ไม่ให้ตัดกลางวลี */}
            <h1 className="text-3xl leading-tight font-bold md:text-5xl">
              {dict.home.heroTitle.split(" ").map((part, i) => (
                <span key={i} className="inline-block">{part}&nbsp;</span>
              ))}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-100">{dict.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link href={`/${locale}/quote`} className="btn-light">{dict.home.ctaQuote}</Link>
              <Link href={`/${locale}/calculator`} className="btn-outline-light">{dict.home.ctaCalc}</Link>
            </div>
            <Link
              href={`/${locale}/track`}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-300 hover:text-white hover:underline"
            >
              <PinIcon className="h-4 w-4" />
              {dict.home.trackLink}
            </Link>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-[320px] md:max-w-lg" />
        </div>
      </section>

      {/* จุดเด่น */}
      <section className="border-b border-brand-100 bg-white">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {dict.home.features.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <li key={f.title} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-400/20 text-brand-700">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-gray-600">{f.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* บริการ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">{dict.services.title}</h2>
        <ServiceGrid items={dict.services.items} />
      </section>

      {/* วิธีขนส่ง */}
      <section className="bg-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold">{dict.home.methodsTitle}</h2>
          <p className="mt-2 mb-10 text-center text-gray-600">{dict.home.methodsSubtitle}</p>
          <div className="grid gap-6 md:grid-cols-2">
            {dict.home.methods.map((m) => {
              const Scene = methodScenes[m.key as ShippingMethod];
              return (
                <div key={m.key} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <Scene className="block h-auto w-full" />
                  <div className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-brand-700">{m.title}</h3>
                      <span className="rounded-full bg-accent-400/25 px-3 py-1 text-sm font-medium text-brand-800">
                        {dict.home.daysLabel} {transitDays[m.key as ShippingMethod]} {dict.calculator.daysUnit}
                      </span>
                    </div>
                    <p className="mt-3 text-gray-600">{m.body}</p>
                    <Link href={`/${locale}/calculator`} className="mt-4 inline-block font-medium text-brand-600 hover:underline">
                      {dict.home.methodsCta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ขั้นตอน */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">{dict.home.stepsTitle}</h2>
        <ol className="grid gap-6 md:grid-cols-4">
          {dict.home.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <li key={step.title} className="rounded-xl border-t-4 border-brand-600 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-2xl font-bold text-accent-500">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ปิดท้าย */}
      <section className="px-4 pb-16">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-10 text-center text-white md:py-12">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent-400/25" />
          <h2 className="relative text-2xl font-bold md:text-3xl">{dict.home.ctaTitle}</h2>
          <p className="relative mt-2 text-brand-100">{dict.home.ctaBody}</p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}/quote`} className="btn-light">{dict.home.ctaQuote}</Link>
            <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-outline-light">
              {dict.home.ctaLine}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
