"use client";

// ปุ่มที่ถามยืนยันก่อนส่งฟอร์ม (ใช้กับการลบ)
export function ConfirmButton({
  message,
  children,
  className = "text-sm text-brand-600 hover:underline",
  formAction,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
