import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ShippingCalculator } from "@/components/ShippingCalculator";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).calculator;
  return { title: `${t.title} | SANHA`, description: t.note };
}

export default async function CalculatorPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).calculator;

  return (
    <>
      <PageHeader title={t.title} subtitle={t.note} width="max-w-4xl" />
      <section className="mx-auto max-w-4xl px-4 py-12">
        <ShippingCalculator t={t} />
      </section>
    </>
  );
}
