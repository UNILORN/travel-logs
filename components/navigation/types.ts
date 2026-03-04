import type { MoveNode, SpotNode } from '@/lib/types'

export interface NavigateMapEntry {
  spot: SpotNode
  prevMove?: MoveNode
  nextMove?: MoveNode
  sequence: number
}
