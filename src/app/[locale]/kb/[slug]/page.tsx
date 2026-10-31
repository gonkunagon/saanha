import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getArticle, getArticleSlugs } from "@/lib/kb";

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
    <article className="mx-auto max-w-3xl px-4 py-16">
      <Link href={`/${locale}/kb`} className="text-sm text-brand-600 hover:underline">
        ← {t.back}
      </Link>
      <p className="mt-6 text-sm text-gray-500">{t.categories[article.category]}</p>
      <h1 className="mt-1 text-3xl font-bold">{article.title}</h1>
      <div className="prose-kb mt-6" dangerouslySetInnerHTML={{ __html: article.html }} />
    </article>
  );
}
