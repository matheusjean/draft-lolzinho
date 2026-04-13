export const PLAYER_COUNT = 10
export const DEFAULT_ADMIN_EMAIL = 'matheusjean11@gmail.com'
export const AUTH_TOKEN_KEY = 'lol_draft_auth_token'
export const AUTH_EMAIL_KEY = 'lol_draft_auth_email'

export const ROLE_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'jungle', label: 'Jungle' },
  { value: 'mid', label: 'Mid' },
  { value: 'adc', label: 'ADC' },
  { value: 'support', label: 'Support' },
]

export const WINNER_OPTIONS = [
  { value: '', label: 'Sem vencedor definido' },
  { value: 'BLUE', label: 'Blue Side venceu' },
  { value: 'RED', label: 'Red Side venceu' },
]

export const ROLE_COLORS = [
  '#1E3A5F', '#5C1E1E', '#1E5C2A', '#4A1E5C', '#5C4A1E',
  '#1E4A5C', '#5C1E3A', '#2A5C1E', '#5C3A1E', '#1E1E5C',
]

export function normalizeName(name) {
  return name.trim().toLowerCase()
}

export function loadStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

export function loadStoredEmail() {
  return localStorage.getItem(AUTH_EMAIL_KEY) || DEFAULT_ADMIN_EMAIL
}

export function persistSession(token, email) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_EMAIL_KEY, email)
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_EMAIL_KEY)
}

export function trimOrNull(value) {
  const nextValue = value?.trim()
  return nextValue ? nextValue : null
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => resolve(event.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

function fitImageWithin(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height)

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

export async function fileToBase64(file) {
  const sourceDataUrl = await readFileAsDataUrl(file)

  if (!file.type?.startsWith('image/')) {
    return sourceDataUrl
  }

  const image = await loadImage(sourceDataUrl)
  const { width, height } = fitImageWithin(image.width, image.height, 512, 512)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return sourceDataUrl
  }

  context.drawImage(image, 0, 0, width, height)

  const webpDataUrl = canvas.toDataURL('image/webp', 0.82)
  if (webpDataUrl.startsWith('data:image/webp')) {
    return webpDataUrl
  }

  return canvas.toDataURL('image/jpeg', 0.82)
}

export function initials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function shufflePlayers(players) {
  const shuffled = [...players]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled
}

export function toDatetimeLocalValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

export function formatDate(dateString) {
  if (!dateString) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateString))
}

export function createSlots() {
  return Array.from({ length: PLAYER_COUNT }, () => ({
    id: null,
    name: '',
    imageUrl: null,
  }))
}

export function normalizeCatalogPlayer(player, index = 0) {
  return {
    id: player.id ?? null,
    name: player.name,
    imageUrl: player.playerImg || null,
    matchesCount: player.matchesCount ?? 0,
    lastMatchAt: player.lastMatchAt ?? null,
    index,
  }
}

export function mergeTeamDetails(team, previousEntries = []) {
  const previousMap = new Map(
    previousEntries.map(entry => [normalizeName(entry.playerName), entry])
  )

  return team.map(player => {
    const previous = previousMap.get(normalizeName(player.name))

    return {
      playerName: player.name,
      playerImg: player.imageUrl || null,
      championName: previous?.championName || '',
      role: previous?.role || '',
    }
  })
}
