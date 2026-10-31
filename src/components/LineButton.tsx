import { site } from "@/config/site";
import { ChatIcon } from "./icons";

// ปุ่มแชท LINE ลอยมุมขวาล่างทุกหน้า
export function LineButton({ label }: { label: string }) {
  return (
    <a
      href={site.lineUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed right-4 bottom-4 z-20 flex items-center gap-2 rounded-full bg-[#06C755] px-4 py-3 font-medium text-white shadow-lg transition hover:brightness-95"
    >
      <ChatIcon className="h-5 w-5" />
      <span>{label}</span>
    </a>
  );
}
