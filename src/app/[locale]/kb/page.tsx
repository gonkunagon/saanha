import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getArticles, kbCategories, type KbCategory } from "@/lib/kb";
import { BookIcon, ShieldIcon, TruckIcon, WalletIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";

const categoryIcons: Record<KbCategory, typeof BookIcon> = {
  "getting-started": BookIcon,
  shipping: TruckIcon,
  payment: WalletIcon,
  policies: ShieldIcon,
};

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).kb;
  return { title: `${t.title} | SANHA`, description: t.subtitle };
}

export default async function KbIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).kb;
  const articles = getArticles(locale);

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} width="max-w-5xl" />
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {kbCategories.map((cat) => {
            const list = articles.filter((a) => a.category === cat);
            if (list.length === 0) return null;
            const Icon = categoryIcons[cat];
            return (
              <div key={cat}>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-brand-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  {t.categories[cat]}
                </h2>
                <ul className="space-y-3">
                  {list.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/${locale}/kb/${a.slug}`}
                        className="block rounded-lg border border-gray-100 border-l-4 border-l-brand-500 bg-white p-4 shadow-sm hover:border-brand-200 hover:border-l-brand-600"
                      >
                        <p className="font-medium">{a.title}</p>
                        <p className="mt-1 text-sm text-gray-600">{a.description}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
