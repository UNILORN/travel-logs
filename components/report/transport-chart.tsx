'use client'

import ReactECharts from 'echarts-for-react'

const COLORS = [
  'oklch(0.45 0.1 175)',
  'oklch(0.75 0.14 70)',
  'oklch(0.55 0.12 25)',
  'oklch(0.6 0.118 184.704)',
  'oklch(0.65 0.15 330)',
]

export function TransportChart({ data }: { data: { name: string; value: number }[] }) {
  const chartData = data.map((item, index) => ({
    ...item,
    itemStyle: { color: COLORS[index % COLORS.length] },
  }))

  const option = {
    animationDuration: 500,
    tooltip: {
      trigger: 'item',
      valueFormatter: (value: number) => `${value}km`,
    },
    legend: {
      type: 'scroll' as const,
      bottom: 0,
      left: 'center',
      itemWidth: 12,
      textStyle: { fontSize: 11, color: 'oklch(0.42 0.02 60)' },
    },
    series: [
      {
        name: '移動距離',
        type: 'pie' as const,
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        minAngle: 8,
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: 'oklch(0.99 0.003 80)',
          borderWidth: 2,
        },
        label: {
          show: true,
          fontSize: 11,
          formatter: '{b|{b}}\n{v|{c}km}',
          rich: {
            b: { fontSize: 11, color: 'oklch(0.28 0.03 60)', fontWeight: 600 },
            v: { fontSize: 10, color: 'oklch(0.42 0.02 60)' },
          },
        },
        labelLine: {
          length: 10,
          length2: 8,
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY' as const,
        },
        data: chartData,
      },
    ],
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <ReactECharts option={option} style={{ height: 260, width: '100%' }} />
    </div>
  )
}
