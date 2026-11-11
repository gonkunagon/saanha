import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageHeader } from "@/components/PageHeader";
import { FaqSection } from "@/components/FaqSection";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).faq;
  return { title: `${t.title} | SAANHA`, description: t.subtitle };
}

// หน้าคำถามที่พบบ่อย (เมนูด้านบน)
export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader title={dict.faq.title} subtitle={dict.faq.subtitle} width="max-w-4xl" />
      <FaqSection locale={locale} faq={dict.faq} />
    </>
  );
}
