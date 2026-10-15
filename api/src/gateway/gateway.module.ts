import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { GatewayHttpService } from './gateway-http.service.js'

@Module({
  imports: [HttpModule],
  providers: [GatewayHttpService],
  exports: [GatewayHttpService],
})
export class GatewayModule {}
