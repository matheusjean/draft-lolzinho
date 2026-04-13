import { useEffect, useMemo, useState } from 'react'

import { findChampionByName } from '../lib/champions'
import { formatDate, ROLE_OPTIONS } from '../lib/app-utils'

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label])
)

function formatRole(role) {
  return ROLE_LABELS[role] || role || 'Sem rota'
}

function resolveTeamResult(side, winnerSide) {
  if (!winnerSide) {
    return {
      label: 'Sem vencedor',
      className: 'match-history-result-neutral',
    }
  }

  const didWin = side === winnerSide

  return {
    label: didWin ? 'Vitoria' : 'Derrota',
    className: didWin ? 'match-history-result-win' : 'match-history-result-loss',
  }
}

function MatchPlayerRow({ player }) {
  const champion = findChampionByName(player.championName)

  return (
    <div className="match-history-player-row">
      <div className="match-history-champion-shell">
        {champion ? (
          <img
            src={champion.icon}
            alt={champion.name}
            className="match-history-champion-icon"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="match-history-champion-fallback">
            {(player.championName || '?').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="match-history-player-copy">
        <div className="match-history-player-name">{player.playerName}</div>
        <div className="match-history-player-meta">
          <span className="match-history-role-tag">{formatRole(player.role)}</span>
          {/* <span>{player.championName}</span> */}
        </div>
      </div>
    </div>
  )
}

function MatchTeamColumn({ title, side, winnerSide, players }) {
  const result = resolveTeamResult(side, winnerSide)

  return (
    <div className={`match-history-team-column ${side === 'BLUE' ? 'match-history-team-blue' : 'match-history-team-red'}`}>
      <div className="match-history-team-header">
        <div className="match-history-team-side">{title}</div>
        <div className={`match-history-team-result ${result.className}`}>
          {result.label}
        </div>
      </div>

      <div className="match-history-player-list">
        {players.map((player, index) => (
          <MatchPlayerRow
            key={`${player.playerName}-${player.championName}-${player.role}-${index}`}
            player={player}
          />
        ))}
      </div>
    </div>
  )
}

function MatchAccordion({
  match,
  expanded,
  canDeleteMatches,
  deleting,
  onToggle,
  onDeleteMatch,
}) {
  const blueTeam = Array.isArray(match.blueTeam) ? match.blueTeam : []
  const redTeam = Array.isArray(match.redTeam) ? match.redTeam : []
  const winnerBadge =
    match.winnerSide === 'BLUE'
      ? 'Blue Side venceu'
      : match.winnerSide === 'RED'
        ? 'Red Side venceu'
        : 'Sem vencedor definido'

  return (
    <div className={`match-history-accordion ${expanded ? 'match-history-accordion-open' : ''}`}>
      <button className="match-history-trigger" type="button" onClick={onToggle}>
        <div className="match-history-trigger-copy">
          <div className="match-history-title">{match.title || 'Partida sem titulo'}</div>
          <div className="match-history-meta">
            <span>{formatDate(match.gameDate)}</span>
            {match.patchVersion ? <span>Patch {match.patchVersion}</span> : null}
            <span>Blue {blueTeam.length} x Red {redTeam.length}</span>
          </div>
        </div>

        <div className="match-history-trigger-side">
          <span className="match-history-winner-badge">{winnerBadge}</span>
          <span className="match-history-arrow">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {expanded && (
        <div className="match-history-body">
          {match.notes ? (
            <div className="match-history-notes">{match.notes}</div>
          ) : null}

          <div className="match-history-teams-grid">
            <MatchTeamColumn
              title="Blue Side"
              side="BLUE"
              winnerSide={match.winnerSide}
              players={blueTeam}
            />
            <MatchTeamColumn
              title="Red Side"
              side="RED"
              winnerSide={match.winnerSide}
              players={redTeam}
            />
          </div>

          {canDeleteMatches ? (
            <div className="match-history-actions">
              <button
                className="match-history-delete-button"
                type="button"
                disabled={deleting}
                onClick={async () => {
                  const confirmed = window.confirm(
                    'Apagar esta partida? Ela deixara de contar na tabela e no historico dos players.'
                  )

                  if (!confirmed) {
                    return
                  }

                  await onDeleteMatch(match)
                }}
              >
                {deleting ? 'Apagando...' : 'Apagar partida'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function MatchHistoryModal({
  open,
  matches,
  canDeleteMatches,
  deletingMatchId,
  onDeleteMatch,
  onClose,
}) {
  const [query, setQuery] = useState('')
  const [expandedMatchId, setExpandedMatchId] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      return
    }

    setExpandedMatchId('')
  }, [open])

  useEffect(() => {
    if (!expandedMatchId) {
      return
    }

    const stillExists = matches.some((match) => match.id === expandedMatchId)

    if (!stillExists) {
      setExpandedMatchId('')
    }
  }, [expandedMatchId, matches])

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return matches
    }

    return matches.filter((match) => {
      const blueTeam = Array.isArray(match.blueTeam) ? match.blueTeam : []
      const redTeam = Array.isArray(match.redTeam) ? match.redTeam : []

      const searchableText = [
        match.title,
        match.notes,
        match.patchVersion,
        ...blueTeam.flatMap((player) => [player.playerName, player.championName, player.role]),
        ...redTeam.flatMap((player) => [player.playerName, player.championName, player.role]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
  }, [matches, query])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-panel match-history-modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>

        <h2 className="modal-title">Historico de partidas</h2>
        <p className="modal-subtitle">
          Abra uma partida para ver os times completos, campeoes usados, rotas e o lado vencedor.
        </p>

        <div className="match-history-toolbar">
          <input
            className="form-input match-history-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por player, campeao ou patch..."
            autoFocus
          />
        </div>

        <div className="match-history-search-count">
          {filteredMatches.length} partida{filteredMatches.length === 1 ? '' : 's'}
        </div>

        <div className="match-history-list">
          {filteredMatches.length === 0 ? (
            <div className="history-empty">Nenhuma partida encontrada para essa busca.</div>
          ) : (
            filteredMatches.map((match) => (
              <MatchAccordion
                key={match.id}
                match={match}
                expanded={expandedMatchId === match.id}
                canDeleteMatches={canDeleteMatches}
                deleting={deletingMatchId === match.id}
                onToggle={() =>
                  setExpandedMatchId((current) => (current === match.id ? '' : match.id))
                }
                onDeleteMatch={onDeleteMatch}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
