import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell, GradientHeader, ProfileBadge, BalanceCard, CircleAction } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import BottomTab from '../components/BottomTab'
import {
  getActivityFeed,
  seedDemoTransactions,
  formatRelativeTime,
} from '../shared/transactionStore'
import { useStoreData } from '../hooks/useStoreData'

// ─── 데이터 ──────────────────────────────────────────────
const COMPANY = {
  name: '㈜주다컴퍼니',
  month: '2026년 5월',
  budget: 120000000,
  spent:   72400000,
  balance:  87420000,
}

const ALERTS = [
  { id: 'a1', type: 'risk',    text: '㈜오로라 · MCC 차단 결제 감지',   sub: '강남 룸살롱 89,000원 · 23:41', time: '방금' },
  { id: 'a2', type: 'warning', text: '박민준 · 소명 미완료 3일 경과',     sub: '1,800,000원 집행 건',          time: '2시간 전' },
  { id: 'a3', type: 'info',    text: '이번 달 예산 60% 소진',             sub: '72,400,000원 / 120,000,000원', time: '오늘' },
]

const CARDS = [
  { id: 'c1', name: '법인카드 A (운영비)',  used: 3200000, limit: 5000000, last4: '4521', color: '#0EA5E9' },
  { id: 'c2', name: '법인카드 B (마케팅)', used: 1850000, limit: 3000000, last4: '8834', color: '#6366F1' },
  { id: 'c3', name: '임직원 카드 (복지)',   used: 420000,  limit: 1000000, last4: '1102', color: '#10B981' },
]

const RECENT_LOGS = [
  { id: 'l1', name: '강남 사무실 임대료', meta: '오늘 09:00 · 운영비',           amount: -5800000, type: 'normal' },
  { id: 'l2', name: 'AWS 클라우드',       meta: '어제 15:22 · 운영비',           amount: -847000,  type: 'normal' },
  { id: 'l3', name: 'GS강남게임센터',     meta: '4.28 · ㈜오로라 · MCC 차단',   amount: null,     type: 'blocked' },
]

// 프로젝트 단계 항목 (store와 별개로 표시되는 활동)
const PROJECT_ITEMS = [
  { id: 'p1', icon: '🚀', text: 'PG 인프라 구축 · 준비 단계', time: '3일 전', isProject: true, auto: false },
]

const EXECUTING = [
  { id: 'e1', name: '㈜오로라',  type: '외주비',   current: 3200000,  total: 5000000,  color: '#0EA5E9', recipientId: 'aurora' },
  { id: 'e2', name: '박민준',    type: '빌려주기', current: 1800000,  total: 1800000,  color: '#F59E0B', recipientId: 'park' },
  { id: 'e3', name: '서울시청',  type: '자금지원', current: 1500000,  total: 3000000,  color: '#10B981', recipientId: 'seoul' },
]

// ─── 메인 ─────────────────────────────────────────────────
export default function HomeBusiness() {
  const BIZ = getAccountTheme('business')
  const navigate = useNavigate()

  // 마운트 시 데모 시드 (이미 시드됐으면 무시 — 멱등)
  useEffect(() => {
    seedDemoTransactions()
  }, [])

  // store에서 활동 피드 구독 (자동 리렌더) — 5개만
  const txActivities = useStoreData(
    () => getActivityFeed({ userId: 'biz_juda', limit: 5 })
  )

  // 표시할 활동 목록: store 활동 최대 4개 + 프로젝트 1개 고정 (총 5개)
  const ACTIVITY_FEED = [
    ...txActivities.slice(0, 4).map(a => ({
      id: a.id,
      icon: a.icon,
      text: a.text,
      time: formatRelativeTime(a.createdAt),
      isProject: false,
      auto: true,
    })),
    ...PROJECT_ITEMS.slice(0, 1),
  ].slice(0, 5)

  const riskCount = ALERTS.filter(a => a.type === 'risk').length
  const warningCount = ALERTS.filter(a => a.type === 'warning').length
  const [showWalletSheet, setShowWalletSheet] = useState(false)
  const [selectedWalletId, setSelectedWalletId] = useState('corp')

  const BIZ_WALLETS = [
    { id:'corp', label:'법인 자금', sub:'제한 없음', amount:47820000, dotColor:'#9CA3AF' },
    { id:'ops',  label:'운영비 지갑', sub:'임대료·구독료 전용', amount:12300000, dotColor:'#0EA5E9' },
    { id:'mkt',  label:'마케팅 지갑', sub:'광고·홍보 전용', amount:5000000, dotColor:'#F59E0B' },
  ]
  const activeWallet = BIZ_WALLETS.find(w => w.id === selectedWalletId) || BIZ_WALLETS[0]

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* ── 헤더 — 개인 홈과 동일 구조, 기업 네이비 색상 ── */}
          <GradientHeader paddingBottom="16px" bg={BIZ.headerGrad}>

            {/* ProfileBadge: 회사명 + BUSINESS 뱃지 */}
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
              action={
                (riskCount > 0 || warningCount > 0) ? (
                  <button onClick={() => navigate('/payment-alerts')} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 10px', background:'rgba(239,68,68,0.25)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#EF4444' }} />
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#FCA5A5' }}>이상 {riskCount + warningCount}건</span>
                  </button>
                ) : null
              }
            />

            {/* BalanceCard: 총 운용 가능 금액 */}
            <BalanceCard
              label="총 운용 가능 금액"
              amount={COMPANY.balance.toLocaleString()}
              onClick={() => navigate('/wallet')}
              sub={
                <span style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#34D399', display:'inline-block' }} />
                  지원 받은 금액 <strong style={{ color:'#fff', fontWeight:600 }}>3,200만원</strong>
                </span>
              }
              secondary={
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', color:'#34D399', fontWeight:600 }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 10 L6 6 L8 8 L12 4" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><polyline points="9 4 12 4 12 7" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  +8.4%
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
              <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} label="충전" onClick={() => navigate('/charge')} />
              <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>} label="집행" active onClick={() => navigate('/execute')} />
              <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>} label="카드" onClick={() => navigate('/card-payment')} />
              <CircleAction icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>} label="출금" onClick={() => navigate('/withdraw')} />
            </div>

          </GradientHeader>          {/* ── 콘텐츠 ── */}
          <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* 결제 우선 순위 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, padding: '16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>결제 우선 순위</span>
                <button onClick={() => navigate('/wallet')} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>전체 보기 ›</button>
              </div>
              <div style={{ background: COLORS.bg, borderRadius: RADIUS.md, padding:'11px 13px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4, flexShrink:0 }}>출금 지갑</span>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: activeWallet.dotColor, flexShrink:0 }} />
                <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{activeWallet.label}</span>
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, flexShrink:0 }}>{activeWallet.amount.toLocaleString()}원</span>
                <button onClick={() => setShowWalletSheet(true)} style={{ flexShrink:0, padding:'5px 10px', background:`${BIZ.brandDark}12`, color: BIZ.brandDark, border:`1px solid ${BIZ.brandDark}25`, borderRadius:'999px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>변경</button>
              </div>
            </div>

            {/* 실시간 운영 활동 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>실시간 운영 활동</span>
                <button onClick={() => navigate('/company-profile')} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'2px' }}>
                  프로필 보기
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BIZ.brandDark} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {ACTIVITY_FEED.map((item, i) => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 16px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: BIZ.brandDark+'12', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.text}</div>
                    <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px' }}>{item.time}</div>
                  </div>
                  {item.isProject && (
                    <button onClick={() => navigate('/company-profile')} style={{ padding:'5px 11px', background: BIZ.brandDark+'12', border:'none', borderRadius:'8px', fontSize:'11px', fontWeight:700, color: BIZ.brandDark, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      단계 변경
                    </button>
                  )}
                </div>
              ))}
              <div style={{ padding:'12px 16px', borderTop:`1px solid ${COLORS.borderSoft}`, display:'flex', gap:'8px' }}>
                <button onClick={() => navigate('/company-profile')} style={{ flex:1, padding:'11px', background: BIZ.activeBtnGrad, border:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', cursor:'pointer', fontFamily:'inherit', boxShadow: BIZ.activeShadow }}>
                  <span style={{ fontSize:'15px' }}>📁</span>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>프로젝트 단계 변경</span>
                </button>
                <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'0 12px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'10px', flexShrink:0 }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10B981' }} />
                  <span style={{ fontSize:'11px', fontWeight:700, color:'#047857', whiteSpace:'nowrap' }}>활동 정상 · 공개중</span>
                </div>
              </div>
            </div>

            {/* 법인카드 현황 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>법인카드 현황</span>
                <button onClick={() => navigate('/card-payment')} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>관리 ›</button>
              </div>
              {CARDS.map((card, i) => {
                const pct = Math.round(card.used / card.limit * 100)
                return (
                  <div key={card.id} style={{ marginBottom: i < CARDS.length-1 ? '14px' : 0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ width:'9px', height:'9px', borderRadius:'3px', background: card.color, flexShrink:0 }} />
                        <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{card.name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{(card.used/10000).toFixed(0)}만원</span>
                        <span style={{ fontSize:'11px', color: COLORS.t4 }}>/ {(card.limit/10000).toFixed(0)}만원</span>
                        <span style={{ fontSize:'11px', fontWeight:700, color: pct>=80?'#EF4444':pct>=60?'#F59E0B':'#10B981', minWidth:'28px', textAlign:'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height:'5px', borderRadius:'3px', background: COLORS.bgMuted, overflow:'hidden' }}>
                      <div style={{ width:pct+'%', height:'100%', background: pct>=80?'#EF4444':pct>=60?'#F59E0B':card.color, borderRadius:'3px', transition:'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 집행 중인 자금 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>집행 중인 자금</span>
                <button onClick={() => navigate('/stats')} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>분석 ›</button>
              </div>
              {EXECUTING.map((item, i) => {
                const pct = Math.round(item.current / item.total * 100)
                return (
                  <button key={item.id} onClick={() => navigate('/control-center/recipient/'+item.recipientId)} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:'11px 0', borderTop: i===0?'none':`1px solid ${COLORS.borderSoft}`, display:'flex', alignItems:'center', gap:'12px', textAlign:'left' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'11px', background: BIZ.brandDark+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:800, color: BIZ.brandDark, flexShrink:0 }}>
                      {item.name[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{item.name}</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{(item.current/10000).toFixed(0)}만원</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                        <span style={{ fontSize:'11px', color: COLORS.t3 }}>{item.type}</span>
                        <span style={{ fontSize:'11px', color: COLORS.t4 }}>{pct}% 소진</span>
                      </div>
                      <div style={{ height:'4px', borderRadius:'2px', background: COLORS.bgMuted, overflow:'hidden' }}>
                        <div style={{ width:pct+'%', height:'100%', background: BIZ.activeBtnGrad, borderRadius:'2px' }} />
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )
              })}
            </div>

            {/* 내 결제 알림 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>내 결제 알림</span>
                <button onClick={() => navigate('/payment-alerts')} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>전체 보기 ›</button>
              </div>
              {[
                { id:'b1', name:'강남 사무실 임대료', meta:'오늘 09:00 · 법인 자금', amount:-5800000, status:'normal' },
                { id:'b2', name:'AWS 클라우드',       meta:'어제 15:22 · 법인 자금', amount:-847000,  status:'normal' },
                { id:'b3', name:'GS강남게임센터',      meta:'4.28 · MCC 차단',        amount:0,        status:'blocked' },
              ].map((p, i) => {
                const blocked = p.status === 'blocked'
                return (
                  <div key={p.id} onClick={() => !blocked && navigate('/payments/'+p.id)} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderTop:`1px solid ${COLORS.borderSoft}`, cursor: blocked?'default':'pointer', background: blocked?'#FFF5F5':'transparent' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: blocked?'#FEE2E2':COLORS.bgMuted, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {blocked
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>
                      }
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color: blocked?'#DC2626':COLORS.t1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'2px' }}>{p.name}</div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>{p.meta}</div>
                    </div>
                    {blocked
                      ? <span style={{ padding:'3px 9px', borderRadius:'8px', background:'#FEE2E2', color:'#DC2626', fontSize:'11px', fontWeight:700, flexShrink:0 }}>차단</span>
                      : <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, flexShrink:0 }}>{p.amount.toLocaleString()}원</span>
                    }
                  </div>
                )
              })}
            </div>

            {/* 상대방 결제 알림 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>상대방 결제 알림</span>
                <button onClick={() => navigate('/payment-alerts#other')} style={{ fontSize:'12px', fontWeight:600, color: BIZ.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>전체 보기 ›</button>
              </div>
              {[
                { id:'o1', name:'박민준',  category:'카페',    amount:4500,  meta:'방금 · 외주비 지갑', status:'normal'  },
                { id:'o2', name:'㈜오로라', category:'사무용품', amount:89000, meta:'어제 · 투자 자금',  status:'normal'  },
                { id:'o3', name:'㈜오로라', category:'카지노',  amount:89000, meta:'4.29 · 투자 자금',  status:'blocked' },
              ].map((p, i) => {
                const blocked = p.status === 'blocked'
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderTop:`1px solid ${COLORS.borderSoft}`, background: blocked?'#FFF5F5':'transparent' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: blocked?'#FEE2E2':`${BIZ.brandDark}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color: blocked?'#DC2626':BIZ.brandDark, flexShrink:0 }}>
                      {p.name[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color: blocked?'#DC2626':COLORS.t1 }}>{p.name}</span>
                        <span style={{ fontSize:'11px', color: blocked?'#DC2626':COLORS.t3, background: blocked?'#FEE2E2':COLORS.bgMuted, padding:'1px 6px', borderRadius:'4px', fontWeight:500 }}>
                          {blocked?'🚫 ':''}{p.category}
                        </span>
                      </div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>{p.meta}</div>
                    </div>
                    {blocked
                      ? <span style={{ padding:'3px 9px', borderRadius:'8px', background:'#FEE2E2', color:'#DC2626', fontSize:'11px', fontWeight:700, flexShrink:0 }}>차단</span>
                      : <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, flexShrink:0 }}>{p.amount.toLocaleString()}원</span>
                    }
                  </div>
                )
              })}
              <div style={{ padding:'8px 16px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                <div style={{ fontSize:'11px', color: COLORS.t5, textAlign:'center' }}>🔒 상대방의 정확한 가맹점명은 보호됩니다 (단계형 공개 정책)</div>
              </div>
            </div>

          </div>
        </div>

        <BottomTab />

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
                    <button key={w.id} onClick={() => { setSelectedWalletId(w.id); setShowWalletSheet(false) }} style={{ width:'100%', padding:'14px 16px', background: isSel?`${BIZ.brandDark}10`:'transparent', border:'none', borderBottom: i<arr.length-1?`1px solid ${COLORS.borderSoft}`:'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
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
              <button onClick={() => setShowWalletSheet(false)} style={{ width:'100%', height:'48px', background: COLORS.bgMuted, color: COLORS.t2, border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>닫기</button>
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  )
}
