'use client'

import { use, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import { CATEGORY_LABELS } from '@/lib/types'
import type { ExpenseCategory } from '@/lib/types'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BudgetGauge } from '@/components/budget/budget-gauge'
import { ExpenseList } from '@/components/budget/expense-list'
import { ExpenseForm } from '@/components/budget/expense-form'
import { ArrowLeft, Users, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'

export default function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<ExpenseCategory | 'all'>('all')

  const trip = getTrip(id)
  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.total, 0)
  const percentage = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0
  const perPerson =
    trip.members.adults + trip.members.children > 0
      ? Math.round(totalSpent / (trip.members.adults + trip.members.children))
      : 0

  const filteredExpenses =
    activeTab === 'all'
      ? trip.expenses
      : trip.expenses.filter((e) => e.category === activeTab)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/trip/${id}/edit`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="旅程に戻る"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex-1">
              <h1 className="font-serif text-lg font-bold text-foreground">予算管理</h1>
              <p className="text-xs text-muted-foreground">{trip.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        {/* Budget Gauge */}
        <BudgetGauge
          spent={totalSpent}
          budget={trip.budget}
          percentage={percentage}
        />

        {/* Member Info */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-card p-3 text-sm shadow-sm border border-border">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-foreground">
            大人{trip.members.adults}名
            {trip.members.children > 0 && `、子供${trip.members.children}名`}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            1人あたり約 {perPerson.toLocaleString()}円
          </span>
        </div>

        {/* Category Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ExpenseCategory | 'all')}
          className="mt-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="all" className="text-xs">全て</TabsTrigger>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {CATEGORY_LABELS[cat]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            <ExpenseList
              expenses={filteredExpenses}
              tripId={id}
            />
          </TabsContent>
        </Tabs>

        {/* Summary Footer */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">合計支出</span>
            <span className="font-serif text-xl font-bold text-foreground">
              {totalSpent.toLocaleString()}円
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">残りの予算</span>
            <span
              className={`font-serif text-lg font-bold ${
                trip.budget - totalSpent < 0
                  ? 'text-destructive'
                  : 'text-primary'
              }`}
            >
              {(trip.budget - totalSpent).toLocaleString()}円
            </span>
          </div>
        </div>
      </main>

      {/* Add Expense FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="支出を追加"
      >
        <Plus className="size-5" />
      </button>

      <ExpenseForm
        tripId={id}
        open={showForm}
        onOpenChange={setShowForm}
      />

      <BottomNav tripId={id} active="budget" />
    </div>
  )
}
