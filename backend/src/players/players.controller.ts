import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreatePlayerDto } from './dto/create-player.dto';
import { SyncPlayersDto } from './dto/sync-players.dto';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.playersService.findAll(search);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePlayerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.createPlayer(dto, user);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  sync(@Body() dto: SyncPlayersDto, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.syncPlayers(dto.players, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }
}
