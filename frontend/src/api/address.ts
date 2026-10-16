import { apiRequest } from './client'

export interface AddressByZipCode {
  zipCode: string
  address: string
  neighborhood: string
  city: string
  state: string
}

export function getAddressByZipCode(zipCode: string, signal?: AbortSignal): Promise<AddressByZipCode> {
  return apiRequest(`/address/zip-code/${encodeURIComponent(zipCode)}`, { signal })
}
