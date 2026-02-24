'use client'

import { cn } from '@/lib/utils'

export function BudgetGauge({
  spent,
  budget,
  percentage,
}: {
  spent: number
  budget: number
  percentage: number
}) {
  const clampedPercent = Math.min(percentage, 100)
  const status =
    percentage < 60 ? 'safe' : percentage < 85 ? 'warning' : 'danger'

  const barColor =
    status === 'safe'
      ? 'bg-chart-1'
      : status === 'warning'
        ? 'bg-chart-2'
        : 'bg-destructive'

  const statusLabel =
    status === 'safe' ? '余裕あり' : status === 'warning' ? '注意' : '予算超過注意'

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">予算進捗</span>
        <span
          className={cn(
            'text-xs font-medium',
            status === 'safe' && 'text-chart-1',
            status === 'warning' && 'text-chart-2',
            status === 'danger' && 'text-destructive'
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-serif text-lg font-bold text-foreground">
          {spent.toLocaleString()}円
        </span>
        <span className="text-sm text-muted-foreground">
          / {budget.toLocaleString()}円
        </span>
      </div>

      <p className="mt-1 text-right text-xs text-muted-foreground">
        {Math.round(percentage)}% 使用
      </p>
    </div>
  )
}
