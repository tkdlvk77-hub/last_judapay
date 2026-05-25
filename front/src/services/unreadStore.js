// ─────────────────────────────────────────────────────────
// unreadStore.js — 메시지/알림 미읽음 카운트 전역 store
//
// 단일 진실의 원천:
//   - { messages: number, alerts: number }
//   - 서버에서 fetch 한 초기값
//   - STOMP 이벤트로 +1 (judapay:realtime 'message' / 'judapay:alert')
//   - 화면에서 markRead 했을 때 setter 로 즉시 0 또는 감소
//
// 사용:
//   const { messages, alerts } = useUnreadBadges()    // 컴포넌트
//   refreshUnread()                                   // hydrate 직후, pull-to-refresh
//   resetMessagesUnread()                             // /messages 진입 시
//   resetAlertsUnread()                               // /alerts read-all 후
// ─────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { api, session } from './api'

// state 전체:
//   messages       — Messages BottomTab 배지 + 헤더 미읽음
//   alerts         — Alerts  BottomTab 배지 + 헤더 미읽음
//   threadCount    — Messages 헤더 "거래 관계 N명"
//   dealCount      — Alerts 헤더 "거래" 탭 카운트
//   actionRequired — Alerts 헤더 "처리 필요한 항목 N개" + "액션 필요 N"
//   blockedPayments — Home 이상결제 배지 (옵션)
let state = {
  messages: 0,
  alerts: 0,
  threadCount: 0,
  dealCount: 0,
  actionRequired: 0,
  blockedPayments: 0,
}
const listeners = new Set()

function notify() {
  for (const fn of listeners) {
    try { fn({ ...state }) } catch {}
  }
}

function set(next) {
  state = { ...state, ...next }
  notify()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 현재 스냅샷. */
export function getUnread() {
  return { ...state }
}

/**
 * 서버에서 최신 카운트 fetch. 로그인 안 된 상태면 no-op.
 *
 * 1 RTT — /api/v1/app/dashboard/counters 가 모든 카운트를 한 번에 반환.
 * 실패 시 개별 엔드포인트로 fallback (messages/alerts 만).
 */
export async function refreshUnread() {
  if (!session.user) {
    set({ messages: 0, alerts: 0, threadCount: 0, dealCount: 0,
          actionRequired: 0, blockedPayments: 0 })
    return state
  }
  try {
    const c = await api.get('/api/v1/app/dashboard/counters')
    set({
      messages:        Number(c?.unreadMessages   || 0),
      alerts:          Number(c?.unreadAlerts     || 0),
      threadCount:     Number(c?.threadCount      || 0),
      dealCount:       Number(c?.dealCount        || 0),
      actionRequired:  Number(c?.actionRequired   || 0),
      blockedPayments: Number(c?.blockedPayments  || 0),
    })
    return state
  } catch (e) {
    console.warn('[unreadStore] counters failed, fallback to individual', e?.message)
  }
  // fallback — messages / alerts 만이라도
  try {
    const [m, a] = await Promise.allSettled([
      api.get('/api/v1/app/messages/unread-count'),
      api.get('/api/v1/app/alerts/unread-count'),
    ])
    set({
      messages: m.status === 'fulfilled' ? Number(m.value?.count || 0) : state.messages,
      alerts:   a.status === 'fulfilled' ? Number(a.value?.count || 0) : state.alerts,
    })
  } catch (e) {
    console.warn('[unreadStore] fallback also failed', e?.message)
  }
  return state
}

/** /messages 진입 시 또는 read-all 시 호출 → 즉시 0 으로 + 서버 sync. */
export function resetMessagesUnread() {
  set({ messages: 0 })
}

/** /alerts 의 모든 알림 읽음 처리 후 호출. */
export function resetAlertsUnread() {
  set({ alerts: 0 })
}

/** 알림 1건 읽음 처리 후 호출 — 1 감소 (음수 방지). */
export function decrementAlerts() {
  set({ alerts: Math.max(0, state.alerts - 1) })
}

/** 알림 1건 읽음 처리 후 호출 — 1 감소 (음수 방지). */
export function decrementMessages() {
  set({ messages: Math.max(0, state.messages - 1) })
}

/** 외부에서 +1 (STOMP 이벤트). */
export function bumpMessagesUnread(by = 1) {
  set({ messages: Math.max(0, state.messages + by) })
}
export function bumpAlertsUnread(by = 1) {
  set({ alerts: Math.max(0, state.alerts + by) })
}

// ─────────────────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────────────────
export function useUnreadBadges() {
  const [snap, setSnap] = useState(() => ({ ...state }))
  useEffect(() => subscribe(setSnap), [])
  return snap
}

// ─────────────────────────────────────────────────────────
// STOMP 이벤트 자동 구독 — 모듈 로드 시 1회만 등록
//   - kind=message 가 들어오면 messages +1
//     단, 본인이 보낸 메시지(senderUserId == 본인) 면 카운트 하지 않음
//   - judapay:alert 가 들어오면 alerts +1
// ─────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  let messageDebounce = null
  let alertDebounce = null

  let onMessage = (e) => {
    const d = e?.detail
    if (!d || d.kind !== 'message' || !d.message) return
    const me = session.user?.userId
    if (me && d.message.senderUserId === me) return   // 내가 보낸 건 제외
    bumpMessagesUnread(1)
    // 자금집행 system 메시지면 dealCount/actionRequired 도 바뀌었을 가능성 → 서버 동기화
    if (d.message.payoutId) {
      clearTimeout(messageDebounce)
      messageDebounce = setTimeout(() => refreshUnread(), 500)
    }
  }
  let onAlert = (e) => {
    if (!e?.detail) return
    if (e.detail.read) return     // 이미 읽음 상태로 들어온 경우 제외
    bumpAlertsUnread(1)
    // payout/payment 관련 알림이면 dealCount/actionRequired 도 갱신
    if (e.detail.refType === 'payout' || e.detail.refType === 'payment') {
      clearTimeout(alertDebounce)
      alertDebounce = setTimeout(() => refreshUnread(), 500)
    }
  }
  window.addEventListener('judapay:realtime', onMessage)
  window.addEventListener('judapay:alert', onAlert)
  // hydrate / 로그인 직후 자동 refresh
  window.addEventListener('judapay:hydrated', () => { refreshUnread() })
  window.addEventListener('judapay:home-hydrated', () => { refreshUnread() })
}
