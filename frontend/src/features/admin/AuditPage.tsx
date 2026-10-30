import { useState } from "react";
import { useStore } from "../../app/store";
import { Card, Empty, PageHeader } from "../../components/ui";
import { dateTime } from "../../lib/format";

/** A03 — Audit log (US26). Read only. */
export function AuditPage() {
  const { audit } = useStore();
  const [who, setWho] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const rows = audit.filter((a) => (who === "ALL" || a.user === who) && (action === "ALL" || a.action === action));

  return (
    <>
      <PageHeader title="Nhật ký hệ thống" sub="Thao tác quan trọng; không sửa, không xóa được" />
      <Card bodyClass="" title={<div className="row wrap">
        <select className="select" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="ALL">Mọi người</option>{[...new Set(audit.map((a) => a.user))].map((u) => <option key={u}>{u}</option>)}
        </select>
        <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="ALL">Mọi thao tác</option>{[...new Set(audit.map((a) => a.action))].map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>}>
        {rows.length === 0 ? <Empty title="Không có bản ghi" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Thời gian</th><th>Người</th><th>Thao tác</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead>
            <tbody>{rows.map((a, i) => (
              <tr key={a.at + i}><td>{dateTime(a.at)}</td><td>{a.user}</td><td className="mono">{a.action}</td><td>{a.target}</td><td className="small">{a.detail}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
