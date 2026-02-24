'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function DailyDistanceChart({ data }: { data: { day: string; distance: number }[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.89 0.015 75)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 50)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 50)' }}
            unit="km"
          />
          <Tooltip
            formatter={(value: number) => [`${value}km`, '移動距離']}
            contentStyle={{
              backgroundColor: 'oklch(0.99 0.003 80)',
              borderColor: 'oklch(0.89 0.015 75)',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
          />
          <Bar
            dataKey="distance"
            fill="oklch(0.45 0.1 175)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
