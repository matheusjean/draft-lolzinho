import { useCallback, useEffect, useState } from 'react'

import {
  createMatch,
  createPlayer,
  deleteMatch,
  getMatches,
  getMe,
  getPlayerById,
  getPlayers,
  requestLoginCode,
  verifyLoginCode,
} from './api'
import { DrawScreen } from './components/DrawScreen'
import { HistoryModal } from './components/HistoryModal'
import { InputScreen } from './components/InputScreen'
import { LeaderboardModal } from './components/LeaderboardPanel'
import { LoginScreen } from './components/LoginScreen'
import { MatchHistoryModal } from './components/MatchHistoryModal'
import { PlayerRegistrationModal } from './components/PlayerRegistrationModal'
import {
  AUTH_EMAIL_KEY,
  clearStoredSession,
  DEFAULT_ADMIN_EMAIL,
  loadStoredEmail,
  loadStoredToken,
  normalizeCatalogPlayer,
  normalizeName,
  persistSession,
} from './lib/app-utils'
import './App.css'

function NoticeBar({ notice }) {
  if (!notice) return null

  return (
    <div className={`notice-bar ${notice.type === 'error' ? 'notice-error' : 'notice-success'}`}>
      {notice.text}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-title">Carregando dados do backend</div>
        <div className="loading-subtitle">Players cadastrados e partidas recentes estao sendo sincronizados.</div>
      </div>
    </div>
  )
}

function HeaderBar({
  user,
  playersCount,
  matchesCount,
  canRegisterPlayer,
  onOpenLeaderboard,
  onOpenMatchHistory,
  onOpenHistory,
  onOpenLogin,
  onOpenRegister,
  onLogout,
}) {
  return (
    <header className="app-topbar">
      <div>
        <div className="topbar-kicker">LoL Draft Manager</div>
        <div className="topbar-title">Draft livre com cadastro de jogador controlado no backend</div>
      </div>

      <div className="topbar-meta">
        <div className="topbar-chip">
          <span>{playersCount}</span>
          players
        </div>
        <div className="topbar-chip">
          <span>{matchesCount}</span>
          partidas
        </div>

        <button className="topbar-action" type="button" onClick={onOpenLeaderboard}>
          Tabela atualizada
        </button>

        <button className="topbar-action" type="button" onClick={onOpenHistory}>
          Historico players
        </button>

        <button className="topbar-action" type="button" onClick={onOpenMatchHistory}>
          Historico partidas
        </button>

        {canRegisterPlayer && (
          <button className="topbar-action" type="button" onClick={onOpenRegister}>
            Cadastro de jogador
          </button>
        )}

        {user ? (
          <>
            <div className="topbar-user">{user.email}</div>
            <button className="topbar-logout" type="button" onClick={onLogout}>
              Sair
            </button>
          </>
        ) : (
          <button className="topbar-action" type="button" onClick={onOpenLogin}>
            Login
          </button>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const [token, setToken] = useState(loadStoredToken)
  const [storedEmail, setStoredEmail] = useState(loadStoredEmail)
  const [user, setUser] = useState(null)
  const [playersCatalog, setPlayersCatalog] = useState([])
  const [matches, setMatches] = useState([])
  const [draftPlayers, setDraftPlayers] = useState(null)
  const [notice, setNotice] = useState(null)
  const [bootLoading, setBootLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [savingMatch, setSavingMatch] = useState(false)
  const [creatingPlayer, setCreatingPlayer] = useState(false)
  const [previewCode, setPreviewCode] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPlayerRegistration, setShowPlayerRegistration] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showMatchHistoryModal, setShowMatchHistoryModal] = useState(false)
  const [playerHistories, setPlayerHistories] = useState({})
  const [loadingPlayerHistoryId, setLoadingPlayerHistoryId] = useState('')
  const [deletingMatchId, setDeletingMatchId] = useState('')

  const isPlayerAdmin = user?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL

  const refreshPlayers = useCallback(async (sessionToken = token) => {
    const data = await getPlayers(sessionToken || undefined)
    const normalized = data.map((player, index) => normalizeCatalogPlayer(player, index))
    setPlayersCatalog(normalized)
    return normalized
  }, [token])

  const refreshMatches = useCallback(async (sessionToken = token) => {
    const data = await getMatches(sessionToken || undefined)
    setMatches(data)
    return data
  }, [token])

  useEffect(() => {
    if (!notice) return undefined

    const timeoutId = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      setBootLoading(true)

      try {
        const [catalog, recentMatches] = await Promise.all([
          getPlayers(),
          getMatches(),
        ])

        if (!active) return

        setPlayersCatalog(catalog.map((player, index) => normalizeCatalogPlayer(player, index)))
        setMatches(recentMatches)

        if (token) {
          try {
            const currentUser = await getMe(token)
            if (!active) return
            setUser(currentUser)
            setStoredEmail(currentUser.email)
          } catch {
            if (!active) return
            clearStoredSession()
            setToken('')
            setUser(null)
          }
        }
      } finally {
        if (active) setBootLoading(false)
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [])

  async function handleRequestCode(email) {
    setAuthSubmitting(true)

    try {
      const result = await requestLoginCode(email)
      setStoredEmail(email)
      localStorage.setItem(AUTH_EMAIL_KEY, email)
      setPreviewCode(result.code || '')
      setNotice({
        type: 'success',
        text: result.code
          ? 'Codigo recebido do backend local. Use-o no modal para entrar.'
          : 'Codigo gerado. Confira os logs do backend.',
      })
      return true
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Nao foi possivel gerar o codigo.',
      })
      return false
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleVerifyCode(email, code) {
    setAuthSubmitting(true)

    try {
      const result = await verifyLoginCode(email, code)
      persistSession(result.accessToken, email)
      setToken(result.accessToken)
      setStoredEmail(email)
      setUser(result.user)
      setPreviewCode('')
      setShowLoginModal(false)
      await Promise.all([refreshPlayers(result.accessToken), refreshMatches(result.accessToken)])
      setNotice({
        type: 'success',
        text: 'Login realizado com sucesso.',
      })
      return true
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Nao foi possivel validar o codigo.',
      })
      return false
    } finally {
      setAuthSubmitting(false)
    }
  }

  function handleLogout() {
    clearStoredSession()
    setToken('')
    setUser(null)
    setDraftPlayers(null)
    setPreviewCode('')
    setShowPlayerRegistration(false)
    setShowLeaderboardModal(false)
    setShowHistoryModal(false)
    setShowMatchHistoryModal(false)
    setStoredEmail(DEFAULT_ADMIN_EMAIL)
    setNotice({
      type: 'success',
      text: 'Sessao encerrada.',
    })
  }

  async function handleCreatePlayer(payload) {
    if (!token || !isPlayerAdmin) {
      setNotice({
        type: 'error',
        text: 'Somente o seu email pode cadastrar jogador.',
      })
      return false
    }

    setCreatingPlayer(true)

    try {
      await createPlayer(token, payload)
      await refreshPlayers(token)
      setNotice({
        type: 'success',
        text: 'Jogador cadastrado com sucesso.',
      })
      return true
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Nao foi possivel cadastrar o jogador.',
      })
      return false
    } finally {
      setCreatingPlayer(false)
    }
  }

  async function handleLoadPlayerHistory(playerId) {
    if (!playerId) {
      return null
    }

    if (playerHistories[playerId]) {
      return playerHistories[playerId]
    }

    setLoadingPlayerHistoryId(playerId)

    try {
      const detail = await getPlayerById(playerId, token || undefined)
      setPlayerHistories((current) => ({
        ...current,
        [playerId]: detail,
      }))
      return detail
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Nao foi possivel carregar o historico do player.',
      })
      return null
    } finally {
      setLoadingPlayerHistoryId((current) => (current === playerId ? '' : current))
    }
  }

  async function handleStartDraft(players) {
    const catalogMap = new Map(
      playersCatalog.map((player) => [normalizeName(player.name), player])
    )
    const missingPlayers = players.filter(
      (player) => !catalogMap.has(normalizeName(player.name))
    )

    if (missingPlayers.length > 0) {
      setNotice({
        type: 'error',
        text: `Cadastre os jogadores antes do draft: ${missingPlayers.map((player) => player.name).join(', ')}`,
      })
      return false
    }

    setDraftPlayers(
      players.map((player, index) => {
        const persisted = catalogMap.get(normalizeName(player.name))
        return {
          id: persisted.id,
          name: persisted.name,
          imageUrl: persisted.imageUrl,
          matchesCount: persisted.matchesCount,
          index,
        }
      })
    )

    return true
  }

  async function handleSaveMatch(payload) {
    if (!token) {
      setNotice({
        type: 'error',
        text: 'Entre pelo botao de login do header para salvar a partida.',
      })
      return null
    }

    if (!isPlayerAdmin) {
      setNotice({
        type: 'error',
        text: 'Somente o seu email pode salvar partidas.',
      })
      return null
    }

    setSavingMatch(true)

    try {
      const savedMatch = await createMatch(token, payload)
      await Promise.all([refreshPlayers(token), refreshMatches(token)])
      setNotice({
        type: 'success',
        text: 'Partida salva com sucesso no backend.',
      })
      return savedMatch
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Nao foi possivel salvar a partida.',
      })
      return null
    } finally {
      setSavingMatch(false)
    }
  }

  async function handleDeleteMatch(match) {
    if (!token) {
      setNotice({
        type: 'error',
        text: 'Entre pelo botao de login do header para apagar a partida.',
      })
      return false
    }

    if (!isPlayerAdmin) {
      setNotice({
        type: 'error',
        text: 'Somente o seu email pode apagar partidas.',
      })
      return false
    }

    setDeletingMatchId(match.id)

    try {
      await deleteMatch(token, match.id)
      setPlayerHistories({})
      await Promise.all([refreshPlayers(token), refreshMatches(token)])
      setNotice({
        type: 'success',
        text: `Partida apagada com sucesso: ${match.title || formatMatchNoticeDate(match.gameDate)}.`,
      })
      return true
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Nao foi possivel apagar a partida.',
      })
      return false
    } finally {
      setDeletingMatchId((current) => (current === match.id ? '' : current))
    }
  }

  if (bootLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="app-shell">
      <NoticeBar notice={notice} />

      <HeaderBar
        user={user}
        playersCount={playersCatalog.length}
        matchesCount={matches.length}
        canRegisterPlayer={Boolean(isPlayerAdmin)}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenMatchHistory={() => setShowMatchHistoryModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenRegister={() => setShowPlayerRegistration(true)}
        onLogout={handleLogout}
      />

      <LeaderboardModal
        open={showLeaderboardModal}
        players={playersCatalog}
        matches={matches}
        onClose={() => setShowLeaderboardModal(false)}
      />

      {!draftPlayers ? (
        <InputScreen
          onStart={handleStartDraft}
          savedPlayers={playersCatalog}
          recentMatches={matches}
          syncingPlayers={false}
          loadingPlayers={false}
        />
      ) : (
        <DrawScreen
          initialPlayers={draftPlayers}
          onRestart={() => setDraftPlayers(null)}
          onSaveMatch={handleSaveMatch}
          canManageMatches={Boolean(isPlayerAdmin)}
          savingMatch={savingMatch}
        />
      )}

      <LoginScreen
        open={showLoginModal}
        initialEmail={storedEmail}
        onRequestCode={handleRequestCode}
        onVerifyCode={handleVerifyCode}
        previewCode={previewCode}
        loading={authSubmitting}
        onClose={() => setShowLoginModal(false)}
      />

      <PlayerRegistrationModal
        open={showPlayerRegistration}
        loading={creatingPlayer}
        onClose={() => setShowPlayerRegistration(false)}
        onSubmit={handleCreatePlayer}
      />

      <HistoryModal
        open={showHistoryModal}
        players={playersCatalog}
        playerHistories={playerHistories}
        loadingPlayerId={loadingPlayerHistoryId}
        onLoadPlayerHistory={handleLoadPlayerHistory}
        onClose={() => setShowHistoryModal(false)}
      />

      <MatchHistoryModal
        open={showMatchHistoryModal}
        matches={matches}
        canDeleteMatches={Boolean(isPlayerAdmin)}
        deletingMatchId={deletingMatchId}
        onDeleteMatch={handleDeleteMatch}
        onClose={() => setShowMatchHistoryModal(false)}
      />
    </div>
  )
}

function formatMatchNoticeDate(value) {
  if (!value) return 'Partida sem titulo'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Partida sem titulo'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
