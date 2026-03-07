'use client'

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

export function DailyDistanceChart({ data }: { data: { day: string; distance: number }[] }) {
  const option = useMemo(
    () => ({
      animationDuration: 500,
      animationDurationUpdate: 150,
      grid: {
        top: 16,
        right: 12,
        left: 10,
        bottom: 26,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis' as const,
        renderMode: 'richText' as const,
        transitionDuration: 0,
        axisPointer: {
          type: 'shadow' as const,
          animation: false,
        },
        valueFormatter: (value: number) => `${value}km`,
      },
      xAxis: {
        type: 'category' as const,
        data: data.map((item) => item.day),
        axisLabel: {
          fontSize: 11,
          color: 'oklch(0.42 0.02 60)',
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        name: 'km',
        nameTextStyle: {
          fontSize: 11,
          color: 'oklch(0.42 0.02 60)',
        },
        splitLine: {
          lineStyle: { color: 'oklch(0.89 0.015 75)' },
        },
        axisLabel: {
          fontSize: 11,
          color: 'oklch(0.42 0.02 60)',
        },
      },
      series: [
        {
          data: data.map((item) => item.distance),
          type: 'bar' as const,
          barWidth: '48%',
          itemStyle: {
            color: 'oklch(0.45 0.1 175)',
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    }),
    [data]
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <ReactECharts option={option} lazyUpdate style={{ height: 220, width: '100%' }} />
    </div>
  )
}
