import { HttpService } from '@nestjs/axios'
import { BadGatewayException, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { AddressService } from './address.service.js'

describe('AddressService', () => {
  it('maps a ViaCEP response to the BaaS address contract', async () => {
    const get = vi.fn().mockReturnValue(of({ data: {
      cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP',
    } }))
    const service = new AddressService({ get } as unknown as HttpService)

    await expect(service.findByZipCode('01001000')).resolves.toEqual({
      zipCode: '01001000', address: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP',
    })
    expect(get).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/', { timeout: 5000 })
  })

  it('reports unknown CEPs and unexpected provider responses', async () => {
    const get = vi.fn()
      .mockReturnValueOnce(of({ data: { erro: 'true' } }))
      .mockReturnValueOnce(of({ data: { cep: '01001-000', logradouro: 'Praça da Sé' } }))
    const service = new AddressService({ get } as unknown as HttpService)

    await expect(service.findByZipCode('99999999')).rejects.toBeInstanceOf(NotFoundException)
    await expect(service.findByZipCode('01001000')).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('hides connection errors from the client', async () => {
    const get = vi.fn().mockReturnValue(throwError(() => new Error('provider connection details')))
    const service = new AddressService({ get } as unknown as HttpService)

    await expect(service.findByZipCode('01001000')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
