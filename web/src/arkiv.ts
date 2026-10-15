// Shared Arkiv plumbing for JalSaakshya. Everything here runs in the browser; there is no backend.
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { http, webSocket, custom, type Hex, type Address } from "viem"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"
import { CURATOR } from "./config"

export { CURATOR }
export const APP = "jalsaakshya/v1"
export { LIMITS, LIFETIME } from "./model"
export const EXPLORER = "https://tiramisu.explorer.arkiv.network"


export const publicClient = createPublicClient({ chain: tiramisu, transport: http() })

let wsClient: ReturnType<typeof createPublicClient> | null = null
export function socketClient() {
  // watchEntityEvents opens a real subscription only over a WebSocket transport (no fromBlock)
  wsClient ??= createPublicClient({ chain: tiramisu, transport: webSocket() })
  return wsClient
}

export function txLink(hash: string) { return `${EXPLORER}/tx/${hash}` }
export function addrLink(a: string) { return `${EXPLORER}/address/${a}` }
export function short(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "" }

// ---- wallets -------------------------------------------------------------------------------
// Two ways to sign: an injected wallet (MetaMask etc.) or a burner key kept in this browser only.
const BURNER_KEY = "jalsaakshya.burner.v1"

export function burnerAccount(storageKey = BURNER_KEY) {
  let pk: string | null = null
  try { pk = localStorage.getItem(storageKey) } catch { /* storage blocked */ }
  if (!pk) {
    pk = generatePrivateKey()
    try { localStorage.setItem(storageKey, pk) } catch { /* key lives for this tab only */ }
  }
  return privateKeyToAccount(pk as Hex)
}

export function burnerWallet(storageKey = BURNER_KEY) {
  const account = burnerAccount(storageKey)
  return createWalletClient({ chain: tiramisu, transport: http(), account })
}

export async function injectedWallet() {
  const eth = (window as any).ethereum
  if (!eth) throw new Error("No browser wallet found. Use the in-browser test wallet instead.")
  const [address] = (await eth.request({ method: "eth_requestAccounts" })) as Address[]
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x7614d1" }] })
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x7614d1", chainName: "Arkiv Tiramisu", nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
        rpcUrls: [tiramisu.rpcUrls.default.http[0]], blockExplorerUrls: [EXPLORER],
      }],
    })
  }
  return createWalletClient({ chain: tiramisu, transport: custom(eth), account: address })
}

export async function balanceOf(address: Address) {
  const wei = await publicClient.getBalance({ address })
  return Number(wei) / 1e18
}

// ---- formatting ----------------------------------------------------------------------------
export function mgl(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v
  return n < 0.1 ? `${(n * 1000).toFixed(n * 1000 < 10 ? 1 : 0)} µg/L` : `${n.toFixed(2)} mg/L`
}

export function attr(e: any, name: string) {
  return e?.attributes?.[name]?.value
}
