'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Navigation, Route, Wallet } from 'lucide-react'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTripContext } from '@/lib/trip-context'
import {
  getTripBriefData,
  getTripBriefDayData,
  type TripBriefRiskLevel,
} from '@/lib/trip-brief'
import { buildTripPageHref } from '@/lib/trip-route'
import { resolveTripIdFromSearch } from '@/lib/trip-id'
import { cn } from '@/lib/utils'

const riskCopy: Record<
  TripBriefRiskLevel,
  { label: string; description: string; className: string }
> = {
  relaxed: {
    label: '余白あり',
    description: '移動も予定も比較的ゆるやかです。',
    className: 'bg-chart-1/10 text-chart-1',
  },
  balanced: {
    label: 'ちょうどよい',
    description: '予定はしっかりありますが、まだ調整しやすい1日です。',
    className: 'bg-chart-4/15 text-chart-4',
  },
  tight: {
    label: '詰まり気味',
    description: '移動か予定数が多めです。休憩の余白を確認してください。',
    className: 'bg-destructive/10 text-destructive',
  },
}

export default function TripBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [tripId, setTripId] = useState(id)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    setTripId(resolveTripIdFromSearch(id, window.location.search))
  }, [id])

  const trip = getTrip(tripId)

  const brief = useMemo(() => {
    if (!trip) return null
    return getTripBriefData(trip)
  }, [trip])

  useEffect(() => {
    if (!brief) return
    setSelectedDay((current) => current ?? brief.todayDay)
  }, [brief])

  if (!trip || !brief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  const activeDay = selectedDay ?? brief.todayDay
  const dayData = getTripBriefDayData(trip, activeDay)
  const dayNodes = dayData.nodes
  const budget = brief.budgetSummary
  const risk = riskCopy[dayData.riskLevel]
  const dayNotes = dayData.criticalNotes

  return (
    <div className="min-h-screen bg-background pb-24">
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
              <h1 className="font-serif text-lg font-bold text-foreground">Trip Brief</h1>
              <p className="text-xs text-muted-foreground">{trip.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">次の予定</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-foreground">
                {brief.nextSpot ? brief.nextSpot.name : '次の目的地はまだ未定です'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {brief.nextSpot
                  ? `Day ${brief.nextSpot.day} ${brief.nextSpot.time} - ${brief.nextSpot.endTime}`
                  : '旅程を追加すると、ここに次の行き先が表示されます。'}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <MapPin className="size-5" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', risk.className)}>
              {risk.label}
            </span>
            <p className="text-xs text-muted-foreground">{risk.description}</p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-base font-bold text-foreground">今日の流れ</h2>
              <p className="text-xs text-muted-foreground">Day {activeDay} の主要スポットと移動</p>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {brief.dayCount}日旅
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {brief.availableDays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
                  day === activeDay
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                Day {day}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Route className="size-3.5" />
                移動
              </div>
              <p className="mt-1 font-serif text-lg font-bold text-foreground">
                {dayData.moveSummary.totalDistance}km
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                予定数
              </div>
              <p className="mt-1 font-serif text-lg font-bold text-foreground">{dayNodes.length}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Navigation className="size-3.5" />
                主移動
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {dayData.moveSummary.primaryTransportLabel ?? '未定'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dayNodes.length > 0 ? (
              dayNodes.map((node) => (
                <div key={node.id} className="rounded-xl border border-border/70 bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {node.time} - {node.endTime}
                      </p>
                      <h3 className="mt-1 font-medium text-foreground">{node.name}</h3>
                      {node.type === 'spot' && node.address && (
                        <p className="mt-1 text-xs text-muted-foreground">{node.address}</p>
                      )}
                      {node.type === 'move' && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {node.distance}km
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {node.type === 'spot' ? 'スポット' : node.type === 'move' ? '移動' : 'エリア'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                まだこの日の予定は少なめです。旅程を追加すると、ここに1日の流れが表示されます。
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4" />
              予算
            </div>
            {budget.usageRate !== null ? (
              <>
                <p className="mt-2 font-serif text-xl font-bold text-foreground">
                  {budget.remaining.toLocaleString()}円
                </p>
                <p className="text-xs text-muted-foreground">
                  残り / {budget.budget.toLocaleString()}円
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      budget.usageRate > 100 ? 'bg-destructive' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(Math.max(budget.usageRate, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {budget.usageRate}% 使用
                  {budget.topCategoryLabel ? ` / 大きい支出は ${budget.topCategoryLabel}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 font-serif text-xl font-bold text-foreground">予算未設定</p>
                <p className="text-xs text-muted-foreground">
                  予算画面で設定すると、残り金額がここに出ます。
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              メモ
            </div>
            {dayNotes.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {dayNotes.map((note) => (
                  <li key={note} className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                今日の重要メモはまだありません。必要な注意点は旅程メモに残しておくと便利です。
              </p>
            )}
          </div>
        </section>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-base font-bold text-foreground">次の確認先</h2>
              <p className="text-xs text-muted-foreground">地図や詳しい導線は既存画面へ移動できます。</p>
            </div>
            <Link
              href={buildTripPageHref(tripId, 'navigate')}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              ナビを見る
            </Link>
          </div>
        </div>
      </main>

      <BottomNav tripId={tripId} active="brief" />
    </div>
  )
}
