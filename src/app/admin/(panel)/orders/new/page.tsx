import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCustomersForPicker } from "@/lib/customers";
import { getQuoteRate } from "@/lib/settings";
import { Card } from "@/components/admin/ui";
import { OrderFields } from "../OrderFields";
import { CreateOrderForm } from "./CreateOrderForm";

type Props = { searchParams: Promise<{ customer?: string }> };

export default async function NewOrderPage({ searchParams }: Props) {
  await requireUser();
  const { customer } = await searchParams;
  const [customers, { rate: todayRate }] = await Promise.all([listCustomersForPicker(), getQuoteRate()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">← ออเดอร์ทั้งหมด</Link>
        <h1 className="text-2xl font-bold">สร้างออเดอร์ใหม่</h1>
      </div>
      <Card>
        <p className="mb-4 text-sm text-gray-500">ระบบจะออกเลขออเดอร์ให้อัตโนมัติ</p>
        <CreateOrderForm>
          <OrderFields customers={customers} preselectId={Number(customer) || undefined} todayRate={todayRate} />
        </CreateOrderForm>
      </Card>
    </div>
  );
}
