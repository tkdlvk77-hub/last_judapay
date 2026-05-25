// ─────────────────────────────────────────────────────────
// walletStore.js — 지갑/잔액/결제 전역 store + STOMP 자동 동기화
//
// 사용:
//   const { summary, wallets, lastPayment } = useWalletState()
//   await refreshWallets()                  // 화면 진입 시 prefetch
//
// 자동 동기화:
//   - 'judapay:realtime' kind='wallet'   → 해당 지갑 갱신
//   - 'judapay:realtime' kind='payment'  → 최근 결제 + summary refresh
//   - 'judapay:alert'    refType='payment'/'wallet' → refresh
// ─────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { api, session } from './api'

let state = {
  summary: null,       // { walletId, balance, pendingOut, available, currency }
  wallets: [],         // [{ id, kind, name, balance, ... }]
  lastPayment: null,   // 최근 알림 발생한 payment
}
const listeners = new Set()

function notify() { for (const fn of listeners) try { fn({ ...state }) } catch {} }
function set(next) { state = { ...state, ...next }; notify() }

export function getWalletState() { return { ...state } }

export async function refreshWallets() {
  if (!session.user) {
    set({ summary: null, wallets: [] })
    return state
  }
  try {
    const [sumRes, listRes] = await Promise.allSettled([
      api.get('/api/v1/app/wallets/summary'),
      api.get('/api/v1/app/wallets'),
    ])
    const wallets = listRes.status === 'fulfilled' ? (Array.isArray(listRes.value) ? listRes.value : []) : state.wallets
    set({
      summary: sumRes.status  === 'fulfilled' ? sumRes.value  : state.summary,
      wallets,
    })
    // 디버깅 — 콘솔에서 어떤 지갑들이 들어왔는지 즉시 보기
    try {
      console.debug('[walletStore] refresh',
        'summary=', sumRes.status === 'fulfilled' ? sumRes.value : sumRes.reason?.message,
        'wallets=', wallets.length, wallets.map(w => `${w.kind}:${w.name}:${w.balance}`))
    } catch {}
  } catch (e) {
    console.warn('[walletStore] refresh failed', e?.message)
  }
  return state
}

/** 특정 지갑 1건 갱신 (STOMP 수신 시) */
function upsertWallet(w) {
  if (!w?.id) return
  const idx = state.wallets.findIndex(x => x.id === w.id)
  let nextWallets
  if (idx === -1) {
    nextWallets = [w, ...state.wallets]
  } else {
    nextWallets = state.wallets.slice()
    nextWallets[idx] = { ...nextWallets[idx], ...w }
  }
  // MY 지갑이 갱신되면 summary 도 동기화
  const nextSummary = w.kind === 'MY'
    ? { walletId: w.id, balance: w.balance, pendingOut: w.pendingOut, available: w.balance - (w.pendingOut || 0), currency: w.currency }
    : state.summary
  set({ wallets: nextWallets, summary: nextSummary })
}

// ─────────────────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────────────────
export function useWalletState() {
  const [snap, setSnap] = useState(() => ({ ...state }))
  useEffect(() => {
    const fn = (s) => setSnap(s)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return snap
}

// ─────────────────────────────────────────────────────────
// STOMP 자동 구독 — 모듈 로드 시 1회
// ─────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  let debounceTimer = null

  window.addEventListener('judapay:realtime', (e) => {
    const d = e?.detail
    if (!d) return
    if (d.kind === 'wallet' && d.wallet) {
      upsertWallet(d.wallet)
    } else if (d.kind === 'payment') {
      set({ lastPayment: d.payment })
      // 잔액도 차감됐을 가능성 → debounce refresh
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => refreshWallets(), 500)
    } else if (d.kind === 'message' && d.message?.payoutId) {
      // 자금집행 → MY 잔액 ↓ 또는 권한자금 ↑
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => refreshWallets(), 500)
    }
  })

  window.addEventListener('judapay:alert', (e) => {
    const a = e?.detail
    if (!a) return
    if (a.refType === 'payment' || a.refType === 'wallet' || a.refType === 'payout') {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => refreshWallets(), 500)
    }
  })

  // hydrate/로그인 직후 — 1회 prefetch
  window.addEventListener('judapay:hydrated', () => { refreshWallets() })
  window.addEventListener('judapay:home-hydrated', () => { refreshWallets() })
}
