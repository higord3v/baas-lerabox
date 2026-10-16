import { Controller, Get, Param } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator.js'
import { AddressService } from './address.service.js'
import { AddressResponseDto } from './dto/address-response.dto.js'
import { ZipCodeParamsDto } from './dto/zip-code-params.dto.js'

@ApiTags('address')
@Controller('address')
export class AddressController {
  constructor(private readonly addresses: AddressService) {}

  @Public()
  @Get('zip-code/:zipCode')
  @ApiOperation({ summary: 'Consulta endereço pelo CEP no ViaCEP' })
  @ApiOkResponse({ type: AddressResponseDto })
  findByZipCode(@Param() params: ZipCodeParamsDto): Promise<AddressResponseDto> {
    return this.addresses.findByZipCode(params.zipCode)
  }
}
