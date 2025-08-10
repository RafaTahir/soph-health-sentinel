import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TimelineChartProps {
  data: { time: string; count: number }[];
}

export default function TimelineChart({ data }: TimelineChartProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold mb-2">Outbreak Chatter</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
            <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} width={24} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
