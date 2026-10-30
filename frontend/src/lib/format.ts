const vnd = new Intl.NumberFormat("vi-VN");

export const money = (value: number) => `${vnd.format(Math.round(value))} ₫`;
export const pct = (value: number, digits = 1) => `${value.toFixed(digits).replace(".", ",")}%`;
export const num = (value: number, digits = 0) =>
  value.toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
export const date = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

/** Deterministic pseudo-random number in [0, 1) from a string, so mock data is stable across reloads. */
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
