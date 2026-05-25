// ─────────────────────────────────────────────────────────
// alerts.js — 앱 알림 도메인
//   서버: /api/v1/app/alerts/*
//   실시간: realtime.js 가 /topic/user/{userId} 구독 → judapay:realtime 이벤트
//          detail = { kind: 'alert', alert: {...} } 형태로 흘러옴.
// ─────────────────────────────────────────────────────────
import { api } from './api'

/**
 * 알림 목록 (페이지네이션).
 *   @param {Object}  opts
 *   @param {number=} opts.page
 *   @param {number=} opts.size
 *   @param {boolean=} opts.unread  true 면 미읽음만 조회
 *   @returns {Array<Alert>}
 *
 * Alert 1건:
 *   { id, userId, kind, title, body, icon, severity,
 *     refType, refId, threadId, deepLink, payload, read, readAt, createdAt }
 */
export async function listAlerts({ page = 0, size = 30, unread = false } = {}) {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('size', String(size))
  if (unread) qs.set('unread', 'true')
  return await api.get(`/api/v1/app/alerts?${qs.toString()}`)
}

/** 미읽음 개수 (배지). */
export async function getUnreadAlertCount() {
  const r = await api.get('/api/v1/app/alerts/unread-count')
  return Number(r?.count || 0)
}

/** 전부 읽음. */
export async function markAllAlertsRead() {
  return await api.post('/api/v1/app/alerts/read-all', {})
}

/** 1건 읽음. */
export async function markAlertRead(id) {
  return await api.post(`/api/v1/app/alerts/${encodeURIComponent(id)}/read`, {})
}
