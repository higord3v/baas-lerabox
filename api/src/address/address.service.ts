import { HttpService } from '@nestjs/axios'
import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { AddressResponseDto } from './dto/address-response.dto.js'

interface ViaCepResponse {
  cep?: unknown
  logradouro?: unknown
  bairro?: unknown
  localidade?: unknown
  uf?: unknown
  erro?: unknown
}

@Injectable()
export class AddressService {
  constructor(private readonly http: HttpService) {}

  async findByZipCode(zipCode: string): Promise<AddressResponseDto> {
    let payload: ViaCepResponse
    try {
      const response = await firstValueFrom(this.http.get<ViaCepResponse>(
        `https://viacep.com.br/ws/${zipCode}/json/`, { timeout: 5000 },
      ))
      payload = response.data
    } catch {
      throw new ServiceUnavailableException('Consulta de CEP indisponível')
    }

    if (!payload || typeof payload !== 'object') throw new BadGatewayException('Resposta inválida da consulta de CEP')
    if (payload.erro === true || payload.erro === 'true') throw new NotFoundException('CEP não encontrado')
    if (typeof payload.cep !== 'string' || typeof payload.logradouro !== 'string'
      || typeof payload.bairro !== 'string' || typeof payload.localidade !== 'string'
      || typeof payload.uf !== 'string' || !/^[A-Z]{2}$/.test(payload.uf)
      || payload.cep.replace(/\D/g, '') !== zipCode) {
      throw new BadGatewayException('Resposta inválida da consulta de CEP')
    }

    return {
      zipCode,
      address: payload.logradouro,
      neighborhood: payload.bairro,
      city: payload.localidade,
      state: payload.uf,
    }
  }
}
