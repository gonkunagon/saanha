import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Card } from "@/components/admin/ui";
import { setUserActive, setUserRole } from "./actions";
import { ChangePasswordForm, CreateUserForm } from "./UserForms";

export default async function UsersPage() {
  const me = await requireAdmin();
  const list = await db.select().from(users).orderBy(asc(users.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">พนักงาน</h1>
      <Card title="เพิ่มพนักงาน">
        <CreateUserForm />
        <p className="mt-3 text-xs text-gray-500">
          พนักงาน = จัดการออเดอร์และตู้ได้ · แอดมิน = ทำได้ทุกอย่าง รวมถึงเพิ่ม/ปิดบัญชีพนักงาน
        </p>
      </Card>
      <Card title={`รายชื่อพนักงาน (${list.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">ชื่อ</th>
                <th className="py-2 pr-4">ชื่อผู้ใช้</th>
                <th className="py-2 pr-4">สิทธิ์</th>
                <th className="py-2 pr-4">สถานะ</th>
                <th className="py-2 pr-4">เปลี่ยนรหัสผ่าน</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4 font-medium">{u.name}{u.id === me.id && " (คุณ)"}</td>
                  <td className="py-2 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">
                    {u.role === "admin" ? (
                      <span className="rounded-full bg-accent-400/25 px-2 py-0.5 text-xs font-medium text-brand-800">แอดมิน</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">พนักงาน</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {u.active ? <span className="text-emerald-700">ใช้งาน</span> : <span className="text-gray-400">ปิดใช้งาน</span>}
                  </td>
                  <td className="py-2 pr-4"><ChangePasswordForm id={u.id} /></td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {u.id !== me.id && (
                      <span className="inline-flex gap-3">
                        <form action={setUserRole}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "admin" ? "staff" : "admin"} />
                          <button className="text-sm text-gray-600 hover:underline">
                            {u.role === "admin" ? "เปลี่ยนเป็นพนักงาน" : "ตั้งเป็นแอดมิน"}
                          </button>
                        </form>
                        <form action={setUserActive}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                          <button className="text-sm text-brand-600 hover:underline">{u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
                        </form>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
