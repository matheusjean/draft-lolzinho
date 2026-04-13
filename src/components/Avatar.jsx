import { ROLE_COLORS, initials } from '../lib/app-utils'

export function Avatar({ player, size = 40, className = '' }) {
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
