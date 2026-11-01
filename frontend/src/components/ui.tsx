import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useStore, type LearnStatus, type VersionStatus } from "../app/store";
import type { BatchStatus, Job, Resolution, Review } from "../mocks/seed";

export function Badge({ tone = "", children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Card({ title, actions, children, className = "", bodyClass = "card-b" }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-h">
          <h3>{title}</h3>
          <div className="spacer" />
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-h">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      <div className="spacer" />
      <div className="row wrap">{actions}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, width }: {
  title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={width ? { width: `min(${width}px, 100%)` } : undefined}>
        <div className="modal-h">
          <h2>{title}</h2>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div className="strong">{title}</div>
      {children && <div className="small">{children}</div>}
    </div>
  );
}

export function Progress({ value, tone = "" }: { value: number; tone?: string }) {
  return <div className={`bar ${tone}`}><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <div className="demo-note"><span className="tag">Prototype</span><span>{children}</span></div>;
}

/** Logo: a barcode in a white tile. */
export function Brand() {
  return <span className="brand"><span className="brand-mark"><i /></span>HybridCheckout</span>;
}

/** Long tables show `step` rows at a time; returns the visible rows and the "show more" footer. */
export function useShowMore<T>(rows: T[], step = 20): [T[], ReactNode] {
  const [n, setN] = useState(step);
  const more = rows.length > n && (
    <div className="more">
      <button className="btn sm" onClick={() => setN(n + step)}>Xem thêm {Math.min(step, rows.length - n)}</button>
      <span className="small faint">Đang hiện {n}/{rows.length}</span>
    </div>
  );
  return [rows.slice(0, n), more];
}

/* Status badges: each status has a text label, the colour is only a second cue. */

const LEARN: Record<LearnStatus, [string, string]> = {
  LEARNED: ["ok", "Đã học"], LEARNING: ["info", "Đang học"], NOT_LEARNED: ["warn", "Chưa học"],
};
export const LearnBadge = ({ status }: { status: LearnStatus }) => <Badge tone={LEARN[status][0]}>{LEARN[status][1]}</Badge>;

const VERSION: Record<VersionStatus, [string, string]> = {
  ACTIVE: ["ok", "Đang chạy"], PENDING_REVIEW: ["info", "Chờ duyệt"], RETIRED: ["", "Đã thay thế"],
  REJECTED: ["danger", "Bị từ chối"], NOT_TRAINED: ["", "Chưa có"],
};
export const VersionBadge = ({ status }: { status: VersionStatus }) => <Badge tone={VERSION[status][0]}>{VERSION[status][1]}</Badge>;

export const BATCH_STEPS: { status: BatchStatus; label: string }[] = [
  { status: "DRAFT", label: "Tạo đợt" },
  { status: "COLLECTING", label: "Thu thập dữ liệu" },
  { status: "TRAINING", label: "Huấn luyện" },
  { status: "PENDING_REVIEW", label: "Chờ duyệt" },
  { status: "DEPLOYED", label: "Đã deploy" },
];
const BATCH: Record<BatchStatus, [string, string]> = {
  DRAFT: ["", "Nháp"], COLLECTING: ["info", "Thu thập dữ liệu"],
  TRAINING: ["warn", "Đang huấn luyện"], PENDING_REVIEW: ["primary", "Chờ duyệt"], DEPLOYED: ["ok", "Đã deploy"],
};
export const BatchBadge = ({ status }: { status: BatchStatus }) => <Badge tone={BATCH[status][0]}>{BATCH[status][1]}</Badge>;

const JOB: Record<Job["status"], [string, string]> = {
  QUEUED: ["", "Chờ"], RUNNING: ["warn", "Đang chạy"], EVALUATING: ["info", "Đang đánh giá"], SUCCEEDED: ["ok", "Xong"], FAILED: ["danger", "Lỗi"],
};
export const JobBadge = ({ status }: { status: Job["status"] }) => <Badge tone={JOB[status][0]}>{JOB[status][1]}</Badge>;

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  OPEN: "Đang mở", SCANNED: "Đã quét bổ sung", FALSE_ALARM: "Thu ngân báo nhầm", AUTO_CLOSED: "Tự đóng khi thanh toán",
};
export const REVIEW_LABEL: Record<Review, string> = {
  ALERT_CORRECT: "Cảnh báo đúng", MODEL_ERROR: "Báo nhầm thật", SUSPECTED_FRAUD: "Nghi gian lận",
};
