import type { Dictionary } from "@/i18n/dictionaries";

export function ServiceGrid({ items }: { items: Dictionary["services"]["items"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <div key={s.key} className="rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-700">{s.title}</h3>
          <p className="mt-2 text-gray-600">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
