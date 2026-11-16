// Depth of field (thin-lens approximation). Distances in metres, focal length in mm.

export function hyperfocalM(focalMm: number, aperture: number, cocMm: number): number {
  return ((focalMm * focalMm) / (aperture * cocMm) + focalMm) / 1000;
}

export interface Dof {
  nearM: number;
  farM: number; // Infinity when beyond hyperfocal
  totalM: number;
  hyperfocalM: number;
}

export function depthOfField(focalMm: number, aperture: number, cocMm: number, focusM: number): Dof {
  const H = hyperfocalM(focalMm, aperture, cocMm);
  const f = focalMm / 1000;
  const s = focusM;
  const nearM = (s * (H - f)) / (H + s - 2 * f);
  const farM = s >= H ? Infinity : (s * (H - f)) / (H - s);
  return { nearM, farM, totalM: farM - nearM, hyperfocalM: H };
}
