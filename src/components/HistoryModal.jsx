import { useEffect, useMemo, useState } from 'react'

import { Avatar } from './Avatar'
import { findChampionByName } from '../lib/champions'
import { formatDate, ROLE_OPTIONS } from '../lib/app-utils'

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label])
)

function resolveResult(historyEntry) {
  if (!historyEntry.winnerSide) {
    return {
      label: 'Sem vencedor',
      className: 'history-result-neutral',
    }
  }

  const didWin = historyEntry.side === historyEntry.winnerSide

  return {
    label: didWin ? 'Vitoria' : 'Derrota',
    className: didWin ? 'history-result-win' : 'history-result-loss',
  }
}

function formatRole(role) {
  return ROLE_LABELS[role] || role || 'Sem rota'
}

function HistoryAccordion({ player, details, expanded, loading, onToggle }) {
  const totalHistory = details?.history?.length || 0

  return (
    <div className={`history-accordion ${expanded ? 'history-accordion-open' : ''}`}>
      <button className="history-accordion-trigger" type="button" onClick={onToggle}>
        <div className="history-accordion-head">
          <Avatar player={player} size={42} />
          <div className="history-accordion-copy">
            <div className="history-accordion-name">{player.name}</div>
            <div className="history-accordion-meta">
              {player.matchesCount || 0} partida{player.matchesCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="history-accordion-arrow">{expanded ? '\u25B2' : '\u25BC'}</div>
      </button>

      {expanded && (
        <div className="history-accordion-body">
          {loading ? (
            <div className="history-empty">Carregando historico do player...</div>
          ) : !details ? (
            <div className="history-empty">Nao foi possivel carregar o historico.</div>
          ) : totalHistory === 0 ? (
            <div className="history-empty">Esse player ainda nao tem partidas salvas.</div>
          ) : (
            <>
              <div className="history-stats-row">
                <div className="history-stat-card">
                  <div className="history-stat-label">Campeoes mais jogados</div>
                  <div className="history-stat-values">
                    {details.championStats.slice(0, 3).map((entry) => (
                      <span key={entry.name} className="history-tag">
                        {entry.name} ({entry.matchesCount})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="history-stat-card">
                  <div className="history-stat-label">Rotas</div>
                  <div className="history-stat-values">
                    {details.roleStats.slice(0, 3).map((entry) => (
                      <span key={entry.name} className="history-tag">
                        {formatRole(entry.name)} ({entry.matchesCount})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="history-entry-list">
                {details.history.map((entry) => {
                  const champion = findChampionByName(entry.championName)
                  const result = resolveResult(entry)

                  return (
                    <div key={entry.matchId} className="history-entry-card">
                      <div className="history-entry-main">
                        <div className="history-champion-shell">
                          {champion ? (
                            <img
                              src={champion.icon}
                              alt={champion.name}
                              className="history-champion-icon"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <div className="history-champion-fallback">
                              {entry.championName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="history-entry-copy">
                          <div className="history-entry-title">
                            {entry.championName}
                            <span className="history-entry-role">{formatRole(entry.role)}</span>
                          </div>
                          <div className="history-entry-subtitle">
                            {formatDate(entry.gameDate)}
                            <span className="history-entry-side">
                              {entry.side === 'BLUE' ? 'Blue Side' : 'Red Side'}
                            </span>
                            {entry.patchVersion ? <span>Patch {entry.patchVersion}</span> : null}
                          </div>
                          {entry.matchTitle ? (
                            <div className="history-entry-note">{entry.matchTitle}</div>
                          ) : null}
                        </div>
                      </div>

                      <span className={`history-result-pill ${result.className}`}>
                        {result.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function HistoryModal({
  open,
  players,
  playerHistories,
  loadingPlayerId,
  onLoadPlayerHistory,
  onClose,
}) {
  const [query, setQuery] = useState('')
  const [expandedPlayerId, setExpandedPlayerId] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      return
    }

    setExpandedPlayerId('')
  }, [open])

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return players
    }

    return players.filter((player) =>
      player.name.toLowerCase().includes(normalizedQuery)
    )
  }, [players, query])

  if (!open) return null

  async function handleToggle(playerId) {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId('')
      return
    }

    setExpandedPlayerId(playerId)

    if (!playerHistories[playerId]) {
      await onLoadPlayerHistory(playerId)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-panel history-modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>

        <h2 className="modal-title">Historico de players</h2>
        <p className="modal-subtitle">
          Abra um player para ver campeoes, rota jogada e se a partida terminou em vitoria ou derrota.
        </p>

        <div className="history-toolbar">
          <input
            className="form-input history-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar player..."
            autoFocus
          />
        </div>

        <div className="history-search-count">
          {filteredPlayers.length} player{filteredPlayers.length === 1 ? '' : 's'}
        </div>

        <div className="history-accordion-list">
          {filteredPlayers.length === 0 ? (
            <div className="history-empty">Nenhum player encontrado para essa busca.</div>
          ) : (
            filteredPlayers.map((player) => (
              <HistoryAccordion
                key={player.id || player.name}
                player={player}
                details={player.id ? playerHistories[player.id] : null}
                expanded={expandedPlayerId === player.id}
                loading={loadingPlayerId === player.id}
                onToggle={() => handleToggle(player.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
