import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getPage } from "@/lib/kb";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPage(locale, "privacy");
  return page ? { title: `${page.title} | SAANHA`, description: page.description } : {};
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const page = await getPage(locale, "privacy");
  if (!page) notFound();

  return (
    <>
      <PageHeader title={page.title} width="max-w-3xl" />
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="prose-kb" dangerouslySetInnerHTML={{ __html: page.html }} />
      </article>
    </>
  );
}
