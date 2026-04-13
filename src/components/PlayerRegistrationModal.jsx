import { useEffect, useState } from 'react'

import { fileToBase64 } from '../lib/app-utils'

export function PlayerRegistrationModal({ open, loading, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [playerImg, setPlayerImg] = useState('')

  useEffect(() => {
    if (!open) {
      setName('')
      setPlayerImg('')
    }
  }, [open])

  if (!open) return null

  async function handleFileChange(file) {
    if (!file) return
    const base64 = await fileToBase64(file)
    setPlayerImg(base64)
  }

  async function handleSubmit() {
    const success = await onSubmit({
      name: name.trim(),
      playerImg: playerImg || undefined,
    })

    if (success) {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={event => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>

        <h2 className="modal-title">Cadastro de jogador</h2>
        <p className="modal-subtitle">
          Apenas o seu email pode cadastrar players novos no sistema.
        </p>

        <div className="form-stack">
          <label className="field-label" htmlFor="player-name">
            Nome do jogador
          </label>
          <input
            id="player-name"
            className="form-input"
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Nome do invocador"
            maxLength={24}
          />

          <label className="field-label" htmlFor="player-image">
            Imagem do jogador
          </label>
          <input
            id="player-image"
            className="form-input"
            type="file"
            accept="image/*"
            onChange={event => handleFileChange(event.target.files?.[0])}
          />

          {playerImg && (
            <div className="registration-preview">
              <img src={playerImg} alt="Preview do jogador" className="registration-preview-image" />
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-draft"
              type="button"
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
            >
              {loading ? 'SALVANDO...' : 'CADASTRAR JOGADOR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
