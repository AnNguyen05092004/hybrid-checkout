import { Check } from "lucide-react";
import type { Mode } from "../useCheckout";

const STEPS: Record<Mode, string[]> = {
  VERIFY: ["Quét mã từng món", "Kiểm tra khay", "Thanh toán"],
  FAST: ["Nhận diện khay", "Quét món cần xác nhận", "Thanh toán"],
};

/** The three steps of a checkout; the current one is highlighted so the next action is obvious. */
export function StepBar({ mode, step }: { mode: Mode; step: number }) {
  return (
    <ol className="stepbar" aria-label="Các bước thanh toán">
      {STEPS[mode].map((label, i) => (
        <li key={label} className={i < step ? "done" : i === step ? "cur" : ""} aria-current={i === step ? "step" : undefined}>
          <span className="n">{i < step ? <Check size={14} /> : i + 1}</span>{label}
        </li>
      ))}
    </ol>
  );
}
