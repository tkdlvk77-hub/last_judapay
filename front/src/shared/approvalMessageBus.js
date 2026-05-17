// ─── Approval Message Bus ────────────────────────────────
// ApprovalCenter에서 액션 발생 시 메시지를 push하고,
// Messages.jsx에서 읽어 해당 요청자 채팅방에 표시한다.

let _msgs = []

export function pushApprovalMsg(msg) {
  _msgs = [{
    id: `amsg_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    createdAt: new Date().toISOString(),
    ...msg,
  }, ..._msgs]
}

export function getApprovalMsgs(requesterId) {
  if (!requesterId) return _msgs
  return _msgs.filter(m => m.requesterId === requesterId || m.targetId === requesterId)
}

export function getAllApprovalMsgs() { return _msgs }
export function clearApprovalMsgs() { _msgs = [] }
