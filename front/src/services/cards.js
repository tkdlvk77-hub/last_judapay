// ─────────────────────────────────────────────────────────
// cards.js — 카드 도메인 (서버: /api/v1/app/cards/*)
//
// 카드 목록/발급/일시정지/MCC 정책/카드별 결제내역.
// ─────────────────────────────────────────────────────────
import { api } from './api'

// ─── 카드 목록 ──────────────────────────────────────────
export async function listCards() {
  return await api.get('/api/v1/app/cards')
}

// ─── 카드 발급 ──────────────────────────────────────────
export async function issueCard(req = {}) {
  return await api.post('/api/v1/app/cards/issue', {
    label:      req.label || '',
    holderName: req.holderName || '',
  })
}

// ─── 카드 단일 상세 ─────────────────────────────────────
export async function getCard(cardId) {
  return await api.get(`/api/v1/app/cards/${cardId}`)
}

// ─── 일시정지 / 재개 ────────────────────────────────────
export async function pauseCard(cardId) {
  return await api.post(`/api/v1/app/cards/${cardId}/pause`)
}

export async function resumeCard(cardId) {
  return await api.post(`/api/v1/app/cards/${cardId}/resume`)
}

// ─── MCC 정책 ───────────────────────────────────────────
export async function getCardMcc(cardId) {
  return await api.get(`/api/v1/app/cards/${cardId}/mcc`)
}

/**
 * 카드 MCC 정책 전체 교체.
 *   items: [{ mccCode, action: 'BLOCK'|'ALLOW', label }]
 */
export async function updateCardMcc(cardId, items) {
  return await api.put(`/api/v1/app/cards/${cardId}/mcc`, { items: items || [] })
}

// ─── 카드별 결제내역 ────────────────────────────────────
export async function listCardPayments(cardId, { page = 0, size = 50 } = {}) {
  const qs = `?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`
  return await api.get(`/api/v1/app/cards/${cardId}/payments${qs}`)
}
