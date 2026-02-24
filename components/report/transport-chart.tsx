'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = [
  'oklch(0.45 0.1 175)',
  'oklch(0.75 0.14 70)',
  'oklch(0.55 0.12 25)',
  'oklch(0.6 0.118 184.704)',
  'oklch(0.65 0.15 330)',
]

export function TransportChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            label={({ name, value }) => `${name} ${value}km`}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}km`, '距離']}
            contentStyle={{
              backgroundColor: 'oklch(0.99 0.003 80)',
              borderColor: 'oklch(0.89 0.015 75)',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
