/** Seed data of the prototype: users, counters, past batches/jobs and a week of transactions. */
import { hash01 } from "../lib/format";
import { reconcile, type TrayAlert } from "../lib/reconcile";
import { SKUS, sku } from "./catalog";
import { MODEL_VERSIONS } from "./models";
import { TRAYS, detect } from "./trays";

export type Role = "CASHIER" | "STORE_MANAGER" | "ML_ENGINEER" | "ADMIN";

export const ROLE_LABEL: Record<Role, string> = {
  CASHIER: "Thu ngân",
  STORE_MANAGER: "Quản lý cửa hàng",
  ML_ENGINEER: "Kỹ sư ML",
  ADMIN: "Quản trị viên",
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLogin: string;
}

export interface Counter {
  id: string;
  name: string;
  camera: string;
  cameraOnline: boolean;
}

export type Resolution = "MO" | "DA_QUET_BO_SUNG" | "QUAN_LY_XAC_NHAN_BAO_NHAM" | "TU_DONG";
export type Review = "XAC_NHAN_DUNG" | "BAO_NHAM_THAT" | "NGHI_GIAN_LAN";

export interface AlertRecord extends TrayAlert {
  resolution: Resolution;
  confirmedBy?: string;
  reason?: string;
  review?: Review;
}

export interface TxLine {
  skuId: number;
  qty: number;
  price: number;
  source: "BARCODE" | "CAMERA";
}

export interface Transaction {
  id: string;
  at: string;
  counterId: string;
  cashier: string;
  mode: "VERIFY" | "FAST";
  trayId: string;
  modelVersion: string;
  lines: TxLine[];
  alerts: AlertRecord[];
  status: "DA_THANH_TOAN" | "DA_HUY";
  payment: "CASH" | "CARD" | "TRANSFER";
  total: number;
  corrections: number;
}

export type BatchStatus =
  | "NHAP" | "DANG_GAN_NHAN" | "CHO_HUAN_LUYEN" | "DANG_HUAN_LUYEN" | "CHO_DUYET" | "DA_DEPLOY";

export interface Batch {
  id: number;
  name: string;
  status: BatchStatus;
  createdAt: string;
  createdBy: string;
  deployedAt?: string;
}

export interface Job {
  id: string;
  batch: number;
  type: "TRAIN" | "EVAL";
  status: "CHO" | "DANG_CHAY" | "DANG_DANH_GIA" | "XONG" | "LOI";
  epoch: number;
  epochs: number;
  gpuHours: number;
  startedAt: string;
  finishedAt?: string;
  log: string[];
}

export interface AuditEntry {
  at: string;
  user: string;
  action: string;
  target: string;
  detail: string;
}

export const USERS: User[] = [
  { id: "u1", name: "Nguyễn Thu Hà", email: "ha.thungan@hybrid.local", role: "CASHIER", active: true, lastLogin: "2026-10-29T07:58:00+07:00" },
  { id: "u2", name: "Trần Minh Khoa", email: "khoa.thungan@hybrid.local", role: "CASHIER", active: true, lastLogin: "2026-10-29T13:02:00+07:00" },
  { id: "u3", name: "Lê Quốc Bảo", email: "bao.quanly@hybrid.local", role: "STORE_MANAGER", active: true, lastLogin: "2026-10-29T08:10:00+07:00" },
  { id: "u4", name: "Phạm Gia An", email: "an.ml@hybrid.local", role: "ML_ENGINEER", active: true, lastLogin: "2026-10-29T09:30:00+07:00" },
  { id: "u5", name: "Đỗ Thanh Tâm", email: "tam.admin@hybrid.local", role: "ADMIN", active: true, lastLogin: "2026-10-28T17:45:00+07:00" },
  { id: "u6", name: "Võ Ngọc Lan", email: "lan.thungan@hybrid.local", role: "CASHIER", active: false, lastLogin: "2026-09-30T18:00:00+07:00" },
];

/** One demo account per role on the login page. */
export const DEMO_USER: Record<Role, User> = {
  CASHIER: USERS[0],
  STORE_MANAGER: USERS[2],
  ML_ENGINEER: USERS[3],
  ADMIN: USERS[4],
};

/** PIN of the store manager in the prototype. */
export const MANAGER_PIN = "246810";

export const COUNTERS: Counter[] = [
  { id: "Q1", name: "Quầy 1", camera: "CAM-Q1 (trên cao)", cameraOnline: true },
  { id: "Q2", name: "Quầy 2", camera: "CAM-Q2 (trên cao)", cameraOnline: true },
  { id: "Q3", name: "Quầy 3 — Làn nhanh", camera: "CAM-Q3 (trên cao)", cameraOnline: false },
];

export const PAST_BATCHES: Batch[] = [
  { id: 1, name: "Khai trương — 100 SKU", status: "DA_DEPLOY", createdAt: "2026-10-20T09:00:00+07:00", createdBy: "Lê Quốc Bảo", deployedAt: "2026-10-23T21:30:00+07:00" },
  { id: 2, name: "Đợt nhập 2 — 25 SKU", status: "DA_DEPLOY", createdAt: "2026-10-22T10:00:00+07:00", createdBy: "Lê Quốc Bảo", deployedAt: "2026-10-24T10:00:00+07:00" },
  { id: 3, name: "Đợt nhập 3 — 25 SKU", status: "DA_DEPLOY", createdAt: "2026-10-23T14:00:00+07:00", createdBy: "Lê Quốc Bảo", deployedAt: "2026-10-25T08:00:00+07:00" },
  { id: 4, name: "Đợt nhập 4 — 25 SKU", status: "DA_DEPLOY", createdAt: "2026-10-24T15:00:00+07:00", createdBy: "Lê Quốc Bảo", deployedAt: "2026-10-26T12:00:00+07:00" },
  { id: 5, name: "Đợt nhập 5 — 25 SKU", status: "DANG_GAN_NHAN", createdAt: "2026-10-28T09:00:00+07:00", createdBy: "Lê Quốc Bảo" },
];

export const PAST_JOBS: Job[] = MODEL_VERSIONS.slice(0, 4).map((v) => ({
  id: `JOB-${v.batch}0${v.batch}`,
  batch: v.batch,
  type: "TRAIN",
  status: "XONG",
  epoch: 16,
  epochs: 16,
  gpuHours: v.gpuHours,
  startedAt: new Date(new Date(v.createdAt).getTime() - v.gpuHours * 3600_000).toISOString(),
  finishedAt: v.createdAt,
  log: [`Huấn luyện đợt ${v.batch} trên RTX 4090`, "16/16 epoch", `Đánh giá val: cAcc ${v.cacc}% · AP50 ${v.ap50}%`, "Đăng ký phiên bản " + v.id],
}));

export const PAST_AUDIT: AuditEntry[] = [
  { at: "2026-10-26T12:00:00+07:00", user: "Phạm Gia An", action: "DEPLOY_MODEL", target: "v4", detail: "Deploy v4 — Đợt nhập 4, đạt cổng duyệt" },
  { at: "2026-10-28T09:00:00+07:00", user: "Lê Quốc Bảo", action: "CREATE_BATCH", target: "Đợt 5", detail: "Tạo đợt nhập 5 với 25 SKU" },
  { at: "2026-10-28T09:12:00+07:00", user: "Lê Quốc Bảo", action: "UPDATE_PRICE", target: "Nước giải khát 097", detail: "12.000 ₫ → 13.000 ₫" },
  { at: "2026-10-29T07:58:00+07:00", user: "Nguyễn Thu Hà", action: "LOGIN", target: "—", detail: "Đăng nhập tại Quầy 1" },
];

/** A week of paid transactions on the trays of batches 1-4, reconciled with the real rules. */
function seedTransactions(): Transaction[] {
  const trays = TRAYS.filter((t) => t.task <= 4);
  const cashiers = ["Nguyễn Thu Hà", "Trần Minh Khoa"];
  const now = Date.now();
  const out: Transaction[] = [];
  for (let i = 0; i < 42; i++) {
    const key = `tx-${i}`;
    const t = trays[i % trays.length];
    const scanned = new Map<number, number>();
    t.objects.forEach((o) => scanned.set(o.rpcId, (scanned.get(o.rpcId) ?? 0) + 1));
    const r = hash01(key);
    const victim = t.objects[Math.floor(hash01(`${key}-v`) * t.objects.length)].rpcId;
    if (r < 0.3) scanned.set(victim, scanned.get(victim)! - 1); // missed scan
    else if (r < 0.38) {
      // swap: the cheapest SKU of the same category was scanned instead
      const cheap = SKUS.filter((s) => s.category === sku(victim).category && s.task <= 4 && s.id !== victim)
        .sort((a, b) => a.price - b.price)[0];
      if (cheap) {
        scanned.set(victim, scanned.get(victim)! - 1);
        scanned.set(cheap.id, (scanned.get(cheap.id) ?? 0) + 1);
      }
    }
    const result = reconcile({
      scanned, detections: detect(t, 4), isLearned: (id) => sku(id).task <= 4,
      categoryOf: (id) => sku(id).category, priceOf: (id) => sku(id).price,
      alertThreshold: () => 0.5, lowThreshold: 0.3,
    });
    const alerts: AlertRecord[] = result.alerts.map((a, k) => {
      if (a.severity === "LOW") return { ...a, resolution: "TU_DONG" };
      const falseAlarm = hash01(`${key}-fa-${k}`) < 0.12;
      return falseAlarm
        ? { ...a, resolution: "QUAN_LY_XAC_NHAN_BAO_NHAM", confirmedBy: "Lê Quốc Bảo", reason: "Báo nhầm — model nhầm SKU",
            review: hash01(`${key}-rv`) < 0.5 ? "BAO_NHAM_THAT" : undefined }
        : { ...a, resolution: "DA_QUET_BO_SUNG" };
    });
    // Lines after fixing: missed items scanned in addition
    const final = new Map(scanned);
    alerts.filter((a) => a.resolution === "DA_QUET_BO_SUNG" && a.seenSku).forEach((a) => {
      final.set(a.seenSku!, (final.get(a.seenSku!) ?? 0) + a.qty);
      if (a.type === "NGHI_TRAO_MA" && a.scannedSku) final.set(a.scannedSku, final.get(a.scannedSku)! - a.qty);
    });
    const lines: TxLine[] = [...final].filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ skuId: id, qty, price: sku(id).price, source: "BARCODE" }));
    const at = new Date(now - Math.floor(hash01(`${key}-t`) * 7 * 24) * 3600_000 - i * 60_000);
    at.setHours(8 + Math.floor(hash01(`${key}-h`) * 13));
    out.push({
      id: `GD${String(1000 + i)}`, at: at.toISOString(), counterId: i % 3 === 0 ? "Q2" : "Q1",
      cashier: cashiers[i % 2], mode: i % 4 === 0 ? "FAST" : "VERIFY", trayId: t.id, modelVersion: "v4",
      lines, alerts, status: "DA_THANH_TOAN", payment: (["CASH", "CARD", "TRANSFER"] as const)[i % 3],
      total: lines.reduce((s, l) => s + l.qty * l.price, 0), corrections: i % 4 === 0 ? Math.floor(r * 3) : 0,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export const SEED_TRANSACTIONS = seedTransactions();
