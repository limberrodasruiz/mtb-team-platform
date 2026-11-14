export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function isHexColor(value: string | null | undefined): boolean {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value.trim()));
}

export function normalizeHex(value: string | null | undefined, fallback: string): string {
  return isHexColor(value) ? value!.trim().toLowerCase() : fallback;
}

export function hexToRgb(value: string): Rgb {
  const hex = normalizeHex(value, '#0f766e').slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function channelToHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0');
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

export function mixColor(value: string, target: string, weight: number): string {
  const a = hexToRgb(value);
  const b = hexToRgb(target);
  const ratio = Math.max(0, Math.min(1, weight));
  return rgbToHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

export function darken(value: string, weight = 0.18): string {
  return mixColor(value, '#000000', weight);
}

export function lighten(value: string, weight = 0.9): string {
  return mixColor(value, '#ffffff', weight);
}

export function relativeLuminance(value: string): number {
  const { r, g, b } = hexToRgb(value);
  const channels = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastText(value: string): string {
  return relativeLuminance(value) > 0.48 ? '#0f172a' : '#ffffff';
}
