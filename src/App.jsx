import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './App.css'

const PLAYER_COUNT = 10
const CARD_WIDTH = 120
const CARD_GAP = 14
const CARD_TOTAL = CARD_WIDTH + CARD_GAP
const AUTO_CONFIRM_DELAY = 450

const ICONS = {
  swords: '\u2694\uFE0F',
  camera: '\uD83D\uDCF7',
  pencil: '\u270F\uFE0F',
  trophy: '\uD83C\uDFC6',
  blue: '\uD83D\uDD35',
  red: '\uD83D\uDD34',
  up: '\u25B2',
  down: '\u25BC',
  right: '\u25B6',
  left: '\u25C0',
}

const ROLE_COLORS = [
  '#1E3A5F', '#5C1E1E', '#1E5C2A', '#4A1E5C', '#5C4A1E',
  '#1E4A5C', '#5C1E3A', '#2A5C1E', '#5C3A1E', '#1E1E5C',
]

const LS_KEY = 'lol_draft_players'

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function upsertSaved(name, imageUrl) {
  const list = loadSaved()
  const idx = list.findIndex(player => player.name.toLowerCase() === name.toLowerCase())
  const entry = { name, imageUrl: imageUrl || null }

  if (idx >= 0) list[idx] = entry
  else list.push(entry)

  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

function deleteSaved(name) {
  const list = loadSaved().filter(player => player.name.toLowerCase() !== name.toLowerCase())
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => resolve(event.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function initials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function shufflePlayers(players) {
  const shuffled = [...players]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled
}

function Avatar({ player, size = 40, className = '' }) {
  const color = ROLE_COLORS[(player.index ?? 0) % ROLE_COLORS.length]

  if (player.imageUrl) {
    return (
      <img
        src={player.imageUrl}
        alt={player.name}
        className={`avatar-img ${className}`}
        style={{ width: size, height: size }}
        draggable={false}
      />
    )
  }

  return (
    <div
      className={`avatar-fallback ${className}`}
      style={{ width: size, height: size, background: color }}
    >
      {player.name ? initials(player.name) : '?'}
    </div>
  )
}

function PlayerRow({ slot, onChange, selectedNames }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(slot.name)
  const [savedList, setSavedList] = useState(loadSaved)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const fileRef = useRef(null)
  const rowRef = useRef(null)
  const normalizedCurrentName = slot.name.trim().toLowerCase()
  const blockedNames = new Set(
    selectedNames.filter(name => name !== normalizedCurrentName)
  )

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
    setSavedList(loadSaved())
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

  const availableSaved = savedList.filter(player => {
    const normalizedName = player.name.toLowerCase()
    return !blockedNames.has(normalizedName)
  })

  const filtered = availableSaved.filter(player =>
    query.trim() === '' || player.name.toLowerCase().includes(query.toLowerCase())
  )

  function selectSaved(player) {
    onChange({ name: player.name, imageUrl: player.imageUrl })
    setQuery(player.name)
    setOpen(false)
  }

  function handleNameChange(value) {
    setQuery(value)
    onChange({ name: value, imageUrl: slot.imageUrl })
    if (!open) openDropdown()
  }

  async function handleFile(file) {
    if (!file) return
    const b64 = await fileToBase64(file)
    onChange({ name: slot.name, imageUrl: b64 })
  }

  function handleDeleteSaved(event, name) {
    event.stopPropagation()
    deleteSaved(name)
    const next = loadSaved()
    setSavedList(next)

    if (slot.name.toLowerCase() === name.toLowerCase()) {
      onChange({ name: '', imageUrl: null })
      setQuery('')
    }
  }

  const hasSaved = availableSaved.length > 0
  const showList = open && (filtered.length > 0 || query.trim() !== '')

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
      {filtered.length === 0 ? (
        <div className="dropdown-empty">Nenhum jogador salvo com esse nome</div>
      ) : (
        filtered.map(player => (
          <div key={player.name} className="dropdown-item" onMouseDown={() => selectSaved(player)}>
            <div className="dropdown-item-avatar">
              {player.imageUrl
                ? <img src={player.imageUrl} alt="" />
                : <div className="dropdown-item-initials">{initials(player.name)}</div>}
            </div>
            <span className="dropdown-item-name">{player.name}</span>
            <button
              className="dropdown-item-del"
              title="Remover da lista"
              onMouseDown={event => handleDeleteSaved(event, player.name)}
            >
              x
            </button>
          </div>
        ))
      )}
    </div>,
    document.body
  )

  return (
    <div className={`player-row ${slot.name.trim() ? 'row-filled' : ''}`} ref={rowRef}>
      <button className="photo-btn" type="button" onClick={() => fileRef.current?.click()} title="Alterar foto">
        {slot.imageUrl ? (
          <img src={slot.imageUrl} alt="" className="photo-preview" />
        ) : (
          <div className="photo-placeholder">
            <span className="photo-icon">{ICONS.camera}</span>
          </div>
        )}
        <div className="photo-overlay">{ICONS.pencil}</div>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={event => handleFile(event.target.files[0])}
      />

      <input
        className="name-input"
        type="text"
        placeholder="Invocador..."
        value={query}
        maxLength={24}
        onChange={event => handleNameChange(event.target.value)}
        onFocus={openDropdown}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
        }}
      />

      {hasSaved && (
        <button
          className="dropdown-arrow"
          type="button"
          onMouseDown={event => {
            event.preventDefault()
            if (open) setOpen(false)
            else openDropdown()
          }}
          title="Jogadores salvos"
        >
          {open ? ICONS.up : ICONS.down}
        </button>
      )}

      {dropdownEl}
    </div>
  )
}

function InputScreen({ onStart }) {
  const [slots, setSlots] = useState(
    Array.from({ length: PLAYER_COUNT }, () => ({ name: '', imageUrl: null }))
  )
  const selectedNames = slots
    .map(slot => slot.name.trim().toLowerCase())
    .filter(Boolean)

  function updateSlot(index, patch) {
    setSlots(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const validCount = slots.filter(slot => slot.name.trim()).length

  function handleStart() {
    const valid = slots.filter(slot => slot.name.trim())
    if (valid.length < 2) return

    valid.forEach(slot => upsertSaved(slot.name.trim(), slot.imageUrl))

    const players = valid.map((slot, rank) => ({
      name: slot.name.trim(),
      imageUrl: slot.imageUrl,
      index: rank,
    }))

    onStart(players)
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
        <p className="lol-subtitle">Selecione ou adicione seus invocadores</p>
        <div className="gold-divider" />
      </header>

      <div className="inputs-grid">
        {slots.map((slot, index) => (
          <PlayerRow
            key={index}
            slot={slot}
            onChange={patch => updateSlot(index, patch)}
            selectedNames={selectedNames}
          />
        ))}
      </div>

      <div className="valid-count">
        <span className={validCount >= 2 ? 'count-ok' : 'count-low'}>{validCount}</span>
        &nbsp;/ {PLAYER_COUNT} invocadores
      </div>

      <button className="btn-draft" onClick={handleStart} disabled={validCount < 2}>
        <span className="btn-draft-icon">{ICONS.swords}</span>
        INICIAR DRAFT
        <span className="btn-draft-icon">{ICONS.swords}</span>
      </button>
    </div>
  )
}

function TeamPlayerCard({ player, side, position }) {
  return (
    <div
      className={`team-card ${side === 'blue' ? 'team-card-blue slide-left' : 'team-card-red slide-right'}`}
      style={{ animationDelay: `${position * 0.05}s` }}
    >
      <Avatar player={player} size={36} className="team-card-avatar" />
      <span className="team-card-name">{player.name}</span>
    </div>
  )
}

function SlotMachine({ players, onPick, nextSide, autoDrafting, onStartAutoDraft, onQuickDraw }) {
  const viewportRef = useRef(null)
  const [offset, setOffset] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [picked, setPicked] = useState(null)
  const animRef = useRef(null)
  const confirmTimeoutRef = useRef(null)
  const offsetRef = useRef(0)
  const spinData = useRef({})
  const initialized = useRef(false)

  const syncOffset = useCallback(value => {
    offsetRef.current = value
    setOffset(value)
  }, [])

  const clearConfirmTimeout = useCallback(() => {
    if (confirmTimeoutRef.current) {
      window.clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = null
    }
  }, [])

  const finishPick = useCallback(player => {
    clearConfirmTimeout()
    setPicked(null)
    initialized.current = false
    onPick(player)
  }, [clearConfirmTimeout, onPick])

  useEffect(() => {
    if (initialized.current) return

    const vw = viewportRef.current?.offsetWidth || 700
    const loops = players.length * CARD_TOTAL
    const centerOffset = loops - (vw / 2 - CARD_WIDTH / 2)

    syncOffset(centerOffset)
    initialized.current = true
  }, [players.length, syncOffset])

  const easeOutQuart = t => 1 - Math.pow(1 - t, 4)

  const animate = useCallback(() => {
    const { start, from, to, duration, autoConfirm } = spinData.current
    const elapsed = Date.now() - start
    const t = Math.min(elapsed / duration, 1)
    const currentOffset = from + (to - from) * easeOutQuart(t)

    syncOffset(currentOffset)

    if (t < 1) {
      animRef.current = requestAnimationFrame(animate)
      return
    }

    const loops = players.length * CARD_TOTAL
    const normalizedTo = ((to % loops) + loops) % loops + loops
    const vw = viewportRef.current?.offsetWidth || 700
    const viewCenter = normalizedTo + vw / 2
    const rawIdx = Math.round((viewCenter - CARD_WIDTH / 2) / CARD_TOTAL)
    const idx = ((rawIdx % players.length) + players.length) % players.length

    syncOffset(normalizedTo)
    setSpinning(false)
    setPicked(idx)

    if (autoConfirm) {
      const selectedPlayer = players[idx]
      clearConfirmTimeout()
      confirmTimeoutRef.current = window.setTimeout(() => {
        finishPick(selectedPlayer)
      }, AUTO_CONFIRM_DELAY)
    }
  }, [clearConfirmTimeout, finishPick, players, syncOffset])

  const spin = useCallback(({ autoConfirm = false } = {}) => {
    if (spinning || picked !== null || players.length === 0) return

    clearConfirmTimeout()
    setSpinning(true)
    setPicked(null)

    const vw = viewportRef.current?.offsetWidth || 700
    const rounds = 3 + Math.floor(Math.random() * 3)
    const stopIdx = Math.floor(Math.random() * players.length)
    const baseTarget = stopIdx * CARD_TOTAL + CARD_WIDTH / 2 - vw / 2
    const loops = players.length * CARD_TOTAL
    const currentOffset = offsetRef.current

    let target = baseTarget
    target += Math.ceil((currentOffset - baseTarget) / loops + 1) * loops
    target += rounds * loops

    spinData.current = {
      start: Date.now(),
      from: currentOffset,
      to: target,
      duration: 2400 + Math.random() * 800,
      autoConfirm,
    }

    animRef.current = requestAnimationFrame(animate)
  }, [animate, clearConfirmTimeout, picked, players.length, spinning])

  function confirm() {
    if (picked === null || spinning) return
    finishPick(players[picked])
  }

  useEffect(() => {
    if (!autoDrafting || spinning || picked !== null || players.length === 0) return
    spin({ autoConfirm: true })
  }, [autoDrafting, picked, players, spin, spinning])

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      clearConfirmTimeout()
    }
  }, [clearConfirmTimeout])

  const COPIES = 10
  const loopItems = Array.from({ length: COPIES }, () => players).flat()
  const pickedPlayer = picked !== null ? players[picked] : null
  const autoBusy = autoDrafting || Boolean(confirmTimeoutRef.current)

  return (
    <div className="slot-section">
      <div className="slot-top-bar">
        <div className="gold-divider-thin" />
        <span className="slot-title">FASE DE PICK</span>
        <div className="gold-divider-thin" />
      </div>

      <div className="slot-status">
        {pickedPlayer ? (
          <div className="slot-picked-row">
            <Avatar player={pickedPlayer} size={32} className="slot-picked-avatar" />
            <span className="slot-picked-text">
              <strong>{pickedPlayer.name}</strong> selecionado
            </span>
            {autoBusy ? (
              <span className={`slot-auto-confirm ${nextSide === 'blue' ? 'auto-blue' : 'auto-red'}`}>
                entrando no {nextSide === 'blue' ? 'Blue Side' : 'Red Side'}...
              </span>
            ) : (
              <button
                className={`btn-confirm ${nextSide === 'blue' ? 'confirm-blue' : 'confirm-red'}`}
                onClick={confirm}
              >
                Confirmar para {nextSide === 'blue' ? 'Blue Side' : 'Red Side'}
              </button>
            )}
          </div>
        ) : spinning ? (
          <span className="slot-spinning-txt">
            {autoDrafting ? 'Modo automatico: sorteando invocador...' : 'Selecionando invocador...'}
          </span>
        ) : (
          <span className="slot-idle-txt">
            {autoDrafting ? 'Modo automatico aguardando o proximo pick...' : 'Clique em GIRAR para selecionar'}
          </span>
        )}
      </div>

      <div className="slot-wrapper">
        <div className={`slot-arrow ${nextSide === 'blue' ? 'arrow-blue' : 'arrow-red'}`}>{ICONS.right}</div>

        <div className="slot-viewport" ref={viewportRef}>
          <div className={`slot-center-box ${nextSide === 'blue' ? 'center-blue' : 'center-red'}`} />
          <div className="slot-track" style={{ transform: `translateX(${-offset}px)` }}>
            {loopItems.map((player, index) => {
              const isCenter =
                !spinning &&
                picked !== null &&
                index % players.length === picked &&
                Math.floor(index / players.length) === 1

              return (
                <div
                  key={`${player.name}-${index}`}
                  className={`slot-card ${isCenter ? (nextSide === 'blue' ? 'slot-card-blue' : 'slot-card-red') : ''}`}
                  style={{ width: CARD_WIDTH }}
                >
                  <Avatar player={player} size={64} className="slot-card-avatar" />
                  <div className="slot-card-name">{player.name}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={`slot-arrow ${nextSide === 'blue' ? 'arrow-blue' : 'arrow-red'}`}>{ICONS.left}</div>
      </div>

      <div className="slot-actions">
        <button
          className={`btn-spin ${spinning ? 'is-spinning' : ''} ${nextSide === 'blue' ? 'spin-blue' : 'spin-red'}`}
          onClick={() => spin()}
          disabled={spinning || picked !== null || autoDrafting}
        >
          {spinning ? 'SELECIONANDO...' : 'GIRAR'}
        </button>

        <button
          className="btn-auto-draft"
          onClick={onStartAutoDraft}
          disabled={spinning || picked !== null || autoDrafting}
        >
          {autoDrafting ? 'SORTEANDO ATE O FIM...' : 'SORTEAR TODO MUNDO'}
        </button>

        <button
          className="btn-fast-draft"
          onClick={onQuickDraw}
          disabled={spinning || picked !== null || autoDrafting}
        >
          SORTEIO RAPIDO
        </button>
      </div>
    </div>
  )
}

function DrawScreen({ initialPlayers, onRestart }) {
  const [team1, setTeam1] = useState([])
  const [team2, setTeam2] = useState([])
  const [autoDrafting, setAutoDrafting] = useState(false)
  const [remaining, setRemaining] = useState(() =>
    [...initialPlayers].sort(() => Math.random() - 0.5)
  )

  const pickedCount = team1.length + team2.length
  const nextSide = pickedCount % 2 === 0 ? 'blue' : 'red'
  const allDone = remaining.length === 0

  useEffect(() => {
    if (allDone) setAutoDrafting(false)
  }, [allDone])

  function handlePick(player) {
    if (nextSide === 'blue') setTeam1(prev => [...prev, player])
    else setTeam2(prev => [...prev, player])

    setRemaining(prev => prev.filter(current => current.name !== player.name))
  }

  function handleQuickDraw() {
    if (remaining.length === 0) return

    const shuffledRemaining = shufflePlayers(remaining)
    const nextTeam1 = [...team1]
    const nextTeam2 = [...team2]
    let side = nextSide

    shuffledRemaining.forEach(player => {
      if (side === 'blue') {
        nextTeam1.push(player)
        side = 'red'
      } else {
        nextTeam2.push(player)
        side = 'blue'
      }
    })

    setAutoDrafting(false)
    setTeam1(nextTeam1)
    setTeam2(nextTeam2)
    setRemaining([])
  }

  return (
    <div className="draw-screen">
      <div className="draw-header">
        <span className="draw-header-title">{`${ICONS.swords} DRAFT DE TIMES ${ICONS.swords}`}</span>
      </div>

      <div className="teams-container">
        <div className="team-col blue-side">
          <div className="team-col-header blue-header">
            <span className="side-icon">{ICONS.blue}</span>
            <span className="side-title">BLUE SIDE</span>
          </div>
          <div className="team-list">
            {team1.map((player, index) => (
              <TeamPlayerCard key={player.name} player={player} side="blue" position={index} />
            ))}
            {!allDone && nextSide === 'blue' && (
              <div className="pick-indicator pick-indicator-blue">{'<- aguardando pick'}</div>
            )}
          </div>
        </div>

        <div className="center-panel">
          {allDone ? (
            <div className="done-panel">
              <div className="done-cup">{ICONS.trophy}</div>
              <p className="done-text">GG! Times prontos.</p>
              <button className="btn-new-draft" onClick={onRestart}>Novo Draft</button>
            </div>
          ) : (
            <div className="draft-status">
              <div className={`draft-turn ${nextSide === 'blue' ? 'turn-blue' : 'turn-red'}`}>
                {nextSide === 'blue' ? `${ICONS.blue} Blue` : `${ICONS.red} Red`}
              </div>
              <div className="draft-turn-label">
                {autoDrafting ? 'modo automatico ativo' : 'escolhe agora'}
              </div>
              <div className="remaining-badge">{remaining.length}</div>
              <div className="remaining-label">restantes</div>
            </div>
          )}
        </div>

        <div className="team-col red-side">
          <div className="team-col-header red-header">
            <span className="side-title">RED SIDE</span>
            <span className="side-icon">{ICONS.red}</span>
          </div>
          <div className="team-list">
            {team2.map((player, index) => (
              <TeamPlayerCard key={player.name} player={player} side="red" position={index} />
            ))}
            {!allDone && nextSide === 'red' && (
              <div className="pick-indicator pick-indicator-red">{'aguardando pick ->'}</div>
            )}
          </div>
        </div>
      </div>

      {!allDone && (
        <SlotMachine
          players={remaining}
          onPick={handlePick}
          nextSide={nextSide}
          autoDrafting={autoDrafting}
          onStartAutoDraft={() => setAutoDrafting(true)}
          onQuickDraw={handleQuickDraw}
        />
      )}
    </div>
  )
}

export default function App() {
  const [players, setPlayers] = useState(null)

  if (!players) return <InputScreen onStart={setPlayers} />
  return <DrawScreen initialPlayers={players} onRestart={() => setPlayers(null)} />
}
