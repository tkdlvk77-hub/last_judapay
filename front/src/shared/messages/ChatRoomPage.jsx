// ─── ChatRoomPage ──────────────────────────────────────────
// /chat/:threadId 전용 독립 라우트
// Messages 목록 없이 ChatRoom만 렌더링.
// Home 등 다른 화면에서 직접 채팅방으로 진입할 때 사용 →
// App.jsx 스택에서 이전 화면(홈)이 아래에 유지된 채 슬라이드 인/아웃.
// ──────────────────────────────────────────────────────────
import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { useUser } from '../../contexts/UserContext'
import { getMyMessageThreads } from '../transactionStore'
import { useStoreData } from '../../hooks/useStoreData'
import { getAllApprovalMsgs } from '../approvalMessageBus'
import { THREADS, CHATS } from './messagesData'
import { getCurrentUserId, adaptStoreThread, adaptStoreChat } from './messagesUtils'
// ChatRoom은 eager import — lazy 로딩 지연 없이 첫 프레임부터 렌더링
import ChatRoom from './ChatRoom'

export default function ChatRoomPage() {
  const { threadId } = useParams()
  const location     = useLocation()
  const navigate     = useNavigate()
  const { userType } = useUser()
  const currentUserId = getCurrentUserId(userType)

  const [pendingPrefillMsg, setPendingPrefillMsg] = useState(
    location.state?.prefillMsg || null
  )

  // 뒤로가기 — App.jsx 스택 pop → 이전 화면으로 슬라이드 아웃
  // useStepHistory 사용 안 함: 독립 라우트이므로 App.jsx popstate 처리로 충분.
  // useStepHistory의 "벽" 엔트리가 iOS 스와이프 백 제스처를 방해하는 현상 방지.
  const handleBack = () => navigate(-1)

  // ── 스레드 데이터 ──
  const storeThreadGroups = useStoreData(
    () => getMyMessageThreads({ userId: currentUserId })
  )
  const storeThreads = storeThreadGroups.map(adaptStoreThread).filter(Boolean)
  const thread = [...storeThreads, ...THREADS].find(t => t.id === threadId)

  // ── 처리센터 알림 메시지 병합 (approval 스레드용) ──
  const approvalBusMsgs  = getAllApprovalMsgs()
  const approvalChatMsgs = approvalBusMsgs.map((m, idx) => {
    const d    = new Date(m.createdAt)
    const date = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    return {
      id: `bus_${idx}`, from: 'system', type: 'approvalAction', date, time,
      approvalAction: {
        action: m.action, actor: m.actor,
        itemTitle: m.itemTitle || '', note: m.note || null,
        requestedDocs: m.requestedDocs || null,
      },
    }
  })

  const chat = (() => {
    if (!thread) return null
    if (thread._fromStore) return adaptStoreChat(thread.id)
    if (thread.id === 'approval') {
      const base = CHATS['approval'] || { messages: [], fdsAlert: null }
      return { ...base, messages: [...base.messages, ...approvalChatMsgs] }
    }
    return CHATS[thread.id] || null
  })()

  return (
    <PhoneShell>
      <ChatRoom
        thread={thread}
        chat={chat}
        onBack={handleBack}
        onOpenDetail={null}
        userType={userType}
        prefillMsg={pendingPrefillMsg}
        onPrefillUsed={() => setPendingPrefillMsg(null)}
      />
    </PhoneShell>
  )
}
