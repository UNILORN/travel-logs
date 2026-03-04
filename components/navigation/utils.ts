import type { MoveNode } from '@/lib/types'

export function hasVisibleMove(move?: MoveNode): move is MoveNode {
  return Boolean(move && move.distance > 0)
}

export function formatDistanceKm(distance: number) {
  return `${distance.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}km`
}
