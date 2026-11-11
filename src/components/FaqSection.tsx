import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

// คำถามที่พบบ่อย (หน้าแรก): กดคำถามแล้วคำตอบเลื่อนลงมา · มี JSON-LD แบบ FAQPage ให้ Google อ่านได้
export function FaqSection({ locale, faq }: { locale: Locale; faq: Dictionary["faq"] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h2 className="text-center text-2xl font-bold">{faq.title}</h2>
      <p className="mt-2 text-center text-gray-600">{faq.subtitle}</p>
      <div className="mt-8 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {faq.items.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg leading-none text-brand-600 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5 leading-7 text-gray-600">
              <p>{item.a}</p>
              <Link href={`/${locale}${item.href}`} className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                {faq.readMore} →
              </Link>
            </div>
          </details>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link href={`/${locale}/kb`} className="btn-secondary">{faq.all}</Link>
      </div>
    </section>
  );
}
