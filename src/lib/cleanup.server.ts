// Storage cleanup shared by the admin button and the daily scheduled job.
export const INACTIVE_DAYS = 14;
export const OLD_MEDIA_DAYS = 30;

type Admin = any;

async function listAll(admin: Admin, prefix: string) {
  const out: { path: string; size: number; created: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await admin.storage.from("media").list(prefix, { limit: 1000, offset });
    if (!data?.length) break;
    for (const f of data) {
      const p = prefix ? `${prefix}/${f.name}` : f.name;
      if (!f.id) out.push(...(await listAll(admin, p)));
      else out.push({ path: p, size: f.metadata?.size ?? 0, created: f.created_at });
    }
    if (data.length < 1000) break;
  }
  return out;
}

async function referencedPaths(admin: Admin) {
  const refs = new Set<string>();
  const add = (v: unknown) => { if (typeof v === "string" && v) refs.add(v); };
  const [posts, profiles, statuses, stickers, comments, messages] = await Promise.all([
    admin.from("posts").select("media_urls,sticker"),
    admin.from("profiles").select("avatar_url,banner_url"),
    admin.from("statuses").select("media_path"),
    admin.from("stickers").select("path"),
    admin.from("comments").select("sticker"),
    admin.from("messages").select("sticker"),
  ]);
  posts.data?.forEach((r: any) => { r.media_urls?.forEach(add); add(r.sticker); });
  profiles.data?.forEach((r: any) => { add(r.avatar_url); add(r.banner_url); });
  statuses.data?.forEach((r: any) => add(r.media_path));
  stickers.data?.forEach((r: any) => add(r.path));
  comments.data?.forEach((r: any) => add(r.sticker));
  messages.data?.forEach((r: any) => add(r.sticker));
  return refs;
}

async function inactiveUsers(admin: Admin) {
  const cutoff = Date.now() - INACTIVE_DAYS * 86400000;
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  const admins = new Set((roles ?? []).map((r: any) => r.user_id));
  const res: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) {
      const last = new Date(u.last_sign_in_at ?? u.created_at).getTime();
      if (last < cutoff && !admins.has(u.id)) res.push({ id: u.id, email: u.email });
    }
    if (users.length < 1000) break;
  }
  return res;
}

export async function storageReport(admin: Admin) {
  const [files, refs, inactive] = await Promise.all([listAll(admin, ""), referencedPaths(admin), inactiveUsers(admin)]);
  const byUser = new Map<string, number>();
  files.forEach((f) => byUser.set(f.path.split("/")[0], (byUser.get(f.path.split("/")[0]) ?? 0) + f.size));
  const orphans = files.filter((f) => !refs.has(f.path));
  return {
    totalFiles: files.length,
    totalBytes: files.reduce((s, f) => s + f.size, 0),
    orphanFiles: orphans.length,
    orphanBytes: orphans.reduce((s, f) => s + f.size, 0),
    inactiveUsers: inactive.length,
    topUsers: [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, bytes]) => ({ id, bytes })),
    biggest: [...files].sort((a, b) => b.size - a.size).slice(0, 10),
  };
}

export async function runCleanup(admin: Admin) {
  const inactive = await inactiveUsers(admin);
  let deletedUsers = 0;
  for (const u of inactive) {
    const files = await listAll(admin, u.id);
    if (files.length) await admin.storage.from("media").remove(files.map((f) => f.path));
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (!error) deletedUsers++;
  }
  // Old posts' media (>30 days) and expired statuses are removed with their rows.
  const old = new Date(Date.now() - OLD_MEDIA_DAYS * 86400000).toISOString();
  await admin.from("posts").delete().lt("created_at", old).neq("media_urls", "{}");
  await admin.from("statuses").delete().lt("created_at", new Date(Date.now() - 86400000).toISOString());
  // Files no longer referenced anywhere (older than 1 hour, so uploads in progress survive).
  const [files, refs] = await Promise.all([listAll(admin, ""), referencedPaths(admin)]);
  const hourAgo = Date.now() - 3600000;
  const orphans = files.filter((f) => !refs.has(f.path) && new Date(f.created).getTime() < hourAgo);
  let freed = 0;
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100);
    await admin.storage.from("media").remove(batch.map((f) => f.path));
    freed += batch.reduce((s, f) => s + f.size, 0);
  }
  return { deletedUsers, deletedFiles: orphans.length, freedBytes: freed };
}
