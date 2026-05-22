// ─────────────────────────────────────────────────────────
// realtime.js — JudaPay 실시간 채널 (현재 서버 미구현 → no-op)
//
// 서버에 STOMP/WebSocket endpoint 가 추가되면 아래 주석을 해제하고
// 쿠키 기반 인증(또는 query-string token)을 사용하도록 구현한다.
// ─────────────────────────────────────────────────────────

export function connectRealtime() {
  // 서버 미구현 — no-op
  return null
}

export function disconnectRealtime() {
  // no-op
}

/* ───── 추후 서버 구현 시 참고용 코드 (STOMP-over-SockJS) ─────
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'
import { API_BASE } from './api'
import { pushServerTransaction, pushServerAlert } from '../shared/transactionStore'

let client = null
let userSub = null

export function connectRealtime() {
  if (client?.active) return client
  client = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
    // 쿠키 인증을 쓰면 별도 헤더 필요 없음 (SockJS 가 쿠키 자동 전송)
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
    onConnect: () => { ... },
    onWebSocketClose:  () => { ... },
    onStompError:       (frame) => console.warn('[stomp]', frame?.headers?.message),
  })
  client.activate()
  return client
}
─────────────────────────────────────────────────────────── */
