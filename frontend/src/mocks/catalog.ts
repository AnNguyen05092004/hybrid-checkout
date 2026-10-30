/**
 * Mock SKU catalog built from the model's batch split (generated/skus.json): 200 RPC SKU in 17 categories,
 * task 1 = 100 SKU, tasks 2-5 = 25 SKU each. RPC has no names, prices or barcodes, so they are
 * invented here: barcodes use the GS1 in-store prefix 200 so they can never match a real product.
 */
import raw from "./generated/skus.json";
import { hash01 } from "../lib/format";

export const CATEGORIES: Record<string, { name: string; basePrice: number }> = {
  puffed_food: { name: "Snack", basePrice: 15000 },
  dried_fruit: { name: "Trái cây sấy", basePrice: 45000 },
  dried_food: { name: "Đồ khô", basePrice: 35000 },
  instant_drink: { name: "Đồ uống pha", basePrice: 60000 },
  instant_noodles: { name: "Mì ăn liền", basePrice: 8000 },
  dessert: { name: "Bánh ngọt", basePrice: 25000 },
  drink: { name: "Nước giải khát", basePrice: 12000 },
  alcohol: { name: "Đồ uống có cồn", basePrice: 120000 },
  milk: { name: "Sữa", basePrice: 30000 },
  canned_food: { name: "Đồ hộp", basePrice: 40000 },
  chocolate: { name: "Sô-cô-la", basePrice: 50000 },
  gum: { name: "Kẹo cao su", basePrice: 10000 },
  candy: { name: "Kẹo", basePrice: 20000 },
  seasoner: { name: "Gia vị", basePrice: 18000 },
  personal_hygiene: { name: "Chăm sóc cá nhân", basePrice: 55000 },
  tissue: { name: "Khăn giấy", basePrice: 22000 },
  stationery: { name: "Văn phòng phẩm", basePrice: 15000 },
};

export interface Sku {
  id: number; // RPC category id, also the SKU id in the prototype
  modelLabel: number; // label index used by the recognition model
  task: number; // import batch (= continual-learning task) that brings this SKU
  category: string;
  categoryName: string;
  name: string;
  barcode: string;
  price: number;
  selling: boolean;
}

function ean13(body12: string): string {
  const sum = [...body12].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return body12 + ((10 - (sum % 10)) % 10);
}

export const SKUS: Sku[] = (raw as { rpcId: number; label: number; category: string; task: number }[]).map((r) => {
  const cat = CATEGORIES[r.category];
  const factor = 0.7 + hash01(`price-${r.rpcId}`) * 0.8;
  return {
    id: r.rpcId,
    modelLabel: r.label,
    task: r.task,
    category: r.category,
    categoryName: cat.name,
    name: `${cat.name} ${String(r.rpcId).padStart(3, "0")}`,
    barcode: ean13(`200${String(r.rpcId).padStart(9, "0")}`),
    price: Math.round((cat.basePrice * factor) / 500) * 500,
    selling: true,
  };
});

export const SKU_BY_ID = new Map(SKUS.map((s) => [s.id, s]));
export const SKU_BY_BARCODE = new Map(SKUS.map((s) => [s.barcode, s]));
export const SKU_BY_LABEL = new Map(SKUS.map((s) => [s.modelLabel, s]));
export const sku = (id: number) => SKU_BY_ID.get(id)!;
