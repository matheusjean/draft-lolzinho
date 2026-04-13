import rawChampions from '../../champions.json'

import { normalizeName } from './app-utils'

function normalizeChampionIcon(iconUrl) {
  if (!iconUrl) return ''
  return iconUrl.replace('http://', 'https://')
}

function normalizeChampionLookup(value) {
  return normalizeName(value || '').replace(/[^a-z0-9]/g, '')
}

export const CHAMPION_OPTIONS = rawChampions
  .map((champion) => ({
    id: champion.id,
    key: champion.key,
    name: champion.name,
    title: champion.title,
    icon: normalizeChampionIcon(champion.icon),
    tags: Array.isArray(champion.tags) ? champion.tags : [],
    lookupKey: normalizeChampionLookup(champion.name),
    searchText: [
      champion.name,
      champion.id,
      champion.title,
      ...(Array.isArray(champion.tags) ? champion.tags : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }))
  .sort((left, right) => left.name.localeCompare(right.name))

export function findChampionByName(name) {
  const normalizedTarget = normalizeChampionLookup(name)

  if (!normalizedTarget) {
    return null
  }

  return (
    CHAMPION_OPTIONS.find((champion) => champion.lookupKey === normalizedTarget) ||
    null
  )
}
