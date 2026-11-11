// แถบหัวข้อสีแดงด้านบนของหน้าย่อย

type Props = {
  title: string;
  subtitle?: string;
  width?: string; // ให้ตรงกับความกว้างเนื้อหาของหน้านั้น
  children?: React.ReactNode; // เช่น ลิงก์ย้อนกลับ หรือชื่อหมวด
};

export function PageHeader({ title, subtitle, width = "max-w-7xl", children }: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 text-white">
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 right-40 h-40 w-40 rounded-full bg-accent-400/20" />
      <div className={`relative mx-auto px-4 py-10 md:py-14 ${width}`}>
        {children}
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-brand-100">{subtitle}</p>}
      </div>
    </section>
  );
}
