export interface Trip {
  id: string
  title: string
  destination: string
  coverImage: string
  startDate: string
  endDate: string
  status: 'planning' | 'traveling' | 'archived'
  members: { adults: number; children: number }
  budget: number
  nodes: TimelineNode[]
  expenses: Expense[]
}

/** A place to visit or stay */
export interface SpotNode {
  type: 'spot'
  id: string
  name: string
  time: string
  endTime: string
  day: number
  address: string
  lat: number
  lng: number
  image: string
  notes: string
}

/** A travel / movement segment — can be an experience itself (scenic train, ferry, etc.) */
export interface MoveNode {
  type: 'move'
  id: string
  name: string
  time: string
  endTime: string
  day: number
  transport: TransportType
  distance: number
  notes: string
  /** Optional: some moves like ferries have origin/destination coords */
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
}

export type TimelineNode = SpotNode | MoveNode

export type TransportType =
  | 'train'
  | 'shinkansen'
  | 'bus'
  | 'car'
  | 'walk'
  | 'ferry'
  | 'plane'
  | 'taxi'
  | 'bicycle'
  | 'ropeway'

export interface Expense {
  id: string
  category: 'transport' | 'accommodation' | 'activity' | 'food' | 'other'
  name: string
  adultPrice: number
  childPrice: number
  total: number
}

export type ExpenseCategory = Expense['category']

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: '交通費',
  accommodation: '宿泊費',
  activity: 'アクティビティ',
  food: '食事',
  other: 'その他',
}

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  train: '電車',
  shinkansen: '新幹線',
  bus: 'バス',
  car: '車',
  walk: '徒歩',
  ferry: 'フェリー',
  plane: '飛行機',
  taxi: 'タクシー',
  bicycle: '自転車',
  ropeway: 'ロープウェイ',
}

export const STATUS_LABELS: Record<Trip['status'], string> = {
  planning: '計画中',
  traveling: '旅行中',
  archived: 'アーカイブ',
}
