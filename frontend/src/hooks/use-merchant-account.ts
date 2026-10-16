import { useCallback, useEffect, useState } from 'react'
import { ApiError, errorMessage } from '../api/client'
import {
  connectGateway,
  getGatewayStatus,
  getMerchantProfile,
  loginMerchant,
  registerMerchant,
  type GatewayCredentials,
  type LocalCredentials,
  type MerchantProfile,
  type RegisterMerchantInput,
} from '../api/merchant'

const SESSION_KEY = 'baasSession'

export function useMerchantAccount() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) ?? '')
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [connected, setConnected] = useState(false)
  const [loadingAccount, setLoadingAccount] = useState(Boolean(token))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setToken('')
    setProfile(null)
    setConnected(false)
    setLoadingAccount(false)
    setError('')
    setNotice('')
  }, [])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    Promise.all([
      getMerchantProfile(token, controller.signal),
      getGatewayStatus(token, controller.signal),
    ]).then(([merchant, isConnected]) => {
      if (controller.signal.aborted) return
      setProfile(merchant)
      setConnected(isConnected)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      if (reason instanceof ApiError && reason.status === 401) signOut()
      else setError(errorMessage(reason, 'Falha ao carregar a conta.'))
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingAccount(false)
    })

    return () => controller.abort()
  }, [token, signOut])

  async function register(input: RegisterMerchantInput): Promise<boolean> {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      setNotice(await registerMerchant(input))
      return true
    } catch (reason) {
      setError(errorMessage(reason, 'Falha no cadastro.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function signIn(input: LocalCredentials): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const accessToken = await loginMerchant(input)
      sessionStorage.setItem(SESSION_KEY, accessToken)
      setLoadingAccount(true)
      setToken(accessToken)
      setNotice('')
    } catch (reason) {
      setError(errorMessage(reason, 'Falha no login.'))
    } finally {
      setBusy(false)
    }
  }

  async function connect(input: GatewayCredentials): Promise<boolean> {
    if (!token) return false
    setBusy(true)
    setError('')
    try {
      await connectGateway(token, input)
      setConnected(true)
      setNotice('Conta do gateway conectada com segurança.')
      return true
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao conectar o gateway.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  return {
    token,
    profile,
    connected,
    loadingAccount,
    busy,
    error,
    notice,
    clearError: () => setError(''),
    register,
    signIn,
    signOut,
    connect,
  }
}
