import natal from "@/assets/frames/frame_natal.png.asset.json";
import nyan from "@/assets/frames/frame_nyan.png.asset.json";

export type FrameKey = "natal" | "nyan";
export const FRAMES: Record<FrameKey, { label: string; url: string; free: boolean; how: string }> = {
  natal: { label: "Natal", url: natal.url, free: true, how: "Grátis para todos" },
  nyan: { label: "Arco-íris", url: nyan.url, free: false, how: "Convide alguém para a Melan" },
};
export const FRAME_KEYS = Object.keys(FRAMES) as FrameKey[];
export function frameUrl(key?: string | null) {
  return key && key in FRAMES ? FRAMES[key as FrameKey].url : null;
}
/** Frames a user may wear: free ones plus the ones they earned or were given. */
export function availableFrames(owned: string[]): FrameKey[] {
  return FRAME_KEYS.filter((k) => FRAMES[k].free || owned.includes(k));
}
