/** Format a price in INR using the Indian numbering system. */
export function formatPrice(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rs ${amount.toLocaleString("en-IN")}`;
  }
}

/** Clamp a value between min and max. */
export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Smoothstep. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Convert 360 panorama yaw/pitch (radians) to 3D position on unit sphere. */
export function spherical(yaw: number, pitch: number): [number, number, number] {
  const cy = Math.cos(pitch);
  return [Math.sin(yaw) * cy, Math.sin(pitch), -Math.cos(yaw) * cy];
}
