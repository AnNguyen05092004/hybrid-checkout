import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, SkipForward, Trash2, Wand2, X } from "lucide-react";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, Modal } from "../../components/ui";
import { TrayViewer, type TrayBox } from "../../components/TrayViewer";
import type { Box } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import { LEVEL_LABEL, detect, tray as getTray } from "../../mocks/trays";

type ProposalState = "pending" | "accepted" | "rejected";
interface Drawn { id: string; box: Box; skuId: number }

const BULK_THRESHOLD = 0.7;

/** L01 — Labelling assistant (UC17, US17): the model proposes old-SKU boxes, people draw new-SKU boxes. */
export function LabelingPage() {
  const { id } = useParams();
  const { labelQueue, labeledTrays, saveLabels, activeBatch, toast } = useStore();
  const navigate = useNavigate();
  const queue = labelQueue.filter((t) => !labeledTrays.includes(t));
  const trayId = queue[0];
  const done = labelQueue.length - queue.length;

  const [states, setStates] = useState<Record<string, ProposalState>>({});
  const [drawn, setDrawn] = useState<Drawn[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [warn, setWarn] = useState<string[] | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [stats, setStats] = useState({ proposals: 0, untouched: 0, images: 0 });
  const saveRef = useRef<() => void>(() => {});

  const t = trayId ? getTray(trayId) : null;
  const proposals = useMemo(() => (t ? detect(t, activeBatch).filter((d) => d.score >= 0.3) : []), [t, activeBatch]);
  // Hint from the barcodes of the transaction this tray came from: new SKU and how many.
  const hints = useMemo(() => {
    const m = new Map<number, number>();
    t?.objects.filter((o) => o.skuTask > activeBatch).forEach((o) => m.set(o.rpcId, (m.get(o.rpcId) ?? 0) + 1));
    return [...m];
  }, [t, activeBatch]);

  useEffect(() => {
    setStates({}); setDrawn([]); setSelected(null); setCurrent(hints[0]?.[0] ?? null);
  }, [trayId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "Enter" && tag !== "INPUT" && tag !== "BUTTON" && tag !== "SELECT") {
        saveRef.current();
        return;
      }
      if (tag === "INPUT" || !selected) {
        const n = Number(e.key);
        if (n >= 1 && n <= hints.length) setCurrent(hints[n - 1][0]);
        return;
      }
      if (e.key === "a" || e.key === "A") setStates((s) => ({ ...s, [selected]: "accepted" }));
      if (e.key === "Delete" || e.key === "Backspace") {
        if (drawn.some((d) => d.id === selected)) setDrawn((ds) => ds.filter((d) => d.id !== selected));
        else setStates((s) => ({ ...s, [selected]: "rejected" }));
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, hints, drawn]);

  if (!t) {
    return (
      <Card>
        <Empty icon={<CheckCheck size={32} color="var(--ok)" />} title="Đã gán nhãn hết hàng đợi của phiên này">
          <Link to={`/batches/${id}`}>Về chi tiết đợt để gửi huấn luyện</Link>
        </Empty>
      </Card>
    );
  }

  const state = (pid: string) => states[pid] ?? "pending";
  const pending = proposals.filter((p) => state(p.id) === "pending");
  const drawnCount = (skuId: number) => drawn.filter((d) => d.skuId === skuId).length;

  const boxes: TrayBox[] = [
    ...proposals.filter((p) => state(p.id) !== "rejected").map((p) => ({
      id: p.id, box: p.box, kind: "proposal" as const, dashed: state(p.id) === "pending",
      label: `${state(p.id) === "accepted" ? "✓" : "?"} ${sku(p.skuId).name} ${p.score.toFixed(2)}`,
    })),
    ...drawn.map((d) => ({ id: d.id, box: d.box, kind: "drawn" as const, label: `✎ ${sku(d.skuId).name}` })),
  ];

  const save = (force = false) => {
    const problems: string[] = [];
    if (pending.length) problems.push(`Còn ${pending.length} box đề xuất chưa duyệt (sẽ bị bỏ).`);
    hints.forEach(([skuId, n]) => {
      if (drawnCount(skuId) !== n) problems.push(`${sku(skuId).name}: mã vạch có ${n} món, đã vẽ ${drawnCount(skuId)} box.`);
    });
    if (problems.length && !force) return setWarn(problems);
    const counts: Record<number, number> = {};
    drawn.forEach((d) => (counts[d.skuId] = (counts[d.skuId] ?? 0) + 1));
    saveLabels(t.id, counts);
    setStats((s) => ({
      proposals: s.proposals + proposals.length,
      untouched: s.untouched + proposals.filter((p) => state(p.id) === "accepted").length,
      images: s.images + 1,
    }));
    setWarn(null);
    toast(`Đã lưu nhãn khay ${t.id}.`);
  };

  saveRef.current = () => save();

  return (
    <>
      <div className="row wrap">
        <button className="btn" onClick={() => navigate(`/batches/${id}`)}><ArrowLeft size={16} /> Đợt {id}</button>
        <h2>Gán nhãn có trợ lý</h2>
        <Badge>Ảnh {done + 1}/{labelQueue.length}</Badge>
        <Badge>Khay {t.id} · {LEVEL_LABEL[t.level]} · {t.objects.length} món</Badge>
        <div className="spacer" />
        <button className="btn" onClick={() => setSkipping(true)}><SkipForward size={16} /> Bỏ qua ảnh</button>
        <button className="btn primary" onClick={() => save()}><Check size={16} /> Lưu & ảnh tiếp</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "260px minmax(0, 1fr) 300px", alignItems: "start" }}>
        <div className="col" style={{ gap: 12 }}>
          <Card title="SKU mới cần vẽ">
            <div className="col" style={{ gap: 6 }}>
              <p className="small muted">Theo mã vạch của giao dịch chứa khay này. Chọn SKU rồi kéo chuột trên ảnh để vẽ box.</p>
              {hints.length === 0 && <span className="small faint">Khay không có SKU mới.</span>}
              {hints.map(([skuId, n], i) => (
                <button key={skuId} className={`alert-card ${current === skuId ? "on" : ""} ${drawnCount(skuId) === n ? "" : "medium"}`} style={{ textAlign: "left" }} onClick={() => setCurrent(skuId)}>
                  <span className="row"><kbd className="small faint">{i + 1}</kbd><span className="strong" style={{ flex: 1 }}>{sku(skuId).name}</span>
                    <Badge tone={drawnCount(skuId) === n ? "ok" : "warn"}>{drawnCount(skuId)}/{n}</Badge></span>
                </button>
              ))}
              <button className="btn sm ghost" title="Chỉ có trong prototype" onClick={() => setDrawn(t.objects.filter((o) => o.skuTask > activeBatch).map((o, i) => ({ id: `d-${i}`, box: o.box, skuId: o.rpcId })))}>
                <Wand2 size={14} /> Điền box mẫu (demo)
              </button>
            </div>
          </Card>
          <Card title="Phím tắt">
            <div className="col small muted" style={{ gap: 4 }}>
              <span><kbd>1</kbd>–<kbd>9</kbd> chọn SKU mới</span>
              <span><kbd>A</kbd> chấp nhận box đang chọn</span>
              <span><kbd>Del</kbd> xóa/từ chối box đang chọn</span>
              <span><kbd>Enter</kbd> lưu và sang ảnh tiếp</span>
              <span>Kéo chuột trên ảnh: vẽ box</span>
            </div>
          </Card>
        </div>

        <div className="col" style={{ gap: 8 }}>
          <TrayViewer src={t.file} boxes={boxes} selected={selected}
            onDraw={current !== null ? (box) => setDrawn((ds) => [...ds, { id: `d-${Date.now()}`, box, skuId: current }]) : undefined} />
          <div className="row small muted wrap">
            <span className="row"><i style={{ width: 14, height: 0, borderTop: "3px dashed var(--box-proposal)" }} /> Đề xuất SKU cũ, chờ duyệt</span>
            <span className="row"><i style={{ width: 14, height: 0, borderTop: "3px solid var(--box-proposal)" }} /> Đề xuất đã chấp nhận</span>
            <span className="row"><i style={{ width: 14, height: 0, borderTop: "3px solid var(--box-drawn)" }} /> Box SKU mới vẽ tay</span>
            {current === null && <span style={{ color: "var(--warn)" }}>Chọn một SKU mới để vẽ.</span>}
          </div>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <Card title="Box trên ảnh" actions={<button className="btn sm" disabled={!pending.some((p) => p.score >= BULK_THRESHOLD)}
            onClick={() => setStates((s) => ({ ...s, ...Object.fromEntries(pending.filter((p) => p.score >= BULK_THRESHOLD).map((p) => [p.id, "accepted"])) }))}>
            <CheckCheck size={14} /> Chấp nhận ≥ {BULK_THRESHOLD}</button>} bodyClass="">
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              {proposals.map((p) => (
                <div key={p.id} className="line" style={{ gridTemplateColumns: "1fr auto", background: selected === p.id ? "var(--primary-soft)" : undefined, cursor: "pointer" }} onClick={() => setSelected(p.id)}>
                  <span>
                    <div className="small strong">{sku(p.skuId).name}</div>
                    <div className="row small faint" style={{ gap: 6 }}>Đề xuất · {p.score.toFixed(2)}
                      {state(p.id) === "accepted" && <Badge tone="ok">Chấp nhận</Badge>}
                      {state(p.id) === "rejected" && <Badge tone="danger">Từ chối</Badge>}
                      {p.score < BULK_THRESHOLD && state(p.id) === "pending" && <Badge tone="warn">Cần xem kỹ</Badge>}
                    </div>
                  </span>
                  <span className="row" onClick={(e) => e.stopPropagation()}>
                    <button className="btn sm ghost" aria-label="Chấp nhận" onClick={() => setStates({ ...states, [p.id]: "accepted" })}><Check size={14} /></button>
                    <button className="btn sm ghost" aria-label="Từ chối" onClick={() => setStates({ ...states, [p.id]: "rejected" })}><X size={14} /></button>
                  </span>
                </div>
              ))}
              {drawn.map((d) => (
                <div key={d.id} className="line" style={{ gridTemplateColumns: "1fr auto", background: selected === d.id ? "var(--primary-soft)" : undefined }} onClick={() => setSelected(d.id)}>
                  <span><div className="small strong">{sku(d.skuId).name}</div><div className="small faint">Vẽ tay · SKU mới</div></span>
                  <button className="btn sm ghost" aria-label="Xóa box" onClick={() => setDrawn(drawn.filter((x) => x !== d))}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Thống kê phiên">
            <div className="col small" style={{ gap: 6 }}>
              <div className="row"><span className="muted">Ảnh đã gán trong phiên</span><span className="spacer" />{stats.images}</div>
              <div className="row"><span className="muted">Đề xuất được chấp nhận</span><span className="spacer" />{stats.proposals ? `${Math.round((stats.untouched / stats.proposals) * 100)}%` : "—"}</div>
              <p className="faint">Đề xuất đến từ model đang chạy (v{activeBatch}). Box đề xuất sai thường nằm trên SKU mới: model chưa học nên đoán thành một SKU cũ cùng nhóm.</p>
            </div>
          </Card>
        </div>
      </div>

      {warn && (
        <Modal title="Kiểm tra trước khi lưu" onClose={() => setWarn(null)} footer={<>
          <button className="btn" onClick={() => setWarn(null)}>Sửa tiếp</button>
          <button className="btn primary" onClick={() => save(true)}>Vẫn lưu</button>
        </>}>
          <ul style={{ margin: 0, paddingLeft: 18 }} className="col">{warn.map((w) => <li key={w}>{w}</li>)}</ul>
        </Modal>
      )}
      {skipping && (
        <Modal title="Bỏ qua ảnh" onClose={() => setSkipping(false)} footer={<button className="btn primary" onClick={() => { saveLabels(t.id, {}); setSkipping(false); toast("Đã bỏ qua ảnh."); }}>Bỏ qua</button>}>
          <label className="field"><span>Lý do</span>
            <select className="select"><option>Ảnh mờ</option><option>Khay bị che</option><option>Không có SKU mới</option></select>
          </label>
        </Modal>
      )}
    </>
  );
}
