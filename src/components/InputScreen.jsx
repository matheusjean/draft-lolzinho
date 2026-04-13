import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  createSlots,
  formatDate,
  initials,
  normalizeName,
  PLAYER_COUNT,
} from '../lib/app-utils'

const ICONS = {
  swords: '\u2694\uFE0F',
  up: '\u25B2',
  down: '\u25BC',
}

function PlayerRow({ slot, onChange, selectedNames, savedPlayers, loadingPlayers }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(slot.name)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const rowRef = useRef(null)
  const normalizedCurrentName = normalizeName(slot.name || '')
  const blockedNames = new Set(selectedNames.filter(name => name !== normalizedCurrentName))

  useEffect(() => {
    setQuery(slot.name)
  }, [slot.name])

  useEffect(() => {
    function onOutsideClick(event) {
      const list = document.getElementById('dropdown-portal')
      if (
        rowRef.current &&
        !rowRef.current.contains(event.target) &&
        (!list || !list.contains(event.target))
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  function openDropdown() {
    const rect = rowRef.current?.getBoundingClientRect()

    if (rect) {
      setDropPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }

    setOpen(true)
  }

  const availableSaved = savedPlayers.filter(player => !blockedNames.has(normalizeName(player.name)))
  const filtered = availableSaved.filter(player =>
    query.trim() === '' || player.name.toLowerCase().includes(query.toLowerCase())
  )

  function selectSaved(player) {
    onChange({
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
    })
    setQuery(player.name)
    setOpen(false)
  }

  function handleNameChange(value) {
    setQuery(value)
    onChange({
      id: null,
      name: value,
      imageUrl: null,
    })
    if (!open) openDropdown()
  }

  const showList = open && (filtered.length > 0 || query.trim() !== '' || loadingPlayers)

  const dropdownEl = showList && createPortal(
    <div
      id="dropdown-portal"
      className="dropdown-list"
      style={{
        position: 'absolute',
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        zIndex: 9999,
      }}
    >
      {loadingPlayers ? (
        <div className="dropdown-empty">Carregando players do backend...</div>
      ) : filtered.length === 0 ? (
        <div className="dropdown-empty">Player nao encontrado. Use o Cadastro de jogador no header.</div>
      ) : (
        filtered.map(player => (
          <div key={player.id || player.name} className="dropdown-item" onMouseDown={() => selectSaved(player)}>
            <div className="dropdown-item-avatar">
              {player.imageUrl
                ? <img src={player.imageUrl} alt="" />
                : <div className="dropdown-item-initials">{initials(player.name)}</div>}
            </div>
            <div className="dropdown-item-content">
              <span className="dropdown-item-name">{player.name}</span>
              <span className="dropdown-item-meta">
                {player.matchesCount || 0} partida{player.matchesCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>,
    document.body
  )

  return (
    <div className={`player-row ${slot.name.trim() ? 'row-filled' : ''}`} ref={rowRef}>
      <div className="inline-avatar-shell">
        {slot.imageUrl ? (
          <img src={slot.imageUrl} alt="" className="photo-preview" />
        ) : (
          <div className="photo-placeholder">
            <span className="photo-icon">{initials(slot.name || '?')}</span>
          </div>
        )}
      </div>

      <input
        className="name-input"
        type="text"
        placeholder="Selecione um player cadastrado..."
        value={query}
        maxLength={24}
        onChange={event => handleNameChange(event.target.value)}
        onFocus={openDropdown}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
        }}
      />

      {savedPlayers.length > 0 && (
        <button
          className="dropdown-arrow"
          type="button"
          onMouseDown={event => {
            event.preventDefault()
            if (open) setOpen(false)
            else openDropdown()
          }}
          title="Players salvos"
        >
          {open ? ICONS.up : ICONS.down}
        </button>
      )}

      {dropdownEl}
    </div>
  )
}

function RecentMatches({ matches }) {
  if (matches.length === 0) {
    return (
      <div className="insight-empty">
        Nenhuma partida salva ainda. Depois do draft pronto, preencha campeoes, rotas e salve.
      </div>
    )
  }

  return (
    <div className="recent-matches-grid">
      {matches.slice(0, 4).map(match => (
        <div key={match.id} className="recent-match-card">
          <div className="recent-match-title">{match.title || 'Partida sem titulo'}</div>
          <div className="recent-match-meta">{formatDate(match.gameDate)}</div>
          <div className="recent-match-meta">
            Blue {Array.isArray(match.blueTeam) ? match.blueTeam.length : 0} x Red {Array.isArray(match.redTeam) ? match.redTeam.length : 0}
          </div>
        </div>
      ))}
    </div>
  )
}

export function InputScreen({
  onStart,
  savedPlayers,
  recentMatches,
  syncingPlayers,
  loadingPlayers,
}) {
  const [slots, setSlots] = useState(createSlots)
  const selectedNames = slots.map(slot => normalizeName(slot.name || '')).filter(Boolean)
  const validCount = slots.filter(slot => slot.name.trim()).length

  function updateSlot(index, patch) {
    setSlots(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        ...patch,
      }
      return next
    })
  }

  async function handleStart() {
    const valid = slots
      .filter(slot => slot.name.trim())
      .map((slot, rank) => ({
        id: slot.id,
        name: slot.name.trim(),
        imageUrl: slot.imageUrl || null,
        index: rank,
      }))

    if (valid.length < 2) return
    if (new Set(valid.map(player => normalizeName(player.name))).size !== valid.length) return

    await onStart(valid)
  }

  return (
    <div className="input-screen">
      <div className="bg-runes" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`rune rune-${index}`} />
        ))}
      </div>

      <header className="lol-header">
        <div className="header-swords">{ICONS.swords}</div>
        <h1 className="lol-title">DRAFT DE TIMES</h1>
        <p className="lol-subtitle">Players, imagens e partidas conectados ao backend</p>
        <div className="gold-divider" />
      </header>

      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-label">Players catalogados</div>
          <div className="insight-value">{savedPlayers.length}</div>
          <div className="insight-help">Autocomplete alimentado pelo banco local</div>
        </div>

        <div className="insight-card insight-card-wide">
          <div className="insight-label">Partidas recentes</div>
          <RecentMatches matches={recentMatches} />
        </div>
      </div>

      <div className="inputs-grid">
        {slots.map((slot, index) => (
          <PlayerRow
            key={index}
            slot={slot}
            onChange={patch => updateSlot(index, patch)}
            selectedNames={selectedNames}
            savedPlayers={savedPlayers}
            loadingPlayers={loadingPlayers}
          />
        ))}
      </div>

      <div className="valid-count">
        <span className={validCount >= 2 ? 'count-ok' : 'count-low'}>{validCount}</span>
        &nbsp;/ {PLAYER_COUNT} invocadores
      </div>

      <button className="btn-draft" onClick={handleStart} disabled={validCount < 2 || syncingPlayers}>
        <span className="btn-draft-icon">{ICONS.swords}</span>
        {syncingPlayers ? 'SINCRONIZANDO...' : 'INICIAR DRAFT'}
        <span className="btn-draft-icon">{ICONS.swords}</span>
      </button>
    </div>
  )
}
