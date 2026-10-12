import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { ApplicationsModule } from '@modules/applications/applications.module';
import { RiskReviewModule } from '@modules/risk-review/risk-review.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SanitizeResponseInterceptor } from '@core/interceptors/sanitize-response.interceptor';
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeResponseInterceptor,
    },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    InfrastructureModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    RiskReviewModule,
  ],
})
export class AppModule {}