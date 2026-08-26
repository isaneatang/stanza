function hueFromAddress(addr: string): number {
  let h = 0;
  for (let i = 2; i < Math.min(addr.length, 10); i++) {
    h = (h * 31 + addr.charCodeAt(i)) % 360;
  }
  return h;
}

export default function Avatar({
  address,
  username,
  size = 32
}: {
  address: string;
  username?: string;
  size?: number;
}) {
  const hue = hueFromAddress(address || "0x0");
  const letter = (username || "?").slice(0, 1).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 60) % 360} 40% 14%))`,
        color: `hsl(${(hue + 140) % 360} 55% 62%)`,
        border: `1px solid hsl(${hue} 35% 30% / 0.6)`
      }}
    >
      {letter}
    </span>
  );
}
