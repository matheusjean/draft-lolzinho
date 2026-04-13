const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function request(path, { token, headers, ...options } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      'Nao foi possivel concluir a requisicao.'
    )
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
