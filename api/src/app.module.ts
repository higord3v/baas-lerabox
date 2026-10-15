import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { createObserveModule } from '@nestjs/observe'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { databaseOptions } from './database/database-options.js'
import { AuthModule } from './auth/auth.module.js'
import { AuthGuard } from './auth/auth.guard.js'
import { CorrelationIdMiddleware } from './common/correlation-id.middleware.js'
import { GatewayAccountModule } from './gateway-account/gateway-account.module.js'

export const { ObserveModule, ObserveInstrument } = createObserveModule()

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptions),
    AuthModule,
    GatewayAccountModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*')
  }
}
