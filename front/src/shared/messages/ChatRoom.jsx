// ─── 채팅방 컴포넌트 ─────────────────────────────────────────
// userType에 따라 칩 / 액션시트를 분기:
//   personal  → [요청하기, 자료제출]        + ChatActionsPersonal
//   business  → [요청하기, 메모, 자료제출]  + ChatActionsBusiness
// ────────────────────────────────────────────────────────────
import { useState, useEffect, useLayoutEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { deleteThreadMemo } from './messagesData'
import { NOTIF_TONE } from './messagesUtils'

// lazy import — 채팅방 진입 애니메이션(280ms) 동안 백그라운드 로드
// 액션시트는 버튼 누를 때 필요하므로 진입 직후 렌더링 불필요
const ChatActionsPersonal = lazy(() => import('./ChatActionsPersonal'))
const ChatActionsBusiness = lazy(() => import('./ChatActionsBusiness'))

// ── 모듈 레벨 상수 (매 렌더 재생성 방지) ──────────────────
const MOCK_TRANSACTIONS = [
  { id:'t1', label:'광고대행 용역비', amount:'5,000,000원', date:'05.08', type:'자금집행', badge:'#1D4ED8', badgeBg:'#EFF6FF' },
  { id:'t2', label:'마케팅 결제',     amount:'1,200,000원', date:'05.06', type:'카드결제', badge:'#059669', badgeBg:'#ECFDF5' },
  { id:'t3', label:'개발 외주비',     amount:'8,000,000원', date:'04.30', type:'자금집행', badge:'#1D4ED8', badgeBg:'#EFF6FF' },
  { id:'t4', label:'사무용품 구매',   amount:'340,000원',   date:'04.22', type:'카드결제', badge:'#059669', badgeBg:'#ECFDF5' },
]
const MOCK_LOANS = [
  { id:'l1', label:'박팀장 대여금', amount:'3,000,000원',  date:'04.15', type:'자금대여', badge:'#DC2626', badgeBg:'#FEF2F2' },
  { id:'l2', label:'운영자금 대여', amount:'10,000,000원', date:'03.20', type:'대여금',   badge:'#D97706', badgeBg:'#FFFBEB' },
]

export default function ChatRoom({ thread, chat, onBack, onOpenDetail, userType, prefillMsg, onPrefillUsed }) {
  const theme = getAccountTheme()
  const isApprovalThread = thread.id === 'approval'

  // ── 액션시트 상태 ──
  const _crRole  = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const isViewer = _crRole === 'viewer'
  const [actionSheet, setActionSheet] = useState(null)
  const [requestType, setRequestType] = useState(null)   // 기업 요청 sub-type
  // 개인 전용 폼
  const [paymentForm, setPaymentForm]       = useState({ amount:'', purpose:'', purposeLabel:'', message:'' })
  // 공통 폼
  const [settlementForm, setSettlementForm] = useState({ purpose:'', memo:'', method:'개인카드' })
  const [evidenceForm, setEvidenceForm]     = useState({ types:[], deadline:'', reason:'', message:'' })
  const [refundForm, setRefundForm]         = useState({ amount:'', deadline:'', reason:'' })
  const [dataReqForm, setDataReqForm]       = useState({ types:[], deadline:'', reason:'' })
  const [submitForm, setSubmitForm]         = useState({ selectedReq: null, message:'', files:[] })
  const [memoText, setMemoText]             = useState('')
  const [memos, setMemos]                   = useState([])
  const [selectedTx, setSelectedTx]         = useState(null)

  const closeSheet = () => { setActionSheet(null); setRequestType(null); setSelectedTx(null) }

  // ── prefillMsg 자동 전송 (결제 소명요청 등 외부 진입 시) ──
  useEffect(() => {
    if (prefillMsg) {
      pushLocalMsg({ from:'me', type:'text', text: prefillMsg })
      if (onPrefillUsed) onPrefillUsed()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 메시지 / 롱프레스 상태 ──
  const [localMsgs, setLocalMsgs]         = useState([])
  const [deletedMsgIds, setDeletedMsgIds] = useState(new Set())
  const [deleteTarget, setDeleteTarget]   = useState(null)   // { id, isMemo }
  const lpTimer  = useRef(null)
  const scrollContainerRef = useRef(null)
  const msgBottomRef       = useRef(null)
  const [inputText, setInputText] = useState('')

  // ── 집행 취소 상태 ──
  const [cancelledContracts, setCancelledContracts]         = useState(new Set())
  const [contractCancelDialog, setContractCancelDialog]     = useState(null)
  const [ccReason, setCcReason]         = useState('')
  const [ccManager, setCcManager]       = useState('')
  const [ccConfirmText, setCcConfirmText] = useState('')

  // ── 최초 마운트: 페인트 전에 즉시 맨 하단으로 (슬라이드 인 중에 스크롤 안 보임) ──
  useLayoutEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // ── 새 메시지 전송 시에만 부드럽게 스크롤 ──
  useEffect(() => {
    if (localMsgs.length > 0) {
      msgBottomRef.current?.scrollIntoView({ behavior:'smooth' })
    }
  }, [localMsgs.length])

  // ── 집행 취소 핸들러 ──
  function handleContractCancelStep2() {
    setContractCancelDialog(prev => prev ? { ...prev, step: 2 } : prev)
  }
  function handleContractCancelConfirm() {
    if (!contractCancelDialog) return
    const { msgId } = contractCancelDialog
    setCancelledContracts(prev => new Set([...prev, msgId]))
    setContractCancelDialog(null)
    setCcReason(''); setCcManager(''); setCcConfirmText('')
  }

  // ── 텍스트 전송 ──
  function sendText() {
    const txt = inputText.trim()
    if (!txt) return
    pushLocalMsg({ from:'me', type:'text', text: txt })
    setInputText('')
  }

  // ── 메시지 삭제 가능 여부 ──
  function canDelete(msg) {
    if (msg.type === 'memo') return true
    if (msg.from === 'me') return msg.read !== true
    return false
  }

  // ── 롱프레스 ──
  const startLongPress = useCallback((msg) => {
    lpTimer.current = setTimeout(() => {
      if (canDelete(msg)) setDeleteTarget({ id: msg.id, isMemo: msg.type === 'memo' })
    }, 600)
  }, [])
  const cancelLongPress = useCallback(() => { clearTimeout(lpTimer.current) }, [])

  // ── pushLocalMsg ──
  function pushLocalMsg(msg) {
    const now = new Date()
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
    setLocalMsgs(prev => [...prev, { ...msg, id: 'local_' + Date.now(), date:'오늘', time }])
  }

  // ── 집행률 ──
  const pct = isApprovalThread ? 0 : Math.round((thread.totalExecuted / thread.totalAmount) * 100)

  // ── 전체 메시지 ──
  const allMsgs = [...(chat ? chat.messages : []), ...localMsgs].filter(m => !deletedMsgIds.has(m.id))

  // ── 모의 거래/대여 데이터 ──
  // ── 하단 칩 정의: userType별 분기 ──
  const bottomChips = userType === 'personal'
    ? [
        { id:'payment', label:'지급 요청', icon:'💸', primary:true },
        { id:'refund',  label:'상환 요청', icon:'🔄', primary:false },
        { id:'data',    label:'자료 요청', icon:'📁', primary:false },
        { id:'memo',    label:'메모',     icon:'📝', primary:false },
      ]
    : [
        { id:'request', label:'요청하기', icon:'📤', primary:true },
        { id:'memo',    label:'메모',    icon:'📝', primary:false },
        { id:'submit',  label:'자료제출', icon:'📎', primary:false },
      ]

  // ── 기업 액션시트 공통 props ──
  const sharedProps = {
    actionSheet, closeSheet,
    requestType, setRequestType,
    evidenceForm, setEvidenceForm,
    refundForm,   setRefundForm,
    dataReqForm,  setDataReqForm,
    submitForm,   setSubmitForm,
    selectedTx,   setSelectedTx,
    MOCK_TRANSACTIONS, MOCK_LOANS,
    pushLocalMsg,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background: COLORS.bg, position:'relative' }}>

      {/* 헤더+메시지 통합 스크롤 영역 */}
      <div ref={scrollContainerRef} style={{ flex:1, overflowY:'auto' }}>

        {/* ① Sticky 네비 바 — 스크롤해도 항상 고정 */}
        <div className="sticky-nav-safe" style={{ position:'sticky', top:0, zIndex:10, background: theme.headerSolid, display:'flex', alignItems:'center', gap:'10px', padding:'16px 16px 14px', overflow:'hidden' }}>
            <button onClick={onBack}
              style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.12)', border:'none',
                borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style={{ width:'40px', height:'40px', borderRadius:'13px', background: thread.avatarBg, color: thread.avatarFg,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: thread.emoji ? '22px' : '15px', fontWeight:700, flexShrink:0,
              boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
              {thread.emoji || thread.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                <span style={{ fontSize:'15px', fontWeight:700, color:'#fff' }}>{thread.name}</span>
                <span style={{ padding:'2px 7px', background:'rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.9)',
                  borderRadius:'6px', fontSize:'9px', fontWeight:700, border:'1px solid rgba(255,255,255,0.2)' }}>
                  {thread.type}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#34D399' }} />
                <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)' }}>
                  {thread.totalAmount.toLocaleString()}원
                </span>
              </div>
            </div>
            {/* 전화 */}
            <button style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.12)', border:'none',
              borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', padding:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            {/* 더보기 */}
            {onOpenDetail && (
              <button onClick={onOpenDetail}
                style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.12)', border:'none',
                  borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', padding:0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="5" cy="12" r="1.5" fill="#fff"/>
                  <circle cx="12" cy="12" r="1.5" fill="#fff"/>
                  <circle cx="19" cy="12" r="1.5" fill="#fff"/>
                </svg>
              </button>
            )}
        </div>

        {/* ② 집행 현황 게이지 — 스크롤에 따라 접힘 */}
        {!isApprovalThread && (
          <div style={{ background: theme.headerSolid, padding:'0 16px 18px', display:'flex', alignItems:'center', gap:'16px' }}>
              {/* 원형 게이지 */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6.5" />
                  <circle cx="36" cy="36" r="28" fill="none"
                    stroke={pct >= 80 ? '#FCA5A5' : '#34D399'} strokeWidth="6.5" strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 175.93} 175.93`} transform="rotate(-90 36 36)" />
                  {pct < 100 && (
                    <circle cx="36" cy="36" r="28" fill="none"
                      stroke={pct >= 80 ? 'rgba(252,165,165,0.2)' : 'rgba(52,211,153,0.18)'} strokeWidth="6.5" strokeLinecap="round"
                      strokeDasharray={`${((100 - pct) / 100) * 175.93} 175.93`}
                      strokeDashoffset={`${-1 * (pct / 100) * 175.93}`} transform="rotate(-90 36 36)" />
                  )}
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:'15px', fontWeight:800, color:'#fff', lineHeight:1 }}>{pct}%</span>
                  <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.5)', fontWeight:600, marginTop:'2px' }}>집행</span>
                </div>
              </div>
              {/* 바 + 수치 */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ marginBottom:'11px' }}>
                  <div style={{ height:'5px', background:'rgba(255,255,255,0.12)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', borderRadius:'3px',
                      background: pct >= 80 ? 'linear-gradient(90deg,#FCA5A5,#EF4444)' : 'linear-gradient(90deg,#34D399,#10B981)' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                    <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.35)', fontWeight:500 }}>0</span>
                    <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.35)', fontWeight:500 }}>
                      {thread.totalAmount >= 10000 ? (thread.totalAmount/10000).toFixed(0)+'만원' : thread.totalAmount.toLocaleString()+'원'}
                    </span>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px' }}>
                  {[
                    { label:'집행액', val: thread.totalExecuted, color:'#fff' },
                    { label:'잔액',   val: thread.balance,       color: pct >= 80 ? '#FCA5A5' : '#6EE7B7' },
                  ].map(item => (
                    <div key={item.label} style={{ background:'rgba(255,255,255,0.09)', borderRadius:'10px', padding:'8px 10px', border:'1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize:'8px', color:'rgba(255,255,255,0.4)', fontWeight:600, marginBottom:'3px' }}>{item.label}</div>
                      <div style={{ fontSize:'13px', fontWeight:700, color: item.color }}>
                        {item.val >= 10000 ? (item.val/10000).toFixed(1).replace(/\.0$/,'')+'만' : item.val.toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* FDS 경고 */}
        {chat.fdsAlert && (
          <div style={{ background: chat.fdsAlert.level === 'block' ? '#FEF2F2' : '#FFFBEB',
            borderBottom: `1px solid ${chat.fdsAlert.level === 'block' ? '#FECACA' : '#FCD34D'}`,
            padding:'10px 16px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
            <div style={{ width:'20px', height:'20px', borderRadius:'50%',
              background: chat.fdsAlert.level === 'block' ? COLORS.danger : COLORS.warning,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                <path d="M12 9v4"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <span style={{ fontSize:'11px', color: chat.fdsAlert.level === 'block' ? '#B91C1C' : '#854F0B', flex:1, lineHeight:1.45 }}>
              {chat.fdsAlert.text}
            </span>
            <button style={{ fontSize:'11px', color: chat.fdsAlert.level === 'block' ? COLORS.danger : COLORS.warning,
              background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:'inherit', flexShrink:0 }}>
              확인 ›
            </button>
          </div>
        )}

        {/* 메시지 목록 */}
        <div style={{ padding:'14px 14px 10px', background:'#F7F8FA', minHeight:'300px' }}>
          {allMsgs.map((msg, i) => {
            const prevMsg = i > 0 ? allMsgs[i-1] : null
            const showDate = !prevMsg || (prevMsg.date ?? '') !== (msg.date ?? '')
            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'20px 0 14px' }}>
                    <div style={{ flex:1, height:'1px', background:'#D1D5DB' }} />
                    <span style={{ padding:'4px 12px', background:'#1F2937', borderRadius: RADIUS.pill,
                      fontSize:'10px', color:'#F9FAFB', fontWeight:700, whiteSpace:'nowrap', letterSpacing:'0.02em' }}>
                      {msg.date}
                    </span>
                    <div style={{ flex:1, height:'1px', background:'#D1D5DB' }} />
                  </div>
                )}

                {/* ── 계약 카드 ── */}
                {msg.from === 'system' && msg.type === 'contract' ? (() => {
                  const isCancelled = cancelledContracts.has(msg.id)
                  const isPendingSign = !msg.contract.signed && !isCancelled
                  return (
                    <div style={{ margin:'8px 0' }}>
                      <div style={{ background: COLORS.bgCard, border:`1.5px solid ${isCancelled ? '#D1D5DB' : theme.brandDark+'30'}`,
                        borderRadius:'16px', overflow:'hidden', boxShadow: SHADOWS.card, opacity: isCancelled ? 0.65 : 1 }}>
                        <div style={{ background: isCancelled ? '#6B7280' : theme.headerGrad, padding:'12px 16px 0', display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'16px' }}>{isCancelled ? '🚫' : '📋'}</span>
                          <span style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{msg.contract.title}</span>
                          {isCancelled && <span style={{ marginLeft:'auto', padding:'2px 8px', background:'rgba(255,255,255,0.2)', borderRadius:'10px', fontSize:'10px', color:'#fff', fontWeight:700 }}>집행 취소됨</span>}
                          {msg.contract.signed && !isCancelled && <span style={{ marginLeft:'auto', padding:'2px 8px', background:'rgba(255,255,255,0.2)', borderRadius:'10px', fontSize:'10px', color:'#fff', fontWeight:700 }}>✓ 서명완료</span>}
                          {isPendingSign && <span style={{ marginLeft:'auto', padding:'2px 8px', background:'rgba(255,220,50,0.3)', borderRadius:'10px', fontSize:'10px', color:'#FEF9C3', fontWeight:700 }}>⏳ 서명 대기</span>}
                        </div>
                        <div style={{ padding:'14px 16px' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                            {[
                              { label:'집행자', value: msg.contract.executor },
                              { label:'수신자', value: msg.contract.recipient },
                              { label:'금액',   value: msg.contract.amount.toLocaleString()+'원' },
                              { label:'유형',   value: msg.contract.type },
                              { label:'만료일', value: msg.contract.expires },
                            ].map((item,i) => (
                              <div key={i} style={{ background: COLORS.bg, borderRadius:'8px', padding:'8px 10px' }}>
                                <div style={{ fontSize:'9px', color: COLORS.t4, fontWeight:600, marginBottom:'2px' }}>{item.label}</div>
                                <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t1 }}>{item.value}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom:'10px' }}>
                            <div style={{ fontSize:'10px', fontWeight:700, color: COLORS.t4, marginBottom:'5px' }}>허용/차단 MCC</div>
                            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'4px' }}>
                              {msg.contract.mccAllowed.map((m,i) => <span key={i} style={{ padding:'2px 7px', borderRadius:'6px', background:'#F0FDF4', color:'#047857', fontSize:'10px', fontWeight:600 }}>✓ {m}</span>)}
                            </div>
                            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                              {msg.contract.mccBlocked.map((m,i) => <span key={i} style={{ padding:'2px 7px', borderRadius:'6px', background:'#FEF2F2', color:'#DC2626', fontSize:'10px', fontWeight:600 }}>✕ {m}</span>)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize:'10px', fontWeight:700, color: COLORS.t4, marginBottom:'6px' }}>마일스톤</div>
                            {msg.contract.milestones.map((ms,i) => (
                              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', borderBottom: i < msg.contract.milestones.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                                <div style={{ width:'18px', height:'18px', borderRadius:'5px', border:`2px solid ${ms.done ? theme.brandDark : COLORS.borderSoft}`,
                                  background: ms.done ? theme.brandDark : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  {ms.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span style={{ flex:1, fontSize:'11px', color: ms.done ? COLORS.t4 : COLORS.t1, textDecoration: ms.done ? 'line-through' : 'none' }}>{ms.text}</span>
                                <span style={{ fontSize:'10px', color: COLORS.t4 }}>{ms.date}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {isPendingSign && (
                          <div style={{ padding:'10px 14px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px', padding:'7px 10px', background:'#FFFBEB', borderRadius:'8px', border:'1px solid #FDE68A' }}>
                              <span style={{ fontSize:'12px' }}>⏳</span>
                              <span style={{ fontSize:'11px', color:'#92400E', fontWeight:600 }}>상대방 서명 대기 중 · 서명 전까지 취소 가능합니다</span>
                            </div>
                            <button
                              onClick={() => { setCcReason(''); setCcManager(''); setCcConfirmText(''); setContractCancelDialog({ step:1, msgId: msg.id }) }}
                              style={{ width:'100%', height:'36px', borderRadius:'10px', fontSize:'12px', fontWeight:700,
                                background:'transparent', color:'#DC2626', border:'1px solid #FECACA', cursor:'pointer', fontFamily:'inherit' }}>
                              집행 취소
                            </button>
                          </div>
                        )}
                        {isCancelled && (
                          <div style={{ padding:'10px 14px', borderTop:`1px solid #E5E7EB` }}>
                            <div style={{ fontSize:'11px', color:'#9CA3AF', textAlign:'center' }}>이 집행은 취소되었습니다</div>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:'center', marginTop:'4px' }}>
                        <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                      </div>
                    </div>
                  )
                })()

                /* ── 결제 완료 카드 ── */
                : msg.from === 'system' && msg.type === 'payment' ? (
                  <div style={{ margin:'6px 0' }}>
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'18px', flexShrink:0 }}>💸</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>{msg.payment.merchant} · {msg.payment.amount.toLocaleString()}원</div>
                        <div style={{ fontSize:'10px', color:'#065F46', marginTop:'1px' }}>{msg.payment.mcc} · {msg.payment.code}</div>
                      </div>
                      <span style={{ padding:'2px 8px', borderRadius:'8px', background:'#D1FAE5', color:'#047857', fontSize:'10px', fontWeight:700 }}>완료</span>
                    </div>
                    <div style={{ textAlign:'center', marginTop:'2px' }}>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                    </div>
                  </div>

                /* ── 검수 추가 요청 카드 ── */
                ) : msg.from === 'system' && msg.type === 'reviewRequest' ? (() => {
                  const rr = msg.reviewRequest
                  return (
                    <div style={{ margin:'6px 0' }}>
                      <div style={{ background:'#FAF5FF', border:'1.5px solid #C4B5FD', borderRadius:'14px', overflow:'hidden' }}>
                        <div style={{ background:'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)', padding:'10px 14px', display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'16px' }}>🔄</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'12px', fontWeight:800, color:'#fff' }}>검수 추가 요청</div>
                            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.7)', marginTop:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rr.itemTitle}</div>
                          </div>
                        </div>
                        <div style={{ padding:'10px 14px 0', display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {rr.resubmitRequest && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 9px', borderRadius:'20px', background:'#EDE9FE', color:'#6D28D9', fontSize:'11px', fontWeight:700 }}>🔄 재제출요청</span>}
                          {rr.deadline && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 9px', borderRadius:'20px', background:'#FEF3C7', color:'#92400E', fontSize:'11px', fontWeight:700 }}>📅 요청기한 · {rr.deadline}</span>}
                          {rr.attachmentRequest && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 9px', borderRadius:'20px', background:'#EFF6FF', color:'#1D4ED8', fontSize:'11px', fontWeight:700 }}>📎 첨부파일요청</span>}
                        </div>
                        <div style={{ padding:'8px 14px 12px' }}>
                          <div style={{ fontSize:'12px', color:'#374151', lineHeight:1.65, background:'#F5F3FF', borderRadius:'8px', padding:'8px 10px', borderLeft:'3px solid #7C3AED' }}>{rr.message}</div>
                        </div>
                        <div style={{ borderTop:'1px solid #EDE9FE', padding:'8px 14px', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                          {rr.attachmentRequest && (
                            <button style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 14px', borderRadius:'20px', background:'#EFF6FF', color:'#1D4ED8', border:'1.5px solid #BFDBFE', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              파일 첨부
                            </button>
                          )}
                          {rr.resubmitRequest && (
                            <button style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 14px', borderRadius:'20px', background:'#EDE9FE', color:'#6D28D9', border:'1.5px solid #C4B5FD', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                              재제출
                            </button>
                          )}
                          <button style={{ padding:'5px 14px', borderRadius:'20px', background:'#7C3AED', color:'#fff', border:'none', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>확인</button>
                        </div>
                      </div>
                      <div style={{ textAlign:'center', marginTop:'3px' }}>
                        <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                      </div>
                    </div>
                  )
                })()

                /* ── store 통지형 카드 ── */
                : msg.from === 'system' && msg.type === 'storeNotification' ? (() => {
                  const tone = NOTIF_TONE[msg.notification.typeKey] || NOTIF_TONE._default
                  const isWaiting = msg.notification.status === 'waiting'
                  return (
                    <div style={{ margin:'6px 0' }}>
                      <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                        <span style={{ fontSize:'18px', flexShrink:0 }}>{msg.notification.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'12px', fontWeight:700, color: tone.text }}>
                            {msg.notification.typeLabel} · {msg.notification.merchant} · {msg.notification.amount.toLocaleString()}원
                          </div>
                          <div style={{ fontSize:'10px', color: tone.sub, marginTop:'1px' }}>{msg.notification.mcc || '메모 없음'}</div>
                        </div>
                        <span style={{ padding:'2px 8px', borderRadius:'8px', background: isWaiting ? '#FFF4E0' : tone.badgeBg, color: isWaiting ? '#C8821A' : tone.badgeText, fontSize:'10px', fontWeight:700, flexShrink:0 }}>
                          {isWaiting ? '대기' : '완료'}
                        </span>
                      </div>
                      <div style={{ textAlign:'center', marginTop:'2px' }}>
                        <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                      </div>
                    </div>
                  )
                })()

                /* ── store 진행 상태 카드 ── */
                : msg.from === 'system' && msg.type === 'storeProgress' ? (
                  <div style={{ margin:'6px 0' }}>
                    <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'18px', flexShrink:0 }}>⏳</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#854F0B' }}>진행 상태 변경</div>
                        <div style={{ fontSize:'11px', color:'#92400E', marginTop:'2px' }}>{msg.progress.statusLabel}</div>
                        {msg.progress.actionLabel && (
                          <div style={{ fontSize:'10px', color:'#B45309', marginTop:'3px', fontWeight:600 }}>→ {msg.progress.actionLabel}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:'center', marginTop:'2px' }}>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                    </div>
                  </div>

                /* ── 미가입자 안내 카드 ── */
                ) : msg.from === 'system' && msg.type === 'pendingSignup' ? (
                  <div style={{ margin:'10px 0' }}>
                    <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'12px', padding:'14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                        <span style={{ fontSize:'18px', flexShrink:0 }}>📩</span>
                        <span style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2 }}>상대방 가입 대기</span>
                      </div>
                      <div style={{ fontSize:'11px', color: COLORS.t3, lineHeight:1.65 }}>
                        <strong>{msg.pendingSignup.recipientName}</strong>은(는) 아직 주다페이에 가입하지 않았습니다.{' '}
                        {msg.pendingSignup.hasEmail ? '이메일로 거래 계약서가 발송됐고, ' : '외부 인증 링크가 발송됐고, '}
                        가입 후 메시지가 가능합니다.
                      </div>
                    </div>
                  </div>

                /* ── 차단 결제 카드 ── */
                ) : msg.from === 'system' && msg.type === 'blocked' ? (
                  <div style={{ margin:'6px 0' }}>
                    <div style={{ background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'18px', flexShrink:0 }}>🚨</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#DC2626' }}>{msg.blocked.merchant} · {msg.blocked.amount.toLocaleString()}원</div>
                        <div style={{ fontSize:'10px', color:'#B91C1C', marginTop:'1px' }}>{msg.blocked.mcc} · 차단됨 · {msg.blocked.code}</div>
                      </div>
                      <span style={{ padding:'2px 8px', borderRadius:'8px', background:'#FEE2E2', color:'#DC2626', fontSize:'10px', fontWeight:700 }}>차단</span>
                    </div>
                    <div style={{ textAlign:'center', marginTop:'2px' }}>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                    </div>
                  </div>

                /* ── 사용내역 요청 카드 ── */
                ) : msg.from === 'system' && msg.type === 'usageCheck' ? (() => {
                  const uc = msg.usageCheck
                  return (
                    <div style={{ margin:'6px 0' }}>
                      <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:'14px', overflow:'hidden' }}>
                        <div style={{ background:'linear-gradient(135deg,#D97706 0%,#B45309 100%)', padding:'10px 14px', display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'16px' }}>📋</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'12px', fontWeight:800, color:'#fff' }}>사용내역 요청</div>
                            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)', marginTop:'1px' }}>{uc.merchant} · {uc.amount.toLocaleString()}원</div>
                          </div>
                          <span style={{ padding:'2px 8px', borderRadius:'8px', background: uc.status==='pending' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)', color:'#fff', fontSize:'10px', fontWeight:700 }}>
                            {uc.status==='pending'?'미제출':'완료'}
                          </span>
                        </div>
                        <div style={{ padding:'10px 14px 0', display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {(uc.requestTypes||[]).map((rt,i) => (
                            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 9px', borderRadius:'20px', background:'#FEF3C7', color:'#92400E', fontSize:'11px', fontWeight:700 }}>
                              {rt === '사용내역요청' ? '📄' : rt === '첨부파일요청' ? '📎' : rt === '재제출요청' ? '🔄' : '📋'} {rt}
                            </span>
                          ))}
                        </div>
                        <div style={{ padding:'8px 14px 12px' }}>
                          {uc.note && (
                            <div style={{ fontSize:'12px', color:'#78350F', lineHeight:1.65, background:'#FFF8E7', borderRadius:'8px', padding:'8px 10px', borderLeft:'3px solid #F59E0B', marginBottom:'8px' }}>{uc.note}</div>
                          )}
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:'10px', color:'#92400E' }}>요청기한: {uc.deadline} · {uc.code}</span>
                          </div>
                        </div>
                        {uc.status === 'pending' && (
                          <div style={{ borderTop:'1px solid #FDE68A', padding:'8px 14px', display:'flex', gap:'8px' }}>
                            <button style={{ flex:1, padding:'7px', background:'#F59E0B', border:'none', borderRadius:'9px', color:'#fff', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>사용내역 제출</button>
                            <button style={{ flex:1, padding:'7px', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:'9px', color:'#92400E', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>파일 첨부</button>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:'center', marginTop:'3px' }}>
                        <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                      </div>
                    </div>
                  )
                })()

                /* ── 마일스톤 카드 ── */
                : msg.from === 'system' && msg.type === 'milestone' ? (
                  <div style={{ margin:'6px 0' }}>
                    <div style={{ background: theme.brandDark+'0E', border:`1px solid ${theme.brandDark}25`, borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'7px', background: theme.brandDark, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark }}>마일스톤 완료</div>
                        <div style={{ fontSize:'11px', color: COLORS.t2, marginTop:'1px' }}>{msg.milestone.text}</div>
                      </div>
                      <span style={{ fontSize:'10px', color: COLORS.t4 }}>{msg.milestone.code}</span>
                    </div>
                    <div style={{ textAlign:'center', marginTop:'2px' }}>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                    </div>
                  </div>

                /* ── 처리센터 액션 결과 카드 ── */
                ) : msg.from === 'system' && msg.type === 'approvalAction' ? (() => {
                  const aa = msg.approvalAction
                  const actionMeta = {
                    approved:            { icon:'✅', label:'승인 완료',         bg:'#F0FDF4', border:'#BBF7D0', hg:'linear-gradient(135deg,#059669 0%,#047857 100%)', color:'#047857' },
                    inspection_approved: { icon:'🔍', label:'검수 승인',         bg:'#EFF6FF', border:'#BFDBFE', hg:'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', color:'#1D4ED8' },
                    inspection_rejected: { icon:'❌', label:'검수 반려',         bg:'#FEF2F2', border:'#FECACA', hg:'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)', color:'#DC2626' },
                    extra_docs:          { icon:'📎', label:'추가서류 요청',     bg:'#FFFBEB', border:'#FDE68A', hg:'linear-gradient(135deg,#D97706 0%,#B45309 100%)', color:'#92400E' },
                    usage_confirmed:     { icon:'📋', label:'사용내역확인 완료', bg:'#F5F3FF', border:'#DDD6FE', hg:'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)', color:'#6D28D9' },
                  }
                  const m = actionMeta[aa.action] || actionMeta.approved
                  return (
                    <div style={{ margin:'8px 0' }}>
                      <div style={{ background: m.bg, border: `1.5px solid ${m.border}`, borderRadius:'14px', overflow:'hidden' }}>
                        <div style={{ background: m.hg, padding:'10px 14px', display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'16px' }}>{m.icon}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'12px', fontWeight:800, color:'#fff' }}>{aa.actor} 님이 {m.label}하였습니다.</div>
                            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)', marginTop:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{aa.itemTitle}</div>
                          </div>
                        </div>
                        {(aa.note || (aa.requestedDocs && aa.requestedDocs.length > 0)) && (
                          <div style={{ padding:'10px 14px' }}>
                            {aa.note && (
                              <div style={{ fontSize:'12px', color: m.color, lineHeight:1.65, background:'rgba(0,0,0,0.04)', borderRadius:'8px', padding:'7px 10px', borderLeft:`3px solid ${m.border}`, marginBottom: aa.requestedDocs?.length ? '8px' : 0 }}>
                                {aa.note}
                              </div>
                            )}
                            {aa.requestedDocs && aa.requestedDocs.length > 0 && (
                              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'4px' }}>
                                {aa.requestedDocs.map((doc,i) => (
                                  <span key={i} style={{ padding:'2px 9px', borderRadius:'20px', background:`${m.border}80`, color: m.color, fontSize:'11px', fontWeight:600 }}>📄 {doc}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:'center', marginTop:'3px' }}>
                        <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                      </div>
                    </div>
                  )
                })()

                /* ── 요청하기 카드 ── */
                : msg.type === 'requestCard' ? (
                  <div style={{ margin:'8px 0' }}
                    onMouseDown={() => startLongPress(msg)} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                    onTouchStart={() => startLongPress(msg)} onTouchEnd={cancelLongPress}
                    onContextMenu={e => { e.preventDefault(); if(canDelete(msg)) setDeleteTarget({ id: msg.id, isMemo:false }) }}>
                    <div style={{ background:'#fff', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', border:`1.5px solid ${msg.card.borderColor}` }}>
                      <div style={{ background: msg.card.headerGrad, padding:'10px 14px 0', display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'16px' }}>{msg.card.emoji}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'12px', fontWeight:800, color:'#fff' }}>{msg.card.title}</div>
                          {msg.card.txLabel && <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)', marginTop:'1px' }}>연결: {msg.card.txLabel}</div>}
                        </div>
                        <span style={{ padding:'2px 8px', background:'rgba(255,255,255,0.25)', borderRadius:'8px', fontSize:'10px', fontWeight:700, color:'#fff' }}>{msg.card.statusLabel}</span>
                      </div>
                      <div style={{ padding:'12px 14px' }}>
                        {msg.card.fields.map((f, fi) => (
                          <div key={fi} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'4px 0', borderBottom: fi < msg.card.fields.length-1 ? '1px solid #F3F4F6' : 'none' }}>
                            <span style={{ fontSize:'11px', color:'#9CA3AF', fontWeight:600, minWidth:'70px' }}>{f.label}</span>
                            <span style={{ fontSize:'11px', color:'#111827', fontWeight:600, textAlign:'right', flex:1 }}>{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', marginTop:'3px', paddingRight:'4px' }}>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500 }}>{msg.time}</span>
                    </div>
                  </div>

                /* ── 메모 버블 ── */
                ) : msg.from === 'me' && msg.type === 'memo' ? (
                  <div style={{ display:'flex', flexDirection:'row-reverse', marginBottom:'8px', gap:'8px', alignItems:'flex-end' }}
                    onMouseDown={() => startLongPress(msg)} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                    onTouchStart={() => startLongPress(msg)} onTouchEnd={cancelLongPress}
                    onContextMenu={e => { e.preventDefault(); setDeleteTarget({ id: msg.id, isMemo:true }) }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', maxWidth:'75%' }}>
                      <div style={{ padding:'10px 13px', background:'#FFFDE7', border:'1px solid #FDE68A', borderRadius:'14px 14px 4px 14px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'5px' }}>
                          <span style={{ fontSize:'10px' }}>📝</span>
                          <span style={{ fontSize:'9px', fontWeight:700, color:'#92400E' }}>개인 메모</span>
                          <span style={{ fontSize:'9px', color:'#D97706', marginLeft:'2px' }}>· 나만 보임</span>
                        </div>
                        <div style={{ fontSize:'12px', color:'#78350F', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{msg.text}</div>
                        {msg.txLabel && (
                          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'8px', padding:'5px 8px', background:'rgba(217,119,6,0.12)', borderRadius:'8px' }}>
                            <span style={{ fontSize:'10px' }}>🔗</span>
                            <span style={{ fontSize:'10px', fontWeight:700, color:'#92400E' }}>연결: {msg.txLabel}</span>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500, marginTop:'3px' }}>나만 보이는 메모입니다 · {msg.time}</span>
                    </div>
                  </div>

                /* ── 일반 시스템 텍스트 ── */
                ) : msg.from === 'system' ? (
                  <div style={{ textAlign:'center', margin:'10px 0' }}>
                    <span style={{ padding:'4px 12px', background:'rgba(0,0,0,0.05)', borderRadius: RADIUS.pill, fontSize:'10px', color: COLORS.t4, fontWeight:500 }}>
                      {msg.text}
                    </span>
                  </div>

                /* ── 일반 말풍선 ── */
                ) : (
                  <div style={{ display:'flex', flexDirection: msg.from === 'me' ? 'row-reverse' : 'row', marginBottom:'8px', gap:'8px', alignItems:'flex-end' }}>
                    {msg.from === 'other' && (
                      <div style={{ width:'28px', height:'28px', borderRadius:'9px', background: thread.avatarBg, color: thread.avatarFg,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize: thread.emoji ? '14px' : '10px', fontWeight:700, flexShrink:0 }}>
                        {thread.emoji || thread.initial}
                      </div>
                    )}
                    <div style={{ display:'flex', flexDirection:'column', alignItems: msg.from === 'me' ? 'flex-end' : 'flex-start', maxWidth:'70%' }}>
                      <div
                        onMouseDown={() => msg.from === 'me' && startLongPress(msg)}
                        onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                        onTouchStart={e => { if(msg.from==='me'){ e.stopPropagation(); startLongPress(msg) } }}
                        onTouchEnd={cancelLongPress}
                        onContextMenu={e => { if(msg.from==='me'){ e.preventDefault(); if(canDelete(msg)) setDeleteTarget({ id:msg.id, isMemo:false }) } }}
                        style={{ padding:'10px 14px', borderRadius: msg.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: msg.from === 'me' ? theme.brandDark : '#fff',
                          color: msg.from === 'me' ? '#fff' : COLORS.t1,
                          fontSize:'13px', lineHeight:1.55,
                          boxShadow: msg.from === 'other' ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
                          userSelect:'none', cursor: msg.from === 'me' ? 'pointer' : 'default' }}>
                        {msg.text}
                      </div>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:500, marginTop:'3px', paddingLeft:'2px', paddingRight:'2px' }}>
                        {msg.time}
                        {msg.from==='me' && (msg.read
                          ? <span style={{ color: COLORS.t4, fontSize:'9px' }}> · 읽음</span>
                          : <span style={{ color: COLORS.t4, fontSize:'9px' }}> · 미읽음</span>)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={msgBottomRef} style={{ height:'8px' }} />
        </div>
      </div>{/* 스크롤 래퍼 끝 */}

      {/* ── 입력 바 ── */}
      {isApprovalThread ? (
        <div style={{ background: COLORS.bgCard, borderTop: `1px solid ${COLORS.borderSoft}`, padding:'12px 16px 16px', flexShrink:0 }}>
          <p style={{ margin:'0 0 10px', fontSize:'11px', color: COLORS.t4, lineHeight:1.6, textAlign:'center' }}>
            처리센터에서 승인·반려·요청 액션을 취하면<br/>해당 내역이 여기에 자동으로 기록됩니다.
          </p>
          <button onClick={onBack} style={{ width:'100%', padding:'11px', background: theme.activeBtnGrad, border:'none', borderRadius:'12px',
            color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: theme.activeShadow }}>
            처리센터 알림 나가기
          </button>
        </div>
      ) : (
        <div style={{ background: COLORS.bgCard, borderTop: `1px solid ${COLORS.borderSoft}`, padding:'8px 12px 14px', flexShrink:0 }}>
          {/* 빠른 액션 칩 — viewer는 숨김 */}
          {!isViewer && <div style={{ display:'flex', gap:'6px', marginBottom:'8px', overflowX:'auto', paddingBottom:'2px' }}>
            {bottomChips.map(chip => (
              <button key={chip.id}
                onClick={() => { setActionSheet(chip.id); setRequestType(null) }}
                style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'6px 14px',
                  background: chip.primary ? theme.activeBtnGrad : '#F7F8FA',
                  color: chip.primary ? '#fff' : COLORS.t3,
                  border: chip.primary ? 'none' : `1px solid ${COLORS.borderSoft}`,
                  borderRadius: RADIUS.pill, fontSize:'11px', fontWeight:700,
                  cursor:'pointer', flexShrink:0, fontFamily:'inherit',
                  boxShadow: chip.primary ? theme.activeShadow : 'none' }}>
                <span style={{ fontSize:'12px' }}>{chip.icon}</span>
                {chip.label}
              </button>
            ))}
          </div>}
          {/* 입력 박스 */}
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
              placeholder={isViewer ? "조회 전용 권한 — 메시지 전송 불가" : "메시지를 입력하세요"} rows={1}
              disabled={isViewer}
              style={{ flex:1, background: COLORS.bgMuted, borderRadius:'14px', padding:'10px 14px',
                fontSize:'13px', color: COLORS.t1, border:`1px solid ${COLORS.borderSoft}`,
                outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.5,
                maxHeight:'96px', overflowY:'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
            />
            <button onClick={!isViewer ? sendText : undefined} disabled={isViewer}
              style={{ width:'42px', alignSelf:'stretch', borderRadius:'14px',
                background: inputText.trim() ? theme.activeBtnGrad : COLORS.bgMuted,
                border: inputText.trim() ? 'none' : `1px solid ${COLORS.borderSoft}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: inputText.trim() ? 'pointer' : 'default', flexShrink:0,
                boxShadow: inputText.trim() ? theme.activeShadow : 'none', transition:'all 0.2s' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={inputText.trim() ? '#fff' : COLORS.t4} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── 삭제 확인 다이얼로그 ── */}
      {deleteTarget && (
        <div style={{ position:'absolute', inset:0, zIndex:300, background:'rgba(15,20,35,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:'0 32px' }}
          onClick={() => setDeleteTarget(null)}>
          <div style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 16px', width:'100%', textAlign:'center', boxShadow:'0 16px 48px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'28px', marginBottom:'10px' }}>{deleteTarget.isMemo ? '📝' : '🗑️'}</div>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>메시지를 삭제하시겠습니까?</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'20px', lineHeight:1.5 }}>
              {deleteTarget.isMemo ? '내 메모를 삭제합니다.' : '상대방이 아직 읽지 않은 메시지입니다. 삭제하면 복구할 수 없습니다.'}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex:1, padding:'12px', background:'#F3F4F6', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
                취소
              </button>
              <button onClick={() => {
                  const tid = deleteTarget.id
                  setDeletedMsgIds(prev => new Set([...prev, tid]))
                  setLocalMsgs(prev => prev.filter(m => m.id !== tid))
                  if (deleteTarget.isMemo) {
                    setMemos(prev => prev.filter(m => m.id !== tid))
                    deleteThreadMemo(thread.id, tid)
                  }
                  setDeleteTarget(null)
                }}
                style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#DC2626,#EF4444)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 액션시트 — userType에 따라 분기 ── */}
      {/* Suspense: lazy 청크 로드 전까지 null 표시 (액션시트는 버튼 탭 전 보이지 않으므로 fallback 불필요) */}
      <Suspense fallback={null}>
        {userType === 'personal' ? (
          <ChatActionsPersonal
            actionSheet={actionSheet}
            closeSheet={closeSheet}
            paymentForm={paymentForm}
            setPaymentForm={setPaymentForm}
            refundForm={refundForm}
            setRefundForm={setRefundForm}
            dataReqForm={dataReqForm}
            setDataReqForm={setDataReqForm}
            selectedTx={selectedTx}
            setSelectedTx={setSelectedTx}
            memoText={memoText}
            setMemoText={setMemoText}
            memos={memos}
            setMemos={setMemos}
            MOCK_LOANS={MOCK_LOANS}
            MOCK_TRANSACTIONS={MOCK_TRANSACTIONS}
            pushLocalMsg={pushLocalMsg}
            setLocalMsgs={setLocalMsgs}
            thread={thread}
          />
        ) : (
          <ChatActionsBusiness
            {...sharedProps}
            settlementForm={settlementForm}
            setSettlementForm={setSettlementForm}
            memoText={memoText}
            setMemoText={setMemoText}
            memos={memos}
            setMemos={setMemos}
            setLocalMsgs={setLocalMsgs}
            thread={thread}
          />
        )}
      </Suspense>

      {/* ── 집행 취소 다이얼로그 (Step 1) ── */}
      {contractCancelDialog?.step === 1 && (
        <div style={{ position:'absolute', inset:0, zIndex:300, background:'rgba(15,20,35,0.55)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px' }}
          onClick={() => setContractCancelDialog(null)}>
          <div style={{ background:'#fff', borderRadius:'20px', padding:'28px 22px 22px', width:'100%', maxWidth:'320px', boxShadow:'0 20px 60px rgba(0,0,0,0.22)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:'16px' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>🚫</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:'#111827', marginBottom:'6px' }}>집행을 취소하시겠습니까?</div>
              <div style={{ fontSize:'12px', color:'#6B7280', lineHeight:1.6 }}>
                상대방이 아직 서명하지 않은 계약입니다.<br/>취소하면 집행이 무효 처리됩니다.
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
              <button onClick={() => setContractCancelDialog(null)}
                style={{ flex:1, padding:'13px', background:'#F3F4F6', border:'none', borderRadius:'12px', fontSize:'13px', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
                돌아가기
              </button>
              <button onClick={handleContractCancelStep2}
                style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#DC2626,#EF4444)', border:'none', borderRadius:'12px', fontSize:'13px', fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                취소 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 집행 취소 다이얼로그 (Step 2) ── */}
      {contractCancelDialog?.step === 2 && (
        <div style={{ position:'absolute', inset:0, zIndex:300, background:'rgba(15,20,35,0.55)',
          display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
          onClick={() => setContractCancelDialog(null)}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'0 0 32px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
              <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'#E4E6EA' }} />
            </div>
            <div style={{ padding:'8px 22px 0' }}>
              <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', marginBottom:'4px' }}>집행 취소 확인</div>
              <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'18px' }}>아래 정보를 입력하고 '삭제'를 입력해야 취소가 완료됩니다</div>

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>취소 사유 <span style={{ color:'#DC2626' }}>*</span></label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
                {['단순 변심','계약 조건 변경','상대방 요청','내부 결재 미승인','기타'].map(r => (
                  <button key={r} onClick={() => setCcReason(r)}
                    style={{ padding:'5px 12px', borderRadius:'20px', border:'1px solid', fontFamily:'inherit', fontSize:'11px', fontWeight:600, cursor:'pointer',
                      background: ccReason === r ? '#FEF2F2' : '#F9FAFB',
                      color: ccReason === r ? '#DC2626' : '#6B7280',
                      borderColor: ccReason === r ? '#FECACA' : '#E4E6EA' }}>{r}</button>
                ))}
              </div>

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>담당자 이름 <span style={{ color:'#DC2626' }}>*</span></label>
              <input value={ccManager} onChange={e => setCcManager(e.target.value)}
                placeholder="취소를 승인한 담당자 이름" maxLength={20}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', outline:'none', marginBottom:'14px' }} />

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>아래 칸에 <span style={{ fontWeight:800, color:'#DC2626' }}>"삭제"</span> 를 입력하세요</label>
              <input value={ccConfirmText} onChange={e => setCcConfirmText(e.target.value)} placeholder="삭제"
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px',
                  background: ccConfirmText === '삭제' ? '#FEF2F2' : '#F9FAFB',
                  border:`1px solid ${ccConfirmText === '삭제' ? '#FECACA' : '#E4E6EA'}`,
                  borderRadius:'10px', fontSize:'14px', fontWeight:700, color:'#DC2626', fontFamily:'inherit', outline:'none', marginBottom:'18px', textAlign:'center', letterSpacing:'0.05em' }} />

              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setContractCancelDialog(null)}
                  style={{ flex:1, padding:'14px', background:'#F3F4F6', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
                  취소
                </button>
                <button
                  disabled={ccConfirmText !== '삭제' || !ccReason || !ccManager.trim()}
                  onClick={handleContractCancelConfirm}
                  style={{ flex:1, padding:'14px',
                    background: ccConfirmText === '삭제' && ccReason && ccManager.trim() ? 'linear-gradient(135deg,#DC2626,#EF4444)' : '#E5E7EB',
                    border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700,
                    color: ccConfirmText === '삭제' && ccReason && ccManager.trim() ? '#fff' : '#6B7280',
                    cursor: ccConfirmText !== '삭제' || !ccReason || !ccManager.trim() ? 'default' : 'pointer',
                    fontFamily:'inherit' }}>
                  삭제 확정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
