/**
 * Sample photos of the new SKU of batch 5, after background removal. The prototype uses product
 * crops of the composite sample trays (scripts/prepare_samples.py); each crop is one distinct cutout.
 */
import raw from "./generated/cutouts.json";
import { hash01 } from "../lib/format";

export interface Cutout {
  id: string;
  skuId: number;
  file: string;
  /** Mask quality reported by the background-removal model, 0..1. */
  quality: number;
}

export const CUTOUTS: Cutout[] = Object.entries(raw as Record<string, string[]>).flatMap(([skuId, files]) =>
  files.map((file, i) => ({ id: `${skuId}_${i}`, skuId: Number(skuId), file, quality: 0.72 + 0.27 * hash01(`cut-${skuId}-${i}`) })));

export const cutoutsOf = (skuId: number) => CUTOUTS.filter((c) => c.skuId === skuId);
