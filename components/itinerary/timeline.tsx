'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  Bus,
  CableCar,
  Car,
  Coffee,
  Footprints,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Route,
  Ship,
  Train,
  Trash2,
} from 'lucide-react'
import type {
  MoveNode,
  Spot,
  TimelineNode,
  TransportType,
  Trip,
} from '@/lib/types'
import { TRANSPORT_LABELS } from '@/lib/types'
import { useTripContext } from '@/lib/trip-context'
import { getTripTimelineNodes } from '@/lib/timeline-nodes'

export type AddNodeKind = 'spot' | 'area' | 'move'

export interface TimelineInsertDraft {
  day: number
  time?: string
  endTime?: string
  type?: AddNodeKind
}

const transportIcons: Partial<Record<TransportType, LucideIcon>> = {
  car: Car,
  walk: Footprints,
  train: Train,
  shinkansen: Train,
  bus: Bus,
  ferry: Ship,
  plane: Plane,
  taxi: Car,
  bicycle: Bike,
  ropeway: CableCar,
}

function TimeColumn({ startTime, endTime }: { startTime: string; endTime: string }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-end pt-0.5 text-[11px] leading-none">
      <span className="font-semibold tabular-nums text-foreground">{startTime}</span>
      <div className="my-1 flex h-4 items-center">
        <div className="h-full w-px bg-border" />
      </div>
      <span className="tabular-nums text-muted-foreground">{endTime}</span>
    </div>
  )
}

function NodeBlock({
  node,
  tripId,
  isLast,
  isEditable,
  spot,
  onEditSpot,
  onEditMove,
}: {
  node: TimelineNode
  tripId: string
  isLast: boolean
  isEditable: boolean
  spot?: Spot
  onEditSpot?: (spot: Spot) => void
  onEditMove?: (node: MoveNode) => void
}) {
  const { removeSpot, removeNode } = useTripContext()

  if (node.type === 'move') {
    const TransportIcon = transportIcons[node.transport] ?? Route

    return (
      <div className="relative flex gap-3 pb-6">
        <TimeColumn startTime={node.time} endTime={node.endTime} />
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            <TransportIcon className="size-4" />
          </div>
          {!isLast && <div className="mt-1 h-full w-px bg-border" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-primary">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium">移動</span>
                </div>
                <h4 className="mt-1 font-serif text-sm font-bold text-foreground">{node.name}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {TRANSPORT_LABELS[node.transport]} {node.distance}km
                </p>
                {node.notes && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{node.notes}</p>
                )}
              </div>
              {(node.image || isEditable) && (
                <div className="flex shrink-0 items-start gap-1">
                  {node.image && (
                    <img
                      src={node.image}
                      alt={node.name}
                      className="h-12 w-16 rounded-md object-cover"
                      crossOrigin="anonymous"
                    />
                  )}
                  {isEditable && onEditMove && (
                    <button
                      onClick={() => onEditMove(node)}
                      className="mt-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      aria-label={`${node.name}を編集`}
                    >
                      <Pencil className="size-3" />
                    </button>
                  )}
                  {isEditable && (
                    <button
                      onClick={() => removeNode(tripId, node.id)}
                      className="mt-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`${node.name}を削除`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (node.type === 'area') {
    return (
      <div className="relative flex gap-3 pb-6">
        <TimeColumn startTime={node.time} endTime={node.endTime} />
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/10 text-emerald-700">
            <MapIcon className="size-4" />
          </div>
          {!isLast && <div className="mt-1 h-full w-px bg-border" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium">エリア</span>
              </div>
              {isEditable && (
                <button
                  onClick={() => removeNode(tripId, node.id)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`${node.name}エリアを削除`}
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
            <h4 className="mt-1 font-serif text-sm font-bold text-foreground">{node.name}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">エリア内は順不同で回る想定</p>
            {node.spotNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {node.spotNames.map((spotName, idx) => (
                  <span
                    key={`${node.id}-spot-${idx}`}
                    className="rounded-full border border-emerald-400/30 bg-background px-2 py-0.5 text-[11px] text-foreground"
                  >
                    {spotName}
                  </span>
                ))}
              </div>
            )}
            {node.notes && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{node.notes}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex gap-3 pb-6">
      <TimeColumn startTime={node.time} endTime={node.endTime} />
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="size-4" />
        </div>
        {!isLast && <div className="mt-1 h-full w-px bg-border" />}
      </div>

      <div className="min-w-0 flex-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">スポット</span>
            </div>
            <h4 className="mt-1 font-serif text-sm font-bold text-foreground">{node.name}</h4>
            {node.notes && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{node.notes}</p>
            )}
          </div>
          {(node.image || isEditable) && (
            <div className="flex shrink-0 items-start gap-1">
              {node.image && (
                <img
                  src={node.image}
                  alt={node.name}
                  className="h-12 w-16 rounded-md object-cover"
                  crossOrigin="anonymous"
                />
              )}
              {isEditable && spot && onEditSpot && (
                <button
                  onClick={() => onEditSpot(spot)}
                  className="mt-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={`${node.name}を編集`}
                >
                  <Pencil className="size-3" />
                </button>
              )}
              {isEditable && (
                <button
                  onClick={() => removeSpot(tripId, node.id)}
                  className="mt-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`${node.name}を削除`}
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FreeTimeBlock({
  day,
  startTime,
  endTime,
  onInsertNode,
}: {
  day: number
  startTime: string
  endTime: string
  onInsertNode: (draft: TimelineInsertDraft) => void
}) {
  if (!startTime || !endTime) {
    return null
  }

  const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
  const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
  const diffMinutes = end - start
  const hasVisibleGap = diffMinutes > 30

  if (!hasVisibleGap) {
    return (
      <div className="relative flex gap-3 pb-4">
        <TimeColumn startTime={startTime} endTime={endTime} />
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'spot' })}
            className="z-10 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm transition-colors hover:bg-primary/5"
            aria-label={`${startTime}から${endTime}の間にノードを追加`}
          >
            <Plus className="size-3.5" />
          </button>
          <div className="mt-1 h-6 w-px bg-border" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5">
            <span className="text-xs text-muted-foreground">この間に追加</span>
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'spot' })}
              className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              スポット
            </button>
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'move' })}
              className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              移動
            </button>
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'area' })}
              className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20"
            >
              エリア
            </button>
          </div>
        </div>
      </div>
    )
  }

  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  const label = hours > 0 ? `${hours}時間${mins > 0 ? `${mins}分` : ''}` : `${mins}分`

  return (
    <div className="relative flex gap-3 pb-6">
      <TimeColumn startTime={startTime} endTime={endTime} />
      <div className="relative flex flex-col items-center">
        <button
          onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'spot' })}
          className="absolute -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm transition-colors hover:bg-primary/5"
          aria-label={`${startTime}から${endTime}の間にノードを追加`}
        >
          <Plus className="size-3.5" />
        </button>
        <div className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent bg-background text-accent">
          <Coffee className="size-4" />
        </div>
        <div className="mt-1 h-full w-px bg-border" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-accent-foreground/70">{label}のスキマ時間</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">ここに差し込み可能</p>
            </div>
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'spot' })}
              className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              + 追加
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'spot' })}
              className="flex-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              スポットを入れる
            </button>
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'move' })}
              className="flex-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              移動を入れる
            </button>
            <button
              onClick={() => onInsertNode({ day, time: startTime, endTime, type: 'area' })}
              className="flex-1 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20"
            >
              エリアでまとめる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Timeline({
  trip,
  isEditable,
  onAddNode,
  onEditSpot,
  onEditMove,
}: {
  trip: Trip
  isEditable: boolean
  onAddNode: (draft: TimelineInsertDraft) => void
  onEditSpot?: (spot: Spot) => void
  onEditMove?: (node: MoveNode) => void
}) {
  const dayCount =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1

  const allNodes = getTripTimelineNodes(trip)
  const spotById = new Map(trip.spots.map((spot) => [spot.id, spot]))
  const days = Array.from({ length: dayCount }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const dayNodes = allNodes.filter((node) => node.day === day)

        const startDate = new Date(trip.startDate)
        startDate.setDate(startDate.getDate() + day - 1)
        const dateStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
        const weekDays = ['日', '月', '火', '水', '木', '金', '土']
        const weekDay = weekDays[startDate.getDay()]

        return (
          <section key={day}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="font-serif text-base font-bold text-foreground">Day {day}</h3>
              <span className="text-xs text-muted-foreground">
                {dateStr}（{weekDay}）
              </span>
            </div>

            {dayNodes.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">まだノードがありません</p>
                {isEditable && (
                  <button
                    onClick={() => onAddNode({ day, type: 'spot' })}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    + 最初のノードを追加
                  </button>
                )}
              </div>
            ) : (
              <div>
                {dayNodes.map((node, idx) => {
                  const nextNode = dayNodes[idx + 1]

                  return (
                    <div key={node.id}>
                      <NodeBlock
                        node={node}
                        tripId={trip.id}
                        isLast={idx === dayNodes.length - 1}
                        isEditable={isEditable}
                        spot={node.type === 'spot' ? spotById.get(node.id) : undefined}
                        onEditSpot={onEditSpot}
                        onEditMove={onEditMove}
                      />
                      {isEditable && nextNode && (
                        <FreeTimeBlock
                          day={day}
                          startTime={node.endTime}
                          endTime={nextNode.time}
                          onInsertNode={onAddNode}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
