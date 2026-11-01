#!/usr/bin/env python3
"""Write the full ER diagram of database/schema.dbml into docs/05-data-model.md as a Mermaid erDiagram.

Usage: scripts/build_diagram.py   (Python 3, standard library only)

The block between the er-full markers in the doc is replaced, so the diagram always matches the
schema. Every table and column is drawn except created_at / updated_at. Links from the people
columns (`*_by`, `actor_id`, `manager_id`) to users, and from the SKU columns of boxes and
alerts to skus, are left out: they would cross the whole diagram. The columns still show as FK.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DBML = ROOT / "database" / "schema.dbml"
DOC = ROOT / "docs" / "05-data-model.md"
START, END = "<!-- er-full:start -->", "<!-- er-full:end -->"

HIDDEN_COLUMNS = {"created_at", "updated_at"}
# Links not drawn: (child table, child column).
HIDDEN_LINKS = {
    ("detections", "sku_id"), ("detections", "confirmed_sku_id"),
    ("alerts", "seen_sku_id"), ("alerts", "scanned_sku_id"),
    ("annotations", "sku_id"),
    ("model_confusions", "true_sku_id"), ("model_confusions", "predicted_sku_id"),
}
# Relationship labels, by (child table, first child column). A missing entry draws no label.
LABELS = {
    ("shifts", "cashier_id"): "đứng ca",
    ("shifts", "counter_id"): "có ca",
    ("transactions", "shift_id"): "trong ca",
    ("transaction_lines", "transaction_id"): "có dòng",
    ("transaction_lines", "sku_id"): "được bán",
    ("transaction_lines", "detection_id"): "làn nhanh tự thêm",
    ("manager_approvals", "transaction_id"): "cần PIN",
    ("tray_captures", "transaction_id"): "chụp khay",
    ("tray_captures", "model_version_id"): "model đã chạy",
    ("detections", "capture_id"): "nhận diện",
    ("alerts", "capture_id"): "sinh ra",
    ("alert_detections", "alert_id"): "chỉ vào",
    ("alert_detections", "detection_id"): "được chỉ",
    ("skus", "category_id"): "gồm",
    ("skus", "batch_id"): "dạy SKU mới",
    ("sku_samples", "sku_id"): "ảnh mẫu",
    ("label_tasks", "batch_id"): "ảnh thật",
    ("label_tasks", "capture_id"): "nguồn ảnh",
    ("annotations", "label_task_id"): "box đã duyệt",
    ("jobs", "batch_id"): "chạy",
    ("model_versions", "train_job_id"): "sinh ra",
    ("model_versions", "batch_id"): "học tới đợt",
    ("model_version_skus", "model_version_id"): "biết SKU",
    ("model_version_skus", "sku_id"): "được học",
    ("model_confusions", "model_version_id"): "hay nhầm",
    ("model_deployments", "model_version_id"): "được deploy",
    ("model_deployments", "previous_version_id"): "bản liền trước",
    ("threshold_configs", "batch_id"): "ngưỡng",
    ("audit_logs", "counter_id"): "tại quầy",
}
# Mermaid lays tables out in the order links are declared: follow the business flow.
FLOW = [
    "users", "counters", "shifts", "transactions", "manager_approvals", "transaction_lines",
    "tray_captures", "detections", "alerts", "alert_detections", "categories", "skus",
    "sku_samples", "label_tasks", "annotations", "import_batches", "jobs", "model_versions",
    "threshold_configs", "model_version_skus", "model_confusions", "model_deployments",
    "settings", "audit_logs",
]


def strip_literals(text):
    """Drop quoted notes and `expressions`, so words inside them are not read as attributes."""
    return re.sub(r"`[^`]*`|'(?:\\.|[^'\\])*'", "''", text)


def parse(dbml):
    tables, links = {}, []
    table = block = None
    for raw in dbml.splitlines():
        line = strip_literals(raw).rstrip()
        if m := re.match(r"Table (\w+)\b.*\{$", line):
            table = tables.setdefault(m[1], {"columns": [], "pk": set()})
            continue
        if table is None:
            if m := re.match(r"Ref: (\w+)\.\(?([\w, ]+)\)? > (\w+)\.", line):
                links.append((m[1], [c.strip() for c in m[2].split(",")], m[3]))
            continue
        if line == "}":
            table = None
        elif re.match(r"  (indexes|checks) \{$", line):
            block = line.split()[0]
        elif line == "  }":
            block = None
        elif block == "indexes":
            if m := re.match(r"\s+\(([\w, ]+)\) \[[^\]]*\bpk\b", line):
                table["pk"].update(c.strip() for c in m[1].split(","))
        elif block is None and (m := re.match(r"  (\w+) ([\w(),]+)(?: \[(.*)\])?$", line)):
            attrs = m[3] or ""
            col = {
                "name": m[1], "type": re.sub(r"\(.*", "", m[2]),
                "pk": bool(re.search(r"\bpk\b", attrs)),
                "unique": bool(re.search(r"\bunique\b", attrs)),
                "not_null": "not null" in attrs or bool(re.search(r"\bpk\b", attrs)),
            }
            table["columns"].append(col)
            if r := re.search(r"ref: > (\w+)\.", attrs):
                links.append((tables_name(tables, table), [m[1]], r[1]))
    return tables, links


def tables_name(tables, table):
    return next(name for name, t in tables.items() if t is table)


def mermaid(tables, links):
    fk = {(child, c) for child, cols, _ in links for c in cols}
    order = {name: i for i, name in enumerate(FLOW)}
    out = ["```mermaid", "erDiagram"]
    for child, cols, parent in sorted(links, key=lambda l: (order.get(l[0], 99), l[1])):
        if parent == "users" and (cols[0].endswith("_by") or cols[0] in ("actor_id", "manager_id")):
            continue
        if (child, cols[0]) in HIDDEN_LINKS:
            continue
        col = next(c for c in tables[child]["columns"] if c["name"] == cols[0])
        one = "||" if col["not_null"] else "|o"
        many = "o|" if col["unique"] else "o{"
        out.append(f'  {parent} {one}--{many} {child} : "{LABELS.get((child, cols[0]), "")}"')
    out.append("")
    for name in sorted(tables, key=lambda n: order.get(n, 99)):
        t = tables[name]
        out.append(f"  {name} {{")
        for c in t["columns"]:
            if c["name"] in HIDDEN_COLUMNS:
                continue
            keys = [k for k, on in (("PK", c["pk"] or c["name"] in t["pk"]),
                                    ("FK", (name, c["name"]) in fk),
                                    ("UK", c["unique"])) if on]
            out.append(f"    {c['type']} {c['name']}{' ' + ', '.join(keys) if keys else ''}")
        out.append("  }")
    out.append("```")
    return "\n".join(out)


def main():
    tables, links = parse(DBML.read_text())
    doc = DOC.read_text()
    head, rest = doc.split(START, 1)
    _, tail = rest.split(END, 1)
    DOC.write_text(f"{head}{START}\n{mermaid(tables, links)}\n{END}{tail}")
    print(f"wrote the ER diagram of {len(tables)} tables into {DOC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
