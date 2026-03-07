'use client'

import { use, useEffect, useState } from 'react'
import type { MoveNode, Spot } from '@/lib/types'
import { ItineraryHeader } from '@/components/itinerary/itinerary-header'
import type { TimelineInsertDraft } from '@/components/itinerary/timeline'
import { Timeline } from '@/components/itinerary/timeline'
import { AddSpotDialog } from '@/components/itinerary/add-spot-dialog'
import { BottomNav } from '@/components/shared/bottom-nav'
import { Plus } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { resolveTripIdFromSearch } from '@/lib/trip-id'

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [tripId, setTripId] = useState(id)
  const [addSpotOpen, setAddSpotOpen] = useState(false)
  const [draft, setDraft] = useState<TimelineInsertDraft>({ day: 1, type: 'spot' })
  const [timelineMode, setTimelineMode] = useState<'view' | 'edit'>('view')
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null)
  const [editingMove, setEditingMove] = useState<MoveNode | null>(null)

  useEffect(() => {
    setTripId(resolveTripIdFromSearch(id, window.location.search))
  }, [id])

  const trip = getTrip(tripId)
  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  const isEditMode = timelineMode === 'edit'

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <ItineraryHeader trip={trip} />

      <main className="mx-auto max-w-md px-4 pt-4">
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
          className="fixed bottom-20 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="ノードを追加"
        >
          <Plus className="size-5" />
        </button>
      )}

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

      <BottomNav tripId={tripId} active="edit" />
    </div>
  )
}
