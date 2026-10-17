import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
export function Chart({
  data,
  x,
  label,
  bar = false,
}: {
  data: Record<string, string | number | null>[];
  x: string;
  label: string;
  bar?: boolean;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {bar ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#354052" />
            <XAxis dataKey={x} />
            <YAxis width={70} />
            <Tooltip
              contentStyle={{ background: '#132033', border: '1px solid #607086', color: '#fff' }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="value"
              name={label}
              fill="#5ed6bd"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5ed6bd" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#5ed6bd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#354052" />
            <XAxis dataKey={x} />
            <YAxis width={70} />
            <Tooltip
              contentStyle={{ background: '#132033', border: '1px solid #607086', color: '#fff' }}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="value"
              name={label}
              stroke="#5ed6bd"
              fill="url(#fade)"
              strokeWidth={3}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
