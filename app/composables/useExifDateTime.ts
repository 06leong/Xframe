import type { NeededExif } from '~~/shared/types/photo'

const parseExifOffsetMinutes = (value?: string | null): number | null => {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  const match = normalized.match(
    /^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i,
  )
  if (!match) {
    return null
  }

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2])
  const minutes = match[3] ? Number(match[3]) : 0

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 14 ||
    minutes > 59
  ) {
    return null
  }

  return sign * (hours * 60 + minutes)
}

const getExifOffsetMinutes = (exif?: NeededExif | null): number | null =>
  parseExifOffsetMinutes(
    exif?.OffsetTimeOriginal || exif?.OffsetTime || exif?.tz,
  )

export const useExifDateTime = () => {
  const dayjs = useDayjs()

  const formatExifDateTime = (
    date?: string | null,
    exif?: NeededExif | null,
    format = 'L LT',
  ): string => {
    if (!date) {
      return ''
    }

    const parsedDate = dayjs(date)
    if (!parsedDate.isValid()) {
      return ''
    }

    const offsetMinutes = getExifOffsetMinutes(exif)
    if (offsetMinutes !== null) {
      return parsedDate.utcOffset(offsetMinutes).format(format)
    }

    return parsedDate.format(format)
  }

  return {
    formatExifDateTime,
    getExifOffsetMinutes,
  }
}
