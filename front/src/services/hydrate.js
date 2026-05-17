// ─────────────────────────────────────────────────────────────
// 앱 부팅 시점에 서버에서 최근 데이터를 끌어와 transactionStore 시드.
//   - 토큰 없으면 (데모 모드) no-op
//   - 호출 실패는 경고만, UX 차단 X
//   - 결과는 ingestServer* 함수로 store 에 주입 → selector 들이 자동 리렌더
// ─────────────────────────────────────────────────────────────
import { api, tokens } from './api'
import {
  ingestServerTransactions,
  ingestServerAlerts,
  ingestServerMessageThreads,
} from '../shared/transactionStore'

export async function hydrate() {
  if (!tokens.access) return
  const userId = tokens.user?.userId
  try {
    const [wallets, feed, alerts, threads] = await Promise.allSettled([
      api.get('/api/wallets'),
      api.get('/api/transactions/feed?page=0&size=50'),
      api.get('/api/alerts?tab=all&limit=50'),
      api.get('/api/messages/threads'),
    ])

    // 1) 지갑 — 별도 store 가 없으므로 window 에 보관 (필요한 컴포넌트가 직접 꺼내 씀)
    if (wallets.status === 'fulfilled') {
      window.__judapay_wallets = wallets.value
    }

    // 2) 거래 피드 → _transactions + _activities 채움
    if (feed.status === 'fulfilled') {
      const content = feed.value?.content || feed.value || []
      ingestServerTransactions(content)
    }

    // 3) 알림 → _alerts 채움
    if (alerts.status === 'fulfilled') {
      const items = alerts.value?.items || []
      ingestServerAlerts(items, userId)
    }

    // 4) 메시지 스레드 → _messages 채움
    if (threads.status === 'fulfilled') {
      const list = Array.isArray(threads.value) ? threads.value : (threads.value?.items || [])
      ingestServerMessageThreads(list, userId)
    }

    window.dispatchEvent(new CustomEvent('judapay:hydrated', { detail: { ok: true } }))
  } catch (e) {
    console.warn('[hydrate] failed:', e?.message)
  }
}
