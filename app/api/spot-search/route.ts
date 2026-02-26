import { NextRequest, NextResponse } from 'next/server'

interface SpotSearchItem {
  id: string
  fsqId: string | null
  name: string
  address: string
  lat: number | null
  lng: number | null
  source: 'foursquare'
}

class FoursquareUpstreamError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(`Foursquare request failed: ${status}`)
    this.status = status
    this.body = body
  }
}

type FsqAutocompleteResult = {
  fsq_id?: string
  id?: string
  type?: string
  name?: string
  text?: {
    primary?: string
    secondary?: string
  }
  location?: {
    formatted_address?: string
    address?: string
    locality?: string
    region?: string
    country?: string
  }
  geocodes?: {
    main?: {
      latitude?: number
      longitude?: number
      lat?: number
      lng?: number
    }
  }
  place?: {
    fsq_id?: string
    id?: string
    name?: string
    location?: {
      formatted_address?: string
      address?: string
      locality?: string
      region?: string
      country?: string
    }
    geocodes?: {
      main?: {
        latitude?: number
        longitude?: number
        lat?: number
        lng?: number
      }
    }
  }
  placePrediction?: {
    place?: {
      fsq_id?: string
      id?: string
      name?: string
      location?: {
        formatted_address?: string
        address?: string
        locality?: string
        region?: string
        country?: string
      }
      geocodes?: {
        main?: {
          latitude?: number
          longitude?: number
          lat?: number
          lng?: number
        }
      }
    }
    text?: {
      primary?: string
      secondary?: string
      text?: string
    }
  }
  geoPrediction?: {
    id?: string
    text?: {
      primary?: string
      secondary?: string
      text?: string
    }
    geocodes?: {
      main?: {
        latitude?: number
        longitude?: number
        lat?: number
        lng?: number
      }
    }
    location?: {
      formatted_address?: string
      address?: string
      locality?: string
      region?: string
      country?: string
    }
  }
  queryPrediction?: {
    text?: {
      primary?: string
      secondary?: string
      text?: string
    }
  }
}

function buildAddress(
  location:
    | FsqAutocompleteResult['location']
    | NonNullable<FsqAutocompleteResult['place']>['location']
) {
  if (!location) return ''
  if (location.formatted_address) return location.formatted_address
  return [location.address, location.locality, location.region, location.country]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(', ')
}

function pickLatLng(result: FsqAutocompleteResult) {
  const geocodes =
    result.placePrediction?.place?.geocodes ??
    result.geoPrediction?.geocodes ??
    result.place?.geocodes ??
    result.geocodes
  const main = geocodes?.main
  const lat = main?.latitude ?? main?.lat
  const lng = main?.longitude ?? main?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

function getAutocompleteArray(data: unknown): FsqAutocompleteResult[] {
  if (!data || typeof data !== 'object') return []
  const record = data as Record<string, unknown>
  const candidates =
    (Array.isArray(record.results) && record.results) ||
    (Array.isArray(record.items) && record.items) ||
    (Array.isArray(record.suggestions) && record.suggestions) ||
    (Array.isArray(record.predictions) && record.predictions) ||
    []

  return candidates as FsqAutocompleteResult[]
}

function mapAutocompleteResults(results: FsqAutocompleteResult[]): SpotSearchItem[] {
  return results
    .map((result, index) => {
      const place =
        result.placePrediction?.place ??
        result.geoPrediction ??
        result.place ??
        result
      const placeName =
        'name' in place && typeof place.name === 'string' ? place.name.trim() : ''
      const placeFsqId =
        'fsq_id' in place && typeof place.fsq_id === 'string' ? place.fsq_id : undefined
      const placeId =
        'id' in place && typeof place.id === 'string' ? place.id : undefined
      const latLng = pickLatLng(result)

      const name =
        placeName ||
        result.placePrediction?.text?.primary?.trim() ||
        result.geoPrediction?.text?.primary?.trim() ||
        result.queryPrediction?.text?.primary?.trim() ||
        result.placePrediction?.text?.text?.trim() ||
        result.geoPrediction?.text?.text?.trim() ||
        result.queryPrediction?.text?.text?.trim() ||
        result.name?.trim() ||
        result.text?.primary?.trim() ||
        '名称未設定'

      const address =
        buildAddress(place.location ?? result.location) ||
        result.placePrediction?.text?.secondary?.trim() ||
        result.geoPrediction?.text?.secondary?.trim() ||
        result.queryPrediction?.text?.secondary?.trim() ||
        result.text?.secondary?.trim() ||
        ''

      return {
        id: `foursquare-${placeFsqId ?? placeId ?? result.fsq_id ?? result.id ?? result.geoPrediction?.id ?? index}`,
        fsqId: placeFsqId ?? result.fsq_id ?? null,
        name,
        address,
        lat: latLng?.lat ?? null,
        lng: latLng?.lng ?? null,
        source: 'foursquare' as const,
      }
    })
    .filter((item) => item.name.length > 0)
}

type FsqPlaceDetails = {
  fsq_id?: string
  name?: string
  location?: {
    formatted_address?: string
    address?: string
    locality?: string
    region?: string
    country?: string
  }
  geocodes?: {
    main?: {
      latitude?: number
      longitude?: number
      lat?: number
      lng?: number
    }
  }
}

function mapPlaceDetailsToSpotSearchItem(place: FsqPlaceDetails): SpotSearchItem {
  const lat = place.geocodes?.main?.latitude ?? place.geocodes?.main?.lat ?? null
  const lng = place.geocodes?.main?.longitude ?? place.geocodes?.main?.lng ?? null
  return {
    id: `foursquare-${place.fsq_id ?? 'unknown'}`,
    fsqId: place.fsq_id ?? null,
    name: place.name?.trim() || '名称未設定',
    address: buildAddress(place.location),
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
    source: 'foursquare',
  }
}

function normalizeFoursquareApiVersion(version: string) {
  const v = version.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`
  }
  return '2025-06-17'
}

async function fetchFoursquareAutocomplete(
  url: URL,
  apiKey: string,
  lang: string,
  apiVersion: string
): Promise<unknown> {
  const authCandidates = [`Bearer ${apiKey}`, apiKey]
  let lastError: FoursquareUpstreamError | null = null

  for (const authHeader of authCandidates) {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Accept-Language': lang,
        'X-Places-Api-Version': apiVersion,
        'X-Foursquare-Api-Version': apiVersion,
        'User-Agent': 'travel-logs/spot-search',
      },
    })

    if (res.ok) {
      return (await res.json()) as unknown
    }

    const body = await res.text()
    lastError = new FoursquareUpstreamError(res.status, body)

    if (res.status !== 401 && res.status !== 403) {
      break
    }
  }

  throw lastError ?? new Error('Foursquare request failed')
}

async function fetchWithFoursquareAuth(
  urls: URL[],
  apiKey: string,
  lang: string,
  apiVersion: string
): Promise<unknown> {
  const authCandidates = [`Bearer ${apiKey}`, apiKey]
  let lastError: FoursquareUpstreamError | null = null

  for (const targetUrl of urls) {
    for (const authHeader of authCandidates) {
      const res = await fetch(targetUrl, {
        cache: 'no-store',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Accept-Language': lang,
          'X-Places-Api-Version': apiVersion,
          'X-Foursquare-Api-Version': apiVersion,
          'User-Agent': 'travel-logs/spot-search',
        },
      })

      if (res.ok) {
        return (await res.json()) as unknown
      }

      const body = await res.text()
      lastError = new FoursquareUpstreamError(res.status, body)

      if (res.status !== 401 && res.status !== 403) {
        break
      }
    }
  }

  throw lastError ?? new Error('Foursquare request failed')
}

async function searchFoursquareAutocomplete(
  query: string,
  limit: number,
  lang: string,
  apiKey: string,
  apiVersion: string,
  ll?: string,
  radius?: string,
  sessionToken?: string
): Promise<SpotSearchItem[]> {
  const url = new URL('https://places-api.foursquare.com/autocomplete')
  url.searchParams.set('query', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('v', apiVersion)

  if (ll?.trim()) {
    url.searchParams.set('ll', ll.trim())
  }

  if (radius?.trim()) {
    url.searchParams.set('radius', radius.trim())
  }

  if (sessionToken?.trim()) {
    url.searchParams.set('session_token', sessionToken.trim())
  }

  const data = await fetchFoursquareAutocomplete(url, apiKey, lang, apiVersion)
  const rawResults = getAutocompleteArray(data)
  return mapAutocompleteResults(rawResults)
}

async function getFoursquarePlaceDetails(
  fsqId: string,
  lang: string,
  apiKey: string,
  apiVersion: string
): Promise<SpotSearchItem> {
  const urls = [
    new URL(`https://places-api.foursquare.com/places/${encodeURIComponent(fsqId)}`),
    new URL(`https://api.foursquare.com/v3/places/${encodeURIComponent(fsqId)}`),
  ]

  for (const url of urls) {
    url.searchParams.set('fields', 'fsq_id,name,location,geocodes')
    url.searchParams.set('v', apiVersion)
  }

  const data = (await fetchWithFoursquareAuth(urls, apiKey, lang, apiVersion)) as FsqPlaceDetails
  return mapPlaceDetailsToSpotSearchItem(data)
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const fsqId = req.nextUrl.searchParams.get('fsq_id')?.trim() ?? ''
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? '6')
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10, limitRaw)) : 6
  const lang = req.nextUrl.searchParams.get('lang')?.trim() || 'ja'
  const ll =
    req.nextUrl.searchParams.get('ll')?.trim() ||
    process.env.FOURSQUARE_SEARCH_LL ||
    undefined
  const radius =
    req.nextUrl.searchParams.get('radius')?.trim() ||
    process.env.FOURSQUARE_SEARCH_RADIUS ||
    undefined
  const apiVersion = normalizeFoursquareApiVersion(
    process.env.FOURSQUARE_API_VERSION || '2025-06-17'
  )
  const sessionToken = req.nextUrl.searchParams.get('session_token')?.trim() ?? undefined

  if (!fsqId && q.length < 2) {
    return NextResponse.json({ results: [], provider: 'foursquare' })
  }

  const apiKey =
    process.env.FOURSQARE_SERVICE_API_KEY ||
    process.env.FOURSQUARE_SERVICE_API_KEY ||
    process.env.FOURSQUARE_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        results: [],
        provider: 'foursquare',
        error: 'Foursquare API key is not configured',
      },
      { status: 500 }
    )
  }

  try {
    if (fsqId) {
      const place = await getFoursquarePlaceDetails(fsqId, lang, apiKey, apiVersion)
      return NextResponse.json({ place, provider: 'foursquare' })
    }

    const results = await searchFoursquareAutocomplete(
      q,
      limit,
      lang,
      apiKey,
      apiVersion,
      ll,
      radius,
      sessionToken
    )
    return NextResponse.json({ results, provider: 'foursquare' })
  } catch (error) {
    console.error('spot-search failed', error)
    if (error instanceof FoursquareUpstreamError) {
      return NextResponse.json(
        {
          results: [],
          provider: 'foursquare',
          error: 'spot search failed',
          upstreamStatus: error.status,
          upstreamBody: error.body.slice(0, 800),
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { results: [], provider: 'foursquare', error: 'spot search failed' },
      { status: 502 }
    )
  }
}
