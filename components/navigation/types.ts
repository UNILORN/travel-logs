import type { AreaNode, MoveNode, SpotNode } from '@/lib/types'
import type { LatLngPoint } from '@/lib/move-path'

/** Spot node entry for map display */
export interface NavigateSpotEntry {
  type: 'spot'
  id: string
  node: SpotNode
  prevMove?: MoveNode
  nextMove?: MoveNode
  prevArea?: AreaNode
  nextArea?: AreaNode
  sequence: number
}

/** Move node entry — knows its adjacent spots and pre-computed route points */
export interface NavigateMoveEntry {
  type: 'move'
  id: string
  node: MoveNode
  fromSpot?: SpotNode
  toSpot?: SpotNode
  routePoints: LatLngPoint[]
}

/** Area node entry — optionally carries a drawable polygon */
export interface NavigateAreaEntry {
  type: 'area'
  id: string
  node: AreaNode
}

export type NavigateEntry = NavigateSpotEntry | NavigateMoveEntry | NavigateAreaEntry

/** Legacy alias kept for internal backward-compat (same shape as NavigateSpotEntry) */
export type NavigateMapEntry = NavigateSpotEntry

export interface NavigateRouteSegment {
  id: string
  move: MoveNode
  points: LatLngPoint[]
}
