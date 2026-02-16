const TRANSPARENT = "#00000000"

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase()
}

export function normalizeHexRgba(value: string): string {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed.startsWith("#")) {
    return TRANSPARENT
  }
  const body = trimmed.slice(1)
  if (body.length === 8 && /^[0-9A-F]{8}$/.test(body)) {
    return `#${body}`
  }
  if (body.length === 6 && /^[0-9A-F]{6}$/.test(body)) {
    return `#${body}FF`
  }
  return TRANSPARENT
}

export function rgbaChannelsToHex(r: number, g: number, b: number, a: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`
}

export function hexRgbaToCss(value: string): string {
  const normalized = normalizeHexRgba(value)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  const a = parseInt(normalized.slice(7, 9), 16) / 255
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(4)})`
}

export function withZeroAlpha(value: string): string {
  const normalized = normalizeHexRgba(value)
  return `${normalized.slice(0, 7)}00`
}

export const TRANSPARENT_RGBA = TRANSPARENT
