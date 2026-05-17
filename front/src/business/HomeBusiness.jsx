import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { PhoneShell, GradientHeader, ProfileBadge, BalanceCard, CircleAction, AccountTransition } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import BottomTab from '../components/BottomTab'
import {
  getActivityFeed,
  seedDemoTransactions,
  formatRelativeTime,
} from '../shared/transactionStore'
import { useStoreData } from '../hooks/useStoreData'
import { useNoSwipeBack } from '../hooks/useNoSwipeBack'

// ─── 데이터 ──────────────────────────────────────────────
const COMPANY = {
  name: '㈜주다컴퍼니',
  month: '2026년 5월',
  budget: 120000000,
  spent:   72400000,
  balance:  87420000,
}

// 1. 처리 필요 항목 — count: 0이면 자동 미노출
const TODO_ITEMS = [
  { id: 't1', text: '내부 검토',    count: 3, urgent: true,  route: '/approval-center', state: { reqDir: 'outgoing' }, icon: '📤' },
  { id: 't2', text: '받은 요청',    count: 2, urgent: false, route: '/approval-center', state: { reqDir: 'incoming' }, icon: '📥' },
  { id: 't3', text: '지급 실패',    count: 1, urgent: true,  route: '/payment-alerts',  state: null, icon: '⚠️' },
  { id: 't4', text: '미분류 결제',  count: 2, urgent: false, route: '/payment-alerts',  state: null, icon: '🏷️' },
  { id: 't5', text: '잔액 부족 위험', count: 1, urgent: true, route: '/wallet',          state: null, icon: '💸' },
].filter(t => t.count > 0)  // 0건은 자동 제외

// 2. 진행 중인 자금 집행
const EXECUTING = [
  { id: 'e1', name: '㈜오로라', type: '외주비',   current: 3200000, total: 5000000, color: '#0EA5E9', recipientId: 'aurora', status: '진행중',  statusColor: '#2563EB', statusBg: '#EFF6FF' },
  { id: 'e2', name: '박민준',   type: '빌려주기', current: 1800000, total: 1800000, color: '#F59E0B', recipientId: 'park',   status: '소명대기', statusColor: '#D97706', statusBg: '#FFFBEB' },
  { id: 'e3', name: '서울시청', type: '자금지원', current: 1500000, total: 3000000, color: '#10B981', recipientId: 'seoul',  status: '진행중',  statusColor: '#2563EB', statusBg: '#EFF6FF' },
  // 미납중 테스트용: 주석 해제 시 하단 배지가 경고 상태로 전환됨
  // { id: 'e4', name: '강남 임대료', type: '자동지출', current: 0, total: 5800000, color: '#EF4444', recipientId: 'rent', status: '미납중', statusColor: '#DC2626', statusBg: '#FEF2F2' },
]

// 3. 운영 활동 피드 — 프로젝트 고정 아이템 (항상 마지막에 노출)
const PROJECT_ITEMS = [
  { id: 'p1', icon: '🚀', text: 'PG 인프라 구축 · 준비 단계', time: '3일 전', isProject: true, auto: false },
]

// 6. 최근 알림
const RECENT_ALERTS = [
  { id: 'a1', name: '㈜오로라',      sub: 'MCC 차단 발생 · 방금 · 투자 자금',       type: 'risk',    amount: null },
  { id: 'a2', name: '강남 임대료',   sub: '자동 지급 완료 · 오늘 09:00 · 법인 자금', type: 'done',    amount: -5800000 },
  { id: 'a3', name: 'GS강남게임센터', sub: 'MCC 차단 · 4.28 · 주 카드',             type: 'blocked', amount: null },
]


// ─── 공통 카드 스타일 ────────────────────────────────────────
const CARD_STYLE = {
  background: '#FFFFFF',
  borderRadius: '14px',
  border: '1px solid #E9EAEC',
  overflow: 'hidden',
}

// ─── 섹션 헤더 공통 ────────────────────────────────────────
function SectionHeader({ eyebrow, title, actionLabel, onAction }) {
  const BIZ = getAccountTheme('business')
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid #F0F1F3' }}>
      <div>
        {eyebrow && <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.8px', marginBottom:'3px' }}>{eyebrow}</div>}
        <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{title}</div>
      </div>
      {actionLabel && (
        <button onClick={onAction} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          {actionLabel} ›
        </button>
      )}
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function HomeBusiness() {
  useNoSwipeBack()
  const BIZ = getAccountTheme('business')
  const navigate = useNavigate()
  const { login } = useUser()
  const scrollRef = useScrollRestore()

  useEffect(() => { seedDemoTransactions() }, [])

  // store에서 자금 집행/수신 활동 피드 구독 (최대 3개) — 마지막은 프로젝트 아이템으로 고정
  const txActivities = useStoreData(
    () => getActivityFeed({ userId: 'biz_juda', limit: 3 })
  )
  const ACTIVITY_FEED = [
    ...txActivities.slice(0, 3).map(a => ({
      id: a.id,
      icon: a.icon,
      text: a.text,
      time: formatRelativeTime(a.createdAt),
      isProject: false,
      auto: true,
    })),
    ...PROJECT_ITEMS.slice(0, 1),
  ].slice(0, 4)

  const urgentTotal  = TODO_ITEMS.reduce((s,t)=>s+t.count, 0)

  // 자동 지출 중 미납 건 감지 (자동납부 항목 중 status가 '미납중'인 경우)
  const hasUnpaid = EXECUTING.some(e => e.status === '미납중')

  // [권한] 역할별 버튼 제한
  // staff: 집행·충전·출금 불가
  // viewer: 집행·충전·출금 모두 불가
  // manager: 집행 불가 (충전·출금은 가능)
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canExecute  = !['viewer', 'manager', 'staff'].includes(bizRole)
  const canWithdraw = !['viewer', 'staff'].includes(bizRole)
  const canCharge   = !['viewer', 'staff'].includes(bizRole)

  // 계정 전환 애니메이션
  const [transitioning, setTransitioning] = useState(false)
  const handleSwitchToPersonal = () => {
    setTransitioning(true)
    setTimeout(() => {
      login('personal')                    // Context + sessionStorage 동시 업데이트
      sessionStorage.removeItem('bizRole')
      navigate('/home')
    }, 750)
  }

  const [todoExpanded, setTodoExpanded] = useState(false)
  const [showWalletSheet, setShowWalletSheet] = useState(false)
  const [selectedWalletId, setSelectedWalletId] = useState('corp')

  const BIZ_WALLETS = [
    { id:'corp', label:'법인 자금',    sub:'제한 없음',         amount:47820000, dotColor:'#9CA3AF' },
    { id:'ops',  label:'운영비 지갑',  sub:'임대료·구독료 전용', amount:12300000, dotColor:'#0EA5E9' },
    { id:'mkt',  label:'마케팅 지갑',  sub:'광고·홍보 전용',    amount:5000000,  dotColor:'#F59E0B' },
  ]
  const activeWallet = BIZ_WALLETS.find(w => w.id === selectedWalletId) || BIZ_WALLETS[0]

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>

          {/* ── 헤더 (기존 유지) ── */}
          <GradientHeader paddingBottom="16px" bg={BIZ.headerGrad}>
            <ProfileBadge
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              }
              accent="BUSINESS"
              name={COMPANY.name}
              sub={COMPANY.month}
              onIconClick={handleSwitchToPersonal}
              action={
                urgentTotal > 0 ? (
                  <button onClick={() => navigate('/payment-alerts')} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 10px', background:'rgba(239,68,68,0.25)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#EF4444' }} />
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#FCA5A5' }}>처리 필요 {urgentTotal}건</span>
                  </button>
                ) : null
              }
            />
            <BalanceCard
              label="총 운용 가능 금액"
              amount={COMPANY.balance.toLocaleString()}
              onClick={() => navigate('/wallet')}
              sub={
                <span style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#34D399', display:'inline-block' }} />
                  이번달 집행 <strong style={{ color:'#fff', fontWeight:600 }}>4,240만원</strong>
                </span>
              }
              secondary={
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', color:'#34D399', fontWeight:600 }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 10 L6 6 L8 8 L12 4" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><polyline points="9 4 12 4 12 7" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  예산 35% 잔여
                </span>
              }
              action={
                <button style={{ background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', padding:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              }
            />
            {/* 4개 액션 버튼 */}
            <div style={{ display:'flex', justifyContent:'space-around', padding:'14px 24px 4px' }}>
              <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} label="충전" onClick={canCharge ? () => navigate('/charge') : undefined}
                locked={!canCharge} />
              {canExecute ? (
                <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>} label="집행" active onClick={() => navigate('/execute')} />
              ) : (
                <div style={{ padding:'4px', display:'flex', flexDirection:'column', alignItems:'center', gap:'7px', opacity:0.4, cursor:'not-allowed' }}>
                  <div style={{ width:'54px', height:'54px', borderRadius:'14px', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.9)', fontWeight:500 }}>집행</span>
                </div>
              )}
              <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>} label="카드" onClick={() => navigate('/card-payment')} />
              {canWithdraw ? (
                <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>} label="출금" onClick={() => navigate('/withdraw')} />
              ) : (
                <div style={{ padding:'4px', display:'flex', flexDirection:'column', alignItems:'center', gap:'7px', opacity:0.4, cursor:'not-allowed' }}>
                  <div style={{ width:'54px', height:'54px', borderRadius:'14px', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.9)', fontWeight:500 }}>출금</span>
                </div>
              )}
            </div>
          </GradientHeader>

          {/* ── 콘텐츠 ── */}
          <div style={{ padding:'14px 14px 36px', display:'flex', flexDirection:'column', gap:'10px', background:'#F4F5F7' }}>

            {/* ─── 1. 처리 필요 항목 ─── */}
            <style>{`
              @keyframes todo-pulse-ring {
                0%   { transform: scale(1);   opacity: 0.7; }
                70%  { transform: scale(1.9); opacity: 0; }
                100% { transform: scale(1.9); opacity: 0; }
              }
              @keyframes todo-badge-beat {
                0%, 100% { transform: scale(1); }
                30%       { transform: scale(1.12); }
                60%       { transform: scale(0.96); }
              }
              .todo-pulse-ring {
                animation: todo-pulse-ring 1.8s ease-out infinite;
              }
              .todo-badge-beat {
                animation: todo-badge-beat 1.8s ease-in-out infinite;
              }
            `}</style>
            <div style={{ ...CARD_STYLE, border: urgentTotal > 0 ? '1px solid #FECACA' : '1px solid #E9EAEC' }}>
              {/* 헤더 — 클릭으로 접기/펼치기 */}
              <button onClick={() => setTodoExpanded(v => !v)}
                style={{ width:'100%', padding:'14px 16px', background:'transparent', border:'none',
                  borderBottom: todoExpanded ? '1px solid #FEE2E2' : 'none',
                  display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:700, color: urgentTotal > 0 ? '#EF4444' : '#9CA3AF', letterSpacing:'0.8px', marginBottom:'3px' }}>
                    {urgentTotal > 0 ? '⚠ 긴급' : 'TODAY'}
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>처리 필요 항목</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {/* 펄스 링 + 뱃지 */}
                  {urgentTotal > 0 && (
                    <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {/* 퍼져나가는 링 */}
                      <div className="todo-pulse-ring" style={{
                        position:'absolute', width:'100%', height:'100%',
                        borderRadius:'20px', background:'#EF4444',
                        pointerEvents:'none',
                      }} />
                      {/* 뱃지 */}
                      <span className="todo-badge-beat" style={{
                        position:'relative',
                        fontSize:'12px', fontWeight:800, color:'#fff',
                        background:'#EF4444',
                        padding:'3px 12px', borderRadius:'20px',
                        letterSpacing:'0.3px',
                      }}>
                        {urgentTotal}건
                      </span>
                    </div>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: todoExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>
              {/* 펼쳐질 때만 노출 */}
              {todoExpanded && TODO_ITEMS.map((item, i) => (
                <button key={item.id} onClick={() => navigate(item.route, item.state ? { state: item.state } : {})}
                  style={{ width:'100%', padding:'12px 16px', background:'transparent', border:'none',
                    borderTop: i===0 ? 'none' : '1px solid #F0F1F3',
                    display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                  <span style={{ fontSize:'15px', flexShrink:0, lineHeight:1 }}>{item.icon || '•'}</span>
                  <span style={{ flex:1, fontSize:'13px', color:'#1F2937', fontWeight:500 }}>{item.text}</span>
                  <span style={{ fontSize:'13px', fontWeight:700,
                    color: item.urgent ? '#DC2626' : '#374151',
                    background: item.urgent ? '#FEF2F2' : '#F3F4F6',
                    padding:'2px 10px', borderRadius:'20px', minWidth:'28px', textAlign:'center' }}>
                    {item.count}
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>

            {/* ─── 2. 운영 활동 ─── */}
            <div style={CARD_STYLE}>
              <SectionHeader eyebrow="ACTIVITY" title="운영 활동" actionLabel="프로필 보기" onAction={() => navigate('/company-profile')} />
              {ACTIVITY_FEED.map((item, i) => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 16px',
                  borderTop: i===0 ? 'none' : '1px solid #F0F1F3' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                    background: BIZ.brandDark+'12',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>
                    {item.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#1F2937',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.text}
                    </div>
                    <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>{item.time}</div>
                  </div>
                  {item.isProject && (
                    <button onClick={() => navigate('/company-profile')}
                      style={{ padding:'5px 11px', background: BIZ.brandDark+'12', border:'none', borderRadius:'8px',
                        fontSize:'11px', fontWeight:700, color: BIZ.brandDark, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      단계 변경
                    </button>
                  )}
                </div>
              ))}
              {/* 하단 액션 바 */}
              <div style={{ padding:'10px 14px', borderTop:'1px solid #F0F1F3', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {/* 좌: 프로젝트 단계 변경 */}
                <button onClick={() => navigate('/company-profile')}
                  style={{ padding:'10px', background: BIZ.activeBtnGrad, border:'none', borderRadius:'10px',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                    cursor:'pointer', fontFamily:'inherit', boxShadow: BIZ.activeShadow }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#fff' }}>단계 변경</span>
                </button>
                {/* 우: 운영 상태 — 정상 or 잔액부족 */}
                {hasUnpaid ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', padding:'10px',
                    background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:'10px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#F97316', flexShrink:0 }} />
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#C2410C', whiteSpace:'nowrap', textAlign:'center', lineHeight:'1.3' }}>
                      미납중 · 공개중
                    </span>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', padding:'10px',
                    background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'10px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10B981', flexShrink:0 }} />
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#047857', whiteSpace:'nowrap' }}>활동 정상 · 공개중</span>
                  </div>
                )}
              </div>
            </div>

            {/* ─── 3. 실시간 결제 ─── */}
            <div style={CARD_STYLE}>
              <SectionHeader eyebrow="LIVE" title="실시간 결제" actionLabel="전체 보기" onAction={() => navigate('/payment-alerts')} />
              {RECENT_ALERTS.map((p, i) => {
                const isRisk = p.type === 'risk' || p.type === 'blocked'
                const isDone = p.type === 'done'
                return (
                  <button key={p.id} onClick={() => navigate('/payments/'+p.id)}
                    style={{ width:'100%', padding:'12px 16px', borderTop: i===0?'none':'1px solid #F0F1F3',
                      display:'flex', alignItems:'center', gap:'12px', background:'transparent', border:'none',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', flexShrink:0,
                      background: isRisk?'#EF4444': isDone?'#10B981':'#9CA3AF' }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color: isRisk?'#DC2626':'#1F2937',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.sub}</div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )
              })}
            </div>

            {/* ─── 4. 집행 상황 ─── */}
            <div style={CARD_STYLE}>
              <SectionHeader eyebrow="IN PROGRESS" title="집행 상황" actionLabel="집행 통계" onAction={() => navigate('/stats')} />
              {EXECUTING.length === 0 ? (
                <div style={{ padding:'28px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7 }}>
                    현재 진행 중인 자금 집행 내역이 없습니다.
                  </div>
                </div>
              ) : EXECUTING.map((item, i) => {
                const pct = Math.round(item.current / item.total * 100)
                return (
                  <button key={item.id} onClick={() => navigate('/control-center/recipient/'+item.recipientId)}
                    style={{ width:'100%', padding:'13px 16px', background:'transparent', border:'none',
                      borderTop: i===0?'none':'1px solid #F0F1F3',
                      display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: BIZ.brandDark+'12',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'13px', fontWeight:800, color: BIZ.brandDark, flexShrink:0 }}>
                      {item.name[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ fontSize:'13px', fontWeight:600, color:'#111827' }}>{item.name}</span>
                          <span style={{ padding:'1px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:600,
                            background: item.statusBg, color: item.statusColor }}>{item.status}</span>
                        </div>
                        <span style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{(item.current/10000).toFixed(0)}만원</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                        <span style={{ fontSize:'11px', color:'#6B7280' }}>{item.type}</span>
                        <span style={{ fontSize:'10px', color:'#9CA3AF' }}>{pct}% 소진</span>
                      </div>
                      <div style={{ height:'3px', borderRadius:'2px', background:'#F3F4F6', overflow:'hidden' }}>
                        <div style={{ width:pct+'%', height:'100%', background: BIZ.activeBtnGrad, borderRadius:'2px' }} />
                      </div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )
              })}
            </div>

          </div>
        </div>

        <BottomTab />
        <AccountTransition
          visible={transitioning}
          message="개인 모드로 전환되었습니다."
          gradient="linear-gradient(160deg,#1e1b4b 0%,#312e81 60%,#6366F1 100%)"
        />

        {/* 출금 지갑 변경 바텀시트 */}
        {showWalletSheet && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div style={{ background: COLORS.bgCard, borderRadius:`${RADIUS.lg} ${RADIUS.lg} 0 0`, padding:'20px 16px 32px' }}>
              <div style={{ width:'36px', height:'4px', background: COLORS.border, borderRadius:'2px', margin:'0 auto 18px' }} />
              <div style={{ fontSize:'16px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>출금 지갑 변경</div>
              <div style={{ fontSize:'12px', color: COLORS.t4, marginBottom:'16px' }}>카드 결제 시 차감되는 지갑을 선택하세요.</div>
              <div style={{ background: COLORS.bg, borderRadius: RADIUS.lg, overflow:'hidden', marginBottom:'16px' }}>
                {BIZ_WALLETS.map((w, i, arr) => {
                  const isSel = selectedWalletId === w.id
                  return (
                    <button key={w.id} onClick={() => { setSelectedWalletId(w.id); setShowWalletSheet(false) }}
                      style={{ width:'100%', padding:'14px 16px', background: isSel?'#fff':'transparent', border:'none', borderBottom: i<arr.length-1?`1px solid ${COLORS.borderSoft}`:'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                      <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: w.dotColor, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color: isSel?BIZ.brandDark:COLORS.t1, marginBottom:'2px' }}>{w.label}</div>
                        <div style={{ fontSize:'11px', color: COLORS.t4 }}>{w.sub}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'13px', fontWeight:700, color: isSel?BIZ.brandDark:COLORS.t1 }}>{w.amount.toLocaleString()}원</span>
                        {isSel && (
                          <div style={{ width:'18px', height:'18px', borderRadius:'50%', background: BIZ.brandDark, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 3.5 6.5 9 1"/></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setShowWalletSheet(false)} style={{ width:'100%', height:'48px', background: COLORS.bgMuted, color: COLORS.t2, border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
닫기
              </button>
            </div>
          </div>
        )}

      </div>
    </PhoneShell>
  )
}
