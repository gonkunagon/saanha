import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageHeader } from "@/components/PageHeader";
import { TrackingForm } from "@/components/TrackingForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).track;
  return { title: `${t.title} | SAANHA`, description: t.subtitle };
}

export default async function TrackPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader title={dict.track.title} subtitle={dict.track.subtitle} width="max-w-3xl" />
      <section className="bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <TrackingForm locale={locale} t={dict.track} cal={dict.calculator} />
        </div>
      </section>
    </>
  );
}
