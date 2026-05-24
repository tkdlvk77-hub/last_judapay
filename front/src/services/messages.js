// ─────────────────────────────────────────────────────────
// messages.js — 메시지 스레드/메시지 도메인
//   서버: /api/v1/app/messages/*
// ─────────────────────────────────────────────────────────
import { api } from './api'

/**
 * 내가 참여한 스레드 목록.
 *   응답 1건 형태:
 *     {
 *       threadId, threadKey,
 *       otherSide: { userId, phone, name },
 *       lastMessage: { txId, text, createdAt },
 *       msgCount, payoutCount, createdAt
 *     }
 */
export async function listThreads({ page = 0, size = 50 } = {}) {
  return await api.get(`/api/v1/app/messages/threads?page=${page}&size=${size}`)
}

/**
 * 한 스레드의 메시지 페이지네이션 (cursor 기반).
 *   @param {string=} opts.before   ISO timestamp. 이 시점보다 이전 메시지 50개. null = 최신 50개.
 *   @returns {{ items: Array, hasMore: boolean, oldest: string|null }}
 *
 *   payload 는 JSON string — 클라가 JSON.parse 해야 한다.
 */
export async function listMessagesByThread(threadId, opts = {}) {
  const qs = opts.before ? `?before=${encodeURIComponent(opts.before)}` : ''
  return await api.get(`/api/v1/app/messages/threads/${threadId}/messages${qs}`)
}

/**
 * 사용자 메시지 입력 (msgType=user).
 *   @param {string=} clientMsgId  optimistic dedup 용. broadcast 응답에 echo 됨.
 */
export async function sendMessage(threadId, text, clientMsgId) {
  return await api.post(`/api/v1/app/messages/threads/${threadId}/messages`,
                        { text, clientMsgId })
}

/** 스레드 진입 시 미읽음 초기화. */
export async function markThreadRead(threadId) {
  return await api.post(`/api/v1/app/messages/threads/${threadId}/read`, {})
}
