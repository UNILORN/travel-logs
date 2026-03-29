'use client'

import { use, useEffect, useMemo, useState } from 'react'
import type { MoveNode, Spot } from '@/lib/types'
import { ItineraryHeader } from '@/components/itinerary/itinerary-header'
import type { TimelineInsertDraft } from '@/components/itinerary/timeline'
import { Timeline } from '@/components/itinerary/timeline'
import { AddSpotDialog } from '@/components/itinerary/add-spot-dialog'
import { BottomNav } from '@/components/shared/bottom-nav'
import { Plus } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { resolveTripIdFromSearch } from '@/lib/trip-id'
import { useIsDesktop } from '@/hooks/use-is-desktop'

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [tripId, setTripId] = useState(id)
  const [addSpotOpen, setAddSpotOpen] = useState(false)
  const [draft, setDraft] = useState<TimelineInsertDraft>({ day: 1, type: 'spot' })
  const [timelineMode, setTimelineMode] = useState<'view' | 'edit'>('view')
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null)
  const [editingMove, setEditingMove] = useState<MoveNode | null>(null)
  const [activeDay, setActiveDay] = useState(1)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    setTripId(resolveTripIdFromSearch(id, window.location.search))
  }, [id])

  const trip = getTrip(tripId)

  const dayCount = trip
    ? Math.ceil(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount])

  useEffect(() => {
    if (days.length === 0) return

    const updateActiveDay = () => {
      let currentDay = days[0]

      for (const day of days) {
        const section = document.getElementById(`day-${day}`)
        if (!section) continue
        if (section.getBoundingClientRect().top <= 120) {
          currentDay = day
        }
      }

      setActiveDay(currentDay)
    }

    updateActiveDay()
    window.addEventListener('scroll', updateActiveDay, { passive: true })
    window.addEventListener('resize', updateActiveDay)

    return () => {
      window.removeEventListener('scroll', updateActiveDay)
      window.removeEventListener('resize', updateActiveDay)
    }
  }, [days])

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  const isEditMode = timelineMode === 'edit'
  const showSidebar = isDesktop && isEditMode && addSpotOpen
  // 移動ノード編集時はサイドバーを広げてマップを使いやすくする
  const isMoveSidebar = showSidebar && (editingMove !== null || draft.type === 'move')

  const handleOpenAddNode = (nextDraft: TimelineInsertDraft) => {
    if (!isEditMode) return
    setEditingSpot(null)
    setEditingMove(null)
    setDraft(nextDraft)
    setAddSpotOpen(true)
  }

  const handleOpenEditSpot = (spot: Spot) => {
    if (!isEditMode) return
    setEditingSpot(spot)
    setEditingMove(null)
    setDraft({ day: spot.day, time: spot.time, endTime: spot.endTime, type: 'spot' })
    setAddSpotOpen(true)
  }

  const handleOpenEditMove = (node: MoveNode) => {
    if (!isEditMode) return
    setEditingSpot(null)
    setEditingMove(node)
    setDraft({ day: node.day, time: node.time, endTime: node.endTime, type: 'move' })
    setAddSpotOpen(true)
  }

  const handleJumpToDay = (day: number) => {
    const section = document.getElementById(`day-${day}`)
    if (!section) return
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveDay(day)
  }

  return (
    <div className={`min-h-screen bg-background pb-24 transition-[padding] duration-200${isMoveSidebar ? ' lg:pr-[656px]' : showSidebar ? ' lg:pr-[400px]' : ''}`}>
      <ItineraryHeader trip={trip} />

      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            目次
          </p>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
            {days.map((day) => {
              const isActive = day === activeDay
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleJumpToDay(day)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  Day {day}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <main className={`mx-auto px-4 pt-20 lg:px-8${showSidebar ? ' lg:max-w-none' : ' max-w-md lg:max-w-5xl'}`}>
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">旅程の表示</p>
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setTimelineMode('view')
                setAddSpotOpen(false)
                setEditingSpot(null)
                setEditingMove(null)
              }}
              aria-pressed={timelineMode === 'view'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                timelineMode === 'view'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              表示モード
            </button>
            <button
              type="button"
              onClick={() => setTimelineMode('edit')}
              aria-pressed={timelineMode === 'edit'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                timelineMode === 'edit'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              編集モード
            </button>
          </div>
        </div>

        <Timeline
          trip={trip}
          isEditable={isEditMode}
          onAddNode={handleOpenAddNode}
          onEditSpot={handleOpenEditSpot}
          onEditMove={handleOpenEditMove}
          columns={isDesktop ? 3 : 1}
        />
      </main>

      {isEditMode && (
        <button
          onClick={() => {
            setEditingSpot(null)
            setEditingMove(null)
            setDraft({ day: 1, type: 'spot' })
            setAddSpotOpen(true)
          }}
          className={`fixed bottom-20 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95 ${
            showSidebar ? 'right-[400px]' : 'right-4'
          }`}
          aria-label="ノードを追加"
        >
          <Plus className="size-5" />
        </button>
      )}

      {/* デスクトップ: 右サイドバーパネル */}
      <div
        className={`hidden lg:flex fixed right-0 top-14 z-30 flex-col border-l border-border bg-background transition-all duration-200 ${
          showSidebar ? 'translate-x-0' : 'translate-x-full'
        } ${isMoveSidebar ? 'w-[640px]' : 'w-96'}`}
        style={{ height: 'calc(100vh - 56px - 64px)' }}
        aria-hidden={!showSidebar}
      >
        <AddSpotDialog
          mode="sidebar"
          tripId={tripId}
          open={showSidebar}
          onOpenChange={(open) => {
            setAddSpotOpen(open)
            if (!open) {
              setEditingSpot(null)
              setEditingMove(null)
            }
          }}
          defaultDay={draft.day}
          defaultTime={draft.time}
          defaultEndTime={draft.endTime}
          defaultNodeType={draft.type}
          editingSpot={editingSpot}
          editingMove={editingMove}
        />
      </div>

      {/* モバイル: ダイアログ */}
      {!isDesktop && (
        <AddSpotDialog
          tripId={tripId}
          open={isEditMode && addSpotOpen}
          onOpenChange={(open) => {
            setAddSpotOpen(open)
            if (!open) {
              setEditingSpot(null)
              setEditingMove(null)
            }
          }}
          defaultDay={draft.day}
          defaultTime={draft.time}
          defaultEndTime={draft.endTime}
          defaultNodeType={draft.type}
          editingSpot={editingSpot}
          editingMove={editingMove}
        />
      )}

      <BottomNav tripId={tripId} active="edit" />
    </div>
  )
}
