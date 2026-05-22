// ─────────────────────────────────────────────────────────
// hydrate.js — 부팅 시 서버에서 데이터 끌어와 store 시드
//
// 현재 서버에 존재하는 도메인:
//   ✅ /api/v1/app/payments        (결제 리스트 — transactions/feed 대응)
//   ❌ wallets / alerts / messages — 서버 미구현 → 데모 데이터 유지
//
// 로그인 안 된 상태 (쿠키 없음): no-op → UI 는 데모 데이터로 동작
// ─────────────────────────────────────────────────────────
import { api, session } from './api'
import {
  ingestServerTransactions,
  ingestServerAlerts,
  ingestServerMessageThreads,
} from '../shared/transactionStore'

export async function hydrate() {
  // 로그인 안 됐으면 (로컬에 user 없음) skip — 데모 모드
  if (!session.user) return

  const userId = session.user?.userId

  try {
    // ── 결제(거래) 피드 — 서버 구현된 유일한 도메인
    try {
      const payments = await api.get('/api/v1/app/payments?page=0&size=50')
      const content  = payments?.content || payments || []
      ingestServerTransactions(content)
    } catch (e) {
      console.warn('[hydrate] payments failed:', e?.message)
    }

    // ── wallets / alerts / messages — 서버 미구현
    //    추후 서버에 추가되면 아래 주석 해제하여 매핑
    //
    //   const wallets = await api.get('/api/v1/app/wallets')
    //   window.__judapay_wallets = wallets
    //
    //   const alerts = await api.get('/api/v1/app/alerts?tab=all&limit=50')
    //   ingestServerAlerts(alerts?.items || [], userId)
    //
    //   const threads = await api.get('/api/v1/app/messages/threads')
    //   ingestServerMessageThreads(Array.isArray(threads) ? threads : (threads?.items || []), userId)

    window.dispatchEvent(new CustomEvent('judapay:hydrated', { detail: { ok: true } }))
  } catch (e) {
    console.warn('[hydrate] failed:', e?.message)
  }
}
