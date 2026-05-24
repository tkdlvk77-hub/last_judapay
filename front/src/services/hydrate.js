// ─────────────────────────────────────────────────────────
// hydrate.js — 서버에서 데이터 끌어와 화면에 시드
//
// 현재 서버 라이브 도메인:
//   ✅ /api/v1/app/me                  (현재 사용자 프로필)
//   ✅ /api/v1/app/wallets/summary     (출금 가능 잔액)
//   ✅ /api/v1/app/payments            (결제 리스트)
//   ✅ /api/v1/app/home/pending        (처리 필요 — 현재는 빈 배열)
//   ✅ /api/v1/app/home/blocked-count  (이상 결제 N건 배지)
//   ❌ alerts / messages               — 서버 미구현 → 데모 유지
//
// 로그인 안 된 상태 (쿠키 없음): no-op → UI 는 데모 데이터로 동작
//
// NOTE: transactionStore 시드 함수(ingestServerTransactions 등)는 아직 클라이언트에
// 존재하지 않습니다. 현재는 홈 컴포넌트가 결과를 직접 state 로 받아서 사용하므로
// store 시드 없이도 정상 동작. 추후 다른 화면 통합 시 store 에 ingest 함수를
// 추가하고 여기서 호출하면 됩니다.
// ─────────────────────────────────────────────────────────
import { api, session } from './api'
import { connectRealtime } from './realtime'

/**
 * 앱 부팅 시 호출. 현재는 로그인 여부만 확인하고 이벤트 발행.
 * (향후 글로벌 데이터를 store 에 시드할 자리)
 */
export async function hydrate() {
  if (!session.user) return
  try {
    // 실시간 채널 연결 (idempotent — 이미 연결됐으면 재사용)
    connectRealtime()
    window.dispatchEvent(new CustomEvent('judapay:hydrated', { detail: { ok: true } }))
  } catch (e) {
    console.warn('[hydrate] failed:', e?.message)
  }
}

/**
 * 홈 화면 전용 prefetch — 로그인 직후 / Pull-to-Refresh / 홈 마운트 시 호출.
 *
 * 반환:
 *   {
 *     me:       { userId, userType, role, name, email, phone, ... } | null,
 *     wallet:   { walletId, balance, pendingOut, available, currency } | null,
 *     payments: [Transaction, ...],
 *     pending:  [HomePendingItem, ...],
 *     blocked:  number,
 *   }
 *
 * 각 호출은 Promise.allSettled 로 격리 — 하나가 실패해도 다른 영역은 그려진다.
 * 로그인 안 된 상태(쿠키 없음): null 반환 → 호출자는 데모 폴백 사용.
 */
export async function hydrateHome() {
  if (!session.user) return null

  const [me, wallet, payments, pending, blocked, executing] = await Promise.allSettled([
    api.get('/api/v1/app/me'),
    api.get('/api/v1/app/wallets/summary'),
    api.get('/api/v1/app/payments?page=0&size=10'),
    api.get('/api/v1/app/home/pending'),
    api.get('/api/v1/app/home/blocked-count'),
    api.get('/api/v1/app/home/executing'),
  ])

  const result = {
    me:        me.status       === 'fulfilled' ? me.value       : null,
    wallet:    wallet.status   === 'fulfilled' ? wallet.value   : null,
    payments:  payments.status === 'fulfilled' ? (payments.value?.content || payments.value || []) : [],
    pending:   pending.status  === 'fulfilled' ? (pending.value || []) : [],
    blocked:   blocked.status  === 'fulfilled' ? Number(blocked.value?.count || 0) : 0,
    executing: executing.status === 'fulfilled' ? (executing.value || []) : [],
  }

  // me 의 최신값이 있으면 session 도 갱신 (이름 변경 등 반영)
  if (result.me) {
    try { session.setUser(result.me) } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent('judapay:home-hydrated', { detail: result }))
  } catch {}
  return result
}
