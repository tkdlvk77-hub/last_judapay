// ─────────────────────────────────────────────────────────
// recipient.js — 수령인 조회 도메인
//   - 최근 거래 상대 리스트
//   - 전화번호/주다페 ID 로 가입자 조회
// ─────────────────────────────────────────────────────────
import { api } from './api'

/**
 * 최근 자금집행 수령인 리스트.
 *   @param {string=} purpose  ex) 'gift' — 같은 type 거래 상대를 위로 정렬
 *   @param {number=} limit    기본 20
 *   @returns {Array<RecipientCard>}
 *
 * 응답 1건:
 *   { id, userId, phone, name, initial, avatarBg, avatarFg,
 *     verified, isBusiness, lastUsedFor, lastUsedAt, lastTypeLabel }
 */
export async function listRecentRecipients({ purpose, limit = 20 } = {}) {
  const qs = new URLSearchParams()
  if (purpose) qs.set('purpose', purpose)
  qs.set('limit', String(limit))
  return await api.get(`/api/v1/app/payouts/recent-recipients?${qs.toString()}`)
}

/**
 * 가입자 조회 (휴대폰 번호 또는 주다페 ID).
 *
 *   @param {Object} req
 *   @param {string=} req.phone   숫자만 또는 010-XXXX-XXXX
 *   @param {string=} req.handle  주다페 ID (email 또는 @핸들)
 *   @returns {{ found: boolean, user?: { userId, name, phone, verified, isBusiness }, reason?: 'self' }}
 */
export async function lookupUser(req) {
  return await api.post('/api/v1/app/users/lookup', req)
}
