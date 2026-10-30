import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Box } from "../lib/reconcile";

export type BoxKind = "match" | "alert" | "review" | "uncertain" | "proposal" | "drawn" | "auto";

export interface TrayBox {
  id: string;
  box: Box;
  kind: BoxKind;
  label: string;
  dashed?: boolean;
  /** Box that needs no attention: its label shows only when all labels are on or it is selected. */
  quiet?: boolean;
}

const COLOR: Record<BoxKind, string> = {
  match: "var(--box-match)",
  auto: "var(--box-match)",
  alert: "var(--box-alert)",
  review: "var(--box-review)",
  uncertain: "#94a3b8",
  proposal: "var(--box-proposal)",
  drawn: "var(--box-drawn)",
};

/**
 * Tray image with its boxes. Each box has a text label so colour is never the only cue; labels of
 * quiet boxes are hidden unless `showLabels` is "all", to keep busy trays readable.
 * With `onDraw`, dragging on the image draws a new box (labelling screen).
 */
export function TrayViewer({ src, boxes, selected, onSelect, focus, showLabels = "all", onDraw, placeholder }: {
  src?: string;
  boxes: TrayBox[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  focus?: string[];
  showLabels?: "all" | "important";
  onDraw?: (box: Box) => void;
  placeholder?: ReactNode;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  if (!src) {
    return <div className="tray" style={{ aspectRatio: "1 / 1", display: "grid", placeItems: "center", color: "#cbd5e1" }}>{placeholder}</div>;
  }

  const point = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const dim = focus && focus.length > 0;

  return (
    <div className="tray">
      <img src={`/${src}`} alt="Ảnh khay chụp từ trên xuống" />
      <svg
        ref={ref}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={{ cursor: onDraw ? "crosshair" : "default" }}
        onPointerDown={onDraw ? (e) => {
          const p = point(e);
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
        } : undefined}
        onPointerMove={onDraw && draft ? (e) => { const p = point(e); setDraft({ ...draft, x1: p.x, y1: p.y }); } : undefined}
        onPointerUp={onDraw && draft ? () => {
          const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
          const w = Math.abs(draft.x1 - draft.x0), h = Math.abs(draft.y1 - draft.y0);
          setDraft(null);
          if (w > 0.02 && h > 0.02) onDraw([x, y, w, h]);
        } : undefined}
      >
        {/* Two passes: every outline first, then every label, so no outline covers a label. */}
        {boxes.map((b) => {
          const [x, y, w, h] = b.box.map((v) => v * 1000);
          const on = selected === b.id || focus?.includes(b.id);
          return (
            <rect key={b.id} x={x} y={y} width={w} height={h} opacity={dim && !focus!.includes(b.id) ? 0.25 : 1}
              fill={on ? "rgb(255 255 255 / 12%)" : "transparent"} stroke={COLOR[b.kind]} strokeWidth={on ? 7 : 4}
              strokeDasharray={b.dashed ? "14 9" : undefined} vectorEffect="non-scaling-stroke"
              onClick={onSelect && !onDraw ? () => onSelect(b.id) : undefined} style={{ cursor: onSelect ? "pointer" : undefined }} />
          );
        })}
        {boxes.map((b) => {
          const [x, y, w] = b.box.map((v) => v * 1000);
          const on = selected === b.id || focus?.includes(b.id);
          if (!(showLabels === "all" || !b.quiet || on)) return null;
          return (
            <foreignObject key={b.id} x={x} y={Math.max(0, y - 38)} width={Math.max(w, 320)} height={38}
              opacity={dim && !focus!.includes(b.id) ? 0.25 : 1} style={{ pointerEvents: "none" }}>
              <div className="boxlabel" style={{ display: "inline-block", background: COLOR[b.kind], color: "#fff", padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>
                {b.label}
              </div>
            </foreignObject>
          );
        })}
        {draft && (
          <rect x={Math.min(draft.x0, draft.x1) * 1000} y={Math.min(draft.y0, draft.y1) * 1000}
            width={Math.abs(draft.x1 - draft.x0) * 1000} height={Math.abs(draft.y1 - draft.y0) * 1000}
            fill="rgb(162 28 175 / 15%)" stroke="var(--box-drawn)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}
