import { PrismaClient, TeamSide, WinnerSide } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'matheusjean11@gmail.com';
const MATCH_DATE = new Date('2026-04-12T20:00:00-03:00');
const MATCH_TITLE = 'Seed - Partida de 12/04/2026';
const MATCH_NOTES =
  'Seed manual da partida de 12 de abril de 2026. Blue Side venceu.';

const blueTeam = [
  { playerName: 'Theuz\u00E3o', championName: 'Syndra', role: 'mid' },
  { playerName: 'adelpo', championName: 'Karma', role: 'support' },
  { playerName: 'frodo', championName: 'Zaahen', role: 'top' },
  { playerName: 'Eldavids', championName: 'Dr Mundo', role: 'jungle' },
  { playerName: 'juka', championName: 'EzReal', role: 'adc' },
];

const redTeam = [
  { playerName: 'Moth\u00E9', championName: 'Viktor', role: 'mid' },
  { playerName: 'Xakara', championName: 'Viego', role: 'jungle' },
  { playerName: 'Amig\u00E3o', championName: 'Malphite', role: 'top' },
  { playerName: 'Yagod', championName: 'Zyra', role: 'support' },
  { playerName: 'Thomas', championName: 'Miss Fortune', role: 'adc' },
];

function normalizeName(name: string) {
  return name.trim().toLowerCase();
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
      },
    });

    const allEntries = [
      ...blueTeam.map((entry) => ({ ...entry, side: TeamSide.BLUE })),
      ...redTeam.map((entry) => ({ ...entry, side: TeamSide.RED })),
    ];

    const playersByNormalizedName = new Map<
      string,
      { id: string; name: string; playerImg: string | null }
    >();

    for (const entry of allEntries) {
      const normalizedName = normalizeName(entry.playerName);

      const player = await tx.player.upsert({
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

      playersByNormalizedName.set(normalizedName, player);
    }

    const serializedBlueTeam = blueTeam.map((entry) => {
      const player = playersByNormalizedName.get(normalizeName(entry.playerName));

      if (!player) {
        throw new Error(`Blue player ${entry.playerName} was not created correctly.`);
      }

      return {
        playerId: player.id,
        playerName: player.name,
        playerImg: player.playerImg,
        championName: entry.championName,
        role: entry.role,
      };
    });

    const serializedRedTeam = redTeam.map((entry) => {
      const player = playersByNormalizedName.get(normalizeName(entry.playerName));

      if (!player) {
        throw new Error(`Red player ${entry.playerName} was not created correctly.`);
      }

      return {
        playerId: player.id,
        playerName: player.name,
        playerImg: player.playerImg,
        championName: entry.championName,
        role: entry.role,
      };
    });

    const participantPayloads = allEntries.map((entry) => {
      const player = playersByNormalizedName.get(normalizeName(entry.playerName));

      if (!player) {
        throw new Error(`Participant ${entry.playerName} was not created correctly.`);
      }

      return {
        playerId: player.id,
        side: entry.side,
        championName: entry.championName,
        role: entry.role,
      };
    });

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
          winnerSide: WinnerSide.BLUE,
          createdById: admin.id,
          blueTeam: serializedBlueTeam,
          redTeam: serializedRedTeam,
          participants: {
            create: participantPayloads,
          },
        },
      });

      return {
        admin,
        matchId: existingMatch.id,
        created: false,
        updated: true,
      };
    }

    for (const entry of allEntries) {
      const player = playersByNormalizedName.get(normalizeName(entry.playerName));

      if (!player) {
        throw new Error(`Player ${entry.playerName} was not created correctly.`);
      }

      await tx.player.update({
        where: {
          id: player.id,
        },
        data: {
          matchesCount: {
            increment: 1,
          },
          lastMatchAt: MATCH_DATE,
        },
      });
    }

    const match = await tx.match.create({
      data: {
        title: MATCH_TITLE,
        notes: MATCH_NOTES,
        gameDate: MATCH_DATE,
        winnerSide: WinnerSide.BLUE,
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

    return {
      admin,
      matchId: match.id,
      created: true,
      updated: false,
    };
  });

  if (result.created) {
    console.log(
      `Yesterday match seed created for ${result.admin.email} with id ${result.matchId}`,
    );
    return;
  }

  if (result.updated) {
    console.log(
      `Yesterday match seed updated for ${result.admin.email} with id ${result.matchId}`,
    );
    return;
  }

  console.log(
    `Yesterday match seed already exists for ${result.admin.email} with id ${result.matchId}`,
  );
}

main()
  .catch((error) => {
    console.error('Yesterday match seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
