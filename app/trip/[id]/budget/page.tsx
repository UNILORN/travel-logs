'use client'

import { use, useEffect, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import { CATEGORY_LABELS } from '@/lib/types'
import type { ExpenseCategory } from '@/lib/types'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BudgetGauge } from '@/components/budget/budget-gauge'
import { ExpenseList } from '@/components/budget/expense-list'
import { ExpenseForm } from '@/components/budget/expense-form'
import { ArrowLeft, Users, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { resolveTripIdFromSearch } from '@/lib/trip-id'
import { buildTripPageHref } from '@/lib/trip-route'

export default function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip, updateBudgetAndMembers } = useTripContext()
  const [tripId, setTripId] = useState(id)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<ExpenseCategory | 'all'>('all')
  const [isSettingsEditing, setIsSettingsEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(0)
  const [adultInput, setAdultInput] = useState(1)
  const [childInput, setChildInput] = useState(0)

  useEffect(() => {
    setTripId(resolveTripIdFromSearch(id, window.location.search))
  }, [id])

  const trip = getTrip(tripId)

  useEffect(() => {
    if (!trip) return
    setBudgetInput(trip.budget)
    setAdultInput(trip.members.adults)
    setChildInput(trip.members.children)
  }, [trip?.budget, trip?.members.adults, trip?.members.children])

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

  const hasSettingsChanges =
    budgetInput !== trip.budget ||
    adultInput !== trip.members.adults ||
    childInput !== trip.members.children

  const handleSaveSettings = () => {
    updateBudgetAndMembers(tripId, {
      budget: Math.max(0, budgetInput),
      adults: Math.max(1, adultInput),
      children: Math.max(0, childInput),
    })
    setIsSettingsEditing(false)
  }

  const handleStartEditingSettings = () => {
    setBudgetInput(trip.budget)
    setAdultInput(trip.members.adults)
    setChildInput(trip.members.children)
    setIsSettingsEditing(true)
  }

  const handleCancelEditingSettings = () => {
    setBudgetInput(trip.budget)
    setAdultInput(trip.members.adults)
    setChildInput(trip.members.children)
    setIsSettingsEditing(false)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={buildTripPageHref(tripId, 'edit')}
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
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-sm font-bold text-foreground">予算と人数</h2>
            {!isSettingsEditing ? (
              <Button variant="outline" size="sm" onClick={handleStartEditingSettings}>
                編集
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEditingSettings}>
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={!hasSettingsChanges}
                >
                  保存
                </Button>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            料金は1人分として扱われ、保存時に全支出を現在の人数で再計算します。
          </p>

          {!isSettingsEditing ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">予算</p>
                <p className="font-semibold text-foreground">{trip.budget.toLocaleString()}円</p>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">人数</p>
                <p className="font-semibold text-foreground">
                  大人{trip.members.adults}名 / 子供{trip.members.children}名
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="trip-budget">予算（円）</Label>
                <Input
                  id="trip-budget"
                  type="number"
                  min={0}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip-adults">大人人数</Label>
                <Input
                  id="trip-adults"
                  type="number"
                  min={1}
                  value={adultInput}
                  onChange={(e) => setAdultInput(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip-children">子供人数</Label>
                <Input
                  id="trip-children"
                  type="number"
                  min={0}
                  value={childInput}
                  onChange={(e) => setChildInput(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
            </div>
          )}
        </section>

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
              tripId={tripId}
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
        tripId={tripId}
        open={showForm}
        onOpenChange={setShowForm}
      />

      <BottomNav tripId={tripId} active="budget" />
    </div>
  )
}
