import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../database/entities/user.entity.js'
import { GatewayModule } from '../gateway/gateway.module.js'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { PasswordService } from './password.service.js'
import { USER_REPOSITORY } from './user-repository.interface.js'
import { UserRepository } from './user.repository.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    GatewayModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.BAAS_SESSION_SECRET
        if (!secret || secret.length < 32) throw new Error('BAAS_SESSION_SECRET must have at least 32 characters')
        return { secret, signOptions: { expiresIn: '8h' } }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    UserRepository,
    { provide: USER_REPOSITORY, useExisting: UserRepository },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
