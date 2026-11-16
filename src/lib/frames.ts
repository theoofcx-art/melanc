import nyan from "@/assets/frames/frame_nyan.png.asset.json";
import nuvem from "@/assets/frames/frame_nuvem.png.asset.json";
import melancia from "@/assets/frames/frame_melancia.png.asset.json";
import neon from "@/assets/frames/frame_neon.png.asset.json";
import estrelas from "@/assets/frames/frame_estrelas.png.asset.json";
import cereja from "@/assets/frames/frame_cereja.png.asset.json";
import laco from "@/assets/frames/frame_laco.png.asset.json";
import ursinho from "@/assets/frames/frame_ursinho_mel.png.asset.json";
import melsOnda from "@/assets/frames/frame_mels_onda.png.asset.json";
import melsDragao from "@/assets/frames/frame_mels_dragao.png.asset.json";
import estrelaAzul from "@/assets/frames/frame_estrela_azul.png.asset.json";
import luz from "@/assets/frames/frame_luz.png.asset.json";
import galaxia from "@/assets/frames/frame_galaxia.png.asset.json";
import rosa from "@/assets/frames/frame_rosa.png.asset.json";
import patinho from "@/assets/frames/frame_patinho.png.asset.json";
import folhas from "@/assets/frames/frame_folhas.png.asset.json";
import melodia from "@/assets/frames/frame_melodia.png.asset.json";
import boia from "@/assets/frames/frame_boia.png.asset.json";
import katseye from "@/assets/frames/frame_katseye.png.asset.json";
import ciano from "@/assets/frames/frame_ciano.png.asset.json";

export type FrameKey = "melancia" | "estrelas" | "luz" | "galaxia" | "katseye" | "ciano" | "nyan" | "nuvem" | "neon" | "cereja" | "laco" | "ursinho" | "estrela_azul" | "rosa" | "folhas" | "melodia" | "patinho" | "boia" | "mels_onda" | "mels_dragao";
/** Followers needed to unlock the cloud frame. */
export const NUVEM_FOLLOWERS = 10;
export type FrameGroup = "convite" | "gratis" | "seguidores" | "views" | "mels";
export const FRAME_GROUPS: { key: FrameGroup; label: string }[] = [
  { key: "convite", label: "Convidar amigos" },
  { key: "gratis", label: "Gratuitas" },
  { key: "seguidores", label: "Necessário seguidores" },
  { key: "views", label: "Necessário visualizações" },
];
type Frame = { label: string; url: string; free: boolean; how: string; group: FrameGroup; followers?: number; views?: number; winner?: boolean };
const free = (label: string, url: string, how = "Grátis para todos"): Frame => ({ label, url, free: true, how, group: "gratis" });
const byFollowers = (label: string, url: string, n: number): Frame => ({ label, url, free: false, how: `Chegue a ${n} seguidores`, followers: n, group: "seguidores" });
const byViews = (label: string, url: string, n: number): Frame => ({ label, url, free: false, how: `1 post com ${n} visualizações`, views: n, group: "views" });
export const FRAMES: Record<FrameKey, Frame> = {
  nyan: { label: "Arco-íris", url: nyan.url, free: false, how: "Convide alguém para a Melan", group: "convite" },
  melancia: free("Melancia", melancia.url),
  estrelas: free("Estrelas", estrelas.url),
  luz: free("Luz", luz.url),
  galaxia: free("Galáxia", galaxia.url),
  katseye: free("KATSEYE", katseye.url, "Parceria com KATSEYE"),
  ciano: free("Ciano", ciano.url),
  nuvem: byFollowers("Nuvem", nuvem.url, NUVEM_FOLLOWERS),
  neon: byFollowers("Neon", neon.url, 20),
  cereja: byFollowers("Cereja", cereja.url, 30),
  laco: byFollowers("Laço", laco.url, 40),
  ursinho: byFollowers("Ursinho do mel", ursinho.url, 50),
  estrela_azul: byFollowers("Estrela azul", estrelaAzul.url, 60),
  rosa: byFollowers("Rosa", rosa.url, 70),
  folhas: byFollowers("Folhas", folhas.url, 80),
  melodia: byFollowers("Melodia", melodia.url, 90),
  patinho: byViews("Patinho", patinho.url, 60),
  boia: byViews("Boia", boia.url, 150),
  mels_onda: { label: "Onda do Mels", url: melsOnda.url, free: false, how: "Só para Vencedor do Mels", winner: true, group: "mels" },
  mels_dragao: { label: "Dragão do Mels", url: melsDragao.url, free: false, how: "Só para Vencedor do Mels", winner: true, group: "mels" },
};
/** Colors a Mels winner can pick for their likes and profile background. */
export const WINNER_COLORS = ["#ff4d6d", "#ffb703", "#8338ec", "#3a86ff", "#06d6a0", "#ff006e", "#f4f1de", "#1b263b"];
export const FRAME_KEYS = Object.keys(FRAMES) as FrameKey[];
export function frameUrl(key?: string | null) {
  return key && key in FRAMES ? FRAMES[key as FrameKey].url : null;
}
/** Frames a user may wear: free ones, follower/view milestones, and the ones they earned or were given. */
export function availableFrames(owned: string[], followers = 0, winner = false, maxViews = 0): FrameKey[] {
  return FRAME_KEYS.filter((k) => {
    const f = FRAMES[k];
    return f.free || (winner && f.winner) || owned.includes(k) || (f.followers !== undefined && followers >= f.followers) || (f.views !== undefined && maxViews >= f.views);
  });
}

export type BadgeKey = "vampiro" | "pomba" | "folha" | "olhos";
/** Representative tags shown above the bio, each with its own aura color token. */
export const BADGES: Record<BadgeKey, { emoji: string; label: string; aura: string }> = {
  vampiro: { emoji: "🧛", label: "Fica on de noite", aura: "aura-vampiro" },
  pomba: { emoji: "🕊️", label: "Cronicamente online", aura: "aura-pomba" },
  folha: { emoji: "🍃", label: "Paz", aura: "aura-folha" },
  olhos: { emoji: "👀", label: "Observando", aura: "aura-olhos" },
};
