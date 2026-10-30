/**
 * In-memory demo state shared by all screens. Stands in for the backend until the API exists
 * (step 6); every action here maps to a future API call.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SKUS, type Sku } from "../mocks/catalog";
import { MODEL_VERSIONS } from "../mocks/models";
import {
  COUNTERS, PAST_AUDIT, PAST_BATCHES, PAST_JOBS, SEED_TRANSACTIONS, USERS,
  type AuditEntry, type Batch, type Job, type Transaction, type User,
} from "../mocks/seed";
import { TRAYS } from "../mocks/trays";

export type LearnStatus = "DA_HOC" | "DANG_HOC" | "CHUA_HOC";
export type VersionStatus = "ACTIVE" | "SAN_SANG" | "DA_THAY_THE" | "BI_TU_CHOI" | "CHUA_CO";

export interface Thresholds {
  alert: number;
  auto: number;
  low: number;
}

export interface Shift {
  counterId: string;
  openedAt: string;
  openingCash: number;
}

/** Approved box counts per new SKU of batch 5 before this session (labelled in earlier sessions). */
const BATCH5_QUEUE = TRAYS.filter((t) => t.task === 5).map((t) => t.id);
function initialApproved(): Record<number, number> {
  const inQueue = new Map<number, number>();
  TRAYS.filter((t) => t.task === 5).forEach((t) =>
    t.objects.filter((o) => o.labeled).forEach((o) => inQueue.set(o.rpcId, (inQueue.get(o.rpcId) ?? 0) + 1)));
  return Object.fromEntries(
    SKUS.filter((s) => s.task === 5).map((s) => [s.id, inQueue.has(s.id) ? 21 - inQueue.get(s.id)! : 20 + (s.id % 9)]));
}

interface Store {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;

  skus: Sku[];
  addSku: (s: Omit<Sku, "id" | "modelLabel" | "task" | "selling">) => void;
  updateSku: (id: number, patch: Partial<Sku>) => void;
  learnStatus: (s: Sku) => LearnStatus;
  isLearned: (skuId: number) => boolean;

  activeBatch: number;
  versionStatus: Record<string, VersionStatus>;
  versionCreatedAt: Record<string, string>;
  deploy: (versionId: string, reason?: string) => void;
  rollback: () => void;
  reject: (versionId: string) => void;

  batches: Batch[];
  createBatch: (name: string, skuIds: number[]) => void;
  labelQueue: string[];
  labeledTrays: string[];
  approved: Record<number, number>;
  valImages: number;
  saveLabels: (trayId: string, counts: Record<number, number>) => void;
  startTraining: (batchId: number) => void;
  jobs: Job[];

  thresholds: Record<number, Thresholds>;
  setThresholds: (t: Record<number, Thresholds>) => void;

  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  updateTransaction: (id: string, patch: (t: Transaction) => Transaction) => void;

  shift: Shift | null;
  openShift: (s: Shift) => void;
  closeShift: () => void;

  users: User[];
  setUsers: (u: User[]) => void;
  counters: typeof COUNTERS;
  audit: AuditEntry[];
  log: (action: string, target: string, detail: string) => void;
  retention: { txDays: number; batchDays: number };
  setRetention: (r: { txDays: number; batchDays: number }) => void;

  toasts: { id: number; text: string }[];
  toast: (text: string) => void;
}

const Ctx = createContext<Store | null>(null);

const DEFAULT_THRESHOLDS: Record<number, Thresholds> = Object.fromEntries(
  [1, 2, 3, 4, 5].map((b) => [b, { alert: 0.5, auto: 0.8, low: 0.3 }]));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("hc-user") ?? "null");
    } catch {
      return null;
    }
  });
  const [skus, setSkus] = useState<Sku[]>(SKUS);
  const [activeBatch, setActiveBatch] = useState(4);
  const [versionStatus, setVersionStatus] = useState<Record<string, VersionStatus>>({
    v1: "DA_THAY_THE", v2: "DA_THAY_THE", v3: "DA_THAY_THE", v4: "ACTIVE", v5: "CHUA_CO",
  });
  const [versionCreatedAt, setVersionCreatedAt] = useState<Record<string, string>>(
    Object.fromEntries(MODEL_VERSIONS.map((v) => [v.id, v.createdAt])));
  const [batches, setBatches] = useState<Batch[]>(PAST_BATCHES);
  const [labeledTrays, setLabeledTrays] = useState<string[]>([]);
  const [approved, setApproved] = useState<Record<number, number>>(initialApproved);
  const [valImages, setValImages] = useState(48);
  const [jobs, setJobs] = useState<Job[]>(PAST_JOBS);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS);
  const [shift, setShift] = useState<Shift | null>(null);
  const [users, setUsers] = useState(USERS);
  const [audit, setAudit] = useState<AuditEntry[]>(PAST_AUDIT);
  const [retention, setRetention] = useState({ txDays: 30, batchDays: 14 });
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const log = useCallback((action: string, target: string, detail: string) => {
    setAudit((a) => [{ at: new Date().toISOString(), user: user?.name ?? "Hệ thống", action, target, detail }, ...a]);
  }, [user]);

  const setBatchStatus = (id: number, status: Batch["status"], extra: Partial<Batch> = {}) =>
    setBatches((bs) => bs.map((b) => (b.id === id ? { ...b, status, ...extra } : b)));

  // Simulated training job: 16 epochs, then evaluation, then a new model version ready for review.
  useEffect(() => {
    const running = jobs.find((j) => j.status === "DANG_CHAY" || j.status === "DANG_DANH_GIA");
    if (!running) return;
    const timer = setTimeout(() => {
      setJobs((js) => js.map((j) => {
        if (j.id !== running.id) return j;
        if (j.status === "DANG_CHAY" && j.epoch < j.epochs) {
          return { ...j, epoch: j.epoch + 1, gpuHours: +(j.gpuHours + 5.9 / 16).toFixed(2), log: [...j.log, `Epoch ${j.epoch + 1}/${j.epochs} xong`] };
        }
        if (j.status === "DANG_CHAY") return { ...j, status: "DANG_DANH_GIA", log: [...j.log, "Đánh giá trên tập val của các đợt 1–5"] };
        return { ...j, status: "XONG", finishedAt: new Date().toISOString(), log: [...j.log, "Đăng ký phiên bản v5 — chờ duyệt"] };
      }));
      if (running.status === "DANG_DANH_GIA") {
        setVersionStatus((v) => ({ ...v, v5: "SAN_SANG" }));
        setVersionCreatedAt((v) => ({ ...v, v5: new Date().toISOString() }));
        setBatchStatus(running.batch, "CHO_DUYET");
        toast("Job huấn luyện đợt 5 đã xong: phiên bản v5 chờ duyệt.");
      }
    }, running.status === "DANG_CHAY" ? 450 : 1200);
    return () => clearTimeout(timer);
  }, [jobs, toast]);

  const store: Store = {
    user,
    login: (u) => {
      setUser(u);
      sessionStorage.setItem("hc-user", JSON.stringify(u));
    },
    logout: () => {
      setUser(null);
      sessionStorage.removeItem("hc-user");
    },

    skus,
    addSku: (s) => {
      const id = Math.max(...skus.map((x) => x.id)) + 1;
      setSkus((all) => [...all, { ...s, id, modelLabel: -1, task: 0, selling: true }]);
      log("CREATE_SKU", s.name, `Thêm SKU mới, mã ${s.barcode}`);
    },
    updateSku: (id, patch) => setSkus((all) => all.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    learnStatus: (s) => (s.task === 0 ? "CHUA_HOC" : s.task <= activeBatch ? "DA_HOC" : "DANG_HOC"),
    isLearned: (id) => {
      const s = skus.find((x) => x.id === id);
      return !!s && s.task > 0 && s.task <= activeBatch;
    },

    activeBatch,
    versionStatus,
    versionCreatedAt,
    deploy: (vid, reason) => {
      const v = MODEL_VERSIONS.find((m) => m.id === vid)!;
      setVersionStatus((st) => ({ ...st, [`v${activeBatch}`]: "DA_THAY_THE", [vid]: "ACTIVE" }));
      setActiveBatch(v.batch);
      setBatchStatus(v.batch, "DA_DEPLOY", { deployedAt: new Date().toISOString() });
      log("DEPLOY_MODEL", vid, reason ? `Deploy ${v.name}, override: ${reason}` : `Deploy ${v.name}, đạt cổng duyệt`);
      toast(`Đã deploy ${v.name}. Quầy dùng model mới, ${v.skuCount} SKU được camera kiểm tra.`);
    },
    rollback: () => {
      const cur = `v${activeBatch}`;
      setVersionStatus((st) => ({ ...st, [cur]: "SAN_SANG", [`v${activeBatch - 1}`]: "ACTIVE" }));
      setBatchStatus(activeBatch, "CHO_DUYET", { deployedAt: undefined });
      setActiveBatch(activeBatch - 1);
      log("ROLLBACK_MODEL", cur, `Rollback ${cur} → v${activeBatch - 1}`);
      toast(`Đã rollback về v${activeBatch - 1}. SKU của đợt ${activeBatch} quay về chưa học.`);
    },
    reject: (vid) => {
      setVersionStatus((st) => ({ ...st, [vid]: "BI_TU_CHOI" }));
      log("REJECT_MODEL", vid, "Từ chối phiên bản");
    },

    batches,
    createBatch: (name, skuIds) => {
      const id = Math.max(...batches.map((b) => b.id)) + 1;
      setBatches((bs) => [...bs, { id, name, status: "NHAP", createdAt: new Date().toISOString(), createdBy: user?.name ?? "" }]);
      setSkus((all) => all.map((s) => (skuIds.includes(s.id) ? { ...s, task: id } : s)));
      log("CREATE_BATCH", `Đợt ${id}`, `Tạo đợt "${name}" với ${skuIds.length} SKU`);
      toast(`Đã tạo đợt ${id}.`);
    },
    labelQueue: BATCH5_QUEUE,
    labeledTrays,
    approved,
    valImages,
    saveLabels: (trayId, counts) => {
      if (labeledTrays.includes(trayId)) return;
      setLabeledTrays((l) => [...l, trayId]);
      setApproved((a) => {
        const next = { ...a };
        Object.entries(counts).forEach(([id, n]) => (next[+id] = (next[+id] ?? 0) + n));
        return next;
      });
      setValImages((n) => n + 1);
    },
    startTraining: (batchId) => {
      setBatchStatus(batchId, "DANG_HUAN_LUYEN");
      setJobs((js) => [{
        id: `JOB-${batchId}0${batchId}`, batch: batchId, type: "TRAIN", status: "DANG_CHAY", epoch: 0, epochs: 16,
        gpuHours: 0, startedAt: new Date().toISOString(),
        log: ["Mô phỏng: dùng checkpoint có sẵn của đợt 5", "Khởi động trên GPU"],
      }, ...js]);
      log("START_TRAINING", `Đợt ${batchId}`, "Gửi huấn luyện đợt");
      toast(`Đã gửi huấn luyện đợt ${batchId}.`);
    },
    jobs,

    thresholds,
    setThresholds: (t) => {
      setThresholds(t);
      log("UPDATE_THRESHOLDS", "Ngưỡng", "Cập nhật ngưỡng nhận diện");
      toast("Đã lưu cấu hình ngưỡng mới.");
    },

    transactions,
    addTransaction: (t) => setTransactions((all) => [t, ...all]),
    updateTransaction: (id, patch) => setTransactions((all) => all.map((t) => (t.id === id ? patch(t) : t))),

    shift,
    openShift: (s) => {
      setShift(s);
      log("OPEN_SHIFT", s.counterId, `Mở ca, tiền đầu ca ${s.openingCash}`);
    },
    closeShift: () => {
      log("CLOSE_SHIFT", shift?.counterId ?? "", "Đóng ca");
      setShift(null);
    },

    users,
    setUsers,
    counters: COUNTERS,
    audit,
    log,
    retention,
    setRetention,

    toasts,
    toast,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
