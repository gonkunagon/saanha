import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { transitDays, type ShippingMethod } from "@/config/rates";
import { site } from "@/config/site";
import { ServiceGrid } from "@/components/ServiceGrid";
import heroImage from "@/assets/hero.webp";
import seaImage from "@/assets/sea.webp";
import truckImage from "@/assets/truck.webp";
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
// รูปการ์ดวิธีขนส่ง
const methodPhotos: Record<ShippingMethod, { src: StaticImageData; className: string }> = {
  truck: { src: truckImage, className: "object-center" },
  sea: { src: seaImage, className: "object-[70%_center]" },
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {/* รถบรรทุก SAANHA อยู่ซ้ายของภาพ ตัวหนังสือจึงวางฝั่งขวา (มือถือ: ตัวหนังสือด้านบน รถด้านล่าง) */}
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="object-cover object-[6%_center] md:object-center"
        />
        {/* ไล่เงาทับภาพ ให้ตัวหนังสืออ่านง่าย */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/50 to-transparent md:bg-transparent md:bg-gradient-to-l md:from-slate-950/85 md:via-slate-950/45 md:to-transparent" />
        {/* จอกว้าง: สูง 42% ของความกว้างจอ (ไม่เกินความสูงจอ) ทุกขนาดจอจึงเห็นภาพเท่ากัน รวมโลโก้ SAANHA บนรถ */}
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pt-14 pb-56 md:min-h-[min(42vw,calc(100svh-4rem))] md:grid-cols-2 md:content-center md:py-20">
          <div className="text-center md:col-start-2 md:text-left [text-shadow:0_2px_12px_rgb(0_0_0/0.45)]">
            {/* ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงห่อแต่ละวลีไว้ไม่ให้ตัดกลางวลี */}
            <h1 className="text-3xl leading-tight font-bold md:text-5xl">
              {dict.home.heroTitle.split(" ").map((part, i) => (
                <span key={i} className="inline-block">{part}&nbsp;</span>
              ))}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">{dict.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link href={`/${locale}/quote`} className="btn-cta">{dict.home.ctaQuote}</Link>
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
              return (
                <div key={m.key} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={methodPhotos[m.key as ShippingMethod].src}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      placeholder="blur"
                      className={`object-cover ${methodPhotos[m.key as ShippingMethod].className}`}
                    />
                  </div>
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
            <Link href={`/${locale}/quote`} className="btn-cta">{dict.home.ctaQuote}</Link>
            <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-outline-light">
              {dict.home.ctaLine}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
