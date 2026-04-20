import '../src/config/env-fallbacks';
import { PrismaClient, TeamSide } from '@prisma/client';

const prisma = new PrismaClient();

type ParsedPlayerEntry = {
  playerName: string;
  normalizedName: string;
  playerImg: string | null;
  championName: string;
  role: string;
  side: TeamSide;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function parseTeam(value: unknown, side: TeamSide) {
  if (!Array.isArray(value)) {
    return [] as ParsedPlayerEntry[];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const playerName =
      typeof record.playerName === 'string' ? record.playerName.trim() : '';
    const championName =
      typeof record.championName === 'string' ? record.championName.trim() : '';
    const playerImg =
      typeof record.playerImg === 'string' ? record.playerImg.trim() || null : null;
    const role = typeof record.role === 'string' ? record.role.trim() : '';

    if (!playerName || !championName || !role) {
      return [];
    }

    return [
      {
        playerName,
        normalizedName: normalizeName(playerName),
        playerImg,
        championName,
        role,
        side,
      },
    ];
  });
}

async function main() {
  const matches = await prisma.match.findMany({
    select: {
      id: true,
      gameDate: true,
      blueTeam: true,
      redTeam: true,
    },
    orderBy: {
      gameDate: 'asc',
    },
  });

  for (const match of matches) {
    const rawEntries = [
      ...parseTeam(match.blueTeam, TeamSide.BLUE),
      ...parseTeam(match.redTeam, TeamSide.RED),
    ];
    const uniqueEntries = rawEntries.filter((entry, index, current) => {
      return (
        current.findIndex(
          (candidate) => candidate.normalizedName === entry.normalizedName,
        ) === index
      );
    });

    for (const entry of uniqueEntries) {
      const player = await prisma.player.upsert({
        where: {
          normalizedName: entry.normalizedName,
        },
        update: {},
        create: {
          name: entry.playerName,
          normalizedName: entry.normalizedName,
          playerImg: entry.playerImg,
        },
      });

      await prisma.player.updateMany({
        where: {
          id: player.id,
          OR: [{ lastMatchAt: null }, { lastMatchAt: { lt: match.gameDate } }],
        },
        data: {
          name: entry.playerName,
          ...(entry.playerImg ? { playerImg: entry.playerImg } : {}),
          lastMatchAt: match.gameDate,
        },
      });

      await prisma.matchParticipant.upsert({
        where: {
          matchId_playerId: {
            matchId: match.id,
            playerId: player.id,
          },
        },
        update: {
          side: entry.side,
          championName: entry.championName,
          role: entry.role,
        },
        create: {
          matchId: match.id,
          playerId: player.id,
          side: entry.side,
          championName: entry.championName,
          role: entry.role,
        },
      });
    }
  }

  const players = await prisma.player.findMany({
    include: {
      participations: {
        include: {
          match: {
            select: {
              gameDate: true,
            },
          },
        },
      },
    },
  });

  for (const player of players) {
    const matchesCount = player.participations.length;
    const lastMatchAt = player.participations.reduce<Date | null>(
      (latest, participation) => {
        if (!latest || participation.match.gameDate > latest) {
          return participation.match.gameDate;
        }

        return latest;
      },
      null,
    );

    await prisma.player.update({
      where: {
        id: player.id,
      },
      data: {
        matchesCount,
        lastMatchAt,
      },
    });
  }

  console.log(
    `Backfill finished for ${matches.length} matches and ${players.length} players.`,
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
