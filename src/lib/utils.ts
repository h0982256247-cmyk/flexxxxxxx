export function uid(prefix = ""): string {
  return prefix + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}
export function autoTextColor(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.slice(0,2), 16) / 255;
  const g = parseInt(hex.slice(2,4), 16) / 255;
  const b = parseInt(hex.slice(4,6), 16) / 255;
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 0.6 ? "#111111" : "#FFFFFF";
}
export function safeUrlProtocol(u: string): boolean {
  return /^https:\/\//i.test(u) || /^line:\/\//i.test(u) || /^liff:\/\//i.test(u);
}
