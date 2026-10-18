import { TrendingDown, TrendingUp } from "lucide-react";

export function RatingJourneyChart({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const width = 720;
  const height = 240;
  const paddingX = 42;
  const paddingY = 30;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 0.2);
  const lower = minimum - range * 0.18;
  const upper = maximum + range * 0.18;
  const x = (index: number) => paddingX + (index / (values.length - 1)) * (width - paddingX * 2);
  const y = (value: number) => paddingY + ((upper - value) / (upper - lower)) * (height - paddingY * 2);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const areaPoints = `${paddingX},${height - paddingY} ${points} ${width - paddingX},${height - paddingY}`;
  const gained = values[values.length - 1] >= values[0];

  return (
    <div className="sport-card overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase text-slate-500">Rating journey</p><p className="text-sm font-semibold text-slate-600">Starting rating plus every completed match</p></div>
        <span className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-black ${gained ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {gained ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {signed(values[values.length - 1] - values[0])}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[560px]" role="img" aria-label="Player rating changes during the selected tournament">
          <defs>
            <linearGradient id="rating-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0aa678" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0aa678" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => {
            const lineY = paddingY + (line / 3) * (height - paddingY * 2);
            const lineValue = upper - (line / 3) * (upper - lower);
            return <g key={line}><line x1={paddingX} x2={width - paddingX} y1={lineY} y2={lineY} stroke="#e2e8f0" strokeWidth="1" /><text x="4" y={lineY + 4} fill="#64748b" fontSize="12" fontWeight="700">{lineValue.toFixed(2)}</text></g>;
          })}
          <polygon points={areaPoints} fill="url(#rating-area)" />
          <polyline className="rating-line" points={points} fill="none" stroke="#087f5b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          {values.map((value, index) => (
            <g key={`${index}-${value}`}>
              <circle className="rating-dot" style={{ animationDelay: `${index * 70}ms` }} cx={x(index)} cy={y(value)} r="6" fill={index === 0 ? "#111a17" : "#c8f135"} stroke="#111a17" strokeWidth="3" />
              <title>{index === 0 ? "Start" : `Match ${index}`}: {value.toFixed(3)}</title>
              <text x={x(index)} y={height - 6} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="800">{index === 0 ? "Start" : `M${index}`}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function signed(value: number) {
  const rounded = value.toFixed(2);
  return value > 0 ? `+${rounded}` : rounded;
}
