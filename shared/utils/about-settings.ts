export const ABOUT_SETTING_LIMITS = {
  'about.title': 80,
  'about.subtitle': 160,
  'about.markdown': 10_000,
  'about.attribution': 300,
} as const

export const ABOUT_SETTING_DEFAULTS = {
  'about.title': 'About',
  'about.subtitle': 'Personal photo gallery',
  'about.markdown':
    'ChronoFrame is a self-hosted personal photo gallery for browsing photos with EXIF metadata and map-based location views.\n\nThis fork is maintained for my personal website and future customization experiments.',
  'about.attribution': 'Based on ChronoFrame v{version}.',
} as const

export function validateAboutSettingValue(
  namespace: string,
  key: string,
  value: unknown,
): void {
  if (namespace !== 'app') return

  const maxLength =
    ABOUT_SETTING_LIMITS[key as keyof typeof ABOUT_SETTING_LIMITS]
  if (maxLength === undefined) return

  if (typeof value !== 'string') {
    throw new TypeError(`Setting ${namespace}:${key} must be a string`)
  }

  if (value.length > maxLength) {
    throw new RangeError(
      `Setting ${namespace}:${key} must not exceed ${maxLength} characters`,
    )
  }
}
