// Pure scroll choreography. Every pose is a function of scroll position, so reversing
// direction reverses the complete sequence without timers or animation queues.
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
const segment = (progress: number, from: number, to: number) => {
  const t = clamp((progress - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export function scrollPose(progress: number) {
  const p = clamp(progress);
  const approach = segment(p, 0, 0.25);
  const seal = segment(p, 0.14, 0.32);
  const flap = segment(p, 0.28, 0.48);
  const lift = segment(p, 0.45, 0.7);
  const fan = segment(p, 0.7, 0.96);
  return {
    progress: p,
    chapter: p < 0.25 ? 0 : p < 0.48 ? 1 : p < 0.73 ? 2 : 3,
    approach, seal, flap, lift, fan,
    cameraX: 19 - approach * 13 - lift * 6,
    cameraY: -25 + approach * 17 + fan * 8,
    cameraZ: -10 + approach * 8 + fan * 2,
    cameraScale: 0.92 + approach * 0.12 - fan * 0.15,
    envelopeOpacity: 1 - segment(p, 0.73, 0.91),
    sealOpacity: 1 - segment(p, 0.27, 0.36),
    cardY: 30 - lift * 40 + fan * 18,
    cardOpacity: segment(p, 0.43, 0.53),
    sideOpacity: segment(p, 0.7, 0.78),
  };
}
