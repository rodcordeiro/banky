import { Module } from '@nestjs/common';

import { HealthModule } from '@/modules/health/health.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { LinesModule } from '@/modules/lines/lines.module';
import { GirasModule } from '@/modules/giras/giras.module';
import { RythmsModule } from './rythms/rythms.module';
import { PointsModule } from '@/modules/points/points.module';
import { UploadsModule } from './uploads/upload.module';

@Module({
  imports: [
    HealthModule,
    UsersModule,
    AuthModule,
    UploadsModule,
    CategoriesModule,
    RythmsModule,
    LinesModule,
    GirasModule,
    PointsModule,
  ],
  controllers: [],
  providers: [],
})
export class SharedModule {}
