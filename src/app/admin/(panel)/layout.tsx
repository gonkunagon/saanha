import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { logout } from "./actions";

const nav = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/orders", label: "ออเดอร์" },
  { href: "/admin/containers", label: "ตู้" },
  { href: "/admin/users", label: "พนักงาน", adminOnly: true },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = nav.filter((n) => !n.adminOnly || user.role === "admin");

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo markClassName="text-accent-400" textClassName="text-white" />
            <span className="text-sm text-accent-400">หลังบ้าน</span>
          </Link>
          <nav className="order-3 flex w-full gap-4 overflow-x-auto text-sm md:order-none md:w-auto">
            {links.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-400">
              {user.name}
              {user.role === "admin" && <span className="ml-1 text-xs text-accent-400">(แอดมิน)</span>}
            </span>
            <form action={logout}>
              <button className="rounded border border-slate-600 px-2 py-1 hover:bg-slate-800">ออกจากระบบ</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
