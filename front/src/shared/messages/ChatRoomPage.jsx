// ─── ChatRoomPage ──────────────────────────────────────────
// /chat/:threadId 전용 독립 라우트
// Messages 목록 없이 ChatRoom만 렌더링.
// Home 등 다른 화면에서 직접 채팅방으로 진입할 때 사용 →
// App.jsx 스택에서 이전 화면(홈)이 아래에 유지된 채 슬라이드 인/아웃.
// ──────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { useUser } from '../../contexts/UserContext'
import { getMyMessageThreads } from '../transactionStore'
import { useStoreData } from '../../hooks/useStoreData'
import { getAllApprovalMsgs } from '../approvalMessageBus'
import { THREADS, CHATS } from './messagesData'
import {
  getCurrentUserId,
  adaptStoreThread, adaptStoreChat,
  adaptServerThread, adaptServerMessages,
} from './messagesUtils'
import { session } from '../../services/api'
import {
  listThreads as listServerThreads,
  listMessagesByThread,
} from '../../services/messages'
import { COLORS } from '../../design/tokens'
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

  // ── 스레드 데이터 (로컬 store + 정적 데모) ──
  const storeThreadGroups = useStoreData(
    () => getMyMessageThreads({ userId: currentUserId })
  )
  const storeThreads = storeThreadGroups.map(adaptStoreThread).filter(Boolean)
  let thread = [...storeThreads, ...THREADS].find(t => t.id === threadId)

  // ── 서버 스레드 fallback ──
  //   URL 의 threadId 가 UUID (서버 스레드) 인 경우, 로컬 store 에는 없으므로
  //   /api/v1/app/messages/threads 에서 매칭되는 항목을 찾아 _fromServer 카드로 사용.
  //   로그인된 경우에만 시도.
  const isAuthed = !!session.user
  const [serverThread, setServerThread] = useState(null)
  const [serverFetchState, setServerFetchState] = useState('idle')  // 'idle' | 'loading' | 'notfound' | 'ok' | 'error'
  useEffect(() => {
    if (thread) { setServerFetchState('ok'); return }   // 로컬에서 찾음
    if (!isAuthed) { setServerFetchState('notfound'); return }
    if (!threadId) { setServerFetchState('notfound'); return }
    let cancelled = false
    setServerFetchState('loading')
    ;(async () => {
      try {
        const raw = await listServerThreads()
        const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])
        // 서버는 _threadId 에 UUID 를 담는다 (adaptServerThread 기준).
        // 원본 응답에선 t.threadId 필드.
        const matched = items.find(t => t?.threadId === threadId)
        if (cancelled) return
        if (!matched) {
          setServerFetchState('notfound')
          return
        }
        const adapted = adaptServerThread(matched)
        setServerThread(adapted)
        setServerFetchState('ok')
      } catch (e) {
        console.warn('[ChatRoomPage] server thread fetch failed', e?.message)
        if (!cancelled) setServerFetchState('error')
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, isAuthed, !!thread])

  if (!thread && serverThread) thread = serverThread

  // ── 서버 스레드 메시지 fetch (cursor 페이지네이션) ──
  const [serverChatState, setServerChatState] = useState({
    messages: [], fdsAlert: null, hasMore: false, oldest: null, loading: false,
  })
  useEffect(() => {
    if (!thread?._fromServer) return
    const tid = thread._threadId
    if (!tid) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await listMessagesByThread(tid)
        const items   = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
        const hasMore = !!res?.hasMore
        const oldest  = res?.oldest || (items[0]?.createdAt ?? null)
        if (!cancelled) {
          const adapted = adaptServerMessages(items)
          setServerChatState({ ...adapted, hasMore, oldest, loading: false })
        }
      } catch (e) {
        console.warn('[ChatRoomPage] listMessagesByThread failed', e?.message)
        if (!cancelled) {
          setServerChatState({ messages: [], fdsAlert: null, hasMore: false, oldest: null, loading: false })
        }
      }
    })()
    return () => { cancelled = true }
  }, [thread?._fromServer, thread?._threadId])

  const loadOlderMessages = useCallback(async (tid) => {
    if (!serverChatState.hasMore || serverChatState.loading || !serverChatState.oldest) return
    setServerChatState(prev => ({ ...prev, loading: true }))
    try {
      const res = await listMessagesByThread(tid, { before: serverChatState.oldest })
      const items   = Array.isArray(res?.items) ? res.items : []
      const hasMore = !!res?.hasMore
      const oldest  = res?.oldest || serverChatState.oldest
      const adapted = adaptServerMessages(items)
      setServerChatState(prev => {
        const existIds = new Set(prev.messages.map(m => m._serverId).filter(Boolean))
        const deduped  = adapted.messages.filter(m => !existIds.has(m._serverId))
        return {
          ...prev,
          messages: [...deduped, ...prev.messages],
          hasMore, oldest, loading: false,
          _justPrepended: deduped.length,
        }
      })
    } catch (e) {
      console.warn('[ChatRoomPage] loadOlder failed', e?.message)
      setServerChatState(prev => ({ ...prev, loading: false }))
    }
  }, [serverChatState.hasMore, serverChatState.loading, serverChatState.oldest])

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
    if (thread._fromServer) return serverChatState
    if (thread._fromStore)  return adaptStoreChat(thread.id)
    if (thread.id === 'approval') {
      const base = CHATS['approval'] || { messages: [], fdsAlert: null }
      return { ...base, messages: [...base.messages, ...approvalChatMsgs] }
    }
    return CHATS[thread.id] || null
  })()

  // ── 가드: thread 가 끝까지 없으면 안내 화면 ──
  if (!thread) {
    const loading = serverFetchState === 'loading' || serverFetchState === 'idle'
    return (
      <PhoneShell>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center',
        }}>
          {loading ? (
            <>
              <div style={{ fontSize: '14px', color: COLORS.t3, marginBottom: '8px' }}>
                대화 불러오는 중…
              </div>
              <div style={{ fontSize: '11px', color: COLORS.t5 }}>잠시만 기다려주세요</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.t1, marginBottom: '8px' }}>
                대화를 찾을 수 없어요
              </div>
              <div style={{ fontSize: '12px', color: COLORS.t4, marginBottom: '20px', lineHeight: 1.6 }}>
                {serverFetchState === 'error'
                  ? '서버 연결에 문제가 있어요. 잠시 후 다시 시도해주세요.'
                  : '삭제되었거나 권한이 없는 대화일 수 있어요.'}
              </div>
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 18px',
                  background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  color: COLORS.t2, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                뒤로가기
              </button>
            </>
          )}
        </div>
      </PhoneShell>
    )
  }

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
        onLoadMore={thread?._fromServer ? () => loadOlderMessages(thread._threadId) : undefined}
        hasMore={thread?._fromServer ? !!serverChatState.hasMore : false}
        loadingMore={thread?._fromServer ? !!serverChatState.loading : false}
        prependedCount={thread?._fromServer ? (serverChatState._justPrepended || 0) : 0}
      />
    </PhoneShell>
  )
}
