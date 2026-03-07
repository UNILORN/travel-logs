'use client'

import { useTripContext } from '@/lib/trip-context'
import { CATEGORY_LABELS } from '@/lib/types'
import type { Expense } from '@/lib/types'
import { Trash2 } from 'lucide-react'

export function ExpenseList({
  expenses,
  tripId,
}: {
  expenses: Expense[]
  tripId: string
}) {
  const { removeExpense } = useTripContext()

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">支出がまだありません</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {CATEGORY_LABELS[expense.category]}
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {expense.name}
              </span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
              <span>
                大人 {expense.adultPrice.toLocaleString()}円 x {expense.adultCount}名
              </span>
              {expense.childCount > 0 && expense.childPrice > 0 && (
                <span>
                  子供 {expense.childPrice.toLocaleString()}円 x {expense.childCount}名
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {expense.total.toLocaleString()}円
            </span>
            <button
              onClick={() => removeExpense(tripId, expense.id)}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`${expense.name}を削除`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
