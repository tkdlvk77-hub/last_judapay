// ─────────────────────────────────────────────────────────
// payment.js — 카드결제(Transaction) 도메인
//   서버: /api/v1/app/payments/*
// ─────────────────────────────────────────────────────────
import { api } from './api'
import { stepUpWithPin, stepUpWithBio, bridgeAvailable } from './biometric'

/**
 * 결제 목록 (페이지).
 */
export async function listPayments({ page = 0, size = 20 } = {}) {
  return await api.get(`/api/v1/app/payments?page=${page}&size=${size}`)
}

/**
 * 결제 1건 상세.
 *   서버: GET /api/v1/app/payments/{id}
 *
 *   응답 = Transaction 엔티티 그대로.
 */
export async function getPayment(id) {
  return await api.get(`/api/v1/app/payments/${encodeURIComponent(id)}`)
}

/**
 * 카드결제 실행 (step-up 필요).
 *   서버: POST /api/v1/app/payments
 */
export async function executePayment(req, opts = {}) {
  if (!opts._skipStepUp) {
    if (opts.faceId) {
      if (!bridgeAvailable()) throw new Error('Face ID 사용 불가 — PIN 으로 진행해주세요')
      await stepUpWithBio({ reason: '결제 인증' })
    } else if (opts.pin) {
      await stepUpWithPin(opts.pin)
    } else {
      throw new Error('step-up 인증이 필요합니다 (PIN 또는 Face ID)')
    }
  }
  const headers = opts.idempotencyKey
    ? { 'X-Idempotency-Key': opts.idempotencyKey }
    : undefined
  return await api.post('/api/v1/app/payments', req, { headers })
}
