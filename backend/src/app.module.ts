import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import './config/env-fallbacks';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MatchesModule } from './matches/matches.module';
import { PlayersModule } from './players/players.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    MatchesModule,
    PlayersModule,
    HealthModule,
  ],
})
export class AppModule {}
