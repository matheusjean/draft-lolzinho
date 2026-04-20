const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const API_DEBUG =
  import.meta.env.DEV || import.meta.env.VITE_API_DEBUG === 'true'

function safeParseJson(text) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers }

  if (sanitized.Authorization) {
    sanitized.Authorization = 'Bearer ***'
  }

  return sanitized
}

function logApiRequest({ method, url, headers, body }) {
  if (!API_DEBUG) return

  console.info('[api] request', {
    method,
    url,
    headers: sanitizeHeaders(headers),
    body: body ? safeParseJson(body) : null,
  })
}

function logApiResponse({ method, url, response, data, duration }) {
  if (!API_DEBUG) return

  const logger = response.ok ? console.info : console.error

  logger('[api] response', {
    method,
    url,
    status: response.status,
    statusText: response.statusText,
    durationMs: Math.round(duration),
    data,
  })
}

function createApiError(response, data) {
  const message =
    data?.message ||
    data?.error ||
    (typeof data === 'string' ? data : '') ||
    'Nao foi possivel concluir a requisicao.'

  const error = new Error(message)
  error.status = response.status
  error.statusText = response.statusText
  error.payload = data
  return error
}

async function request(path, { token, headers, ...options } = {}) {
  const url = `${API_BASE}${path}`
  const method = options.method || 'GET'
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }
  const startedAt = performance.now()

  logApiRequest({
    method,
    url,
    headers: requestHeaders,
    body: options.body,
  })

  const response = await fetch(url, {
    ...options,
    headers: requestHeaders,
  })

  const text = await response.text()
  const data = safeParseJson(text)
  const duration = performance.now() - startedAt

  logApiResponse({
    method,
    url,
    response,
    data,
    duration,
  })

  if (!response.ok) {
    throw createApiError(response, data)
  }

  return data
}

export function requestLoginCode(email) {
  return request('/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function verifyLoginCode(email, code) {
  return request('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

export function getMe(token) {
  return request('/auth/me', { token })
}

export function getPlayers(token, search = '') {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : ''
  return request(`/players${suffix}`, { token })
}

export function getPlayerById(id, token) {
  return request(`/players/${id}`, { token })
}

export function createPlayer(token, payload) {
  return request('/players', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function syncPlayers(token, players) {
  return request('/players/sync', {
    method: 'POST',
    token,
    body: JSON.stringify({ players }),
  })
}

export function getMatches(token) {
  return request('/matches', { token })
}

export function createMatch(token, payload) {
  return request('/matches', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function deleteMatch(token, id) {
  return request(`/matches/${id}`, {
    method: 'DELETE',
    token,
  })
}
