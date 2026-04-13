import { useEffect, useState } from 'react'

import { DEFAULT_ADMIN_EMAIL } from '../lib/app-utils'

export function LoginScreen({
  open,
  initialEmail,
  onRequestCode,
  onVerifyCode,
  previewCode,
  loading,
  onClose,
}) {
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [codeRequested, setCodeRequested] = useState(false)

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  if (!open) return null

  async function handleRequestCode() {
    const requested = await onRequestCode(email.trim())
    if (requested) setCodeRequested(true)
  }

  async function handleVerifyCode() {
    const verified = await onVerifyCode(email.trim(), code.trim())
    if (verified) setCode('')
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={event => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>

        <h2 className="modal-title">Login por codigo</h2>
        <p className="modal-subtitle">Use o seu email para liberar as acoes administrativas.</p>

        <div className="form-stack">
          <label className="field-label" htmlFor="login-email">
            Email autorizado
          </label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder={DEFAULT_ADMIN_EMAIL}
            autoComplete="email"
          />

          <button
            className="btn-draft"
            type="button"
            onClick={handleRequestCode}
            disabled={loading || !email.trim()}
          >
            {loading ? 'ENVIANDO...' : 'ENVIAR CODIGO'}
          </button>

          <label className="field-label" htmlFor="login-code">
            Codigo de acesso
          </label>
          <input
            id="login-code"
            className="form-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />

          <button
            className="btn-secondary"
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || !email.trim() || code.trim().length !== 6}
          >
            {loading ? 'VALIDANDO...' : 'ENTRAR'}
          </button>
        </div>

        {previewCode && (
          <div className="code-preview">
            <div className="code-preview-title">Codigo retornado pelo backend local</div>
            <div className="code-preview-value">{previewCode}</div>
          </div>
        )}

        <div className="login-help">
          {codeRequested
            ? 'No ambiente local voce pode usar o codigo acima imediatamente.'
            : 'O backend local devolve o codigo em desenvolvimento para acelerar os testes.'}
        </div>
      </div>
    </div>
  )
}
