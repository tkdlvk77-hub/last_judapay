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
 * 한 스레드의 메시지 전체 (시간 순).
 *   응답 1건 형태:
 *     {
 *       id, threadId, payoutId, msgType,         // simple|contract|payment|progress|user|action
 *       senderUserId, senderName, isSystem,
 *       icon, text, payload, createdAt
 *     }
 *   payload 는 JSON string — 클라가 JSON.parse 해야 한다.
 */
export async function listMessagesByThread(threadId) {
  return await api.get(`/api/v1/app/messages/threads/${threadId}/messages`)
}

/** 사용자 메시지 입력 (msgType=user). */
export async function sendMessage(threadId, text) {
  return await api.post(`/api/v1/app/messages/threads/${threadId}/messages`, { text })
}
