import type {
  Achievement,
  AuditLog,
  Banner,
  CashLedgerRow,
  CashMovement,
  CashMonthly,
  CashSummary,
  Category,
  Contribution,
  Cyclist,
  CyclistStats,
  Expense,
  ExpenseCategorySummary,
  ExpenseDetail,
  GalleryItem,
  Member,
  MemberDebt,
  MembershipObligation,
  MembershipPaymentEntry,
  MembershipSummary,
  NewsItem,
  PublicCyclist,
  PublicStats,
  Race,
  RaceBudget,
  RaceFinancial,
  RaceResult,
  RankingRow,
  ScoringRule,
  SiteSettings,
  Sponsor,
  SponsorSocials,
} from '../types';
import { toNumber } from '../utils/format';

type Raw = Record<string, unknown>;

function withNumbers<T>(raw: Raw, fields: string[]): T {
  const copy: Raw = { ...raw };
  for (const field of fields) {
    if (field in copy) copy[field] = toNumber(copy[field]);
  }
  return copy as unknown as T;
}

export function mapSettings(raw: Raw): SiteSettings {
  return withNumbers<SiteSettings>(raw, ['id']);
}

export function mapCategory(raw: Raw): Category {
  return withNumbers<Category>(raw, ['sort_order']);
}

export function mapCyclist(raw: Raw): Cyclist {
  return withNumbers<Cyclist>(raw, ['number', 'team_since']);
}

export function mapPublicCyclist(raw: Raw): PublicCyclist {
  return withNumbers<PublicCyclist>(raw, ['number', 'team_since', 'age']);
}

export function mapStats(raw: Raw): CyclistStats {
  return withNumbers<CyclistStats>(raw, [
    'total_races',
    'total_points',
    'wins',
    'seconds',
    'thirds',
    'podiums',
    'best_position',
  ]);
}

export function mapRace(raw: Raw): Race {
  return withNumbers<Race>(raw, ['season']);
}

export function mapResult(raw: Raw): RaceResult {
  return withNumbers<RaceResult>(raw, ['position', 'points', 'time_seconds']);
}

export function mapScoring(raw: Raw): ScoringRule {
  return withNumbers<ScoringRule>(raw, ['position', 'points']);
}

export function mapAchievement(raw: Raw): Achievement {
  return withNumbers<Achievement>(raw, ['year', 'sort_order']);
}

export function mapMember(raw: Raw): Member {
  return withNumbers<Member>(raw, ['monthly_amount']);
}

export function mapPublicStats(raw: Raw | null): PublicStats {
  return {
    activeCyclists: toNumber(raw?.active_cyclists),
    races: toNumber(raw?.races),
    podiums: toNumber(raw?.podiums),
    wins: toNumber(raw?.wins),
    news: toNumber(raw?.news),
    upcomingRaces: toNumber(raw?.upcoming_races),
  };
}

export function mapObligation(raw: Raw): MembershipObligation {
  return withNumbers<MembershipObligation>(raw, [
    'month',
    'year',
    'expected',
    'paid',
    'balance',
  ]);
}

export function mapPaymentEntry(raw: Raw): MembershipPaymentEntry {
  return withNumbers<MembershipPaymentEntry>(raw, ['amount']);
}

export function mapContribution(raw: Raw): Contribution {
  return withNumbers<Contribution>(raw, ['amount']);
}

export function mapCash(raw: Raw): CashMovement {
  return withNumbers<CashMovement>(raw, ['amount']);
}

export function mapCashLedger(raw: Raw): CashLedgerRow {
  return withNumbers<CashLedgerRow>(raw, ['amount']);
}

export function mapExpense(raw: Raw): Expense {
  return withNumbers<Expense>(raw, ['amount']);
}

export function mapExpenseDetail(raw: Raw): ExpenseDetail {
  return withNumbers<ExpenseDetail>(raw, ['amount']);
}

export function mapBudget(raw: Raw): RaceBudget {
  return withNumbers<RaceBudget>(raw, ['budgeted']);
}

export function mapSponsor(raw: Raw): Sponsor {
  const socials = raw.socials;
  return {
    ...withNumbers<Sponsor>(raw, ['sort_order']),
    socials:
      socials && typeof socials === 'object' && !Array.isArray(socials)
        ? (socials as SponsorSocials)
        : {},
  };
}

export function mapNews(raw: Raw): NewsItem {
  return raw as unknown as NewsItem;
}

export function mapBanner(raw: Raw): Banner {
  return withNumbers<Banner>(raw, ['sort_order']);
}

export function mapGallery(raw: Raw): GalleryItem {
  return withNumbers<GalleryItem>(raw, ['sort_order', 'width', 'height']);
}

export function mapAudit(raw: Raw): AuditLog {
  return raw as unknown as AuditLog;
}

export function mapRanking(raw: Raw): RankingRow {
  return withNumbers<RankingRow>(raw, [
    'total_points',
    'races_count',
    'wins',
    'seconds',
    'thirds',
    'podiums',
    'best_position',
    'position_rank',
  ]);
}

export function mapCashSummary(raw: Raw | null): CashSummary {
  return withNumbers<CashSummary>(raw ?? {}, [
    'total_income',
    'total_expenses',
    'balance',
    'opening_balance',
    'movements_count',
  ]);
}

export function mapCashMonthly(raw: Raw): CashMonthly {
  return withNumbers<CashMonthly>(raw, ['operating_income', 'expenses', 'net']);
}

export function mapExpenseCategory(raw: Raw): ExpenseCategorySummary {
  return withNumbers<ExpenseCategorySummary>(raw, ['count', 'total']);
}

export function mapMemberDebt(raw: Raw): MemberDebt {
  return withNumbers<MemberDebt>(raw, [
    'pending_periods',
    'pending_amount',
    'overdue_amount',
  ]);
}

export function mapMembershipSummary(raw: Raw): MembershipSummary {
  return withNumbers<MembershipSummary>(raw, [
    'year',
    'month',
    'obligations',
    'expected_total',
    'paid_total',
    'pending_total',
    'paid_count',
    'pending_count',
    'overdue_count',
  ]);
}

export function mapRaceFinancial(raw: Raw): RaceFinancial {
  return withNumbers<RaceFinancial>(raw, [
    'expenses_total',
    'income_total',
    'budget_total',
    'budget_difference',
  ]);
}
