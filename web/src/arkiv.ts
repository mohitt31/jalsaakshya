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


// Reads cost budget. Every arkiv_query costs a flat 100 units (the `arkiv-cost` response header),
// whatever its size, and unauthenticated reads share a budget of 10,000 units per network per window
// (about 100 queries). Filtered counts (arkiv_getEntityCount) are not charged. So the app:
//  - reads anonymously first, spending the reader's own free budget;
//  - only when the node answers ANON_COST_LIMITED does it retry with the site's access key, sent in the
//    X-API-KEY header (not the URL) and restricted in the Arkiv Hub to this site's origin. The key is
//    injected at build time (VITE_ARKIV_KEY) and never committed;
//  - never retries a 429 in a loop (retryCount 0), and counts what it spends, shown in the footer.
const KEY = String((import.meta as any).env?.VITE_ARKIV_KEY ?? "").trim()
let keyed = false
export const readStats = { queries: 0, cost: 0, keyed: false }
let onRead: (() => void) | undefined
export function onReadStats(f: () => void) { onRead = f }
async function arkivFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const withKey = (i?: RequestInit): RequestInit => ({ ...i, headers: { ...((i?.headers as Record<string, string>) || {}), "X-API-KEY": KEY } })
  let r = await fetch(input, keyed && KEY ? withKey(init) : init)
  if (r.status === 429 && KEY && !keyed) {
    const body = await r.clone().text().catch(() => "")
    if (body.includes("ANON_COST_LIMITED")) { keyed = true; readStats.keyed = true; r = await fetch(input, withKey(init)) }
  }
  const cost = Number(r.headers.get("arkiv-cost") || 0)
  if (cost) { readStats.queries++; readStats.cost += cost; onRead?.() }
  return r
}
const RPC = () => http(undefined, { retryCount: 0, fetchFn: arkivFetch })
export const usesAccessKey = !!KEY
export const publicClient = createPublicClient({ chain: tiramisu, transport: RPC() })

/** Filtered count over raw JSON-RPC. SDK 0.8.1's getEntityCount() sends empty params (a chain-wide count);
 *  the node accepts `[{ query }]`. Counts are not charged against the query budget. */
export async function countWhere(query: string): Promise<number> {
  const n = await (publicClient as any).request({ method: "arkiv_getEntityCount", params: [{ query }] })
  return Number(n)
}

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
