/**
 * Sample trays (RPC synthetic v2 sample, copied by scripts/prepare_samples.py) and a simulated
 * detector. The simulation follows the real model's behaviour: learned SKU are found with high
 * confidence (a few uncertain), SKU the active model has not learned are either missed or taken for
 * a learned SKU of the same category with a middling score.
 */
import raw from "./generated/samples.json";
import { hash01 } from "../lib/format";
import type { Box, Detection } from "../lib/reconcile";
import { SKUS, sku } from "./catalog";

export interface TrayObject {
  rpcId: number;
  skuTask: number;
  labeled: boolean;
  box: Box;
}

export interface Tray {
  id: string;
  file: string;
  task: number;
  level: "easy" | "medium" | "hard";
  objects: TrayObject[];
}

export const TRAYS = raw as Tray[];
export const tray = (id: string) => TRAYS.find((t) => t.id === id)!;

export const LEVEL_LABEL = { easy: "Dễ", medium: "Vừa", hard: "Khó" } as const;

/** Detections of the model that has learned batches 1..activeBatch. */
export function detect(t: Tray, activeBatch: number): Detection[] {
  const out: Detection[] = [];
  t.objects.forEach((o, i) => {
    const key = `${t.id}-${i}`;
    const h = hash01(key);
    if (o.skuTask <= activeBatch) {
      const uncertain = hash01(`${key}-u`) < 0.12;
      out.push({ id: key, skuId: o.rpcId, box: o.box, score: uncertain ? 0.55 + 0.2 * h : 0.82 + 0.17 * h });
      return;
    }
    if (h < 0.5) return; // not found at all
    const cat = sku(o.rpcId).category;
    const learnedSameCat = SKUS.filter((s) => s.category === cat && s.task <= activeBatch);
    const guess = learnedSameCat[Math.floor(hash01(`${key}-g`) * learnedSameCat.length)];
    if (guess) out.push({ id: key, skuId: guess.id, box: o.box, score: 0.52 + 0.1 * hash01(`${key}-s`) });
  });
  return out;
}
