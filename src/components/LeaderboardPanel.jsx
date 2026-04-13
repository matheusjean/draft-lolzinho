import { useMemo } from 'react'

import { Avatar } from './Avatar'
import { normalizeName } from '../lib/app-utils'

function buildLeaderboard(players, matches) {
  const standings = new Map()

  function ensurePlayer(playerName, patch = {}) {
    const normalized = normalizeName(playerName || '')
    if (!normalized) return null

    const current = standings.get(normalized) || {
      id: null,
      name: playerName,
      imageUrl: null,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      index: standings.size,
    }

    const nextValue = {
      ...current,
      ...patch,
      name: patch.name || current.name || playerName,
    }

    standings.set(normalized, nextValue)
    return nextValue
  }

  players.forEach((player, index) => {
    ensurePlayer(player.name, {
      id: player.id ?? null,
      name: player.name,
      imageUrl: player.imageUrl || null,
      index,
    })
  })

  matches.forEach((match) => {
    if (!match?.winnerSide) return

    const blueTeam = Array.isArray(match.blueTeam) ? match.blueTeam : []
    const redTeam = Array.isArray(match.redTeam) ? match.redTeam : []
    const blueWon = match.winnerSide === 'BLUE'

    blueTeam.forEach((player) => {
      const current = ensurePlayer(player.playerName, {
        imageUrl: player.playerImg || undefined,
      })

      if (!current) return

      current.matchesPlayed += 1
      if (blueWon) current.wins += 1
      else current.losses += 1
    })

    redTeam.forEach((player) => {
      const current = ensurePlayer(player.playerName, {
        imageUrl: player.playerImg || undefined,
      })

      if (!current) return

      current.matchesPlayed += 1
      if (blueWon) current.losses += 1
      else current.wins += 1
    })
  })

  return [...standings.values()]
    .map((player) => ({
      ...player,
      winRate: player.matchesPlayed > 0
        ? (player.wins / player.matchesPlayed) * 100
        : 0,
    }))
    .sort((left, right) => {
      if (right.winRate !== left.winRate) return right.winRate - left.winRate
      if (right.wins !== left.wins) return right.wins - left.wins
      if (right.matchesPlayed !== left.matchesPlayed) return right.matchesPlayed - left.matchesPlayed
      return left.name.localeCompare(right.name)
    })
}

function formatWinRate(value) {
  return `${value.toFixed(1)}%`
}

export function LeaderboardModal({ open, players, matches, onClose }) {
  const leaderboard = useMemo(
    () => buildLeaderboard(players, matches),
    [players, matches]
  )

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-panel leaderboard-modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>

        <h2 className="modal-title">Tabela atualizada</h2>
        <p className="modal-subtitle">
          Ranking calculado automaticamente pelas partidas salvas com vencedor definido.
        </p>

        <section className="leaderboard-panel leaderboard-panel-modal">
          <div className="leaderboard-panel-head">
            <div>
              <div className="leaderboard-title">Visao geral do ranking</div>
              <div className="leaderboard-subtitle">
                Winrate, partidas jogadas, vitorias e derrotas em um lugar so.
              </div>
            </div>
            <div className="leaderboard-summary">
              {leaderboard.length} player{leaderboard.length === 1 ? '' : 's'}
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              Ainda nao ha partidas com vitoria ou derrota definidas para montar a tabela.
            </div>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Winrate</th>
                    <th>Partidas</th>
                    <th>Vitorias</th>
                    <th>Derrotas</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player, index) => (
                    <tr key={player.id || `${player.name}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="leaderboard-player-cell">
                          <Avatar player={player} size={36} />
                          <span className="leaderboard-player-name">{player.name}</span>
                        </div>
                      </td>
                      <td className="leaderboard-winrate">{formatWinRate(player.winRate)}</td>
                      <td>{player.matchesPlayed}</td>
                      <td className="leaderboard-wins">{player.wins}</td>
                      <td className="leaderboard-losses">{player.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
