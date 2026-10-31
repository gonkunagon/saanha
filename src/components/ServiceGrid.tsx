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
          <div key={s.key} className="rounded-xl border border-gray-100 p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-brand-700">{s.title}</h3>
            <p className="mt-2 text-gray-600">{s.body}</p>
          </div>
        );
      })}
    </div>
  );
}
