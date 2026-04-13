import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { SyncPlayerEntryDto } from './dto/sync-players.dto';

type PlayerHistoryEntry = {
  matchId: string;
  matchTitle: string | null;
  gameDate: Date;
  patchVersion: string | null;
  winnerSide: string | null;
  side: string;
  championName: string;
  role: string;
};

const PLAYER_ADMIN_EMAIL = 'matheusjean11@gmail.com';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlayer(dto: CreatePlayerDto, user: AuthenticatedUser) {
    this.assertPlayerAdmin(user);

    const normalizedName = this.normalizeName(dto.name);
    const existingPlayer = await this.prisma.player.findUnique({
      where: { normalizedName },
      select: { id: true },
    });

    if (existingPlayer) {
      throw new ConflictException('Player already exists.');
    }

    return this.prisma.player.create({
      data: {
        name: dto.name.trim(),
        normalizedName,
        playerImg: dto.playerImg?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        playerImg: true,
        matchesCount: true,
        lastMatchAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async syncPlayers(entries: SyncPlayerEntryDto[], user: AuthenticatedUser) {
    this.assertPlayerAdmin(user);

    const normalizedEntries = [...new Map(
      entries
        .map((entry) => ({
          name: entry.name.trim(),
          normalizedName: this.normalizeName(entry.name),
          playerImg: entry.playerImg?.trim() || null,
        }))
        .filter((entry) => entry.name)
        .map((entry) => [entry.normalizedName, entry]),
    ).values()];

    for (const entry of normalizedEntries) {
      await this.prisma.player.upsert({
        where: {
          normalizedName: entry.normalizedName,
        },
        update: {
          name: entry.name,
          ...(entry.playerImg ? { playerImg: entry.playerImg } : {}),
        },
        create: {
          name: entry.name,
          normalizedName: entry.normalizedName,
          playerImg: entry.playerImg,
        },
      });
    }

    return this.findAll();
  }

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.prisma.player.findMany({
      where: normalizedSearch
        ? {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: [{ matchesCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        normalizedName: true,
        playerImg: true,
        matchesCount: true,
        lastMatchAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        playerImg: true,
        matchesCount: true,
        lastMatchAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found.');
    }

    const participations = await this.prisma.matchParticipant.findMany({
      where: {
        playerId: id,
      },
      include: {
        match: {
          select: {
            id: true,
            title: true,
            gameDate: true,
            patchVersion: true,
            winnerSide: true,
          },
        },
      },
    });

    const history = participations
      .map<PlayerHistoryEntry>((participation) => ({
        matchId: participation.match.id,
        matchTitle: participation.match.title,
        gameDate: participation.match.gameDate,
        patchVersion: participation.match.patchVersion,
        winnerSide: participation.match.winnerSide,
        side: participation.side,
        championName: participation.championName,
        role: participation.role,
      }))
      .sort((left, right) => right.gameDate.getTime() - left.gameDate.getTime());

    return {
      ...player,
      history,
      championStats: this.buildStats(history.map((entry) => entry.championName)),
      roleStats: this.buildStats(history.map((entry) => entry.role)),
    };
  }

  private buildStats(values: string[]) {
    const counts = new Map<string, number>();

    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([name, matchesCount]) => ({
        name,
        matchesCount,
      }))
      .sort((left, right) => {
        if (right.matchesCount !== left.matchesCount) {
          return right.matchesCount - left.matchesCount;
        }

        return left.name.localeCompare(right.name);
      });
  }

  private normalizeName(name: string) {
    return name.trim().toLowerCase();
  }

  private assertPlayerAdmin(user: AuthenticatedUser) {
    if (this.normalizeName(user.email) !== PLAYER_ADMIN_EMAIL) {
      throw new ForbiddenException('Only Matheus can create players.');
    }
  }
}
