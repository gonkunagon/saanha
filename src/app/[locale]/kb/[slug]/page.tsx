import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getArticle, getArticleSlugs } from "@/lib/kb";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getArticleSlugs(locale).map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticle(locale, slug);
  return article ? { title: `${article.title} | SANHA`, description: article.description } : {};
}

export default async function KbArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = await getArticle(locale, slug);
  if (!article) notFound();
  const t = getDictionary(locale).kb;

  return (
    <>
      <PageHeader title={article.title} subtitle={article.description} width="max-w-3xl">
        <Link href={`/${locale}/kb`} className="text-sm text-brand-100 hover:text-white hover:underline">
          ← {t.back}
        </Link>
        <p className="mt-4 mb-1 text-sm font-medium text-accent-300">{t.categories[article.category]}</p>
      </PageHeader>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="prose-kb" dangerouslySetInnerHTML={{ __html: article.html }} />
      </article>
    </>
  );
}
