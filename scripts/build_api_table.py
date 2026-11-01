#!/usr/bin/env python3
"""Write the endpoint table of api/openapi.yaml into docs/06-api.md.

Reads the contract bundled to JSON (scripts/check_api.sh does that with Redocly, so this script
needs only the standard library) and replaces the block between the api-table markers.
Do not edit that block by hand: change the contract and run scripts/check_api.sh.

Usage: scripts/build_api_table.py <openapi.json>
"""

import json
import sys
from pathlib import Path

DOC = Path(__file__).resolve().parent.parent / "docs" / "06-api.md"
START, END = "<!-- api-table:start -->", "<!-- api-table:end -->"
METHODS = ("get", "post", "put", "patch", "delete")
ROLES = {"CASHIER": "TN", "STORE_MANAGER": "QL", "ML_ENGINEER": "ML", "ADMIN": "AD"}


def roles(op: dict) -> str:
    if op.get("security") == []:
        return "công khai"
    names = op.get("x-roles")
    return ", ".join(ROLES[r] for r in names) if names else "đã đăng nhập"


def table(spec: dict) -> str:
    rows: dict[str, list[str]] = {t["name"]: [] for t in spec["tags"]}
    for path, item in spec["paths"].items():
        for method in METHODS:
            op = item.get(method)
            if op:
                rows[op["tags"][0]].append(
                    f"| `{method.upper()}` | `{path}` | {op['summary']} | {roles(op)} |"
                )
    out = []
    for tag in spec["tags"]:
        out += [f"**{tag['name']}** — {tag['description']}", "",
                "| | Path | Thao tác | Vai trò |", "|---|---|---|---|", *rows[tag["name"]], ""]
    count = sum(len(r) for r in rows.values())
    return f"{count} thao tác, sinh từ `api/openapi.yaml`.\n\n" + "\n".join(out).rstrip()


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    doc = DOC.read_text(encoding="utf-8")
    head, rest = doc.split(START, 1)
    _, tail = rest.split(END, 1)
    DOC.write_text(f"{head}{START}\n{table(spec)}\n{END}{tail}", encoding="utf-8")
    print(f"wrote the endpoint table into {DOC.relative_to(DOC.parent.parent)}")


if __name__ == "__main__":
    main()
