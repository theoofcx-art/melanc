export function cleanPollOptions(opts: string[]): string[] {
  const seen = new Set<string>();
  return opts.map((o) => o.trim().slice(0, 80)).filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase())).slice(0, 6);
}

/** Percent per option, based on number of distinct voters. */
export function pollPercents(counts: number[], voters: number): number[] {
  return counts.map((c) => (voters ? Math.round((c / voters) * 100) : 0));
}
