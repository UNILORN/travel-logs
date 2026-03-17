import type { AreaNode, MoveNode, SpotNode } from '@/lib/types'
import type { LatLngPoint } from '@/lib/move-path'

export interface NavigateMapEntry {
  spot: SpotNode
  prevMove?: MoveNode
  nextMove?: MoveNode
  prevArea?: AreaNode
  nextArea?: AreaNode
  sequence: number
}

export interface NavigateRouteSegment {
  id: string
  move: MoveNode
  points: LatLngPoint[]
}
