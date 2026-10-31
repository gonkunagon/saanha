import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getArticles, kbCategories, type KbCategory } from "@/lib/kb";
import { BookIcon, ShieldIcon, TruckIcon, WalletIcon } from "@/components/icons";

const categoryIcons: Record<KbCategory, typeof BookIcon> = {
  "getting-started": BookIcon,
  shipping: TruckIcon,
  payment: WalletIcon,
  policies: ShieldIcon,
};

export default async function KbIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale).kb;
  const articles = getArticles(locale);

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <p className="mt-2 mb-10 text-gray-600">{t.subtitle}</p>
      <div className="grid gap-8 md:grid-cols-2">
        {kbCategories.map((cat) => {
          const list = articles.filter((a) => a.category === cat);
          if (list.length === 0) return null;
          const Icon = categoryIcons[cat];
          return (
            <div key={cat}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-brand-700">
                <Icon className="h-5 w-5" />
                {t.categories[cat]}
              </h2>
              <ul className="space-y-3">
                {list.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/${locale}/kb/${a.slug}`} className="block rounded-lg border border-gray-100 p-4 hover:border-brand-500">
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
  );
}
