"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary">
      พิมพ์ / บันทึกเป็น PDF
    </button>
  );
}
