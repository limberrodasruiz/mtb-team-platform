import { DEFAULT_SCORING } from '../constants';
import type { RaceResult, RankingRow, ScoringRule } from '../types';

type ResultLike = Pick<
  RaceResult,
  'cyclist_id' | 'position' | 'points'
> & {
  cyclist_full_name?: string | null;
  cyclist_slug?: string | null;
  cyclist_photo_url?: string | null;
};

export function getPointsForPosition(
  rules: ScoringRule[] | Readonly<Record<number, number>>,
  pos: number,
): number {
  if (!Number.isInteger(pos) || pos <= 0) return 0;
  if (Array.isArray(rules)) {
    const found = rules.find((r) => r.position === pos);
    return found ? found.points : 0;
  }
  return rules[pos] ?? DEFAULT_SCORING[pos] ?? 0;
}

export function calculateTeamRanking(results: ResultLike[]): RankingRow[] {
  const grouped = new Map<string, RankingRow>();

  for (const r of results) {
    const key = r.cyclist_id;
    const existing = grouped.get(key);
    if (existing) {
      existing.total_points += r.points;
      existing.races_count += 1;
      if (r.position === 1) existing.wins += 1;
      else if (r.position === 2) existing.seconds += 1;
      else if (r.position === 3) existing.thirds += 1;
      if (r.position >= 1 && r.position <= 3) existing.podiums += 1;
    } else {
      grouped.set(key, {
        cyclist_id: r.cyclist_id,
        full_name: r.cyclist_full_name ?? r.cyclist_id,
        slug: r.cyclist_slug ?? null,
        photo_url: r.cyclist_photo_url ?? null,
        total_points: r.points,
        races_count: 1,
        wins: r.position === 1 ? 1 : 0,
        seconds: r.position === 2 ? 1 : 0,
        thirds: r.position === 3 ? 1 : 0,
        podiums: r.position >= 1 && r.position <= 3 ? 1 : 0,
      });
    }
  }

  return [...grouped.values()].sort((a, b) => {
    if (b.total_points !== a.total_points)
      return b.total_points - a.total_points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.podiums - a.podiums;
  });
}
