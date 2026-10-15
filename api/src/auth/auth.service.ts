import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { AuthResponseDto, MerchantProfileDto, RegisterResponseDto } from './dto/auth-response.dto.js'
import { LocalLoginDto } from './dto/local-login.dto.js'
import { RegisterMerchantDto } from './dto/register-merchant.dto.js'
import { PasswordService } from './password.service.js'
import { USER_REPOSITORY, type UserRepositoryPort } from './user-repository.interface.js'

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly gateway: GatewayHttpService,
  ) {}

  async register(input: RegisterMerchantDto, correlationId: string): Promise<RegisterResponseDto> {
    const email = input.email.trim().toLowerCase()
    if (await this.users.findByEmail(email)) throw new ConflictException('E-mail já cadastrado')
    if ((input.personType === 'PF' && input.document.length !== 11)
      || (input.personType === 'PJ' && input.document.length !== 14)) {
      throw new BadRequestException('Documento incompatível com o tipo de pessoa')
    }

    const passwordHash = await this.passwords.hash(input.localPassword)
    const { localPassword: _localPassword, ...gatewayInput } = input
    await this.gateway.createUser({ ...gatewayInput, email }, correlationId)
    await this.users.create({ email, displayName: input.name, passwordHash })
    return { message: 'Cadastro realizado. Consulte o e-mail para receber as credenciais do gateway.' }
  }

  async login(input: LocalLoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase(), true)
    if (!user || !await this.passwords.verify(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciais inválidas')
    }
    return { accessToken: await this.jwt.signAsync({ sub: user.id }), tokenType: 'Bearer' }
  }

  async profile(userId: string): Promise<MerchantProfileDto> {
    const user = await this.users.findById(userId)
    if (!user) throw new NotFoundException('Lojista não encontrado')
    return { id: user.id, email: user.email, displayName: user.displayName }
  }
}
