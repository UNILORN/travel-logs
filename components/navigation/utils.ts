import type { MoveNode, TransportType } from '@/lib/types'

export function hasVisibleMove(move?: MoveNode): move is MoveNode {
  return Boolean(move && move.distance > 0)
}

export function formatDistanceKm(distance: number) {
  return `${distance.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}km`
}

export function getTransportRouteStyle(transport: TransportType) {
  switch (transport) {
    case 'train':
    case 'car':
    case 'taxi':
    case 'bicycle':
      return {
        color: '#16a34a',
        dashArray: undefined as string | undefined,
        weight: 4,
        opacity: 0.85,
      }
    case 'shinkansen':
      return {
        color: '#2563eb',
        dashArray: undefined as string | undefined,
        weight: 4,
        opacity: 0.85,
      }
    case 'limited_express':
      return {
        color: '#f97316',
        dashArray: undefined as string | undefined,
        weight: 4,
        opacity: 0.85,
      }
    case 'bus':
      return {
        color: '#eab308',
        dashArray: undefined as string | undefined,
        weight: 4,
        opacity: 0.9,
      }
    case 'ferry':
      return { color: '#2563eb', dashArray: '8 8', weight: 4, opacity: 0.85 }
    case 'plane':
      return { color: '#16a34a', dashArray: '8 8', weight: 4, opacity: 0.85 }
    case 'walk':
      return {
        color: '#dc2626',
        dashArray: undefined as string | undefined,
        weight: 4,
        opacity: 0.9,
      }
    default:
      return {
        color: '#6b7280',
        dashArray: undefined as string | undefined,
        weight: 4,
        opacity: 0.85,
      }
  }
}
