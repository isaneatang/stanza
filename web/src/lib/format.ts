export function abbreviateAddress(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function timeAgo(unixSeconds: number | undefined): string {
  if (!unixSeconds) return "";
  const diff = Math.max(0, Date.now() / 1000 - unixSeconds);
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatAmount(value: bigint, decimals: number, maxFrac = 4): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  if (frac === 0n) return whole.toString();
  let fracStr = frac.toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "");
  if (!fracStr) return whole.toString();
  return `${whole}.${fracStr}`;
}

export function parseAmount(text: string, decimals: number): bigint | null {
  const trimmed = text.trim();
  if (!trimmed || !/^\d*(\.\d*)?$/.test(trimmed)) return null;
  try {
    const [w, f = ""] = trimmed.split(".");
    if ((f || "").length > decimals) return null;
    return BigInt((w || "0") + (f || "").padEnd(decimals, "0"));
  } catch {
    return null;
  }
}

export function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
}

export const LICENSE_LABELS = [
  "All Rights Reserved",
  "CC0",
  "CC BY",
  "CC BY-SA"
] as const;

export const LICENSE_HINTS = [
  "Default. Others may read and link, but rights stay with you.",
  "Public domain. Anyone may use your poem for anything.",
  "Credit required. Sharing and adapting allowed with attribution.",
  "Share-alike. Adaptations allowed with credit, under the same license."
] as const;
