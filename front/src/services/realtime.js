// ─────────────────────────────────────────────────────────────
// JudaPay 실시간 — STOMP over SockJS
//
//   서버는 /topic/user/{userId} 에 사용자별 이벤트 broadcast.
//   payload: { kind: 'alert'|'transaction'|'message', data: {...} }
//
//   동작:
//     1) store 에 push (selector 들이 자동 리렌더)
//     2) 추가로 window 'judapay:realtime' 이벤트도 dispatch
//        (커스텀 화면이 직접 듣고 싶을 때)
// ─────────────────────────────────────────────────────────────
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'
import { API_BASE, tokens } from './api'
import { pushServerTransaction, pushServerAlert } from '../shared/transactionStore'

let client = null
let userSub = null

export function connectRealtime() {
  if (client?.active) return client
  const at = tokens.access
  const userId = tokens.user?.userId
  if (!at || !userId) return null

  client = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
    connectHeaders: { Authorization: `Bearer ${at}` },
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
    onConnect: () => {
      userSub = client.subscribe(`/topic/user/${userId}`, (msg) => {
        try {
          const body = JSON.parse(msg.body)
          // 1) store 에 즉시 반영
          if (body?.kind === 'transaction' && body.data) {
            pushServerTransaction(body.data)
          } else if (body?.kind === 'alert' && body.data) {
            pushServerAlert(body.data, userId)
          }
          // 2) 커스텀 리스너용 fanout
          window.dispatchEvent(new CustomEvent('judapay:realtime', { detail: body }))
        } catch (e) {
          console.warn('[realtime] parse fail:', e?.message)
        }
      })
      window.dispatchEvent(new CustomEvent('judapay:realtime:connected'))
    },
    onWebSocketClose:  () => window.dispatchEvent(new CustomEvent('judapay:realtime:disconnected')),
    onStompError:       (frame) => console.warn('[stomp]', frame?.headers?.message),
  })
  client.activate()
  return client
}

export function disconnectRealtime() {
  try { userSub?.unsubscribe() } catch {}
  userSub = null
  client?.deactivate()
  client = null
}
