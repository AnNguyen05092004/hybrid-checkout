/** Small SVG charts: enough for the prototype, replaced by a chart library if needed later. */

export interface Series {
  name: string;
  color: string;
  values: number[];
}

export function StackedBars({ labels, series, height = 200 }: { labels: string[]; series: Series[]; height?: number }) {
  const totals = labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
  const max = Math.max(1, ...totals);
  const w = 100 / labels.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height / 4}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Biểu đồ cột">
        {labels.map((_, i) => {
          let y = height / 4;
          return series.map((s) => {
            const h = (s.values[i] / max) * (height / 4 - 2);
            y -= h;
            return <rect key={s.name + i} x={i * w + w * 0.2} y={y} width={w * 0.6} height={h} fill={s.color} rx={0.6} />;
          });
        })}
      </svg>
      <div className="row small faint" style={{ justifyContent: "space-between" }}>
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
      <Legend series={series} />
    </div>
  );
}

export function Lines({ labels, series, height = 200, min = 0, max = 100, unit = "%" }: {
  labels: string[]; series: Series[]; height?: number; min?: number; max?: number; unit?: string;
}) {
  const W = 600, H = height, pad = 28;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, labels.length - 1);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Biểu đồ đường">
        {[min, (min + max) / 2, max].map((t) => (
          <g key={t}>
            <line x1={pad} x2={W - pad} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text x={4} y={y(t) + 4} fontSize={10} fill="var(--text-3)">{t}{unit}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth={2.5} points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={s.color} />)}
          </g>
        ))}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 8} fontSize={11} textAnchor="middle" fill="var(--text-2)">{l}</text>)}
      </svg>
      <Legend series={series} />
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="row wrap small muted" style={{ marginTop: 8, gap: 14 }}>
      {series.map((s) => (
        <span key={s.name} className="row" style={{ gap: 6 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />{s.name}
        </span>
      ))}
    </div>
  );
}
