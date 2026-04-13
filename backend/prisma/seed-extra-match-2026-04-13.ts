import {
  Prisma,
  PrismaClient,
  TeamSide,
  WinnerSide,
} from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'matheusjean11@gmail.com';
const MATCH_DATE = new Date('2026-04-13T20:00:00-03:00');
const MATCH_TITLE = 'Seed - Partida extra de 13/04/2026 - Juka Lissandra';
const MATCH_NOTES =
  'Seed manual da partida de 13 de abril de 2026. Red Side venceu.';

type SeedEntry = {
  playerId?: string;
  playerName: string;
  championName: string;
  role: string;
};

type ResolvedPlayer = {
  id: string;
  name: string;
  playerImg: string | null;
};

const blueTeam: SeedEntry[] = [
  { playerName: 'Theuzão', championName: 'Akali', role: 'mid' },
  { playerName: 'adelpo', championName: 'Seraphine', role: 'support' },
  { playerName: 'frodo', championName: 'Ashe', role: 'adc' },
  { playerName: 'eldavids', championName: 'Ornn', role: 'top' },
  {
    playerId: 'cmnx4icti0009leqc0o2qi5v9',
    playerName: 'Dr Pingola',
    championName: 'Amumu',
    role: 'jungle',
  },
];

const redTeam: SeedEntry[] = [
  { playerName: 'juka', championName: 'Lissandra', role: 'mid' },
  { playerName: 'Xakara', championName: 'Nocturne', role: 'jungle' },
  { playerName: 'Amigão', championName: 'Mordekaiser', role: 'top' },
  { playerName: 'Yagod', championName: 'Karma', role: 'support' },
  { playerName: 'Thomas', championName: 'Sivir', role: 'adc' },
];

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function getEntryKey(entry: SeedEntry) {
  return entry.playerId ?? `name:${normalizeName(entry.playerName)}`;
}

async function resolvePlayer(
  tx: Prisma.TransactionClient,
  entry: SeedEntry,
): Promise<ResolvedPlayer> {
  if (entry.playerId) {
    const player = await tx.player.findUnique({
      where: {
        id: entry.playerId,
      },
      select: {
        id: true,
        name: true,
        playerImg: true,
      },
    });

    if (!player) {
      throw new Error(
        `Player ${entry.playerName} with id ${entry.playerId} was not found.`,
      );
    }

    return player;
  }

  const normalizedName = normalizeName(entry.playerName);

  return tx.player.upsert({
    where: {
      normalizedName,
    },
    update: {
      name: entry.playerName,
    },
    create: {
      name: entry.playerName,
      normalizedName,
    },
    select: {
      id: true,
      name: true,
      playerImg: true,
    },
  });
}

async function syncPlayerSummaries(
  tx: Prisma.TransactionClient,
  playerIds: string[],
) {
  for (const playerId of playerIds) {
    const participations = await tx.matchParticipant.findMany({
      where: {
        playerId,
      },
      select: {
        match: {
          select: {
            gameDate: true,
          },
        },
      },
    });

    const lastMatchAt = participations.reduce<Date | null>((latest, entry) => {
      if (!latest || entry.match.gameDate > latest) {
        return entry.match.gameDate;
      }

      return latest;
    }, null);

    await tx.player.update({
      where: {
        id: playerId,
      },
      data: {
        matchesCount: participations.length,
        lastMatchAt,
      },
    });
  }
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const admin = await tx.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { isSuperAdmin: true },
      create: {
        email: ADMIN_EMAIL,
        isSuperAdmin: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const existingMatch = await tx.match.findFirst({
      where: {
        title: MATCH_TITLE,
        gameDate: MATCH_DATE,
      },
      select: {
        id: true,
        participants: {
          select: {
            playerId: true,
          },
        },
      },
    });

    const allEntries = [
      ...blueTeam.map((entry) => ({ ...entry, side: TeamSide.BLUE })),
      ...redTeam.map((entry) => ({ ...entry, side: TeamSide.RED })),
    ];

    const playersByEntryKey = new Map<string, ResolvedPlayer>();

    for (const entry of allEntries) {
      const player = await resolvePlayer(tx, entry);
      playersByEntryKey.set(getEntryKey(entry), player);
    }

    const getResolvedPlayer = (
      entry: SeedEntry,
      teamLabel: 'Blue' | 'Red' | 'Participant',
    ) => {
      const player = playersByEntryKey.get(getEntryKey(entry));

      if (!player) {
        throw new Error(
          `${teamLabel} player ${entry.playerName} was not resolved correctly.`,
        );
      }

      return player;
    };

    const serializedBlueTeam = blueTeam.map((entry) => {
      const player = getResolvedPlayer(entry, 'Blue');

      return {
        playerId: player.id,
        playerName: player.name,
        playerImg: player.playerImg,
        championName: entry.championName,
        role: entry.role,
      };
    });

    const serializedRedTeam = redTeam.map((entry) => {
      const player = getResolvedPlayer(entry, 'Red');

      return {
        playerId: player.id,
        playerName: player.name,
        playerImg: player.playerImg,
        championName: entry.championName,
        role: entry.role,
      };
    });

    const participantPayloads = allEntries.map((entry) => {
      const player = getResolvedPlayer(entry, 'Participant');

      return {
        playerId: player.id,
        side: entry.side,
        championName: entry.championName,
        role: entry.role,
      };
    });

    const impactedPlayerIds = Array.from(
      new Set([
        ...(existingMatch?.participants.map((participant) => participant.playerId) ??
          []),
        ...participantPayloads.map((participant) => participant.playerId),
      ]),
    );

    if (existingMatch) {
      await tx.matchParticipant.deleteMany({
        where: {
          matchId: existingMatch.id,
        },
      });

      await tx.match.update({
        where: {
          id: existingMatch.id,
        },
        data: {
          title: MATCH_TITLE,
          notes: MATCH_NOTES,
          gameDate: MATCH_DATE,
          winnerSide: WinnerSide.RED,
          createdById: admin.id,
          blueTeam: serializedBlueTeam,
          redTeam: serializedRedTeam,
          participants: {
            create: participantPayloads,
          },
        },
      });

      await syncPlayerSummaries(tx, impactedPlayerIds);

      return {
        admin,
        matchId: existingMatch.id,
        created: false,
        updated: true,
      };
    }

    const match = await tx.match.create({
      data: {
        title: MATCH_TITLE,
        notes: MATCH_NOTES,
        gameDate: MATCH_DATE,
        winnerSide: WinnerSide.RED,
        createdById: admin.id,
        blueTeam: serializedBlueTeam,
        redTeam: serializedRedTeam,
        participants: {
          create: participantPayloads,
        },
      },
      select: {
        id: true,
      },
    });

    await syncPlayerSummaries(tx, impactedPlayerIds);

    return {
      admin,
      matchId: match.id,
      created: true,
      updated: false,
    };
  });

  if (result.created) {
    console.log(
      `Extra match seed created for ${result.admin.email} with id ${result.matchId}`,
    );
    return;
  }

  if (result.updated) {
    console.log(
      `Extra match seed updated for ${result.admin.email} with id ${result.matchId}`,
    );
    return;
  }

  console.log(
    `Extra match seed already exists for ${result.admin.email} with id ${result.matchId}`,
  );
}

main()
  .catch((error) => {
    console.error('Extra match seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
