import { useEffect, useState } from 'react'

import { CHAMPION_OPTIONS } from '../lib/champions'
import { normalizeName } from '../lib/app-utils'

export function ChampionPickerModal({
  open,
  side,
  currentChampionName,
  onSelect,
  onClear,
  onClose,
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

  if (!open) return null

  const normalizedQuery = normalizeName(query)
  const normalizedSelectedName = normalizeName(currentChampionName || '')
  const filteredChampions = normalizedQuery
    ? CHAMPION_OPTIONS.filter((champion) => champion.searchText.includes(normalizedQuery))
    : CHAMPION_OPTIONS

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal-panel champion-modal-panel ${side === 'blue' ? 'champion-modal-blue' : 'champion-modal-red'}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>

        <h2 className="modal-title">Selecionar campeao</h2>
        <p className="modal-subtitle">
          Clique no icone do campeao para preencher o jogador. A busca aceita nome, titulo e tags.
        </p>

        <div className="champion-modal-toolbar">
          <input
            className="form-input champion-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar campeao..."
            autoFocus
          />

          <button
            className="btn-secondary champion-clear-button"
            type="button"
            onClick={onClear}
            disabled={!currentChampionName}
          >
            Limpar
          </button>
        </div>

        <div className="champion-search-meta">
          {filteredChampions.length} campeao{filteredChampions.length === 1 ? '' : 'es'}
        </div>

        <div className="champion-picker-grid">
          {filteredChampions.map((champion) => {
            const isSelected = normalizeName(champion.name) === normalizedSelectedName

            return (
              <button
                key={champion.id}
                className={`champion-option ${isSelected ? 'champion-option-selected' : ''}`}
                type="button"
                onClick={() => onSelect(champion)}
              >
                <img
                  src={champion.icon}
                  alt={champion.name}
                  className="champion-option-icon"
                  loading="lazy"
                  draggable={false}
                />
                <span className="champion-option-name">{champion.name}</span>
                <span className="champion-option-tags">{champion.tags.join(' / ')}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
