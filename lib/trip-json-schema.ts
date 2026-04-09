import { EXPENSE_CATEGORIES, TRANSPORT_TYPES, TRIP_STATUSES } from '@/lib/types'

const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$'
const TIME_PATTERN = '^([01]\\d|2[0-3]):[0-5]\\d$'

export const TRIP_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://travel-logs.local/schemas/trips.schema.json',
  title: 'Travel Logs Trip Collection',
  description:
    'Travel Logs app data. The canonical format always stores both timeline nodes and legacy spot records.',
  type: 'array',
  items: {
    $ref: '#/$defs/trip',
  },
  $defs: {
    tripStatus: {
      type: 'string',
      enum: [...TRIP_STATUSES],
    },
    transportType: {
      type: 'string',
      enum: [...TRANSPORT_TYPES],
    },
    expenseCategory: {
      type: 'string',
      enum: [...EXPENSE_CATEGORIES],
    },
    members: {
      type: 'object',
      additionalProperties: false,
      required: ['adults', 'children'],
      properties: {
        adults: {
          type: 'integer',
          minimum: 1,
        },
        children: {
          type: 'integer',
          minimum: 0,
        },
      },
    },
    spotNode: {
      type: 'object',
      additionalProperties: false,
      required: [
        'type',
        'id',
        'name',
        'time',
        'endTime',
        'day',
        'address',
        'lat',
        'lng',
        'image',
        'notes',
      ],
      properties: {
        type: {
          type: 'string',
          enum: ['spot'],
        },
        id: {
          type: 'string',
          minLength: 1,
        },
        name: {
          type: 'string',
        },
        time: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        endTime: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        day: {
          type: 'integer',
          minimum: 1,
        },
        address: {
          type: 'string',
        },
        lat: {
          type: 'number',
          minimum: -90,
          maximum: 90,
        },
        lng: {
          type: 'number',
          minimum: -180,
          maximum: 180,
        },
        image: {
          type: 'string',
        },
        notes: {
          type: 'string',
        },
      },
    },
    moveNode: {
      type: 'object',
      additionalProperties: false,
      required: [
        'type',
        'id',
        'name',
        'time',
        'endTime',
        'day',
        'transport',
        'distance',
        'image',
        'notes',
      ],
      properties: {
        type: {
          type: 'string',
          enum: ['move'],
        },
        id: {
          type: 'string',
          minLength: 1,
        },
        name: {
          type: 'string',
        },
        time: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        endTime: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        day: {
          type: 'integer',
          minimum: 1,
        },
        transport: {
          $ref: '#/$defs/transportType',
        },
        distance: {
          type: 'number',
          minimum: 0,
        },
        image: {
          type: 'string',
        },
        notes: {
          type: 'string',
        },
        fromLat: {
          type: 'number',
          minimum: -90,
          maximum: 90,
        },
        fromLng: {
          type: 'number',
          minimum: -180,
          maximum: 180,
        },
        toLat: {
          type: 'number',
          minimum: -90,
          maximum: 90,
        },
        toLng: {
          type: 'number',
          minimum: -180,
          maximum: 180,
        },
        path: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['lat', 'lng'],
            properties: {
              lat: {
                type: 'number',
                minimum: -90,
                maximum: 90,
              },
              lng: {
                type: 'number',
                minimum: -180,
                maximum: 180,
              },
            },
          },
        },
      },
    },
    areaNode: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'id', 'name', 'time', 'endTime', 'day', 'spotNames', 'notes'],
      properties: {
        type: {
          type: 'string',
          enum: ['area'],
        },
        id: {
          type: 'string',
          minLength: 1,
        },
        name: {
          type: 'string',
        },
        time: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        endTime: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        day: {
          type: 'integer',
          minimum: 1,
        },
        spotNames: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        notes: {
          type: 'string',
        },
        polygon: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['lat', 'lng'],
            properties: {
              lat: {
                type: 'number',
                minimum: -90,
                maximum: 90,
              },
              lng: {
                type: 'number',
                minimum: -180,
                maximum: 180,
              },
            },
          },
        },
      },
    },
    timelineNode: {
      oneOf: [
        { $ref: '#/$defs/spotNode' },
        { $ref: '#/$defs/moveNode' },
        { $ref: '#/$defs/areaNode' },
      ],
    },
    legacySpot: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'name',
        'time',
        'endTime',
        'day',
        'address',
        'lat',
        'lng',
        'image',
        'notes',
        'transport',
        'distance',
      ],
      properties: {
        id: {
          type: 'string',
          minLength: 1,
        },
        name: {
          type: 'string',
        },
        time: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        endTime: {
          type: 'string',
          pattern: TIME_PATTERN,
        },
        day: {
          type: 'integer',
          minimum: 1,
        },
        address: {
          type: 'string',
        },
        lat: {
          type: 'number',
          minimum: -90,
          maximum: 90,
        },
        lng: {
          type: 'number',
          minimum: -180,
          maximum: 180,
        },
        image: {
          type: 'string',
        },
        notes: {
          type: 'string',
        },
        transport: {
          $ref: '#/$defs/transportType',
        },
        distance: {
          type: 'number',
          minimum: 0,
        },
      },
    },
    expense: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'category',
        'name',
        'adultPrice',
        'childPrice',
        'adultCount',
        'childCount',
        'total',
      ],
      properties: {
        id: {
          type: 'string',
          minLength: 1,
        },
        category: {
          $ref: '#/$defs/expenseCategory',
        },
        name: {
          type: 'string',
        },
        adultPrice: {
          type: 'number',
          minimum: 0,
        },
        childPrice: {
          type: 'number',
          minimum: 0,
        },
        adultCount: {
          type: 'integer',
          minimum: 0,
        },
        childCount: {
          type: 'integer',
          minimum: 0,
        },
        total: {
          type: 'number',
          minimum: 0,
        },
      },
    },
    trip: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'title',
        'destination',
        'coverImage',
        'startDate',
        'endDate',
        'status',
        'members',
        'budget',
        'nodes',
        'spots',
        'expenses',
      ],
      properties: {
        id: {
          type: 'string',
          minLength: 1,
        },
        title: {
          type: 'string',
        },
        destination: {
          type: 'string',
        },
        coverImage: {
          type: 'string',
        },
        startDate: {
          type: 'string',
          pattern: DATE_PATTERN,
        },
        endDate: {
          type: 'string',
          pattern: DATE_PATTERN,
        },
        status: {
          $ref: '#/$defs/tripStatus',
        },
        members: {
          $ref: '#/$defs/members',
        },
        budget: {
          type: 'number',
          minimum: 0,
        },
        nodes: {
          type: 'array',
          items: {
            $ref: '#/$defs/timelineNode',
          },
        },
        spots: {
          type: 'array',
          items: {
            $ref: '#/$defs/legacySpot',
          },
        },
        expenses: {
          type: 'array',
          items: {
            $ref: '#/$defs/expense',
          },
        },
      },
    },
  },
} as const
