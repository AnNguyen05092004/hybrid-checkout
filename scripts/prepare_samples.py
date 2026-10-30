"""Copy a few RPC tray images and the SKU list from the model repo into the UI prototype.

Reads (never writes) the model repo:
  configs/tasks_100-4x25_seed0.json             -> which SKU belongs to which task
  data/synth_v2_sample_v1/annotations/task_*.json -> boxes of the sample tray images

Writes:
  frontend/src/mocks/generated/skus.json     200 SKU (rpc id, category, task)
  frontend/src/mocks/generated/samples.json  chosen trays, boxes normalised to 0..1
  frontend/public/samples/*.jpg              trays resized to 960 px (gitignored, CC BY-NC-SA 4.0)

Usage:
  python3 scripts/prepare_samples.py --model-repo <path to the model repo>
Resizing uses `sips` (built into macOS).
"""

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIZE = 960
# (task, level, how many) per tray picked; trays of tasks 1-4 hold only learned SKUs in the demo,
# trays of task 5 hold the new SKUs of the batch being labelled.
PICKS = [(1, "easy", 2), (1, "medium", 1), (2, "medium", 1), (3, "easy", 1), (4, "medium", 1),
         (5, "easy", 2), (5, "medium", 2)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-repo", required=True, type=Path)
    args = parser.parse_args()

    config = json.loads((args.model_repo / "configs/tasks_100-4x25_seed0.json").read_text())
    skus = [
        {"rpcId": c["rpc_category_id"], "label": c["label"], "category": c["supercategory"],
         "task": t["task_id"]}
        for t in config["tasks"] if not t["reserved"] for c in t["classes"]
    ]
    task_of = {s["rpcId"]: s["task"] for s in skus}

    sample_dir = args.model_repo / "data/synth_v2_sample_v1"
    out_images = ROOT / "frontend/public/samples"
    out_images.mkdir(parents=True, exist_ok=True)
    samples = []
    for task, level, count in PICKS:
        ann = json.loads((sample_dir / f"annotations/task_{task}.json").read_text())
        boxes_of = {}
        for a in ann["annotations"]:
            boxes_of.setdefault(a["image_id"], []).append(a)
        images = sorted((i for i in ann["images"] if i["level"] == level), key=lambda i: i["id"])
        taken = sum(1 for s in samples if s["task"] == task and s["level"] == level)
        for image in images[taken:taken + count]:
            name = f"{image['id']}.jpg"
            subprocess.run(["sips", "-Z", str(SIZE), str(sample_dir / image["file_name"]),
                            "--out", str(out_images / name)], check=True, capture_output=True)
            w, h = image["width"], image["height"]
            samples.append({
                "id": str(image["id"]), "file": f"samples/{name}", "task": task, "level": level,
                "objects": [
                    {"rpcId": a["category_id"], "skuTask": task_of[a["category_id"]],
                     "labeled": a["labeled"],
                     "box": [round(a["bbox"][0] / w, 4), round(a["bbox"][1] / h, 4),
                             round(a["bbox"][2] / w, 4), round(a["bbox"][3] / h, 4)]}
                    for a in boxes_of[image["id"]]
                ],
            })

    out_data = ROOT / "frontend/src/mocks/generated"
    out_data.mkdir(parents=True, exist_ok=True)
    (out_data / "skus.json").write_text(json.dumps(skus, indent=1))
    (out_data / "samples.json").write_text(json.dumps(samples, indent=1))
    print(f"{len(skus)} SKU, {len(samples)} trays -> {out_data}, {out_images}")


if __name__ == "__main__":
    main()
