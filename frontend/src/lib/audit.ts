/**
 * Post-review of false alarms (UC14, BR-17). Cashiers close false alarms alone, so the review has to
 * separate model errors from staff errors: model errors spread over every cashier, staff errors
 * concentrate on one person.
 */
import { hash01 } from "./format";

export const HIGH_VALUE = 30_000; // alerts worth at least this are always reviewed first
export const ANOMALY_RATIO = 1.5; // cashier false-alarm rate vs the store rate
export const ANOMALY_MIN_ALERTS = 5; // too few alerts say nothing about a cashier
export const RANDOM_SAMPLE_RATE = 0.1;
export const ANOMALY_MIN_REMOVALS = 5; // deleted lines a cashier needs before the rate counts

export interface AuditAlert {
  id: string;
  cashier: string;
  value: number;
  falseAlarm: boolean;
}

export interface CashierStat {
  cashier: string;
  alerts: number;
  falseAlarms: number;
  rate: number;
  anomalous: boolean;
}

export function cashierStats(alerts: AuditAlert[]): { store: number; cashiers: CashierStat[] } {
  const store = alerts.length ? alerts.filter((a) => a.falseAlarm).length / alerts.length : 0;
  const names = [...new Set(alerts.map((a) => a.cashier))];
  const cashiers = names.map((cashier) => {
    const mine = alerts.filter((a) => a.cashier === cashier);
    const falseAlarms = mine.filter((a) => a.falseAlarm).length;
    const rate = mine.length ? falseAlarms / mine.length : 0;
    return { cashier, alerts: mine.length, falseAlarms, rate, anomalous: mine.length >= ANOMALY_MIN_ALERTS && rate >= store * ANOMALY_RATIO && rate > 0 };
  });
  return { store, cashiers };
}

export interface RemovalStat {
  cashier: string;
  transactions: number;
  removed: number;
  rate: number;
  anomalous: boolean;
}

/**
 * Cashiers delete lines without a PIN (BR-05), so deletions per transaction are compared with the
 * store like false alarms; a flagged cashier has their deleted lines reviewed.
 */
export function removalStats(txs: { cashier: string; removed: number }[]): { store: number; cashiers: RemovalStat[] } {
  const store = txs.length ? txs.reduce((s, t) => s + t.removed, 0) / txs.length : 0;
  const names = [...new Set(txs.map((t) => t.cashier))];
  const cashiers = names.map((cashier) => {
    const mine = txs.filter((t) => t.cashier === cashier);
    const removed = mine.reduce((s, t) => s + t.removed, 0);
    const rate = removed / mine.length;
    return { cashier, transactions: mine.length, removed, rate, anomalous: removed >= ANOMALY_MIN_REMOVALS && rate >= store * ANOMALY_RATIO };
  });
  return { store, cashiers };
}

export type AuditReason = "HIGH_VALUE" | "ANOMALOUS_CASHIER" | "RANDOM_SAMPLE";

export const AUDIT_REASON_LABEL: Record<AuditReason, string> = {
  HIGH_VALUE: "Giá trị cao", ANOMALOUS_CASHIER: "Thu ngân bất thường", RANDOM_SAMPLE: "Mẫu ngẫu nhiên",
};

/** Why a false alarm should be reviewed first; empty means it can wait. */
export function auditReasons(a: AuditAlert, anomalous: Set<string>): AuditReason[] {
  const out: AuditReason[] = [];
  if (a.value >= HIGH_VALUE) out.push("HIGH_VALUE");
  if (anomalous.has(a.cashier)) out.push("ANOMALOUS_CASHIER");
  if (out.length === 0 && hash01(`audit-${a.id}`) < RANDOM_SAMPLE_RATE) out.push("RANDOM_SAMPLE");
  return out;
}

/** Order of the review queue: more reasons first, then higher value. */
export function byPriority<T extends AuditAlert>(items: T[], anomalous: Set<string>): (T & { reasons: AuditReason[] })[] {
  return items
    .map((a) => ({ ...a, reasons: auditReasons(a, anomalous) }))
    .sort((x, y) => y.reasons.length - x.reasons.length || y.value - x.value);
}
