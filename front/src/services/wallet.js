// ─────────────────────────────────────────────────────────
// wallet.js — 지갑/충전 도메인 (서버: /api/v1/app/wallets, /me)
// ─────────────────────────────────────────────────────────
import { api } from './api'
import { stepUpWithPin, stepUpWithBio, bridgeAvailable } from './biometric'

/** MY 지갑 한 줄 요약 — { walletId, balance, pendingOut, available, currency } */
export async function getWalletSummary() {
  return await api.get('/api/v1/app/wallets/summary')
}

/** 내 지갑 목록 — [{ id, kind, balance, ... }] */
export async function listWallets() {
  return await api.get('/api/v1/app/wallets')
}

/**
 * 충전 요청 — 출금계좌 → MY 지갑
 *   step-up MFA 통과(PIN 또는 Face ID) 후 호출해야 한다.
 *   서버가 mfaVerified 쿠키 검증 → 잔액 증가 + tx_transactions 1건 INSERT.
 *
 *   @param {Object}   req
 *   @param {number}   req.amount        충전 금액 (KRW)
 *   @param {string}   req.bankCode      출금 은행 코드 (예: '004')
 *   @param {string}   req.bankAccount   출금 계좌번호
 *   @param {string=}  req.idempotencyKey  중복 방어용 (선택)
 *   @returns {{ transactionId, amount, newBalance, available, chargedAt }}
 */
export async function chargeWallet(req) {
  const headers = req.idempotencyKey
    ? { 'X-Idempotency-Key': req.idempotencyKey }
    : undefined
  return await api.post('/api/v1/app/wallets/charge', {
    amount:      req.amount,
    bankCode:    req.bankCode,
    bankAccount: req.bankAccount,
  }, { headers })
}

/**
 * PIN 으로 step-up 인증 (mfaVerified 쿠키 발급) + 콜백 실행
 *   사용 예:
 *     await stepUpThen(pin, () => chargeWallet({ ... }))
 */
export async function stepUpThen(pin, action) {
  await stepUpWithPin(pin)
  return await action()
}

/** Face ID step-up (네이티브 셸 전용) + 콜백 */
export async function stepUpWithBioThen(action, reason = '충전 인증') {
  if (!bridgeAvailable()) throw new Error('Face ID 사용 불가')
  await stepUpWithBio({ reason })
  return await action()
}
