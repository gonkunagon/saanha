// ภาพประกอบหน้าแรก: ฉากไอโซเมตริก โกดัง ตู้คอนเทนเนอร์ และรถบรรทุก พร้อมการ์ดลอย (ติดตามพัสดุ / เงินหยวน / ส่งถึงแล้ว)
// โทนน้ำเงินของโลโก้ + ทอง บนแท่นสีขาว ให้ตัดกับพื้นหลังสีแดง — ไม่มีตัวหนังสือในภาพ จึงใช้ได้ทั้งสองภาษา

type Pt = [number, number];
type Shades = { top: string; left: string; right: string };

// พิกัด 3 มิติ (x ไปขวาล่าง, y ไปซ้ายล่าง, z ขึ้น) → จุดบนจอ
const P = (x: number, y: number, z: number): Pt => [280 + (x - y) * 0.866, 120 + (x + y) * 0.5 - z];
const pts = (...ps: Pt[]) => ps.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

function Box({ x, y, z = 0, w, d, h, c }: { x: number; y: number; z?: number; w: number; d: number; h: number; c: Shades }) {
  return (
    <g strokeLinejoin="round">
      <polygon points={pts(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={c.left} />
      <polygon points={pts(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h))} fill={c.right} />
      <polygon points={pts(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={c.top} />
    </g>
  );
}

// แผ่นเรียบบนพื้น (ถนน เส้นจราจร)
const flat = (x: number, y: number, w: number, d: number, z = 0.5) =>
  pts(P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z));

const navy = { top: "#3b5bdb", left: "#1e3a8a", right: "#172554" };
const gold = { top: "#fde68a", left: "#fbbf24", right: "#d97706" };
const red = { top: "#f87171", left: "#dc2626", right: "#991b1b" };
const sky = { top: "#7dd3fc", left: "#0ea5e9", right: "#0369a1" };

// ตู้คอนเทนเนอร์ (ลอนตู้ที่ด้านซ้าย)
function Container({ x, y, z = 0, c }: { x: number; y: number; z?: number; c: Shades }) {
  const w = 56, d = 26, h = 26;
  return (
    <g>
      <Box x={x} y={y} z={z} w={w} d={d} h={h} c={c} />
      {[8, 16, 24, 32, 40, 48].map((dx) => {
        const [a, b] = [P(x + dx, y + d, z + 3), P(x + dx, y + d, z + h - 3)];
        return <line key={dx} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#000" strokeOpacity="0.15" strokeWidth="1.5" />;
      })}
    </g>
  );
}

// ล้อบนด้านซ้ายของรถ (วงกลมในระนาบ x–z)
function Wheel({ x, y }: { x: number; y: number }) {
  const [cx, cy] = P(x, y, 9);
  return (
    <g transform={`matrix(0.866 0.5 0 1 ${cx} ${cy})`}>
      <circle r="10" fill="#0f172a" />
      <circle r="4" fill="#cbd5e1" />
    </g>
  );
}

function Tree({ x, y }: { x: number; y: number }) {
  const [bx, by] = P(x, y, 0);
  return (
    <g>
      <ellipse cx={bx} cy={by} rx="10" ry="5" fill="#000" fillOpacity="0.1" />
      <rect x={bx - 2} y={by - 16} width="4" height="16" fill="#92400e" />
      <circle cx={bx} cy={by - 24} r="13" fill="#10b981" />
      <path d={`M${bx} ${by - 37}a13 13 0 0 1 0 26z`} fill="#059669" />
    </g>
  );
}

export function HeroIllustration({ className }: { className?: string }) {
  const pin = P(258, 47, 96);
  return (
    <svg viewBox="0 0 560 470" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="hero-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="hero-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#450a0a" floodOpacity="0.3" />
        </filter>
        <filter id="hero-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* เงาใต้แท่น + แท่น */}
      <ellipse cx="280" cy="440" rx="240" ry="26" fill="#450a0a" fillOpacity="0.45" filter="url(#hero-blur)" />
      <Box x={0} y={0} z={-18} w={300} d={300} h={18} c={{ top: "#f8fafc", left: "#e2e8f0", right: "#cbd5e1" }} />
      <polygon points={flat(10, 10, 280, 170, 0.3)} fill="#eef2ff" />

      {/* ถนน */}
      <polygon points={flat(0, 196, 300, 58)} fill="#334155" />
      <polygon points={flat(0, 196, 300, 4, 0.8)} fill="#94a3b8" />
      <polygon points={flat(0, 250, 300, 4, 0.8)} fill="#94a3b8" />
      {[12, 62, 112, 162, 212, 262].map((x) => (
        <polygon key={x} points={flat(x, 223, 26, 3, 0.9)} fill="white" />
      ))}

      {/* โกดัง */}
      <Box x={22} y={26} w={112} d={86} h={64} c={{ top: "#1e3a8a", left: "#ffffff", right: "#e2e8f0" }} />
      <Box x={22} y={26} z={64} w={112} d={86} h={5} c={{ top: "#3b5bdb", left: "#1e40af", right: "#172554" }} />
      <polygon points={pts(P(46, 112.5, 0), P(102, 112.5, 0), P(102, 112.5, 42), P(46, 112.5, 42))} fill="#fbbf24" />
      {[8, 16, 24, 32].map((z) => {
        const [a, b] = [P(46, 112.5, z), P(102, 112.5, z)];
        return <line key={z} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#b45309" strokeOpacity="0.5" strokeWidth="1.5" />;
      })}
      <polygon points={pts(P(134.5, 40, 38), P(134.5, 98, 38), P(134.5, 98, 50), P(134.5, 40, 50))} fill="#bfdbfe" />

      {/* ตู้คอนเทนเนอร์ */}
      <Container x={170} y={30} c={navy} />
      <Container x={228} y={30} c={sky} />
      <Container x={199} y={30} z={26} c={gold} />
      <Container x={170} y={58} c={red} />
      <Container x={228} y={58} c={gold} />
      <Container x={228} y={58} z={26} c={navy} />

      {/* หมุดตำแหน่งเหนือตู้ */}
      <ellipse cx={P(258, 47, 52)[0]} cy={P(258, 47, 52)[1]} rx="10" ry="5" fill="#000" fillOpacity="0.15" />
      <g transform={`translate(${pin[0]} ${pin[1]})`}>
        <path d="M0 0C-11-13-20-24-20-35A20 20 0 1 1 20-35C20-24 11-13 0 0Z" fill="#dc2626" />
        <circle cy="-35" r="8" fill="white" />
      </g>

      <Tree x={150} y={150} />
      <Tree x={278} y={120} />
      <Tree x={14} y={160} />

      {/* รถบรรทุก */}
      <Box x={56} y={208} z={4} w={112} d={30} h={42} c={{ top: "#f1f5f9", left: "#ffffff", right: "#cbd5e1" }} />
      <polygon points={pts(P(62, 238.5, 12), P(162, 238.5, 12), P(162, 238.5, 18), P(62, 238.5, 18))} fill="#dc2626" />
      <polygon points={pts(P(62, 238.5, 22), P(162, 238.5, 22), P(162, 238.5, 25), P(62, 238.5, 25))} fill="#1e3a8a" />
      <Box x={170} y={208} z={4} w={34} d={30} h={34} c={navy} />
      <polygon points={pts(P(204.5, 212, 20), P(204.5, 234, 20), P(204.5, 234, 32), P(204.5, 212, 32))} fill="#bae6fd" />
      <polygon points={pts(P(178, 238.5, 20), P(198, 238.5, 20), P(198, 238.5, 32), P(178, 238.5, 32))} fill="#bae6fd" />
      <polygon points={pts(P(204.5, 230, 8), P(204.5, 236, 8), P(204.5, 236, 12), P(204.5, 230, 12))} fill="#fbbf24" />
      {[74, 100, 150, 190].map((x) => (
        <Wheel key={x} x={x} y={239} />
      ))}

      {/* การ์ดติดตามพัสดุ */}
      <g transform="translate(4 8)" filter="url(#hero-shadow)">
        <rect width="184" height="100" rx="18" fill="white" />
        <circle cx="32" cy="32" r="17" fill="#dbeafe" />
        <path d="M24 28l8-5 8 5v10l-8 5-8-5zM24 28l8 5 8-5M32 33v10" stroke="#1e3a8a" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="58" y="22" width="92" height="9" rx="4.5" fill="#1f2937" fillOpacity="0.85" />
        <rect x="58" y="38" width="60" height="7" rx="3.5" fill="#cbd5e1" />
        <path d="M24 74h136" stroke="#e5e7eb" strokeWidth="4" strokeLinecap="round" />
        <path d="M24 74h90" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        <circle cx="114" cy="74" r="12" fill="#3b5bdb" fillOpacity="0.2" />
        {[24, 69, 114].map((cx) => (
          <circle key={cx} cx={cx} cy="74" r="6.5" fill="#1e3a8a" stroke="white" strokeWidth="2" />
        ))}
        <circle cx="160" cy="74" r="6.5" fill="white" stroke="#cbd5e1" strokeWidth="2.5" />
      </g>

      {/* เหรียญหยวน */}
      <g transform="translate(500 92)" filter="url(#hero-shadow)">
        <circle r="32" fill="url(#hero-coin)" />
        <circle r="25" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
        <path d="M-8-11L0 0l8-11M0 0v13M-7 2h14M-7 7h14" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* การ์ดส่งถึงแล้ว */}
      <g transform="translate(392 330)" filter="url(#hero-shadow)">
        <rect width="164" height="58" rx="16" fill="white" />
        <circle cx="29" cy="29" r="16" fill="#10b981" />
        <path d="M21 29l6 6 10-11" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="54" y="19" width="88" height="8" rx="4" fill="#1f2937" fillOpacity="0.85" />
        <rect x="54" y="34" width="56" height="7" rx="3.5" fill="#cbd5e1" />
      </g>
    </svg>
  );
}
