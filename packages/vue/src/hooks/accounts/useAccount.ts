import { getAccount, watchAccount } from '@wagmi/core'

import type { GetAccountResult } from '@wagmi/core'
import {
  getCurrentScope,
  onScopeDispose,
  reactive,
  toRefs,
  watchEffect,
} from 'vue-demi'

import { useClient } from '../../client'

export type UseAccountConfig = {
  /** Function to invoke when connected */
  onConnect?({
    address,
    connector,
    isReconnected,
  }: {
    address?: GetAccountResult['address']
    connector?: GetAccountResult['connector']
    isReconnected: boolean
  }): void
  /** Function to invoke when disconnected */
  onDisconnect?(): void
}

export function useAccount({ onConnect, onDisconnect }: UseAccountConfig = {}) {
  const client = useClient()

  const initialState = getAccount()
  let account = reactive(initialState)

  const unwatch = watchAccount((data) => {
    account = Object.assign(account, data)
  })

  if (getCurrentScope()) onScopeDispose(() => unwatch())

  if (!!onConnect || !!onDisconnect) {
    watchEffect((onCleanup) => {
      const unsubscribe = client.subscribe(
        (state) => ({
          address: state.data?.account,
          connector: state.connector,
          status: state.status,
        }),
        (curr, prev) => {
          if (
            !!onConnect &&
            prev.status !== 'connected' &&
            curr.status === 'connected'
          )
            onConnect({
              address: curr.address,
              connector: curr.connector,
              isReconnected: prev.status === 'reconnecting',
            })

          if (
            !!onDisconnect &&
            prev.status === 'connected' &&
            curr.status === 'disconnected'
          )
            onDisconnect()
        },
      )

      onCleanup(() => unsubscribe())
    })
  }

  return toRefs(account)
}