import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomTab from '../components/BottomTab'
import {
  PhoneShell, GradientHeader, PageTitle, Badge, FilterChips,
} from '../design/components'
import { COLORS, RADIUS, progressGradient } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'
import { getMyMessageThreads } from './transactionStore'
import { useStoreData } from '../hooks/useStoreData'
import { getAllApprovalMsgs } from './approvalMessageBus'

import { THREADS, CHATS } from './messages/messagesData'
import { getCurrentUserId, adaptStoreThread, adaptStoreChat, shortStatusLabel } from './messages/messagesUtils'
import DetailScreen from './messages/DetailScreen'
import { useStepHistory } from '../hooks/useStepHistory'
import { useNoSwipeBack } from '../hooks/useNoSwipeBack'

const ChatRoom = lazy(() => import('./messages/ChatRoom'))

// 오버레이 공통 스타일 — .phone 내부에서 절대 위치로 전체 덮기
const OVERLAY = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  background: '#F4F6FB', overflow: 'hidden',
  // will-change / backfaceVisibility 는 CSS 클래스(.page-enter-right 등)가 담당.
  // 인라인으로 상시 적용하면 iOS WKWebView에서 unmount 후에도
  // GPU 레이어가 잔류해 ghost touch area 가 남는 버그가 있음 → 제거.
}

// ─── 메인 컴포넌트 ───
export default function Messages() {
  const theme = getAccountTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { userType } = useUser()
  const currentUserId = getCurrentUserId(userType)
  const scrollRef = useRef(null)

  // _thread(내부) 또는 threadId(외부 진입) 초기값
  const initThread = location.state?._thread || location.state?.threadId || null
  const [activeThread, setActiveThread]   = useState(initThread)
  const [showDetail, setShowDetail]       = useState(false)
  const [filter, setFilter]               = useState('전체')
  const [pendingPrefillMsg, setPendingPrefillMsg] = useState(location.state?.prefillMsg || null)

  // 채팅방 exit 애니메이션 상태
  const [chatExiting, setChatExiting] = useState(false)
  // chatVisible: overlay를 화면에 표시할지 여부 (ChatRoom 마운트 여부와 분리)
  // exit 완료 시 먼저 false → overlay 즉시 숨김(Messages 목록 즉시 인터랙티브)
  // 실제 ChatRoom 언마운트는 requestIdleCallback으로 유휴 시간에 조용히 처리
  const [chatVisible, setChatVisible] = useState(!!initThread)
  const chatExitTimer = useRef(null)

  // 방향 추적 ref
  const enterDirRef = useRef('forward')

  // 외부 진입 여부 — Home 등에서 threadId 로 바로 진입한 경우 true
  // 목록에서 직접 열면 false 로 전환
  const isExternalEntry = useRef(!!initThread)

  // userType 별 홈 경로
  const homeRoute = userType === 'business' ? '/home-business'
    : userType === 'institution' ? '/home-institution' : '/home'

  // 스레드 열기 — 슬라이드 진입 (목록에서 내부 진입)
  const openThread = (threadId, prefill) => {
    isExternalEntry.current = false  // 내부에서 열면 외부 진입 플래그 해제
    enterDirRef.current = 'forward'
    setActiveThread(threadId)
    setChatVisible(true)
    if (prefill) setPendingPrefillMsg(prefill)
  }

  // 뒤로가기 — exit 애니메이션 후 분기
  const handleBack = () => {
    if (chatExiting) return  // 이미 exit 중이면 중복 실행 방지
    if (showDetail) { setShowDetail(false); return }
    if (activeThread) {
      enterDirRef.current = 'back'
      setChatExiting(true)
      clearTimeout(chatExitTimer.current)
      chatExitTimer.current = setTimeout(() => {
        if (isExternalEntry.current) {
          // 외부 진입 (Home 처리 필요 항목 등): 목록 표시 없이 홈으로 바로 복귀
          navigate(homeRoute)
        } else {
          // 내부 진입 (목록에서 열기): 2단계 분리로 멈칫 제거
          // 1단계: overlay 즉시 숨기기 → Messages 목록이 멈칫 없이 즉시 인터랙티브
          setChatVisible(false)
          setChatExiting(false)
          // 2단계: 브라우저 유휴 시간에 ChatRoom 실제 언마운트
          // (화면에 안 보이는 상태에서 조용히 처리 → 사용자 체감 없음)
          const doUnmount = () => setActiveThread(null)
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(doUnmount, { timeout: 600 })
          } else {
            setTimeout(doUnmount, 50)
          }
        }
      }, 300)
    }
  }

  // 메시지 탭 루트 — 스와이프 백 차단
  useNoSwipeBack()
  // skipCleanup=true: UI 뒤로가기 버튼으로 채팅을 닫을 때 go(-1) cleanup을 생략.
  // useNoSwipeBack() 이 이미 /messages 전체 스와이프를 막으므로 orphaned sentinel은 무해함.
  // go(-1) 을 호출하면 App.jsx의 isBackRef=true 가 세팅되어 홈 탭 클릭이
  // "뒤로가기"로 오인되는 버그가 발생함 → skipCleanup 으로 방지.
  useStepHistory(handleBack, !activeThread && !showDetail && !chatExiting, true, true)

  // 외부 진입 시 state 정규화
  useEffect(() => {
    if (location.state?.threadId && !location.state?._thread) {
      const { threadId, ...rest } = location.state
      navigate('/messages', { state: { ...rest, _thread: threadId }, replace: true })
    }
    if (location.state?.prefillMsg) {
      setPendingPrefillMsg(location.state.prefillMsg)
    }
  }, [location.state?.threadId, location.state?.prefillMsg])

  // store에서 본인 스레드 구독
  const storeThreadGroups = useStoreData(
    () => getMyMessageThreads({ userId: currentUserId })
  )
  const storeThreads = storeThreadGroups.map(adaptStoreThread).filter(Boolean)

  const baseThreads = [...storeThreads, ...THREADS]
    .filter(t => !(userType === 'personal' && t.id === 'approval'))
  const allThreads = baseThreads.sort((a, b) => {
    if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1
    if (a._fromStore && b._fromStore) return new Date(b._createdAt) - new Date(a._createdAt)
    if (a._fromStore && !b._fromStore) return -1
    if (!a._fromStore && b._fromStore) return 1
    return 0
  })

  const filterItems = userType === 'personal'
    ? [
        { id:'전체', label:'전체' },
        { id:'거래', label:'거래' },
        { id:'대여', label:'대여' },
        { id:'기관', label:'기관' },
        { id:'주의', label:'⚠ 주의' },
      ]
    : [
        { id:'전체', label:'전체' },
        { id:'내부', label:'내부' },
        { id:'외부', label:'외부' },
        { id:'기관', label:'기관' },
        { id:'주의', label:'⚠ 주의' },
      ]

  const filtered = allThreads.filter(t => {
    if (filter === '전체') return true
    if (filter === '주의') return t.status !== 'normal'
    if (userType === 'personal') return t.txCat === filter
    return t.msgCat === filter
  })

  const totalUnread = allThreads.reduce((s, t) => s + (t.unread || 0), 0)
  const thread = allThreads.find(t => t.id === activeThread)

  // 처리센터 알림 메시지 병합
  const approvalBusMsgs  = getAllApprovalMsgs()
  const approvalChatMsgs = approvalBusMsgs.map((m, idx) => {
    const d = new Date(m.createdAt)
    const date = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    return {
      id: `bus_${idx}`, from:'system', type:'approvalAction', date, time,
      approvalAction: { action: m.action, actor: m.actor, itemTitle: m.itemTitle || '', note: m.note || null, requestedDocs: m.requestedDocs || null },
    }
  })

  const chat = (() => {
    if (!thread) return null
    if (thread._fromStore) return adaptStoreChat(thread.id)
    if (thread.id === 'approval') {
      const base = CHATS['approval'] || { messages:[], fdsAlert:null }
      return { ...base, messages: [...base.messages, ...approvalChatMsgs] }
    }
    return CHATS[thread.id] || null
  })()

  // showChatOverlay: ChatRoom 마운트 여부 (언마운트는 idle 시간에 미뤄짐)
  // chatShouldShow: overlay를 실제로 화면에 표시할지 (exit 완료 직후 false → 멈칫 없음)
  const showChatOverlay = !!activeThread || chatExiting
  const chatShouldShow  = chatVisible || chatExiting
  const chatAnimClass   = chatExiting
    ? 'page-exit-right'
    : (enterDirRef.current === 'forward' ? 'page-enter-right' : '')

  return (
    <PhoneShell>

      {/* ── 목록 — 항상 마운트 (뒤로가기 시 re-mount 비용 없음) ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#F4F6FB' }}>

        <GradientHeader paddingBottom="20px" bg={theme.headerGrad}>
          <PageTitle
            title="메시지"
            badge={totalUnread}
            right={<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)' }}>거래 관계 {allThreads.length}명</span>}
          />
          <FilterChips dark value={filter} onChange={setFilter} items={filterItems} />
          <div style={{ padding:'8px 16px 4px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.14)', borderRadius:'12px', padding:'9px 14px', border:'1px solid rgba(255,255,255,0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)' }}>이름, 거래 유형 검색...</span>
            </div>
          </div>
        </GradientHeader>

        <div style={{ padding:'12px 12px 24px', background:'#F4F5F7', minHeight:'100%' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'40px 16px', textAlign:'center', color:COLORS.t4, fontSize:'13px' }}>
              해당 유형의 거래가 없어요
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {filtered.map(t => {
                const pct = Math.round((t.totalExecuted / t.totalAmount) * 100)
                const isWarning = t.status !== 'normal'
                return (
                  <button
                    key={t.id}
                    onClick={() => openThread(t.id)}
                    style={{
                      width:'100%', background: isWarning ? '#FFFBF5' : COLORS.bgCard,
                      borderRadius: RADIUS.lg, padding:'13px 14px 13px 0',
                      display:'flex', alignItems:'center', gap:'0', border:'none',
                      borderLeft: isWarning ? '3.5px solid #F59E0B' : '3.5px solid transparent',
                      cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                      boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                    }}>

                    {/* 아바타 */}
                    <div style={{ position:'relative', flexShrink:0, padding:'0 12px' }}>
                      <div style={{ width:'46px', height:'46px', borderRadius:'14px',
                        background: t.avatarBg, color: t.avatarFg,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize: t.emoji ? '24px' : '16px', fontWeight:'700' }}>
                        {t.emoji || t.initial}
                      </div>
                      <div style={{ position:'absolute', bottom:'-4px', right:'8px', padding:'1px 5px',
                        background: t.typeBg, borderRadius:'6px', fontSize:'8px', fontWeight:700, color: t.typeColor,
                        border:`1.5px solid ${COLORS.bgCard}`, whiteSpace:'nowrap' }}>
                        {t.type}
                      </div>
                      {t.unread > 0 && (
                        <div style={{ position:'absolute', top:'-4px', right:'6px', minWidth:'16px', height:'16px',
                          padding:'0 4px', borderRadius:'8px', background: COLORS.danger, border:`2px solid ${COLORS.bgCard}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'9px', fontWeight:'700', color:'#fff', zIndex:1 }}>
                          {t.unread}
                        </div>
                      )}
                    </div>

                    {/* 본문 */}
                    <div style={{ flex:1, minWidth:0, paddingRight:'4px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'3px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', flex:1, minWidth:0 }}>
                          <span style={{ fontSize:'14px', fontWeight: t.unread > 0 ? '700' : '600', color: COLORS.t1,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {t.name}
                          </span>
                          {isWarning && (
                            <Badge bg={t.statusBg} color={t.statusColor} size="sm">
                              {shortStatusLabel(t.statusLabel)}
                            </Badge>
                          )}
                        </div>
                        <span style={{ fontSize:'10px', color: COLORS.t4, flexShrink:0, marginLeft:'6px' }}>{t.time}</span>
                      </div>
                      <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'8px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.lastMsg}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ flex:1, height:'3px', background: COLORS.bgMuted, borderRadius: RADIUS.pill, overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%',
                            background: progressGradient(pct, isWarning ? null : (pct >= 100 ? 'success' : null)),
                          }} />
                        </div>
                        <span style={{ fontSize:'10px', fontWeight:600, color: isWarning ? '#F59E0B' : COLORS.t3, flexShrink:0 }}>{pct}%</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <BottomTab />

      {/* ── 외부 진입 시 목록 가림막 — ChatRoom 슬라이드 아웃 중 목록 노출 방지 ── */}
      {showChatOverlay && isExternalEntry.current && (
        <div style={{ position:'absolute', inset:0, background:'#F4F6FB', zIndex: 9, pointerEvents:'none' }} />
      )}

      {/* ── 채팅방 오버레이 — exit 완료 시 display:none → Messages 즉시 복귀, 언마운트는 idle 시간에 ── */}
      {showChatOverlay && (
        <div className={chatShouldShow ? chatAnimClass : ''} style={{ ...OVERLAY, zIndex: 10, display: chatShouldShow ? 'flex' : 'none', pointerEvents: (chatExiting || !chatShouldShow) ? 'none' : 'auto' }}>
          <Suspense fallback={
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:'2px solid #e5e7eb', borderTopColor:'#6B5FE4', animation:'spin .7s linear infinite' }} />
            </div>
          }>
            <ChatRoom
              thread={thread}
              chat={chat}
              onBack={handleBack}
              onOpenDetail={thread?._fromStore ? null : () => setShowDetail(true)}
              userType={userType}
              prefillMsg={pendingPrefillMsg}
              onPrefillUsed={() => setPendingPrefillMsg(null)}
            />
          </Suspense>
        </div>
      )}

      {/* ── 상세 오버레이 ── */}
      {activeThread && showDetail && (
        <div className="page-enter-right" style={{ ...OVERLAY, zIndex: 20 }}>
          <DetailScreen
            thread={thread}
            onBack={() => setShowDetail(false)}
          />
        </div>
      )}

    </PhoneShell>
  )
}
