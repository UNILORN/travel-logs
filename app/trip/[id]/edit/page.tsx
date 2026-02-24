'use client'

import { use, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import { ItineraryHeader } from '@/components/itinerary/itinerary-header'
import type { TimelineInsertDraft } from '@/components/itinerary/timeline'
import { Timeline } from '@/components/itinerary/timeline'
import { AddSpotDialog } from '@/components/itinerary/add-spot-dialog'
import { BottomNav } from '@/components/shared/bottom-nav'
import { Plus } from 'lucide-react'

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [addSpotOpen, setAddSpotOpen] = useState(false)
  const [draft, setDraft] = useState<TimelineInsertDraft>({ day: 1, type: 'spot' })

  const trip = getTrip(id)
  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  const handleOpenAddNode = (nextDraft: TimelineInsertDraft) => {
    setDraft(nextDraft)
    setAddSpotOpen(true)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <ItineraryHeader trip={trip} />

      <main className="mx-auto max-w-md px-4 pt-4">
        <Timeline trip={trip} onAddNode={handleOpenAddNode} />
      </main>

      <button
        onClick={() => {
          setDraft({ day: 1, type: 'spot' })
          setAddSpotOpen(true)
        }}
        className="fixed bottom-20 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="スポットを追加"
      >
        <Plus className="size-5" />
      </button>

      <AddSpotDialog
        tripId={trip.id}
        open={addSpotOpen}
        onOpenChange={setAddSpotOpen}
        defaultDay={draft.day}
        defaultTime={draft.time}
        defaultEndTime={draft.endTime}
        defaultNodeType={draft.type}
      />

      <BottomNav tripId={id} active="edit" />
    </div>
  )
}
