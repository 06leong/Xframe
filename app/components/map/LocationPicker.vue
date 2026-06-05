<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { MapInstance } from '~~/shared/types/map'

interface LocationSearchResult {
  id: string
  title: string
  description: string
  coordinates: [number, number]
}

const props = withDefaults(
  defineProps<{
    modelValue?: { latitude: number; longitude: number } | null
    zoom?: number
    class?: string
  }>(),
  {
    modelValue: null,
    zoom: 4,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [{ latitude: number; longitude: number } | null]
  pick: [{ latitude: number; longitude: number }]
}>()

const mapInstance = ref<MapInstance | null>(null)
const markerCoordinates = ref<[number, number] | null>(null)
const { locale, t } = useI18n()

const searchQuery = ref('')
const searchResults = ref<LocationSearchResult[]>([])
const searchLoading = ref(false)
const searchError = ref('')
const searchCache = new Map<string, LocationSearchResult[]>()

let clickHandler: ((event: any) => void) | null = null
let searchAbortController: AbortController | null = null

const mapConfig = computed<Record<string, unknown>>(() => {
  const config = getSetting('map')
  return typeof config === 'object' && config ? config : {}
})

const locationConfig = computed<Record<string, unknown>>(() => {
  const config = getSetting('location')
  return typeof config === 'object' && config ? config : {}
})

const maptilerToken = computed(() => {
  const token = mapConfig.value['maplibre.token']
  return typeof token === 'string' ? token.trim() : ''
})

const searchLanguage = computed(() => {
  const configuredLanguage = locationConfig.value.language
  const language =
    typeof configuredLanguage === 'string' && configuredLanguage
      ? configuredLanguage
      : locale.value

  if (
    language === 'zh' ||
    language === 'zh-CN' ||
    language === 'zh-TW' ||
    language === 'zh-HK' ||
    language === 'zh-Hans' ||
    language.startsWith('zh-TW') ||
    language.startsWith('zh-HK') ||
    language.startsWith('zh-CN') ||
    language.startsWith('zh-Hans')
  ) {
    return 'zh'
  }

  if (language.startsWith('ja')) {
    return 'ja'
  }

  return 'en'
})

const normalizedSearchQuery = computed(() =>
  searchQuery.value.trim().replace(/\s+/g, ' '),
)

const stopSearchRequest = () => {
  if (searchAbortController) {
    searchAbortController.abort()
    searchAbortController = null
  }

  searchLoading.value = false
}

const parseCoordinateQuery = (
  query: string,
): { latitude: number; longitude: number } | null => {
  const normalizedQuery = query
    .trim()
    .replace(/[，、]/g, ',')
    .replace(/\s+/g, ' ')

  const values = normalizedQuery.match(/[-+]?\d+(?:\.\d+)?/g)
  if (!values || values.length !== 2) {
    return null
  }

  const first = Number(values[0])
  const second = Number(values[1])
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null
  }

  const isValidLatitude = (value: number) => Math.abs(value) <= 90
  const isValidLongitude = (value: number) => Math.abs(value) <= 180

  if (isValidLatitude(first) && isValidLongitude(second)) {
    return {
      latitude: first,
      longitude: second,
    }
  }

  if (isValidLongitude(first) && isValidLatitude(second)) {
    return {
      latitude: second,
      longitude: first,
    }
  }

  return null
}

const moveMapToCoordinates = (coordinates: [number, number], zoom = 12) => {
  if (!mapInstance.value) {
    return
  }

  const map: any = mapInstance.value
  if (typeof map.flyTo === 'function') {
    map.flyTo({
      center: coordinates,
      zoom,
      essential: true,
    })
    return
  }

  map.setCenter?.(coordinates)
  map.setZoom?.(zoom)
}

const normalizeMapTilerFeature = (
  feature: any,
  index: number,
): LocationSearchResult | null => {
  const coordinates = feature?.center || feature?.geometry?.coordinates
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    typeof coordinates[0] !== 'number' ||
    typeof coordinates[1] !== 'number'
  ) {
    return null
  }

  const title =
    feature?.text ||
    feature?.place_name?.split(',')?.[0]?.trim() ||
    feature?.properties?.name ||
    normalizedSearchQuery.value
  const description =
    feature?.place_name ||
    feature?.properties?.label ||
    `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`

  return {
    id: feature?.id || `${coordinates[0]}:${coordinates[1]}:${index}`,
    title,
    description,
    coordinates: [coordinates[0], coordinates[1]],
  }
}

const selectSearchResult = (result: LocationSearchResult) => {
  const [longitude, latitude] = result.coordinates
  searchQuery.value = result.title
  searchResults.value = []
  searchError.value = ''
  updateValue(latitude, longitude)
  moveMapToCoordinates(result.coordinates)
}

const handleLocationSearch = async () => {
  const query = normalizedSearchQuery.value
  stopSearchRequest()
  searchError.value = ''
  searchResults.value = []

  if (query.length < 2) {
    searchError.value = t(
      'dashboard.photos.editModal.fields.locationSearchMinLength',
    )
    return
  }

  const coordinates = parseCoordinateQuery(query)
  if (coordinates) {
    updateValue(coordinates.latitude, coordinates.longitude)
    moveMapToCoordinates([coordinates.longitude, coordinates.latitude])
    return
  }

  if (!maptilerToken.value) {
    searchError.value = t(
      'dashboard.photos.editModal.fields.locationSearchMissingToken',
    )
    return
  }

  const cacheKey = `${searchLanguage.value}:${query.toLowerCase()}`
  const cachedResults = searchCache.get(cacheKey)
  if (cachedResults) {
    searchResults.value = cachedResults
    if (cachedResults.length === 0) {
      searchError.value = t(
        'dashboard.photos.editModal.fields.locationSearchNoResults',
      )
    }
    return
  }

  const controller = new AbortController()
  searchAbortController = controller
  searchLoading.value = true

  try {
    const url = new URL(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`,
    )
    url.searchParams.set('key', maptilerToken.value)
    url.searchParams.set('language', searchLanguage.value)
    url.searchParams.set('limit', '5')
    url.searchParams.set('autocomplete', 'false')

    if (markerCoordinates.value) {
      url.searchParams.set('proximity', markerCoordinates.value.join(','))
    }

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`MapTiler geocoding failed: ${response.status}`)
    }

    const data = await response.json()
    const results = (data?.features || [])
      .map((feature: any, index: number) =>
        normalizeMapTilerFeature(feature, index),
      )
      .filter(Boolean) as LocationSearchResult[]

    searchCache.set(cacheKey, results)
    searchResults.value = results

    if (results.length === 0) {
      searchError.value = t(
        'dashboard.photos.editModal.fields.locationSearchNoResults',
      )
    }
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      searchError.value = t(
        'dashboard.photos.editModal.fields.locationSearchFailed',
      )
    }
  } finally {
    if (searchAbortController === controller) {
      searchLoading.value = false
      searchAbortController = null
    }
  }
}

const syncFromProps = (
  value: { latitude: number; longitude: number } | null,
) => {
  if (value) {
    markerCoordinates.value = [value.longitude, value.latitude]
    if (mapInstance.value) {
      const map: any = mapInstance.value
      map.flyTo?.({
        center: markerCoordinates.value,
        zoom: Math.max(props.zoom ?? 4, 4),
        essential: true,
      })
    }
  } else {
    markerCoordinates.value = null
  }
}

watch(
  () => props.modelValue,
  (value) => {
    syncFromProps(value ?? null)
  },
  { immediate: true },
)

const updateValue = (
  latitude: number,
  longitude: number,
  shouldEmitPick = true,
) => {
  markerCoordinates.value = [longitude, latitude]
  emit('update:modelValue', { latitude, longitude })
  if (shouldEmitPick) {
    emit('pick', { latitude, longitude })
  }
}

const handleMapClick = (event: any) => {
  const point =
    event?.lngLat ||
    event?.latlng ||
    (Array.isArray(event) ? { lng: event[0], lat: event[1] } : null)
  if (!point) {
    return
  }
  const latitude =
    typeof point.lat === 'number' ? point.lat : (point.latitude ?? point[1])
  const longitude =
    typeof point.lng === 'number' ? point.lng : (point.longitude ?? point[0])
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return
  }
  updateValue(latitude, longitude)
}

const onMapLoad = (map: MapInstance) => {
  mapInstance.value = map

  if (markerCoordinates.value) {
    const anyMap: any = map
    anyMap.setCenter?.(markerCoordinates.value)
    anyMap.setZoom?.(Math.max(props.zoom ?? 4, 4))
  }

  const anyMap: any = map
  if (typeof anyMap.on === 'function') {
    clickHandler = (event: any) => handleMapClick(event)
    anyMap.on('click', clickHandler)
  }
}

onBeforeUnmount(() => {
  stopSearchRequest()
  if (mapInstance.value && clickHandler) {
    const anyMap: any = mapInstance.value
    if (typeof anyMap.off === 'function') {
      anyMap.off('click', clickHandler)
    }
  }
})
</script>

<template>
  <div
    :class="['relative w-full h-64 rounded-xl overflow-hidden', $props.class]"
  >
    <MapProvider
      class="w-full h-full"
      :map-id="'photo-location-picker'"
      :center="markerCoordinates ?? undefined"
      :zoom="
        markerCoordinates ? Math.max($props.zoom ?? 4, 4) : ($props.zoom ?? 2)
      "
      :interactive="true"
      :language="locale"
      @load="onMapLoad"
    >
      <MapProviderMarker
        v-if="markerCoordinates"
        :lnglat="markerCoordinates"
      >
        <template #marker>
          <div class="relative">
            <div
              class="absolute inset-0 animate-ping rounded-full bg-primary/40"
            />
            <div
              class="relative size-4 rounded-full bg-primary border-2 border-white shadow"
            />
          </div>
        </template>
      </MapProviderMarker>
    </MapProvider>

    <div
      v-if="!markerCoordinates"
      class="absolute inset-0 pointer-events-none flex items-center justify-center text-sm text-neutral-600 dark:text-neutral-400"
    >
      <slot name="empty" />
    </div>

    <div class="absolute inset-x-3 top-3 z-10 space-y-2">
      <div
        class="flex items-center gap-2 rounded-lg bg-white/90 p-2 shadow-lg backdrop-blur dark:bg-neutral-900/90"
      >
        <UInput
          v-model="searchQuery"
          icon="tabler:search"
          size="sm"
          class="min-w-0 flex-1"
          :placeholder="
            t('dashboard.photos.editModal.fields.locationSearchPlaceholder')
          "
          :disabled="searchLoading"
          @keydown.enter.prevent="handleLocationSearch"
        />
        <UButton
          icon="tabler:search"
          size="sm"
          :loading="searchLoading"
          :disabled="searchLoading"
          @click="handleLocationSearch"
        >
          {{ t('dashboard.photos.editModal.fields.locationSearch') }}
        </UButton>
      </div>

      <div
        v-if="searchError"
        class="rounded-md border border-error-200 bg-white/95 px-3 py-2 text-xs text-error-600 shadow-lg backdrop-blur dark:border-error-500/30 dark:bg-neutral-900/95 dark:text-error-400"
      >
        {{ searchError }}
      </div>

      <div
        v-else-if="searchResults.length > 0"
        class="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-white/95 text-sm shadow-lg backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95"
      >
        <button
          v-for="result in searchResults"
          :key="result.id"
          type="button"
          class="block w-full border-b border-neutral-100 px-3 py-2 text-left last:border-b-0 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
          @click="selectSearchResult(result)"
        >
          <span
            class="block truncate font-medium text-neutral-800 dark:text-neutral-100"
          >
            {{ result.title }}
          </span>
          <span class="block truncate text-xs text-neutral-500">
            {{ result.description }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
