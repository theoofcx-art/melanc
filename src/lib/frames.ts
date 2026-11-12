import natal from "@/assets/frames/frame_natal.png.asset.json";
import nyan from "@/assets/frames/frame_nyan.png.asset.json";
import nuvem from "@/assets/frames/frame_nuvem.png.asset.json";
import melancia from "@/assets/frames/frame_melancia.png.asset.json";

export type FrameKey = "natal" | "melancia" | "nyan" | "nuvem";
/** Followers needed to unlock the cloud frame. */
export const NUVEM_FOLLOWERS = 10;
export const FRAMES: Record<FrameKey, { label: string; url: string; free: boolean; how: string; followers?: number }> = {
  natal: { label: "Natal", url: natal.url, free: true, how: "Grátis para todos" },
  melancia: { label: "Melancia", url: melancia.url, free: true, how: "Grátis para todos" },
  nyan: { label: "Arco-íris", url: nyan.url, free: false, how: "Convide alguém para a Melan" },
  nuvem: { label: "Nuvem", url: nuvem.url, free: false, how: `Chegue a ${NUVEM_FOLLOWERS} seguidores`, followers: NUVEM_FOLLOWERS },
};
export const FRAME_KEYS = Object.keys(FRAMES) as FrameKey[];
export function frameUrl(key?: string | null) {
  return key && key in FRAMES ? FRAMES[key as FrameKey].url : null;
}
/** Frames a user may wear: free ones, follower milestones, and the ones they earned or were given. */
export function availableFrames(owned: string[], followers = 0): FrameKey[] {
  return FRAME_KEYS.filter((k) => FRAMES[k].free || owned.includes(k) || (FRAMES[k].followers !== undefined && followers >= FRAMES[k].followers!));
}
