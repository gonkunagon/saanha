import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getPage } from "@/lib/kb";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPage(locale, "privacy");
  return page ? { title: `${page.title} | SANHA`, description: page.description } : {};
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const page = await getPage(locale, "privacy");
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div className="prose-kb mt-6" dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  );
}
