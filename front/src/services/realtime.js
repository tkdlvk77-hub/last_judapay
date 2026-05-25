// ─────────────────────────────────────────────────────────
// realtime.js — JudaPay 실시간 채널 (STOMP-over-SockJS)
//
// 서버: /ws (SockJS endpoint) — 쿠키 인증(jp_app_token) 자동 전송
// 구독: /topic/user/{userId} — 새 메시지 push 수신
//
// 이벤트 fanout:
//   - judapay:realtime  (커스텀 이벤트) — 모든 구독자가 수신 가능
//     detail (메시지) = { kind: 'message', threadId, threadKey, message }
//     detail (알림)   = { kind: 'alert',   alert }
//   - 편의 이벤트 — judapay:alert (kind=alert 만 발행됨)
//
// 사용처:
//   - main.jsx (또는 로그인 직후) → connectRealtime()
//   - Messages.jsx — kind='message' 만 처리
//   - Alerts.jsx   — 'judapay:alert' 이벤트 또는 kind='alert'
// ─────────────────────────────────────────────────────────
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'
import { API_BASE, session } from './api'

let client = null
let userSub = null
let currentUserId = null

export function connectRealtime() {
  const user = session.user
  if (!user?.userId) {
    console.debug('[realtime] no session.user — skip')
    return null
  }
  // 이미 같은 user 로 연결 중이면 재사용
  if (client?.active && currentUserId === user.userId) {
    return client
  }
  // 기존 연결 정리 (사용자 전환 등)
  if (client?.active) {
    try { disconnectRealtime() } catch {}
  }

  currentUserId = user.userId
  const url = `${API_BASE}/ws`

  client = new Client({
    webSocketFactory: () => new SockJS(url),
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},  // 시끄러우니 무음. 디버깅 시 console.log 로 교체
    onConnect: () => {
      console.info('[realtime] connected userId=%s', currentUserId)
      const dest = `/topic/user/${currentUserId}`
      userSub = client.subscribe(dest, (frame) => {
        let data
        try { data = JSON.parse(frame.body) } catch { return }
        // 글로벌 fanout
        try {
          window.dispatchEvent(new CustomEvent('judapay:realtime', { detail: data }))
          // 편의 이벤트 — 알림 전용 채널
          if (data?.kind === 'alert') {
            window.dispatchEvent(new CustomEvent('judapay:alert', { detail: data?.alert || null }))
          }
        } catch {}
      })
    },
    onWebSocketClose: () => {
      console.debug('[realtime] socket closed — auto reconnect')
    },
    onStompError: (frame) => {
      console.warn('[realtime] stomp error:', frame?.headers?.message)
    },
  })
  client.activate()
  return client
}

export function disconnectRealtime() {
  try { userSub?.unsubscribe() } catch {}
  userSub = null
  try { client?.deactivate() } catch {}
  client = null
  currentUserId = null
}
