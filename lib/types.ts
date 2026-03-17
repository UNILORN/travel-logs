export const TRIP_STATUSES = ['planning', 'traveling', 'archived'] as const

export type TripStatus = (typeof TRIP_STATUSES)[number]

export const TRANSPORT_TYPES = [
  'train',
  'limited_express',
  'shinkansen',
  'bus',
  'car',
  'walk',
  'ferry',
  'plane',
  'taxi',
  'bicycle',
  'ropeway',
] as const

export type TransportType = (typeof TRANSPORT_TYPES)[number]

export const EXPENSE_CATEGORIES = [
  'transport',
  'accommodation',
  'activity',
  'food',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Trip {
  id: string
  title: string
  destination: string
  coverImage: string
  startDate: string
  endDate: string
  status: TripStatus
  members: { adults: number; children: number }
  budget: number
  /** New timeline model: move / spot as separate nodes */
  nodes?: TimelineNode[]
  /** Legacy model still used by parts of the UI; kept for compatibility during migration */
  spots: Spot[]
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
  image: string
  notes: string
  /** Optional: some moves like ferries have origin/destination coords */
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  /** Route points in drawing order (including anchors when available). */
  path?: { lat: number; lng: number }[]
}

/** A grouped area block (unordered visits inside a rough time box) */
export interface AreaNode {
  type: 'area'
  id: string
  name: string
  time: string
  endTime: string
  day: number
  spotNames: string[]
  notes: string
}

export type TimelineNode = SpotNode | MoveNode | AreaNode

/**
 * Legacy spot model that stores the inbound movement on the spot itself.
 * Timeline UI converts this to separate move/spot nodes when rendering.
 */
export interface Spot {
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
  transport: TransportType
  distance: number
}

export interface Expense {
  id: string
  category: ExpenseCategory
  name: string
  adultPrice: number
  childPrice: number
  adultCount: number
  childCount: number
  total: number
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: '交通費',
  accommodation: '宿泊費',
  activity: 'アクティビティ',
  food: '食事',
  other: 'その他',
}

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  train: '電車',
  limited_express: '在来線特急',
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

export const STATUS_LABELS: Record<TripStatus, string> = {
  planning: '計画中',
  traveling: '旅行中',
  archived: 'アーカイブ',
}
