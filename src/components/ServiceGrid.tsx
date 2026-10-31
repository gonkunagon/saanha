import type { Dictionary } from "@/i18n/dictionaries";
import { CartIcon, HomeIcon, SearchIcon, ShieldIcon, TruckIcon, WalletIcon } from "./icons";

const serviceIcons: Record<string, typeof SearchIcon> = {
  sourcing: SearchIcon,
  order: CartIcon,
  payment: WalletIcon,
  shipping: TruckIcon,
  customs: ShieldIcon,
  delivery: HomeIcon,
};

export function ServiceGrid({ items }: { items: Dictionary["services"]["items"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => {
        const Icon = serviceIcons[s.key] ?? SearchIcon;
        return (
          <div
            key={s.key}
            className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-brand-700">{s.title}</h3>
            <p className="mt-2 text-gray-600">{s.body}</p>
          </div>
        );
      })}
    </div>
  );
}
