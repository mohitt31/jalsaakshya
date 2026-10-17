// Shared Arkiv plumbing for JalSaakshya. Everything here runs in the browser; there is no backend.
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { http, webSocket, custom, fallback, type Hex, type Address } from "viem"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"
import { CURATOR } from "./config"

export { CURATOR }
export const APP = "jalsaakshya/v1"
export { LIMITS, LIFETIME } from "./model"
export const EXPLORER = "https://tiramisu.explorer.arkiv.network"


// The public RPC rate-limits per IP (HTTP 429). Shared networks (a campus, a mobile carrier's NAT) can hit
// that limit through other users' traffic, so reads retry with backoff instead of leaving the page empty.
//
// Since 17 October the public RPC also caps unauthenticated queries with a per-network budget
// (ANON_COST_LIMITED). The deployed site can carry an Arkiv access key restricted to its own origin
// (VITE_ARKIV_KEY at build time, never committed). It rides in the URL path, as the Hub documents.
// If the keyed endpoint fails, the anonymous endpoint is tried next.
const KEY = String((import.meta as any).env?.VITE_ARKIV_KEY ?? "").trim()
const HTTP_URL = tiramisu.rpcUrls.default.http[0].replace(/\/$/, "")
const opts = { retryCount: 4, retryDelay: 1200 }
const RPC = () => KEY ? fallback([http(`${HTTP_URL}/${KEY}`, opts), http(undefined, opts)]) : http(undefined, opts)
export const usesAccessKey = !!KEY
export const publicClient = createPublicClient({ chain: tiramisu, transport: RPC() })

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
  return createWalletClient({ chain: tiramisu, transport: RPC(), account })
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
