import natal from "@/assets/frames/frame_natal.png.asset.json";
import nyan from "@/assets/frames/frame_nyan.png.asset.json";
import nuvem from "@/assets/frames/frame_nuvem.png.asset.json";
import melancia from "@/assets/frames/frame_melancia.png.asset.json";
import neon from "@/assets/frames/frame_neon.png.asset.json";
import estrelas from "@/assets/frames/frame_estrelas.png.asset.json";
import cereja from "@/assets/frames/frame_cereja.png.asset.json";
import laco from "@/assets/frames/frame_laco.png.asset.json";
import ursinho from "@/assets/frames/frame_ursinho.png.asset.json";
import melsOnda from "@/assets/frames/frame_mels_onda.png.asset.json";
import melsDragao from "@/assets/frames/frame_mels_dragao.png.asset.json";
import estrelaAzul from "@/assets/frames/frame_estrela_azul.png.asset.json";

export type FrameKey = "natal" | "melancia" | "estrelas" | "nyan" | "nuvem" | "neon" | "cereja" | "laco" | "ursinho" | "estrela_azul" | "mels_onda" | "mels_dragao";
/** Followers needed to unlock the cloud frame. */
export const NUVEM_FOLLOWERS = 10;
type Frame = { label: string; url: string; free: boolean; how: string; followers?: number; winner?: boolean };
const byFollowers = (label: string, url: string, n: number): Frame => ({ label, url, free: false, how: `Chegue a ${n} seguidores`, followers: n });
export const FRAMES: Record<FrameKey, Frame> = {
  natal: { label: "Natal", url: natal.url, free: true, how: "Grátis para todos" },
  melancia: { label: "Melancia", url: melancia.url, free: true, how: "Grátis para todos" },
  estrelas: { label: "Estrelas", url: estrelas.url, free: true, how: "Grátis para todos" },
  nyan: { label: "Arco-íris", url: nyan.url, free: false, how: "Convide alguém para a Melan" },
  nuvem: byFollowers("Nuvem", nuvem.url, NUVEM_FOLLOWERS),
  neon: byFollowers("Neon", neon.url, 20),
  cereja: byFollowers("Cereja", cereja.url, 30),
  laco: byFollowers("Laço", laco.url, 40),
  ursinho: byFollowers("Ursinho", ursinho.url, 50),
  estrela_azul: byFollowers("Estrela azul", estrelaAzul.url, 60),
  mels_onda: { label: "Onda do Mels", url: melsOnda.url, free: false, how: "Só para Vencedor do Mels", winner: true },
  mels_dragao: { label: "Dragão do Mels", url: melsDragao.url, free: false, how: "Só para Vencedor do Mels", winner: true },
};
/** Colors a Mels winner can pick for their likes and profile background. */
export const WINNER_COLORS = ["#ff4d6d", "#ffb703", "#8338ec", "#3a86ff", "#06d6a0", "#ff006e", "#f4f1de", "#1b263b"];
export const FRAME_KEYS = Object.keys(FRAMES) as FrameKey[];
export function frameUrl(key?: string | null) {
  return key && key in FRAMES ? FRAMES[key as FrameKey].url : null;
}
/** Frames a user may wear: free ones, follower milestones, and the ones they earned or were given. */
export function availableFrames(owned: string[], followers = 0, winner = false): FrameKey[] {
  return FRAME_KEYS.filter((k) => FRAMES[k].free || (winner && FRAMES[k].winner) || owned.includes(k) || (FRAMES[k].followers !== undefined && followers >= FRAMES[k].followers!));
}

export type BadgeKey = "vampiro" | "pomba" | "folha" | "olhos";
/** Representative tags shown above the bio, each with its own aura color token. */
export const BADGES: Record<BadgeKey, { emoji: string; label: string; aura: string }> = {
  vampiro: { emoji: "🧛", label: "Fica on de noite", aura: "aura-vampiro" },
  pomba: { emoji: "🕊️", label: "Cronicamente online", aura: "aura-pomba" },
  folha: { emoji: "🍃", label: "Paz", aura: "aura-folha" },
  olhos: { emoji: "👀", label: "Observando", aura: "aura-olhos" },
};
