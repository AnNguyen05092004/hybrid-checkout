import type { ReactNode } from "react";
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
  return <div className="demo-note">{children}</div>;
}

/* Status badges: each status has a text label, the colour is only a second cue. */

const LEARN: Record<LearnStatus, [string, string]> = {
  DA_HOC: ["ok", "Đã học"], DANG_HOC: ["info", "Đang học"], CHUA_HOC: ["warn", "Chưa học"],
};
export const LearnBadge = ({ status }: { status: LearnStatus }) => <Badge tone={LEARN[status][0]}>{LEARN[status][1]}</Badge>;

const VERSION: Record<VersionStatus, [string, string]> = {
  ACTIVE: ["ok", "Đang chạy"], SAN_SANG: ["info", "Chờ duyệt"], DA_THAY_THE: ["", "Đã thay thế"],
  BI_TU_CHOI: ["danger", "Bị từ chối"], CHUA_CO: ["", "Chưa có"],
};
export const VersionBadge = ({ status }: { status: VersionStatus }) => <Badge tone={VERSION[status][0]}>{VERSION[status][1]}</Badge>;

export const BATCH_STEPS: { status: BatchStatus; label: string }[] = [
  { status: "NHAP", label: "Tạo đợt" },
  { status: "THU_THAP", label: "Thu thập dữ liệu" },
  { status: "DANG_HUAN_LUYEN", label: "Huấn luyện" },
  { status: "CHO_DUYET", label: "Chờ duyệt" },
  { status: "DA_DEPLOY", label: "Đã deploy" },
];
const BATCH: Record<BatchStatus, [string, string]> = {
  NHAP: ["", "Nháp"], THU_THAP: ["info", "Thu thập dữ liệu"],
  DANG_HUAN_LUYEN: ["warn", "Đang huấn luyện"], CHO_DUYET: ["primary", "Chờ duyệt"], DA_DEPLOY: ["ok", "Đã deploy"],
};
export const BatchBadge = ({ status }: { status: BatchStatus }) => <Badge tone={BATCH[status][0]}>{BATCH[status][1]}</Badge>;

const JOB: Record<Job["status"], [string, string]> = {
  CHO: ["", "Chờ"], DANG_CHAY: ["warn", "Đang chạy"], DANG_DANH_GIA: ["info", "Đang đánh giá"], XONG: ["ok", "Xong"], LOI: ["danger", "Lỗi"],
};
export const JobBadge = ({ status }: { status: Job["status"] }) => <Badge tone={JOB[status][0]}>{JOB[status][1]}</Badge>;

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  MO: "Đang mở", DA_QUET_BO_SUNG: "Đã quét bổ sung", BAO_NHAM: "Thu ngân báo nhầm", TU_DONG: "Tự đóng (mức thấp)",
};
export const REVIEW_LABEL: Record<Review, string> = {
  XAC_NHAN_DUNG: "Cảnh báo đúng", BAO_NHAM_THAT: "Báo nhầm thật", NGHI_GIAN_LAN: "Nghi gian lận",
};
