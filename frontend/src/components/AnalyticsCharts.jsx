import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

const COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6', '#f97316', '#22c55e', '#ef4444']

function ChartCard({ title, children }) {
  return (
    <div className="glass-card">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">{title}</h4>
      <div style={{ width: '100%', height: 180 }}>{children}</div>
    </div>
  )
}

export default function AnalyticsCharts({ speedHistory, typeDistribution, riskDistribution, packetHistory }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <ChartCard title="Average Speed Over Time (km/h)">
        <ResponsiveContainer>
          <LineChart data={speedHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2334" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#64748b' }} hide />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={28} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1a2334', fontSize: 12 }} />
            <Line type="monotone" dataKey="speed" stroke="#22d3ee" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Vehicle Type Distribution">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={typeDistribution} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60}>
              {typeDistribution.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1a2334', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Risk Distribution">
        <ResponsiveContainer>
          <BarChart data={riskDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2334" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={24} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1a2334', fontSize: 12 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {riskDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Packets / Second">
        <ResponsiveContainer>
          <LineChart data={packetHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2334" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#64748b' }} hide />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={28} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1a2334', fontSize: 12 }} />
            <Line type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sent" />
            <Line type="monotone" dataKey="received" stroke="#22c55e" strokeWidth={2} dot={false} name="Received" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
