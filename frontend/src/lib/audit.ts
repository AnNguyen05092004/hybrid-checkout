/**
 * Post-review of false alarms (UC14, BR-17). Cashiers close false alarms alone, so the review has to
 * separate model errors from staff errors: model errors spread over every cashier, staff errors
 * concentrate on one person.
 */
import { hash01 } from "./format";

export const HIGH_VALUE = 30_000; // alerts worth at least this are always reviewed first
export const ANOMALY_RATIO = 1.5; // cashier false-alarm rate vs the store rate
export const ANOMALY_MIN_ALERTS = 5; // too few alerts say nothing about a cashier
export const RANDOM_SAMPLE = 0.1;

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

export type AuditReason = "GIA_TRI_CAO" | "THU_NGAN_BAT_THUONG" | "MAU_NGAU_NHIEN";

export const AUDIT_REASON_LABEL: Record<AuditReason, string> = {
  GIA_TRI_CAO: "Giá trị cao", THU_NGAN_BAT_THUONG: "Thu ngân bất thường", MAU_NGAU_NHIEN: "Mẫu ngẫu nhiên",
};

/** Why a false alarm should be reviewed first; empty means it can wait. */
export function auditReasons(a: AuditAlert, anomalous: Set<string>): AuditReason[] {
  const out: AuditReason[] = [];
  if (a.value >= HIGH_VALUE) out.push("GIA_TRI_CAO");
  if (anomalous.has(a.cashier)) out.push("THU_NGAN_BAT_THUONG");
  if (out.length === 0 && hash01(`audit-${a.id}`) < RANDOM_SAMPLE) out.push("MAU_NGAU_NHIEN");
  return out;
}

/** Order of the review queue: more reasons first, then higher value. */
export function byPriority<T extends AuditAlert>(items: T[], anomalous: Set<string>): (T & { reasons: AuditReason[] })[] {
  return items
    .map((a) => ({ ...a, reasons: auditReasons(a, anomalous) }))
    .sort((x, y) => y.reasons.length - x.reasons.length || y.value - x.value);
}
