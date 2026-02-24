'use client'

import { use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTripContext } from '@/lib/trip-context'
import { TRANSPORT_LABELS, CATEGORY_LABELS } from '@/lib/types'
import type { ExpenseCategory } from '@/lib/types'
import { BottomNav } from '@/components/shared/bottom-nav'
import { StatCard } from '@/components/report/stat-card'
import { TransportChart } from '@/components/report/transport-chart'
import { SpendingChart } from '@/components/report/spending-chart'
import { DailyDistanceChart } from '@/components/report/distance-chart'
import { ArrowLeft, MapPin, Wallet, Route, CalendarDays, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip, archiveTrip } = useTripContext()
  const router = useRouter()

  const trip = getTrip(id)

  const stats = useMemo(() => {
    if (!trip) return null

    const totalDistance = trip.spots.reduce((sum, s) => sum + s.distance, 0)
    const totalSpent = trip.expenses.reduce((sum, e) => sum + e.total, 0)
    const spotCount = trip.spots.length
    const dayCount =
      Math.ceil(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1

    // Transport breakdown
    const transportBreakdown: Record<string, number> = {}
    trip.spots.forEach((s) => {
      if (s.distance > 0) {
        const label = TRANSPORT_LABELS[s.transport]
        transportBreakdown[label] = (transportBreakdown[label] || 0) + s.distance
      }
    })
    const transportData = Object.entries(transportBreakdown).map(([name, value]) => ({
      name,
      value: Math.round(value * 10) / 10,
    }))

    // Spending breakdown
    const spendingBreakdown: Record<string, number> = {}
    trip.expenses.forEach((e) => {
      const label = CATEGORY_LABELS[e.category as ExpenseCategory]
      spendingBreakdown[label] = (spendingBreakdown[label] || 0) + e.total
    })
    const spendingData = Object.entries(spendingBreakdown).map(([name, value]) => ({
      name,
      value,
    }))

    // Daily distances
    const dailyDistances: { day: string; distance: number }[] = []
    for (let d = 1; d <= dayCount; d++) {
      const dayDistance = trip.spots
        .filter((s) => s.day === d)
        .reduce((sum, s) => sum + s.distance, 0)
      dailyDistances.push({ day: `Day ${d}`, distance: Math.round(dayDistance * 10) / 10 })
    }

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalSpent,
      spotCount,
      dayCount,
      transportData,
      spendingData,
      dailyDistances,
    }
  }, [trip])

  if (!trip || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  const handleArchive = () => {
    archiveTrip(id)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background pb-24">
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
              <h1 className="font-serif text-lg font-bold text-foreground">旅のレポート</h1>
              <p className="text-xs text-muted-foreground">{trip.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Route className="size-5" />}
            label="総移動距離"
            value={`${stats.totalDistance}km`}
          />
          <StatCard
            icon={<Wallet className="size-5" />}
            label="総支出"
            value={`${stats.totalSpent.toLocaleString()}円`}
          />
          <StatCard
            icon={<MapPin className="size-5" />}
            label="訪問スポット"
            value={`${stats.spotCount}ヶ所`}
          />
          <StatCard
            icon={<CalendarDays className="size-5" />}
            label="旅行日数"
            value={`${stats.dayCount}日間`}
          />
        </div>

        {/* Transport Breakdown */}
        {stats.transportData.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-serif text-sm font-bold text-muted-foreground tracking-wider">
              移動手段の内訳
            </h2>
            <TransportChart data={stats.transportData} />
          </section>
        )}

        {/* Daily Distance */}
        {stats.dailyDistances.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-serif text-sm font-bold text-muted-foreground tracking-wider">
              日別移動距離
            </h2>
            <DailyDistanceChart data={stats.dailyDistances} />
          </section>
        )}

        {/* Spending Breakdown */}
        {stats.spendingData.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-serif text-sm font-bold text-muted-foreground tracking-wider">
              支出カテゴリ別内訳
            </h2>
            <SpendingChart data={stats.spendingData} />
          </section>
        )}

        {/* Archive Button */}
        {trip.status !== 'archived' && (
          <button
            onClick={handleArchive}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/5 px-4 py-3 font-serif text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <BookOpen className="size-4" />
            本棚にアーカイブする
          </button>
        )}

        {trip.status === 'archived' && (
          <div className="mt-8 rounded-lg bg-muted p-4 text-center">
            <p className="font-serif text-sm text-muted-foreground">
              この旅はアーカイブ済みです
            </p>
          </div>
        )}
      </main>

      <BottomNav tripId={id} active="report" />
    </div>
  )
}
