import { useCallback, useEffect, useRef, useState } from 'react'

import { Avatar } from './Avatar'
import { ChampionPickerModal } from './ChampionPickerModal'
import { findChampionByName } from '../lib/champions'
import {
  mergeTeamDetails,
  ROLE_OPTIONS,
  shufflePlayers,
  toDatetimeLocalValue,
  trimOrNull,
  WINNER_OPTIONS,
} from '../lib/app-utils'

const CARD_WIDTH = 120
const CARD_GAP = 14
const CARD_TOTAL = CARD_WIDTH + CARD_GAP
const AUTO_CONFIRM_DELAY = 450

const ICONS = {
  trophy: '\uD83C\uDFC6',
  blue: '\uD83D\uDD35',
  red: '\uD83D\uDD34',
  right: '\u25B6',
  left: '\u25C0',
  swords: '\u2694\uFE0F',
  champion: '\u25C8',
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
      clearConfirmTimeout()
      confirmTimeoutRef.current = window.setTimeout(() => {
        finishPick(players[idx])
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

  const loopItems = Array.from({ length: 10 }, () => players).flat()
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
                type="button"
                onClick={() => finishPick(players[picked])}
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
          type="button"
          onClick={() => spin()}
          disabled={spinning || picked !== null || autoDrafting}
        >
          {spinning ? 'SELECIONANDO...' : 'GIRAR'}
        </button>

        <button
          className="btn-auto-draft"
          type="button"
          onClick={onStartAutoDraft}
          disabled={spinning || picked !== null || autoDrafting}
        >
          {autoDrafting ? 'SORTEANDO ATE O FIM...' : 'SORTEAR TODO MUNDO'}
        </button>

        <button
          className="btn-fast-draft"
          type="button"
          onClick={onQuickDraw}
          disabled={spinning || picked !== null || autoDrafting}
        >
          SORTEIO RAPIDO
        </button>
      </div>
    </div>
  )
}

function MatchPlayerEditor({ player, details, side, onChange, onOpenChampionPicker }) {
  const selectedChampion = findChampionByName(details.championName)
  const championLabel = selectedChampion?.name || details.championName.trim() || 'Selecionar campeao'

  return (
    <div className={`match-player-card ${side === 'blue' ? 'match-player-blue' : 'match-player-red'}`}>
      <div className="match-player-head">
        <Avatar player={player} size={38} className="team-card-avatar" />
        <div>
          <div className="match-player-name">{player.name}</div>
          <div className="match-player-side">{side === 'blue' ? 'Blue Side' : 'Red Side'}</div>
        </div>
      </div>

      <div className="match-player-fields">
        <button
          className={`champion-trigger ${side === 'blue' ? 'champion-trigger-blue' : 'champion-trigger-red'}`}
          type="button"
          onClick={onOpenChampionPicker}
        >
          <div className="champion-trigger-art">
            {selectedChampion ? (
              <img
                src={selectedChampion.icon}
                alt={selectedChampion.name}
                className="champion-trigger-icon"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <span className="champion-trigger-placeholder">{ICONS.champion}</span>
            )}
          </div>

          <div className="champion-trigger-copy">
            <span className="champion-trigger-label">Campeao</span>
            <strong className="champion-trigger-name">{championLabel}</strong>
          </div>
        </button>

        <div className="role-picker">
          <div className="role-picker-label">Rota</div>
          <div className="role-picker-buttons">
            {ROLE_OPTIONS.map((option) => {
              const selected = details.role === option.value

              return (
                <button
                  key={option.value}
                  className={`role-pill ${selected ? 'role-pill-selected' : ''} ${side === 'blue' ? 'role-pill-blue' : 'role-pill-red'}`}
                  type="button"
                  onClick={() => onChange({ role: option.value })}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DrawScreen({
  initialPlayers,
  onRestart,
  onSaveMatch,
  canManageMatches,
  savingMatch,
}) {
  const [team1, setTeam1] = useState([])
  const [team2, setTeam2] = useState([])
  const [autoDrafting, setAutoDrafting] = useState(false)
  const [remaining, setRemaining] = useState(() =>
    [...initialPlayers].sort(() => Math.random() - 0.5)
  )
  const [savedMatchId, setSavedMatchId] = useState(null)
  const [championPicker, setChampionPicker] = useState(null)
  const [matchForm, setMatchForm] = useState({
    title: '',
    notes: '',
    patchVersion: '',
    gameDate: toDatetimeLocalValue(),
    winnerSide: '',
    blueTeamDetails: [],
    redTeamDetails: [],
  })

  const pickedCount = team1.length + team2.length
  const nextSide = pickedCount % 2 === 0 ? 'blue' : 'red'
  const allDone = remaining.length === 0

  useEffect(() => {
    setMatchForm(prev => ({
      ...prev,
      blueTeamDetails: mergeTeamDetails(team1, prev.blueTeamDetails),
      redTeamDetails: mergeTeamDetails(team2, prev.redTeamDetails),
    }))
  }, [team1, team2])

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

  function updateField(field, value) {
    setSavedMatchId(null)
    setMatchForm(prev => ({ ...prev, [field]: value }))
  }

  function updateTeam(side, index, patch) {
    setSavedMatchId(null)
    setMatchForm(prev => {
      const key = side === 'blue' ? 'blueTeamDetails' : 'redTeamDetails'
      const nextTeam = [...prev[key]]
      nextTeam[index] = { ...nextTeam[index], ...patch }
      return { ...prev, [key]: nextTeam }
    })
  }

  function openChampionPicker(side, index) {
    setChampionPicker({ side, index })
  }

  function closeChampionPicker() {
    setChampionPicker(null)
  }

  function getPickerDetails() {
    if (!championPicker) return null

    const key = championPicker.side === 'blue' ? 'blueTeamDetails' : 'redTeamDetails'
    return matchForm[key]?.[championPicker.index] || null
  }

  function handleChampionSelect(champion) {
    if (!championPicker) return

    updateTeam(championPicker.side, championPicker.index, {
      championName: champion.name,
    })
    closeChampionPicker()
  }

  function handleChampionClear() {
    if (!championPicker) return

    updateTeam(championPicker.side, championPicker.index, {
      championName: '',
    })
    closeChampionPicker()
  }

  async function handleSave() {
    if (!canManageMatches) return

    const blueTeam = matchForm.blueTeamDetails.map(player => ({
      playerName: player.playerName,
      playerImg: player.playerImg,
      championName: player.championName.trim(),
      role: player.role.trim(),
    }))
    const redTeam = matchForm.redTeamDetails.map(player => ({
      playerName: player.playerName,
      playerImg: player.playerImg,
      championName: player.championName.trim(),
      role: player.role.trim(),
    }))

    if ([...blueTeam, ...redTeam].some(player => !player.championName || !player.role)) return

    const savedMatch = await onSaveMatch({
      title: trimOrNull(matchForm.title) || undefined,
      notes: trimOrNull(matchForm.notes) || undefined,
      patchVersion: trimOrNull(matchForm.patchVersion) || undefined,
      gameDate: new Date(matchForm.gameDate).toISOString(),
      winnerSide: matchForm.winnerSide || undefined,
      blueTeam,
      redTeam,
    })

    if (savedMatch?.id) {
      setSavedMatchId(savedMatch.id)
      onRestart()
    }
  }

  const canSave =
    allDone &&
    matchForm.gameDate &&
    matchForm.blueTeamDetails.length === team1.length &&
    matchForm.redTeamDetails.length === team2.length &&
    [...matchForm.blueTeamDetails, ...matchForm.redTeamDetails].every(
      player => player.championName.trim() && player.role.trim()
    )

  const pickerDetails = getPickerDetails()

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
              <p className="done-text">Times prontos. Agora preencha os dados da partida.</p>
              <button className="btn-new-draft" type="button" onClick={onRestart}>
                Novo Draft
              </button>
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

      {allDone ? (
        <div className="save-panel">
          <div className="save-panel-header">
            <div>
              <div className="save-panel-title">Salvar partida</div>
              <div className="save-panel-subtitle">
                {canManageMatches
                  ? 'Campeoes, rotas, data e imagens.'
                  : 'Todos podem visualizar, mas somente o login do Matheus pode salvar ou alterar partidas.'}
              </div>
            </div>
            {savedMatchId && <div className="save-badge">Partida salva: {savedMatchId}</div>}
          </div>

          <div className="save-meta-grid">
            <input
              className="form-input"
              type="text"
              value={matchForm.title}
              onChange={event => updateField('title', event.target.value)}
              placeholder="Titulo da partida"
            />
            <input
              className="form-input"
              type="datetime-local"
              value={matchForm.gameDate}
              onChange={event => updateField('gameDate', event.target.value)}
            />
            <input
              className="form-input"
              type="text"
              value={matchForm.patchVersion}
              onChange={event => updateField('patchVersion', event.target.value)}
              placeholder="Patch ex: 14.8"
            />
            <select
              className="form-input"
              value={matchForm.winnerSide}
              onChange={event => updateField('winnerSide', event.target.value)}
            >
              {WINNER_OPTIONS.map(option => (
                <option key={option.value || 'none'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="form-input form-textarea"
            value={matchForm.notes}
            onChange={event => updateField('notes', event.target.value)}
            placeholder="Observacoes da partida"
          />

          <div className="save-teams-grid">
            <div className="save-team-column">
              <div className="save-team-title">Blue Side</div>
              <div className="match-player-list">
                {team1.map((player, index) => (
                  <MatchPlayerEditor
                    key={player.name}
                    player={player}
                    details={matchForm.blueTeamDetails[index] || {
                      playerName: player.name,
                      playerImg: player.imageUrl,
                      championName: '',
                      role: '',
                    }}
                    side="blue"
                    onChange={patch => updateTeam('blue', index, patch)}
                    onOpenChampionPicker={() => openChampionPicker('blue', index)}
                  />
                ))}
              </div>
            </div>

            <div className="save-team-column">
              <div className="save-team-title">Red Side</div>
              <div className="match-player-list">
                {team2.map((player, index) => (
                  <MatchPlayerEditor
                    key={player.name}
                    player={player}
                    details={matchForm.redTeamDetails[index] || {
                      playerName: player.name,
                      playerImg: player.imageUrl,
                      championName: '',
                      role: '',
                    }}
                    side="red"
                    onChange={patch => updateTeam('red', index, patch)}
                    onOpenChampionPicker={() => openChampionPicker('red', index)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="save-panel-actions">
            <button className="btn-new-draft" type="button" onClick={onRestart}>
              Novo Draft
            </button>
            <button
              className="btn-draft"
              type="button"
              onClick={handleSave}
              disabled={!canManageMatches || !canSave || savingMatch || Boolean(savedMatchId)}
            >
              {savingMatch
                ? 'SALVANDO...'
                : savedMatchId
                  ? 'PARTIDA SALVA'
                  : canManageMatches
                    ? 'SALVAR PARTIDA'
                    : 'LOGIN ADMIN PARA SALVAR'}
            </button>
          </div>
        </div>
      ) : (
        <SlotMachine
          players={remaining}
          onPick={handlePick}
          nextSide={nextSide}
          autoDrafting={autoDrafting}
          onStartAutoDraft={() => setAutoDrafting(true)}
          onQuickDraw={handleQuickDraw}
        />
      )}

      <ChampionPickerModal
        open={Boolean(championPicker)}
        side={championPicker?.side || 'blue'}
        currentChampionName={pickerDetails?.championName || ''}
        onSelect={handleChampionSelect}
        onClear={handleChampionClear}
        onClose={closeChampionPicker}
      />
    </div>
  )
}
