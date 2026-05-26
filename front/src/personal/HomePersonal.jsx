import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import BottomTab from '../components/BottomTab'
import {
  PhoneShell, GradientHeader, ProfileBadge, BalanceCard, CircleAction, AccountTransition,
} from '../design/components'
import { getAccountTheme } from '../design/accountTokens'
import { useNoSwipeBack } from '../hooks/useNoSwipeBack'
import { useUser } from '../contexts/UserContext'
import { hydrateHome } from '../services/hydrate'
import { useWalletState, refreshWallets } from '../services/walletStore'
import { session } from '../services/api'

// ─── 공통 카드 스타일 ─────────────────────────────────────
const CARD_STYLE = {
  background:'#FFFFFF',
  borderRadius:'14px',
  border:'1px solid #E9EAEC',
  overflow:'hidden',
}

// ─── 처리 필요 항목 (데모 폴백) ──────────────────────────
// 서버 GET /api/v1/app/home/pending 응답이 있으면 그걸로 덮어쓴다.
// 각 항목 클릭 시 → /messages 로 이동, threadId로 1:1 채팅 자동 진입
const DEMO_PENDING = [
  { id:'p1', category:'입금 필요',       emoji:'💸', from:'이유진', fromInitial:'👧', avatarBg:'#FCD34D', avatarFg:'#92400E', desc:'생활비 지급 요청',  amount:'30,000원',  urgent:true,  threadId:'2' },
  { id:'p2', category:'상환 필요',       emoji:'🔄', from:'박철수', fromInitial:'박', avatarBg:'#EF4444', avatarFg:'#FFFFFF', desc:'대여금 상환 요청',  amount:'200,000원', urgent:false, threadId:'1' },
  { id:'p3', category:'자료 제출 필요',  emoji:'📁', from:'김창업', fromInitial:'김', avatarBg:'#7C3AED', avatarFg:'#FFFFFF', desc:'계약서 제출 요청',  amount:null,        urgent:false, threadId:'4' },
]

const CATEGORY_STYLE = {
  '입금 필요':           { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE', dot:'#2563EB' },
  '상환 필요':           { bg:'#FEF2F2', color:'#DC2626', border:'#FECACA', dot:'#EF4444' },
  '자료 제출 필요':      { bg:'#F0FDFA', color:'#0F766E', border:'#99F6E4', dot:'#14B8A6' },
  '자동 지급 잔액 부족': { bg:'#FFF7ED', color:'#C2410C', border:'#FDBA74', dot:'#EA580C' },
  '자동 지급 확인 필요': { bg:'#FFFBEB', color:'#B45309', border:'#FDE68A', dot:'#D97706' },
  '자동 지급 예정':      { bg:'#ECFDF5', color:'#047857', border:'#6EE7B7', dot:'#10B981' },
  '서명 필요':           { bg:'#F5F3FF', color:'#6D28D9', border:'#DDD6FE', dot:'#7C3AED' },
  '인증 대기':           { bg:'#FFFBEB', color:'#B45309', border:'#FDE68A', dot:'#D97706' },
  '진행 중':             { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE', dot:'#2563EB' },
  '검수 필요':           { bg:'#FEF3C7', color:'#854F0B', border:'#FDE68A', dot:'#D97706' },
  '처리 필요':           { bg:'#F3F4F6', color:'#374151', border:'#E5E7EB', dot:'#9CA3AF' },
}

// 자금 종류별 아바타 색상 (수신자 이니셜 배경)
const TYPE_AVATAR = {
  lend:        { bg:'#FFF4E0', fg:'#C8821A' },
  freelance:   { bg:'#EDF3FA', fg:'#1E5294' },
  bonus:       { bg:'#E6F5EF', fg:'#085041' },
  condolence:  { bg:'#FCE7F3', fg:'#9D174D' },
  gift:        { bg:'#FCE7F3', fg:'#9D174D' },
  invest:      { bg:'#E6F5EF', fg:'#2A7D5E' },
  rent:        { bg:'#EDF3FA', fg:'#2D6BB0' },
  support:     { bg:'#E6F5EF', fg:'#2A7D5E' },
}

// 서버 status → 화면 카테고리 라벨
function statusToCategory(status, category) {
  switch (status) {
    case 'waiting':     return '인증 대기'
    case 'signing':     return '서명 필요'
    case 'in_progress': return '진행 중'
    case 'reviewing':   return '검수 필요'
    case 'rejected':    return '입금 필요'
    default:            return category === 'contract' ? '서명 필요' : '처리 필요'
  }
}

// 서버 pending payout → DEMO_PENDING 카드 shape 으로 변환
function mapServerPendingToCard(p) {
  if (!p) return null
  const fmt   = (n) => Number(n || 0).toLocaleString('ko-KR')
  // 서버는 sender/recipient 양쪽 관점의 pending 을 모두 보내준다.
  //   viewerRole === 'recipient' → 내가 받는 쪽. 상대방(=fromUserName)을 카드에 표시.
  //   viewerRole === 'sender'    → 내가 보내는 쪽. 수령인(=recipientName)을 카드에 표시. (기본)
  const isRecipient = p.viewerRole === 'recipient'
  const counterpart = isRecipient
    ? (p.fromUserName || '발신자')
    : (p.recipientName || '')
  // 전화번호만 있는 비가입자 수령인(010-xxxx-xxxx) 케이스는 첫 글자 "0" 대신 사람 아이콘 표기
  const isPhone     = /^\s*0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\s*$/.test(counterpart)
  const tone        = TYPE_AVATAR[p.type] || { bg:'#F2EFE9', fg:'#555550' }
  return {
    id:           p.id,
    category:     statusToCategory(p.status, p.category),
    emoji:        p.typeIcon || '💸',
    from:         counterpart || (p.typeLabel || '수신자 없음'),
    fromInitial:  isPhone ? '👤' : (counterpart ? counterpart.charAt(0) : '?'),
    avatarBg:     tone.bg,
    avatarFg:     tone.fg,
    desc:         p.actionLabel || p.dealTitle || p.typeLabel || '',
    amount:       p.amount ? `${fmt(p.amount)}원` : null,
    urgent:       p.status === 'waiting' || p.status === 'rejected',
    // 서버가 threadId 를 직접 보내준다 (AppHomeController.baseItemOf).
    //   payoutId 폴백 금지 — payoutId 는 thread 가 아니므로 /chat/{uuid} 에서 못 찾는다.
    threadId:     p.threadId || null,
    viewerRole:   p.viewerRole || 'sender',
    _payoutId:    p.id,
  }
}

// ─── 실시간 결제 (데모 폴백) ──────────────────────────────
const DEMO_PAYMENTS = [
  { id:'p1', merchant:'스타벅스 강남점', sub:'오늘 09:12 · MY 지갑', amount:-4500,  status:'normal',  type:'mine'     },
  { id:'o1', merchant:'카페 결제',       sub:'방금 · 박철수 · 외주비', amount:-4500,  status:'normal',  type:'external', user:'박철수' },
  { id:'p2', merchant:'이마트 역삼점',   sub:'어제 14:32 · MY 지갑', amount:-32000, status:'normal',  type:'mine'     },
  { id:'o2', merchant:'편의점 결제',     sub:'오늘 · 이민형 · 대여금', amount:-3200,  status:'normal',  type:'external', user:'이민형' },
  { id:'p3', merchant:'GS게임센터',      sub:'4.28 22:14 · MCC 차단', amount:0,      status:'blocked', type:'mine'     },
  { id:'o3', merchant:'카지노 결제 시도',sub:'4.29 · 박철수 · 외주비', amount:0,      status:'blocked', type:'external', user:'박철수' },
]

// 서버 Transaction → 홈 카드 형태로 매핑
function mapServerPaymentToCard(tx) {
  if (!tx) return null
  const blocked = tx.fdsStatus === 'BLOCKED' || tx.status === 'DECLINED'

  // 결제자가 본인이 아니면 (권한자금 발신자 viewer 케이스) 결제자 이름을 가맹점 앞에 prefix.
  //   ex) "박철수 · 이마트 역삼점"
  const merchantBase = tx.merchantName || '결제'
  const isMine = tx.isMine !== false   // 서버가 isMine 안 보내면 본인 결제로 간주 (호환)
  const merchant = isMine
    ? merchantBase
    : (tx.userName ? `${tx.userName} · ${merchantBase}` : merchantBase)

  // sub 라인 — 시간 · MCC (· 사용 지갑 이름) 같이
  const walletPart = tx.wallet?.kind === 'PERMISSION' && tx.wallet?.name ? tx.wallet.name : null
  const sub = [
    tx.requestedAt ? new Date(tx.requestedAt).toLocaleString('ko-KR') : '',
    tx.merchantMcc,
    walletPart,
  ].filter(Boolean).join(' · ')

  return {
    id:       tx.id || tx.transactionNo,
    merchant,
    sub,
    amount:   blocked ? 0 : -(Number(tx.amount) || 0),
    status:   blocked ? 'blocked' : 'normal',
    type:     isMine ? 'mine' : 'external',
    userName: tx.userName,
    isMine,
  }
}

// ─── 집행 상황 (데모 폴백) ────────────────────────────────
// 서버 GET /api/v1/app/home/executing 응답이 있으면 그걸로 덮어쓴다.
const DEMO_EXECUTING = []

// ─── 섹션 헤더 ────────────────────────────────────────────
function SectionHeader({ eyebrow, title, actionLabel, onAction }) {
  const theme = getAccountTheme()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px', borderBottom:'1px solid #F0F1F3' }}>
      <div>
        {eyebrow && <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.8px', marginBottom:'3px' }}>{eyebrow}</div>}
        <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{title}</div>
      </div>
      {actionLabel && (
        <button onClick={onAction} style={{ fontSize:'12px', fontWeight:600, color: theme.brandDark,
          background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          {actionLabel} ›
        </button>
      )}
    </div>
  )
}

// ─── 아이콘 ───────────────────────────────────────────────
const PlusIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const ZapIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const CardIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>
const ArrowIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="18" x2="18" y2="6"/><polyline points="9 6 18 6 18 15"/></svg>
const TrendIcon = () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 10 L6 6 L8 8 L12 4" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><polyline points="9 4 12 4 12 7" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
const PersonalEmoji = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="18" cy="13" r="1.5" fill="white"/></svg>
const ShieldIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="15" r="0.5" fill="#EF4444"/></svg>
const BlockIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>

function fmt(n) { return Number(Math.abs(n) || 0).toLocaleString('ko-KR') }

export default function HomePersonal() {
  useNoSwipeBack()
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()
  const { login, currentUser } = useUser()
  const [todoExpanded, setTodoExpanded] = useState(
    () => sessionStorage.getItem('home_todo_expanded') === 'true'
  )

  // ── 서버 데이터 (로그인 안 됐으면 데모 폴백) ──────────────
  // 우선순위: session.user.name → currentUser.name (DEMO_USERS) → 빈 문자열
  const [userName,  setUserName]  = useState(() => session.user?.name || currentUser?.name || '')
  const [balance,   setBalance]   = useState(null)         // null = 데모, 숫자 = 서버
  // 로그인 시: 빈 배열로 시작 → 서버 응답이 채움. 비로그인 시: 데모 데이터 폴백.
  const _isAuthed = !!session.user
  const [pending,   setPending]   = useState(_isAuthed ? [] : DEMO_PENDING)
  const [payments,  setPayments]  = useState(_isAuthed ? [] : DEMO_PAYMENTS)
  const [executing, setExecuting] = useState(_isAuthed ? [] : DEMO_EXECUTING)
  const [blockedN,  setBlockedN]  = useState(null)         // null = 폴백 계산

  // currentUser 가 바뀌면 userName 도 동기화 (로그인/로그아웃, storage 이벤트)
  useEffect(() => {
    if (currentUser?.name) setUserName(currentUser.name)
  }, [currentUser?.name])

  // ── 권한자금 합계 (다른 사람이 보내준 자금) ──────────────
  //   MY 지갑 외에 권한자금(PERMISSION)이 있으면 총합 + 갯수 표시.
  //   walletStore 가 STOMP 로 자동 갱신.
  const _wState = useWalletState()
  const permissionWallets = (_wState.wallets || []).filter(w => w.kind === 'PERMISSION')
  const permissionTotal = permissionWallets.reduce(
    (s, w) => s + Math.max(0, (w.balance || 0) - (w.pendingOut || 0)), 0
  )

  const refreshHome = useCallback(async () => {
    const data = await hydrateHome()
    if (!data) return       // 로그인 안 됨 → 데모 유지
    if (data.me?.name)            setUserName(data.me.name)
    if (data.wallet?.available != null) setBalance(data.wallet.available)
    // 로그인 시 — 서버 응답이 단일 출처. 빈 배열도 그대로 반영 (데모 카드 잔존 방지)
    if (Array.isArray(data.pending))   {
      const mappedPending = data.pending.map(mapServerPendingToCard).filter(Boolean)
      setPending(mappedPending)
    }
    if (Array.isArray(data.payments)) {
      const mapped = data.payments.map(mapServerPaymentToCard).filter(Boolean)
      setPayments(mapped)
    }
    if (Array.isArray(data.executing)) setExecuting(data.executing)
    if (typeof data.blocked === 'number') setBlockedN(data.blocked)
  }, [])

  // 첫 마운트 시 prefetch
  useEffect(() => {
    refreshHome()
    refreshWallets()   // 권한자금 포함 전체 지갑 fetch — Home '받은 자금' 표시용
  }, [refreshHome])

  // ── 다른 화면(충전/결제 등)에서 hydrateHome 이 실행되면 그 결과를 받아 즉시 갱신
  //    이벤트는 services/hydrate.js 의 hydrateHome 마지막에 dispatch.
  //    keep-alive 스택 때문에 HomePersonal 이 unmount/remount 되지 않을 때도 동기화된다.
  useEffect(() => {
    const handler = (e) => {
      const data = e?.detail
      if (!data) return
      if (data.me?.name)                  setUserName(data.me.name)
      if (data.wallet?.available != null) setBalance(data.wallet.available)
      if (Array.isArray(data.pending))    {
        const mappedPending = data.pending.map(mapServerPendingToCard).filter(Boolean)
        setPending(mappedPending)
      }
      if (Array.isArray(data.payments)) {
        const mapped = data.payments.map(mapServerPaymentToCard).filter(Boolean)
        setPayments(mapped)
      }
      if (Array.isArray(data.executing))  setExecuting(data.executing)
      if (typeof data.blocked === 'number') setBlockedN(data.blocked)
    }
    window.addEventListener('judapay:home-hydrated', handler)
    return () => window.removeEventListener('judapay:home-hydrated', handler)
  }, [])

  // ── STOMP 실시간 — 결제/지갑/자금집행 이벤트 받으면 home 자동 새로고침 ──
  useEffect(() => {
    let timer = null
    const trigger = () => {
      clearTimeout(timer)
      timer = setTimeout(() => refreshHome(), 500)
    }
    const onRealtime = (e) => {
      const d = e?.detail
      if (!d) return
      if (d.kind === 'wallet' || d.kind === 'payment') {
        trigger()
      } else if (d.kind === 'message' && d.message?.payoutId) {
        trigger()
      }
    }
    const onAlert = (e) => {
      const t = e?.detail?.refType
      if (t === 'payout' || t === 'payment' || t === 'wallet') trigger()
    }
    window.addEventListener('judapay:realtime', onRealtime)
    window.addEventListener('judapay:alert', onAlert)
    return () => {
      window.removeEventListener('judapay:realtime', onRealtime)
      window.removeEventListener('judapay:alert', onAlert)
      clearTimeout(timer)
    }
  }, [refreshHome])

  // ── Pull-to-Refresh ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    try { await refreshHome() } catch {}
  }, [refreshHome])
  const ptr = usePullToRefresh(handleRefresh)

  // ── 헤더 '이상 N건' 배지 계산 (서버 값 > 클라 fallback) ──
  const blockedCount = useMemo(() => (
    blockedN != null
      ? blockedN
      : payments.filter(p => p.status === 'blocked').length
  ), [blockedN, payments])

  // useScrollRestore 와 usePullToRefresh 가 같은 div 를 가리키도록 ref 병합
  const mergedRef = useCallback((node) => {
    scrollRef.current = node
    ptr.containerRef.current = node
  }, [scrollRef, ptr.containerRef])

  // 기업 초대 수락 여부
  const [bizInviteAccepted] = useState(
    () => sessionStorage.getItem('bizInviteAccepted') === 'true'
  )
  const [transitioning, setTransitioning] = useState(false)

  // 기업 계정으로 전환 (애니메이션 포함)
  const handleSwitchToBusiness = () => {
    const role = sessionStorage.getItem('bizInviteRole') || 'accounting'
    setTransitioning(true)
    setTimeout(() => {
      login('business')                         // Context + sessionStorage 동시 업데이트
      sessionStorage.setItem('bizRole', role)
      navigate('/home-business')
    }, 750)
  }

  return (
    <PhoneShell>
      {/* ── 고정 헤더 (스크롤되지 않음) ── */}
      <GradientHeader paddingBottom="16px">
        <ProfileBadge
          icon={<PersonalEmoji />}
          accent="PERSONAL"
          name={userName}
          sub={null}
          onIconClick={bizInviteAccepted ? handleSwitchToBusiness : undefined}
          iconBadge={bizInviteAccepted}
          action={
            blockedCount > 0 ? (
              <button onClick={() => navigate('/payment-alerts')} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 11px', background:'rgba(239,68,68,0.25)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#EF4444' }} />
                <span style={{ fontSize:'11px', fontWeight:700, color:'#FCA5A5' }}>
                  이상 {blockedCount}건
                </span>
              </button>
            ) : null
          }
        />
        <BalanceCard
          label="출금 가능 잔액"
          amount={balance != null ? Number(balance).toLocaleString('ko-KR') : '1,250,000'}
          onClick={() => navigate('/wallet')}
          sub={
            <span style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#34D399', display:'inline-block' }} />
              {permissionWallets.length > 0 ? (
                <>
                  받은 자금 <strong style={{ color:'#fff', fontWeight:600 }}>
                    {permissionTotal.toLocaleString('ko-KR')}원
                  </strong>
                  <span style={{ color:'rgba(255,255,255,0.55)', marginLeft:'4px' }}>
                    ({permissionWallets.length}개 지갑)
                  </span>
                </>
              ) : (
                <>받은 자금 <strong style={{ color:'#fff', fontWeight:600 }}>0원</strong></>
              )}
            </span>
          }
          secondary={
            <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', color:'#34D399', fontWeight:600 }}>
              <TrendIcon /> +3.2%
            </span>
          }
          action={
            <button style={{ background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          }
        />
        <div style={{ display:'flex', justifyContent:'space-around', padding:'14px 24px 4px' }}>
          <CircleAction icon={<PlusIcon />} label="충전" onClick={() => navigate('/charge')} />
          <CircleAction icon={<ZapIcon />} label="지급집행" active onClick={() => navigate('/execute')} />
          <CircleAction icon={<CardIcon />} label="카드결제" onClick={() => navigate('/card-payment')} />
          <CircleAction icon={<ArrowIcon />} label="출금" onClick={() => navigate('/withdraw')} />
        </div>
      </GradientHeader>

      {/* ── 스크롤 본문 + Pull-to-Refresh ── */}
      <div ref={mergedRef} style={{
        flex:1, overflowY:'auto', position:'relative',
        overscrollBehavior:'contain',
      }}>
        {ptr.indicator}
        <div style={ptr.contentStyle}>

        {/* ── 콘텐츠 ── */}
        {/* p-pulse-ring / p-badge-beat 키프레임은 index.css 에 전역 선언됨
            여기서 <style> 재정의하면 매 렌더마다 리셋되어 끊겨 보임 */}
        <div style={{ padding:'14px 14px 100px', display:'flex', flexDirection:'column', gap:'10px', background:'#F4F5F7' }}>

          {/* ── 1. 처리 필요 항목 ── */}
          <div style={{ ...CARD_STYLE, border: pending.some(p=>p.urgent) ? '1px solid #FECACA' : '1px solid #E9EAEC' }}>
            <button onClick={() => setTodoExpanded(v => {
                const next = !v
                sessionStorage.setItem('home_todo_expanded', String(next))
                return next
              })}
              style={{ width:'100%', padding:'14px 16px', background:'transparent', border:'none',
                borderBottom: todoExpanded ? '1px solid #FEE2E2' : 'none',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.8px', marginBottom:'3px',
                  color: pending.some(p=>p.urgent) ? '#EF4444' : '#9CA3AF' }}>
                  {pending.some(p=>p.urgent) ? '⚠ 긴급' : 'TODAY'}
                </div>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>처리 필요 항목</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {pending.length > 0 && (
                  <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div className="p-pulse-ring" style={{ position:'absolute', width:'100%', height:'100%', borderRadius:'20px', background:'#EF4444', pointerEvents:'none' }} />
                    <span className="p-badge-beat" style={{ position:'relative', fontSize:'12px', fontWeight:800, color:'#fff', background:'#EF4444', padding:'3px 12px', borderRadius:'20px' }}>
                      {pending.length}건
                    </span>
                  </div>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: todoExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>
            {todoExpanded && pending.map((item, i) => {
              const cs = CATEGORY_STYLE[item.category] || { bg:'#F3F4F6', color:'#374151', border:'#E5E7EB', dot:'#9CA3AF' }
              return (
                <button key={item.id}
                  onClick={() => {
                    // 우선순위: 메시지 스레드 → 거래 상세 → 결제 알림 목록
                    if (item.threadId) {
                      navigate(`/chat/${item.threadId}`)
                    } else if (item._payoutId) {
                      navigate(`/transactions/${item._payoutId}`)
                    } else {
                      navigate('/payment-alerts')
                    }
                  }}
                  style={{ width:'100%', padding:'12px 16px', background:'transparent', border:'none',
                    borderTop: i===0 ? 'none' : '1px solid #F0F1F3',
                    display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                  {/* 아바타 */}
                  <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                    background: item.avatarBg || '#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'15px', fontWeight:700, color: item.avatarFg || '#374151' }}>
                    {item.fromInitial}
                  </div>
                  {/* 텍스트 */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'13px', fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.from}</span>
                      <span style={{ fontSize:'10px', fontWeight:700, color: cs.color, background: cs.bg,
                        border:`1px solid ${cs.border}`, padding:'1px 6px', borderRadius:'6px', flexShrink:0 }}>
                        {item.category}
                      </span>
                    </div>
                    <div style={{ fontSize:'11px', color:'#6B7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.desc}
                    </div>
                  </div>
                  {/* 금액 */}
                  {item.amount && (
                    <span style={{ fontSize:'13px', fontWeight:700, color: item.urgent ? '#DC2626' : '#111827', flexShrink:0 }}>
                      {item.amount}
                    </span>
                  )}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )
            })}
          </div>

          {/* ── 2. 실시간 결제 ── */}
          <div style={CARD_STYLE}>
            <SectionHeader eyebrow="LIVE" title="실시간 결제" actionLabel="전체 보기" onAction={() => navigate('/payment-alerts')} />
            {payments.map((p, i) => {
              const isBlocked = p.status === 'blocked'
              const isExternal = p.type === 'external'
              const dotColor = isBlocked ? '#EF4444' : '#D1D5DB'
              const amountText = isBlocked ? 'MCC 차단' : `-${fmt(p.amount)}원`
              const amountColor = isBlocked ? '#DC2626' : '#111827'
              return (
                <button key={p.id} onClick={() => navigate('/payments/' + p.id)}
                  style={{ width:'100%', padding:'12px 16px', background:'transparent', border:'none',
                    borderTop: i===0 ? 'none' : '1px solid #F0F1F3',
                    display:'flex', alignItems:'center', gap:'10px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', flexShrink:0, background: dotColor }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px', marginBottom:'4px' }}>
                      <span style={{ fontSize:'13px', fontWeight:600, color: isBlocked ? '#DC2626' : '#111827',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                        {p.merchant}
                      </span>
                      <span style={{ fontSize:'13px', fontWeight:700, color: amountColor, flexShrink:0 }}>{amountText}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                      {isExternal && p.user && (
                        <>
                          <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark, flexShrink:0 }}>{p.user}</span>
                          <span style={{ fontSize:'11px', color:'#D1D5DB' }}>·</span>
                        </>
                      )}
                      <span style={{ fontSize:'11px', color:'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.sub}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── 3. 집행 상황 ── */}
          <div style={CARD_STYLE}>
            <SectionHeader eyebrow="IN PROGRESS" title="집행 상황" actionLabel="집행 통계" onAction={() => navigate('/stats')} />
            {executing.length === 0 ? (
              <div style={{ padding:'28px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7 }}>
                  현재 권한 자금 집행 내역이 없습니다.
                </div>
              </div>
            ) : executing.map((item, i) => {
              const pct = Math.round(item.current / item.total * 100)
              return (
                <button key={item.id} onClick={() => navigate('/control-center/recipient/' + item.recipientId)}
                  style={{ width:'100%', padding:'13px 16px', background:'transparent', border:'none',
                    borderTop: i===0 ? 'none' : '1px solid #F0F1F3',
                    display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: theme.brandDark+'12',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'13px', fontWeight:800, color: theme.brandDark, flexShrink:0 }}>
                    {item.name[0]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                      <span style={{ fontSize:'13px', fontWeight:600, color:'#111827' }}>{item.name}</span>
                      <span style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{(item.current/10000).toFixed(0)}만원</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontSize:'11px', color:'#6B7280' }}>{item.type}</span>
                      <span style={{ fontSize:'10px', color:'#9CA3AF' }}>{pct}% 소진</span>
                    </div>
                    <div style={{ height:'3px', borderRadius:'2px', background:'#F3F4F6' }}>
                      <div style={{ width:pct+'%', height:'100%', background: theme.activeBtnGrad || theme.brandDark, borderRadius:'2px' }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

        </div>
        </div>
      </div>
      <BottomTab />
      <AccountTransition
        visible={transitioning}
        message="기업 모드로 전환되었습니다."
        gradient="linear-gradient(160deg, #1E3A5F 0%, #0F2035 50%, #0A1628 100%)"
      />
    </PhoneShell>
  )
}
