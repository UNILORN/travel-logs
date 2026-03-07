import type { AreaNode, MoveNode, SpotNode } from '@/lib/types'

export interface NavigateMapEntry {
  spot: SpotNode
  prevMove?: MoveNode
  nextMove?: MoveNode
  prevArea?: AreaNode
  nextArea?: AreaNode
  sequence: number
}
