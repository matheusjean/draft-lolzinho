import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TeamSide } from '@prisma/client';

import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';

type NormalizedMatchPlayer = {
  playerName: string;
  playerImg: string | null;
  championName: string;
  role: string;
  normalizedName: string;
  side: TeamSide;
};

const MATCH_ADMIN_EMAIL = 'matheusjean11@gmail.com';

const matchInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
      isSuperAdmin: true,
    },
  },
  participants: {
    include: {
      player: {
        select: {
          id: true,
          name: true,
          playerImg: true,
          matchesCount: true,
          lastMatchAt: true,
        },
      },
    },
  },
} satisfies Prisma.MatchInclude;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMatchDto, user: AuthenticatedUser) {
    this.assertMatchAdmin(user);

    const gameDate = new Date(dto.gameDate);

    if (Number.isNaN(gameDate.getTime())) {
      throw new BadRequestException('gameDate must be a valid ISO date.');
    }

    const blueTeam = this.normalizeTeam(dto.blueTeam, TeamSide.BLUE);
    const redTeam = this.normalizeTeam(dto.redTeam, TeamSide.RED);
    const allPlayers = [...blueTeam, ...redTeam];

    this.ensureUniquePlayers(allPlayers);

    return this.prisma.$transaction(async (tx) => {
      const existingPlayers = await tx.player.findMany({
        where: {
          normalizedName: {
            in: allPlayers.map((player) => player.normalizedName),
          },
        },
        select: {
          id: true,
          normalizedName: true,
          playerImg: true,
        },
      });
      const playersByNormalizedName = new Map(
        existingPlayers.map((player) => [
          player.normalizedName,
          { id: player.id, playerImg: player.playerImg },
        ]),
      );
      const missingPlayers = allPlayers.filter(
        (player) => !playersByNormalizedName.has(player.normalizedName),
      );

      if (missingPlayers.length > 0) {
        throw new BadRequestException(
          `Cadastre os players antes de salvar a partida: ${missingPlayers
            .map((player) => player.playerName)
            .join(', ')}`,
        );
      }

      const impactedPlayerIds = [
        ...new Set(
          allPlayers.map(
            (player) =>
              this.getPlayer(playersByNormalizedName, player.normalizedName).id,
          ),
        ),
      ];

      const createdMatch = await tx.match.create({
        data: {
          title: dto.title || null,
          notes: dto.notes || null,
          patchVersion: dto.patchVersion || null,
          gameDate,
          winnerSide: dto.winnerSide ?? null,
          blueTeam: this.toJson(blueTeam, playersByNormalizedName),
          redTeam: this.toJson(redTeam, playersByNormalizedName),
          createdById: user.id,
          participants: {
            create: allPlayers.map((player) => ({
              playerId: this.getPlayer(playersByNormalizedName, player.normalizedName).id,
              side: player.side,
              championName: player.championName,
              role: player.role,
            })),
          },
        },
        select: {
          id: true,
        },
      });

      await this.syncPlayerSummaries(tx, impactedPlayerIds);

      return tx.match.findUniqueOrThrow({
        where: {
          id: createdMatch.id,
        },
        include: matchInclude,
      });
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    this.assertMatchAdmin(user);

    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          createdById: true,
          participants: {
            select: {
              playerId: true,
            },
          },
        },
      });

      if (!match) {
        throw new NotFoundException('Match not found.');
      }

      const impactedPlayerIds = [
        ...new Set(match.participants.map((participant) => participant.playerId)),
      ];

      await tx.match.delete({
        where: {
          id: match.id,
        },
      });

      await this.syncPlayerSummaries(tx, impactedPlayerIds);

      return {
        id: match.id,
        deleted: true,
      };
    });
  }

  findAll() {
    return this.prisma.match.findMany({
      orderBy: {
        gameDate: 'desc',
      },
      include: matchInclude,
    });
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: matchInclude,
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    return match;
  }

  private toJson(
    value: NormalizedMatchPlayer[],
    playersByNormalizedName: Map<string, { id: string; playerImg: string | null }>,
  ) {
    return value.map((player) => ({
      playerId: this.getPlayer(playersByNormalizedName, player.normalizedName).id,
      playerName: player.playerName.trim(),
      playerImg:
        this.getPlayer(playersByNormalizedName, player.normalizedName).playerImg ??
        player.playerImg,
      championName: player.championName.trim(),
      role: player.role.trim(),
    }));
  }

  private normalizeTeam(
    value: CreateMatchDto['blueTeam'],
    side: TeamSide,
  ): NormalizedMatchPlayer[] {
    return value.map((player) => {
      const playerName = player.playerName.trim();
      const playerImg = player.playerImg?.trim() || null;
      const championName = player.championName.trim();
      const role = player.role.trim();

      if (!playerName || !championName || !role) {
        throw new BadRequestException(
          'playerName, championName and role are required for every player.',
        );
      }

      return {
        playerName,
        playerImg,
        championName,
        role,
        normalizedName: this.normalizeName(playerName),
        side,
      };
    });
  }

  private ensureUniquePlayers(players: NormalizedMatchPlayer[]) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const player of players) {
      if (seen.has(player.normalizedName)) {
        duplicates.add(player.playerName);
      }

      seen.add(player.normalizedName);
    }

    if (duplicates.size > 0) {
      throw new BadRequestException(
        `Players cannot repeat in the same match: ${[...duplicates].join(', ')}`,
      );
    }
  }

  private getPlayer(
    playersByNormalizedName: Map<string, { id: string; playerImg: string | null }>,
    normalizedName: string,
  ) {
    const player = playersByNormalizedName.get(normalizedName);

    if (!player) {
      throw new BadRequestException(
        `Player ${normalizedName} was not persisted correctly.`,
      );
    }

    return player;
  }

  private normalizeName(name: string) {
    return name.trim().toLowerCase();
  }

  private assertMatchAdmin(user: AuthenticatedUser) {
    if (this.normalizeName(user.email) !== MATCH_ADMIN_EMAIL) {
      throw new ForbiddenException(
        'Only Matheus can create or delete matches.',
      );
    }
  }

  private async syncPlayerSummaries(
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
}
