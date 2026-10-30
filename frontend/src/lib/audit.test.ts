import { describe, expect, it } from "vitest";
import { auditReasons, byPriority, cashierStats, type AuditAlert } from "./audit";

const alert = (id: string, cashier: string, falseAlarm: boolean, value = 10_000): AuditAlert => ({ id, cashier, value, falseAlarm });

describe("cashierStats", () => {
  it("flags a cashier whose false-alarm rate is well above the store rate", () => {
    const alerts = [
      ...Array.from({ length: 10 }, (_, i) => alert(`a${i}`, "An", i < 1)), // 10%
      ...Array.from({ length: 10 }, (_, i) => alert(`b${i}`, "Bình", i < 6)), // 60%
    ];
    const { store, cashiers } = cashierStats(alerts);
    expect(store).toBeCloseTo(0.35);
    expect(cashiers.find((c) => c.cashier === "Bình")!.anomalous).toBe(true);
    expect(cashiers.find((c) => c.cashier === "An")!.anomalous).toBe(false);
  });

  it("does not judge a cashier on too few alerts", () => {
    const alerts = [alert("a", "An", true), ...Array.from({ length: 9 }, (_, i) => alert(`b${i}`, "Bình", false))];
    expect(cashierStats(alerts).cashiers.find((c) => c.cashier === "An")!.anomalous).toBe(false);
  });
});

describe("audit priority", () => {
  it("puts high-value alerts of anomalous cashiers first", () => {
    const items = [alert("x", "An", true, 5_000), alert("y", "Bình", true, 40_000)];
    const queue = byPriority(items, new Set(["Bình"]));
    expect(queue[0].id).toBe("y");
    expect(auditReasons(items[1], new Set(["Bình"]))).toEqual(["GIA_TRI_CAO", "THU_NGAN_BAT_THUONG"]);
  });
});
