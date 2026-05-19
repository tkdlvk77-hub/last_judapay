import { useState, useEffect, useRef } from 'react'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import MccBlock, { DEFAULT_MCC } from './execute/MccBlock'
import { dialog } from '../components/Dialog'

function getUserType() {
  const s = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizType') : null
  if (s === 'business') return 'business'
  if (s === 'public')   return 'public'
  return 'personal'
}

// ─── 카드별 색상 팔레트 (순환 사용) ─────────────────────
const CARD_PALETTES = [
  { grad: 'linear-gradient(135deg,#0A1628 0%,#0F2035 40%,#1E3A5F 70%,#0A1628 100%)', glow:'rgba(30,90,160,0.45)', tint:'#EFF6FF', tintBorder:'#BFDBFE' },  // 네이비 (주 카드)
  { grad: 'linear-gradient(135deg,#0D2018 0%,#0F3020 40%,#1A4D30 70%,#0D2018 100%)', glow:'rgba(20,120,60,0.40)', tint:'#F0FDF4', tintBorder:'#BBF7D0' },  // 딥그린 (법인)
  { grad: 'linear-gradient(135deg,#1A0A28 0%,#2D1245 40%,#3D1A5E 70%,#1A0A28 100%)', glow:'rgba(100,50,180,0.45)', tint:'#F5F3FF', tintBorder:'#DDD6FE' },  // 퍼플 (임직원)
  { grad: 'linear-gradient(135deg,#1A1000 0%,#2D2000 40%,#4A3500 70%,#1A1000 100%)', glow:'rgba(160,110,0,0.40)',  tint:'#FFFBEB', tintBorder:'#FDE68A' },  // 골드 (여행)
  { grad: 'linear-gradient(135deg,#1A0A0A 0%,#2D1010 40%,#4A1A1A 70%,#1A0A0A 100%)', glow:'rgba(160,30,30,0.40)', tint:'#FEF2F2', tintBorder:'#FECACA' },  // 레드 (추가)
]

// ─────────────────────────────────────────────────────────
// 데모 카드 데이터
// ─────────────────────────────────────────────────────────
const INITIAL_CARDS = [
  {
    id: 'card_1',
    holder: '이호형',
    type: '마스터',
    number: '5234 7891 2345 0001',
    numberMasked: '5234 **** **** 0001',
    validThru: '05/31',
    cvc: '342',
    label: '주 카드',
    balance: 1932000,
  },
  {
    id: 'card_2',
    holder: '이호형',
    type: '마스터',
    number: '5234 7891 2345 0082',
    numberMasked: '5234 **** **** 0082',
    validThru: '05/31',
    cvc: '519',
    label: '여행용',
    balance: 450000,
  },
]

// 카드별 결제 내역
const CARD_PAYMENTS = {
  card_1: [
    { id:'p1', name:'이마트 역삼점',        meta:'5.5 14:32 · 서울시 교육비',  amount:-32000,  status:'normal',  month:5 },
    { id:'p2', name:'스타벅스',             meta:'5.5 09:15 · 엄마 용돈',      amount:-7500,   status:'normal',  month:5 },
    { id:'p3', name:'AWS 서버비 (자동)',     meta:'5.1 00:01 · MY 지갑',        amount:-408000, status:'normal',  month:5 },
    { id:'p4', name:'GS강남게임센터 (차단)', meta:'4.28 22:14 · MCC 7993 차단', amount:0,       status:'blocked', month:4 },
    { id:'p5', name:'올리브영',             meta:'4.27 16:44 · MY 지갑',       amount:-23000,  status:'normal',  month:4 },
  ],
  card_2: [
    { id:'p6', name:'인천공항 면세점',       meta:'5.1 10:22 · MY 지갑',        amount:-156000, status:'normal',  month:5 },
    { id:'p7', name:'Adobe CC (자동)',       meta:'5.1 00:01 · MY 지갑',        amount:-145200, status:'normal',  month:5 },
    { id:'p8', name:'싱가포르 Grab',         meta:'4.30 14:05 · MY 지갑',       amount:-18500,  status:'normal',  month:4 },
    { id:'p9', name:'카지노 (차단)',          meta:'4.29 23:11 · MCC 7011 차단', amount:0,       status:'blocked', month:4 },
  ],
}

// 카드별 이번 달 한도
const CARD_MONTHLY_LIMIT = {
  card_1: 3000000,
  card_2: 1000000,
}

const WALLET_PRIORITY = [
  { id:'edu', label:'서울시 · 4월 교육비', sub:'만료 D-3', amount:50000, dotColor:'#10B981',
    mccItems:[
      { id:'gambling', label:'유흥·도박',   block:true },
      { id:'crypto',   label:'암호화폐',    block:true },
      { id:'overseas', label:'해외 결제',   block:true },
      { id:'luxury',   label:'명품',        block:true },
      { id:'gaming',   label:'게임 아이템', block:true },
      { id:'dining',   label:'고급 음식점', block:true },
    ],
  },
  { id:'my', label:'MY 지갑', sub:'제한 없음', amount:932000, dotColor:'#9CA3AF',
    mccItems:[], // 본인 지갑 — 지갑 레이어 제한 없음
  },
]

function fmt(n) { return Number(n || 0).toLocaleString('ko-KR') }

// ─────────────────────────────────────────────────────────
// 카드 비주얼
// ─────────────────────────────────────────────────────────
function PhysicalCard({ card, paused, revealed, onDetailClick, palette }) {
  const theme = getAccountTheme()
  const cardGrad  = palette?.grad  || 'linear-gradient(135deg,#0A1628 0%,#0F2035 40%,#1E3A5F 70%,#0A1628 100%)'
  const glowColor = palette?.glow  || `${theme.brandDark}55`
  const shineColor = 'rgba(255,255,255,0.10)'

  return (
    <div style={{
      background: cardGrad,
      borderRadius: RADIUS.lg,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)`,
      minHeight: '196px',
      display: 'flex', flexDirection: 'column',
      opacity: paused ? 0.75 : 1,
      transition: 'background 0.4s ease, opacity 0.2s ease',
    }}>
      {/* 글로우 */}
      <div style={{ position:'absolute', top:'-40px', left:'-40px', width:'180px', height:'180px', background:`radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-60px', right:'-30px', width:'200px', height:'120px', background:`radial-gradient(ellipse, ${shineColor} 0%, transparent 70%)`, pointerEvents:'none' }} />
      {/* 사선 패턴 */}
      <div style={{ position:'absolute', inset:0, background:`repeating-linear-gradient(120deg, transparent 0px, transparent 18px, rgba(255,255,255,0.025) 18px, rgba(255,255,255,0.025) 19px)`, pointerEvents:'none' }} />

      {/* 헤더 */}
      <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'2px', textShadow:`0 0 10px ${theme.brand}50` }}>
            JUDA<span style={{ color: theme.brandLight || theme.brand, fontWeight:300 }}>PAY</span>
          </div>
          <div style={{ fontSize:'8px', color:`${theme.brandLight || theme.brand}99`, letterSpacing:'4px', marginTop:'2px', fontWeight:600 }}>
            {card.label.toUpperCase()}
          </div>
        </div>
        <span style={{
          padding:'4px 10px',
          background: paused ? 'rgba(252,211,77,0.20)' : 'rgba(52,211,153,0.20)',
          color: paused ? '#FCD34D' : '#34D399',
          border: `1px solid ${paused ? 'rgba(252,211,77,0.35)' : 'rgba(52,211,153,0.35)'}`,
          borderRadius: RADIUS.pill,
          fontSize:'10px', fontWeight:700,
        }}>
          {paused ? '일시정지' : '사용 가능'}
        </span>
      </div>

      {/* 명의 */}
      <div style={{ position:'relative', marginBottom:'12px' }}>
        <span style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{card.holder}</span>
        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', marginLeft:'6px' }}>({card.type})</span>
      </div>

      {/* 번호 */}
      <div style={{ position:'relative', fontSize:'16px', fontWeight:600, color:'#fff', letterSpacing:'2px', marginBottom:'16px', fontFamily:'monospace' }}>
        {revealed ? card.number : card.numberMasked}
      </div>

      {/* 하단 */}
      <div style={{ position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:'auto' }}>
        <div style={{ display:'flex', gap:'16px' }}>
          <div>
            <div style={{ fontSize:'8px', color:`${theme.brandLight || theme.brand}99`, letterSpacing:'1.5px', marginBottom:'2px', fontWeight:600 }}>VALID THRU</div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', fontFamily:'monospace' }}>{revealed ? card.validThru : '** / **'}</div>
          </div>
          <div>
            <div style={{ fontSize:'8px', color:`${theme.brandLight || theme.brand}99`, letterSpacing:'1.5px', marginBottom:'2px', fontWeight:600 }}>CVC</div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', fontFamily:'monospace' }}>{revealed ? card.cvc : '***'}</div>
          </div>
        </div>
        <button onClick={onDetailClick} style={{ background:'transparent', border:'none', color: theme.brandLight || theme.brand, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
          {revealed ? '숨기기' : '상세 보기 ›'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 액션 4버튼
// ─────────────────────────────────────────────────────────
function ActionGrid({ paused, onToggle, onQR, onIssue, onMCC, canSetMCC = false, isPersonal = false, canToggle = true, canQR = true, canIssue = true }) {
  const theme = getAccountTheme()
  const items = [
    {
      label: paused ? '재개' : '일시정지',
      locked: !canToggle,
      grad: !canToggle ? 'linear-gradient(135deg,#D1D5DB,#9CA3AF)' : paused ? 'linear-gradient(135deg,#9CA3AF,#6B7280)' : 'linear-gradient(135deg,#F97316,#EA580C)',
      icon: paused
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
      onClick: onToggle,
    },
    {
      label: isPersonal ? '결제하기' : 'QR 결제',
      locked: !canQR,
      grad: !canQR ? 'linear-gradient(135deg,#D1D5DB,#9CA3AF)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><line x1="14" y1="14" x2="20" y2="14"/><line x1="14" y1="20" x2="20" y2="20"/><line x1="14" y1="14" x2="14" y2="20"/><line x1="17" y1="17" x2="21" y2="17"/></svg>,
      onClick: onQR,
    },
    {
      label: isPersonal ? '카드발급' : '발급',
      locked: !canIssue,
      grad: !canIssue ? 'linear-gradient(135deg,#D1D5DB,#9CA3AF)' : `linear-gradient(135deg,${theme.brand},${theme.brandDark})`,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/><line x1="12" y1="15" x2="12" y2="18"/><line x1="10" y1="16.5" x2="14" y2="16.5"/></svg>,
      onClick: canIssue ? onIssue : null,
    },
    {
      label: isPersonal ? '보안설정' : 'MCC 설정',
      grad: canSetMCC ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#D1D5DB,#9CA3AF)',
      icon: canSetMCC
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
      onClick: canSetMCC ? onMCC : null,
      locked: !canSetMCC,
    },
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
      {items.map(item => (
        <button key={item.label} onClick={item.onClick} style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, border:'none', borderRadius: RADIUS.lg, padding:'12px 4px', display:'flex', flexDirection:'column', alignItems:'center', gap:'7px', cursor:'pointer', fontFamily:'inherit' }}>
          <div style={{ width:'52px', height:'52px', borderRadius:'14px', background: item.grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
            {item.icon}
          </div>
          <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t1 }}>{item.label}</div>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Face ID 모달
// ─────────────────────────────────────────────────────────
function FaceIDModal({ onSuccess, onCancel }) {
  const theme = getAccountTheme()
  const [stage, setStage] = useState('scanning')
  useEffect(() => {
    const t = setTimeout(() => { setStage('success'); setTimeout(onSuccess, 500) }, 1500)
    return () => clearTimeout(t)
  }, [onSuccess])
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'24px', backdropFilter:'blur(8px)' }}>
      <div style={{ width:'100%', background:'linear-gradient(135deg,#14142B 0%,#0A0A12 100%)', border:`1px solid ${theme.brandDark}35`, borderRadius: RADIUS.lg, padding:'32px 24px', textAlign:'center' }}>
        <div style={{ width:'88px', height:'88px', margin:'0 auto 16px', borderRadius:'24px', background: stage==='success'?'rgba(52,211,153,0.20)':`${theme.brandDark}20`, border:`2px solid ${stage==='success'?'#34D399':theme.brandDark}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .3s' }}>
          {stage === 'scanning'
            ? <svg width="44" height="44" viewBox="0 0 64 64" fill="none"><path d="M8 18V12a4 4 0 0 1 4-4h6" stroke={theme.brandDark} strokeWidth="3" strokeLinecap="round"/><path d="M46 8h6a4 4 0 0 1 4 4v6" stroke={theme.brandDark} strokeWidth="3" strokeLinecap="round"/><path d="M56 46v6a4 4 0 0 1-4 4h-6" stroke={theme.brandDark} strokeWidth="3" strokeLinecap="round"/><path d="M18 56h-6a4 4 0 0 1-4-4v-6" stroke={theme.brandDark} strokeWidth="3" strokeLinecap="round"/><circle cx="24" cy="26" r="2" fill={theme.brandDark}/><circle cx="40" cy="26" r="2" fill={theme.brandDark}/><path d="M24 40c2 3 6 4 8 4s6-1 8-4" stroke={theme.brandDark} strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
            : <svg width="44" height="36" viewBox="0 0 36 30" fill="none"><path d="M2 15l11 11L34 2" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </div>
        <div style={{ fontSize:'17px', fontWeight:700, color:'#fff', marginBottom:'6px' }}>
          {stage==='scanning' ? '얼굴을 인식하는 중' : '인증 완료'}
        </div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'20px' }}>
          {stage==='scanning' ? '카드 정보를 보려면 Face ID 인증이 필요해요' : '카드 정보가 표시됩니다'}
        </div>
        {stage==='scanning' && (
          <button onClick={onCancel} style={{ padding:'10px 24px', background:'transparent', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.18)', borderRadius: RADIUS.md, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 카드 발급 바텀시트
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// BottomSheet — iOS 스타일 슬라이드업 + 드래그 닫기
// ─────────────────────────────────────────────────────────
function BottomSheet({ onClose, children, maxHeight = '90%' }) {
  const [open, setOpen]       = useState(false)
  const [dragY, setDragY]     = useState(0)
  const [dragging, setDragging] = useState(false)
  const startYRef             = useRef(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const dismiss = () => {
    setOpen(false)
    setTimeout(onClose, 320)
  }

  const handleStart = (clientY) => { startYRef.current = clientY; setDragging(true) }
  const handleMove  = (clientY) => {
    if (startYRef.current === null) return
    setDragY(Math.max(0, clientY - startYRef.current))
  }
  const handleEnd   = () => {
    setDragging(false)
    startYRef.current = null
    if (dragY > 80) dismiss()
    else setDragY(0)
  }

  const transform   = !open ? 'translateY(100%)' : `translateY(${dragY}px)`
  const transition  = dragging ? 'none' : 'transform 0.34s cubic-bezier(0.32,0.72,0,1)'
  const bdOpacity   = open ? Math.max(0, 0.5 - dragY / 400) : 0

  return (
    <div style={{ position:'absolute', inset:0, zIndex:200 }}>
      {/* 백드롭 — 클릭하면 닫힘 */}
      <div
        onClick={dismiss}
        style={{
          position:'absolute', inset:0,
          background: `rgba(0,0,0,${bdOpacity})`,
          transition: dragging ? 'none' : 'background 0.34s',
        }}
      />
      {/* 시트 본체 */}
      <div
        style={{
          position:'absolute', bottom:0, left:0, right:0,
          background: COLORS.bgCard,
          borderRadius: '16px 16px 0 0',
          maxHeight, overflowY:'auto',
          transform, transition,
        }}
        onTouchStart={e => handleStart(e.touches[0].clientY)}
        onTouchMove={e  => handleMove(e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        {/* 드래그 핸들 */}
        <div
          style={{ padding:'12px 0 2px', cursor:'grab', flexShrink:0 }}
          onTouchStart={e => handleStart(e.touches[0].clientY)}
          onTouchMove={e  => handleMove(e.touches[0].clientY)}
          onTouchEnd={handleEnd}
        >
          <div style={{ width:'36px', height:'4px', background: COLORS.border, borderRadius:'2px', margin:'0 auto' }} />
        </div>
        {children}
      </div>
    </div>
  )
}

function IssueCardSheet({ onClose, onIssue }) {
  const theme = getAccountTheme()
  const [label, setLabel] = useState('')
  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding:'16px 16px 32px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color: COLORS.t1, marginBottom:'6px' }}>새 카드 발급</div>
        <div style={{ fontSize:'12px', color: COLORS.t4, marginBottom:'20px' }}>추가 카드를 즉시 발급받아요. 같은 계좌에서 결제됩니다.</div>
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px' }}>카드 별명 (선택)</div>
          <input
            type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="예: 여행용, 업무용, 가족용"
            style={{ width:'100%', height:'46px', padding:'0 14px', background: COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, fontSize:'13px', color: COLORS.t1, fontFamily:'inherit', outline:'none' }}
          />
        </div>
        <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius: RADIUS.md, padding:'10px 12px', fontSize:'11px', color:'#92400E', marginBottom:'18px', lineHeight:1.6 }}>
          가상 카드로 즉시 발급됩니다. 실물 카드는 영업일 3~5일 내 배송됩니다.
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ flex:1, height:'48px', background: COLORS.bgMuted, color: COLORS.t2, border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
          <button onClick={() => onIssue(label || '추가 카드')} style={{ flex:2, height:'48px', background: theme.brandDark, color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>즉시 발급</button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─────────────────────────────────────────────────────────
// 보안 설정 바텀시트 (개인용)
// ─────────────────────────────────────────────────────────
function SecuritySheet({ settings, onChange, onClose }) {
  const theme = getAccountTheme()

  const items = [
    {
      id: 'blockOverseas',
      label: '해외 결제 제한',
      sub: '해외 가맹점·해외 사이트 결제 차단',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      color: '#0EA5E9',
    },
    {
      id: 'blockOnline',
      label: '온라인 결제 제한',
      sub: '인터넷 쇼핑몰·앱 내 결제 차단',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      color: '#8B5CF6',
    },
    {
      id: 'alertUsage',
      label: '실시간 사용 알림',
      sub: '결제 발생 즉시 푸시 알림 수신',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      color: '#F59E0B',
    },
  ]

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding:'16px 16px 36px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:`${theme.brandDark}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.brandDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1 }}>보안 설정</div>
        </div>
        <div style={{ fontSize:'12px', color:COLORS.t4, marginBottom:'20px' }}>카드 결제 보안 옵션을 설정하세요</div>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
          {items.map(item => {
            const on = !!settings[item.id]
            return (
              <div key={item.id} onClick={() => onChange({ ...settings, [item.id]: !on })}
                style={{
                  display:'flex', alignItems:'center', gap:'12px',
                  padding:'14px 14px',
                  background: on ? `${item.color}0D` : COLORS.bg,
                  border: `1px solid ${on ? item.color + '30' : COLORS.borderSoft}`,
                  borderRadius: RADIUS.lg,
                  cursor:'pointer', transition:'all .15s',
                }}>
                <div style={{
                  width:'38px', height:'38px', borderRadius:'10px', flexShrink:0,
                  background: on ? `${item.color}18` : COLORS.bgMuted,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: on ? item.color : COLORS.t4,
                  transition:'all .15s',
                }}>
                  {item.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:700, color: on ? COLORS.t1 : COLORS.t2, marginBottom:'2px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize:'11px', color:COLORS.t4, lineHeight:1.4 }}>{item.sub}</div>
                </div>
                {/* 토글 */}
                <div style={{
                  width:'44px', height:'24px', borderRadius:'12px', flexShrink:0,
                  background: on ? item.color : COLORS.border,
                  position:'relative', transition:'background .2s',
                }}>
                  <div style={{
                    position:'absolute', top:'3px',
                    left: on ? '23px' : '3px',
                    width:'18px', height:'18px', borderRadius:'50%',
                    background:'#fff',
                    boxShadow:'0 1px 4px rgba(0,0,0,0.25)',
                    transition:'left .2s',
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={onClose} style={{ width:'100%', height:'50px', background:theme.brandDark, color:'#fff', border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          확인
        </button>
      </div>
    </BottomSheet>
  )
}

// ─────────────────────────────────────────────────────────
// MCC 설정 풀스크린
// ─────────────────────────────────────────────────────────
function MCCScreen({ mccItems, onChange, onClose, singleLimit, onLimitChange, exiting }) {
  const theme = getAccountTheme()
  const blockedCount = mccItems.filter(m => m.block).length
  return (
    <div
      className={exiting ? 'page-exit-right' : 'page-enter-right'}
      style={{ position:'absolute', inset:0, zIndex:100, display:'flex', flexDirection:'column', background: COLORS.bg }}
    >
      {/* 헤더 */}
      <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingBottom:'16px', paddingLeft:'16px', paddingRight:'16px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={onClose}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>MCC 차단 설정</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', marginTop:'3px' }}>
              {blockedCount > 0 ? `${blockedCount}개 카테고리 차단 중` : '차단 항목은 이 카드로 결제 불가합니다'}
            </div>
          </div>
          {blockedCount > 0 && (
            <span style={{ fontSize:'12px', fontWeight:700, color:'#FCA5A5', background:'rgba(239,68,68,0.2)', padding:'3px 10px', borderRadius:'8px' }}>
              {blockedCount}개 차단
            </span>
          )}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>
        <MccBlock
          items={mccItems}
          onChange={onChange}
          singleLimit={singleLimit}
          onLimitChange={onLimitChange}
        />
      </div>

      {/* 하단 버튼 */}
      <div style={{ flexShrink:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard, display:'grid', gridTemplateColumns:'1fr 2fr', gap:'8px' }}>
        <button onClick={onClose}
          style={{ height:'52px', background: COLORS.bgMuted, color: COLORS.t2, border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          취소
        </button>
        <button onClick={onClose}
          style={{ height:'52px', background: theme.brandDark, color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.buttonBrand }}>
          저장
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function CardPayment() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const userType = getUserType()
  const isPersonal = userType === 'personal'
  const bizRoleNow = !isPersonal ? (sessionStorage.getItem('bizRole') || '') : ''
  const isViewer      = bizRoleNow === 'viewer'              // 일시정지·QR 포함 전체 잠금
  const isActionLocked = ['viewer','staff'].includes(bizRoleNow) // 발급·지갑변경 잠금

  // 카드 목록 state
  const [cards, setCards] = useState(INITIAL_CARDS)
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const s = sessionStorage.getItem('cardPayment_selectedIdx')
    return s !== null ? parseInt(s, 10) : 0
  })
  const selectCard = (idx) => {
    sessionStorage.setItem('cardPayment_selectedIdx', idx)
    setSelectedIdx(idx)
  }

  // 카드별 독립 state (paused, revealed, mccItems, walletId)
  const [cardStates, setCardStates] = useState(() =>
    Object.fromEntries(INITIAL_CARDS.map(c => [c.id, {
      paused: false,
      revealed: false,
      mccItems: DEFAULT_MCC.map(m => ({ ...m })),
      walletId: 'my',
      securitySettings: { blockOverseas:false, blockOnline:false, alertUsage:true },
    }]))
  )

  // 모달/시트 state
  const [showFaceID, setShowFaceID] = useState(false)
  const [showIssue, setShowIssue] = useState(false)
  const [showMCC, setShowMCC] = useState(false)
  const [mccExiting, setMccExiting] = useState(false)

  const [showWalletPicker, setShowWalletPicker] = useState(false)
  const [showSecurity, setShowSecurity] = useState(false)

  const closeMCC = () => {
    setMccExiting(true)
    setTimeout(() => { setShowMCC(false); setMccExiting(false) }, 320)
  }

  const card = cards[selectedIdx]
  const cs = cardStates[card?.id] || { paused:false, revealed:false, mccItems: DEFAULT_MCC, walletId:'my' }

  const updateCardState = (cardId, patch) =>
    setCardStates(prev => ({ ...prev, [cardId]: { ...prev[cardId], ...patch } }))

  const handleDetailClick = () => {
    if (cs.revealed) { updateCardState(card.id, { revealed: false }); return }
    setShowFaceID(true)
  }

  const handleIssue = (label) => {
    const newCard = {
      id: `card_${Date.now()}`,
      holder: '이호형',
      type: '마스터',
      number: `5234 7891 2345 ${String(Math.floor(Math.random()*9000)+1000)}`,
      numberMasked: '5234 **** **** ****',
      validThru: '05/31',
      cvc: String(Math.floor(Math.random()*900)+100),
      label,
      balance: 0,
    }
    setCards(prev => [...prev, newCard])
    setCardStates(prev => ({ ...prev, [newCard.id]: { paused:false, revealed:false, mccItems: DEFAULT_MCC.map(m=>({...m})), walletId:'my', securitySettings:{ blockOverseas:false, blockOnline:false, alertUsage:true, lockPayment:false } } }))
    selectCard(cards.length)
    setShowIssue(false)
  }

  // 카드별 색상 팔레트 (인덱스 기준 순환)
  const palette = CARD_PALETTES[selectedIdx % CARD_PALETTES.length]

  const thisMonth = new Date().getMonth() + 1
  const allPayments  = CARD_PAYMENTS[card?.id] || []
  const payments     = allPayments  // 전체 표시 (최신순 이미 정렬됨)
  const monthlyUsed  = allPayments
    .filter(p => p.month === thisMonth && p.status !== 'blocked' && p.amount < 0)
    .reduce((s, p) => s + Math.abs(p.amount), 0)
  const monthlyCount = allPayments.filter(p => p.month === thisMonth && p.status !== 'blocked' && p.amount < 0).length
  const monthlyLimit = CARD_MONTHLY_LIMIT[card?.id] || null
  const usagePct     = monthlyLimit ? Math.min(100, Math.round(monthlyUsed / monthlyLimit * 100)) : null

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 헤더 */}
        <div style={{ background: theme.headerSolid, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'17px', fontWeight:700, color:'#fff' }}>카드 관리</span>
            </div>
            <button onClick={!isActionLocked ? () => setShowIssue(true) : undefined} style={{ display:'flex', alignItems:'center', gap:'4px', background: isActionLocked ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.15)', border:'none', borderRadius: RADIUS.pill, padding:'6px 12px', cursor: isActionLocked ? 'default' : 'pointer', fontFamily:'inherit', opacity: isActionLocked ? 0.5 : 1 }}>
              {isActionLocked
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              }
              <span style={{ fontSize:'12px', fontWeight:700, color:'#fff' }}>카드 발급</span>
            </button>
          </div>
        </div>

        <div style={{ padding:'18px 16px 32px' }}>

          {/* ① 카드 이미지 */}
          <div style={{ marginBottom:'12px' }}>
            <PhysicalCard
              card={card}
              paused={cs.paused}
              revealed={cs.revealed}
              onDetailClick={handleDetailClick}
              palette={palette}
            />
          </div>

          {/* 카드 선택 인디케이터 dots */}
          {cards.length > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', marginBottom:'16px' }}>
              {cards.map((c, i) => (
                <button key={c.id} onClick={() => selectCard(i)} style={{ width: i===selectedIdx ? '20px' : '7px', height:'7px', borderRadius:'4px', background: i===selectedIdx ? theme.brandDark : COLORS.border, border:'none', cursor:'pointer', padding:0, transition:'all .2s' }} />
              ))}
            </div>
          )}

          {/* ② 액션 4버튼 */}
          <div style={{ marginBottom:'14px' }}>
            <ActionGrid
              paused={cs.paused}
              onToggle={!isViewer ? () => updateCardState(card.id, { paused: !cs.paused }) : undefined}
              onQR={!isViewer ? () => dialog.alert({ title: 'QR 결제', message: '추후 구현될 기능입니다.' }) : undefined}
              canToggle={!isViewer}
              canQR={!isViewer}
              canIssue={!isActionLocked}
              onIssue={!isActionLocked ? () => setShowIssue(true) : undefined}
              onMCC={() => isPersonal ? setShowSecurity(true) : setShowMCC(true)}
              canSetMCC={isPersonal || ['master','admin'].includes(sessionStorage.getItem('bizRole') || '')}
              isPersonal={isPersonal}
            />
          </div>

          {/* ③ 출금 지갑 */}
          {(() => {
            const w = WALLET_PRIORITY.find(w => w.id === cs.walletId) || WALLET_PRIORITY[0]
            return (
              <div style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, borderRadius: RADIUS.lg, padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                <span style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4, flexShrink:0 }}>출금 지갑</span>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: w.dotColor, flexShrink:0 }} />
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{w.label}</span>
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, flexShrink:0 }}>{fmt(w.amount)}원</span>
                <button onClick={!isActionLocked ? () => setShowWalletPicker(true) : undefined} style={{ flexShrink:0, padding:'5px 10px', background: isActionLocked ? '#F3F4F6' : `${theme.brandDark}12`, color: isActionLocked ? '#9CA3AF' : theme.brandDark, border: isActionLocked ? '1px solid #E5E7EB' : `1px solid ${theme.brandDark}25`, borderRadius: RADIUS.pill, fontSize:'11px', fontWeight:700, cursor: isActionLocked ? 'default' : 'pointer', fontFamily:'inherit' }}>
                  {isActionLocked ? '🔒 변경' : '변경'}
                </button>
              </div>
            )
          })()}

          {/* ④ 카드 라벨 필터 탭 */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', overflowX:'auto', paddingBottom:'2px' }}>
            {cards.map((c, i) => (
              <button key={c.id} onClick={() => selectCard(i)}
                style={{ flexShrink:0, padding:'6px 16px', background: i===selectedIdx ? theme.brandDark : COLORS.bgCard, color: i===selectedIdx ? '#fff' : COLORS.t3, border: i===selectedIdx ? 'none' : `1px solid ${COLORS.border}`, borderRadius: RADIUS.pill, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: i===selectedIdx ? SHADOWS.card : 'none', transition:'all .15s' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* ⑤ 이번 달 사용 요약 */}
          <div onClick={() => navigate('/payments', { state: { cardLabel: card.label } })} style={{ background: palette.tint, border:`1px solid ${palette.tintBorder}`, borderRadius: RADIUS.lg, padding:'14px 16px', marginBottom:'14px', cursor:'pointer', transition:'background 0.4s ease, border-color 0.4s ease' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4 }}>{thisMonth}월 카드 사용액</span>
              <span style={{ fontSize:'11px', fontWeight:600, color: COLORS.t3 }}>{monthlyCount}건</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom: usagePct !== null ? '10px' : 0 }}>
              <span style={{ fontSize:'24px', fontWeight:800, color: COLORS.t1, letterSpacing:'-0.5px' }}>{fmt(monthlyUsed)}</span>
              <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t3 }}>원</span>
              {monthlyLimit && (
                <span style={{ fontSize:'11px', color: COLORS.t4, marginLeft:'4px' }}>/ {fmt(monthlyLimit)}원 한도</span>
              )}
            </div>
            {usagePct !== null && (
              <>
                <div style={{ height:'6px', background: COLORS.bgMuted, borderRadius:'3px', overflow:'hidden', marginBottom:'5px' }}>
                  <div style={{ height:'100%', width:`${usagePct}%`, borderRadius:'3px', background: usagePct >= 90 ? '#EF4444' : usagePct >= 70 ? '#F59E0B' : theme.brand, transition:'width 0.4s' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color: usagePct >= 90 ? '#EF4444' : usagePct >= 70 ? '#B45309' : COLORS.t4, fontWeight:600 }}>
                  <span>한도의 {usagePct}% 사용</span>
                  <span>잔여 {fmt(monthlyLimit - monthlyUsed)}원</span>
                </div>
              </>
            )}
          </div>

          {/* ⑥ 결제 내역 헤더 */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', padding:'0 4px' }}>
            <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>
              <span style={{ color: theme.brandDark }}>{card.label}</span> 결제 내역
            </span>
            <button onClick={() => navigate('/payments', { state: { cardLabel: card.label } })} style={{ fontSize:'11px', fontWeight:600, color: theme.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>전체 보기 ›</button>
          </div>
          {payments.length === 0 ? (
            <div style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, borderRadius: RADIUS.lg, padding:'28px 16px', textAlign:'center', color: COLORS.t4, fontSize:'13px' }}>
              결제 내역이 없어요
            </div>
          ) : (
            <div style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, borderRadius: RADIUS.lg, overflow:'hidden' }}>
              {payments.map((p, i, arr) => {
                const blocked = p.status === 'blocked'
                return (
                  <button key={p.id} onClick={() => navigate(`/payments/${p.id}`)} style={{ width:'100%', padding:'13px 16px', background:'transparent', border:'none', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    {/* 차단 아이콘 */}
                    {blocked && (
                      <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color: blocked ? COLORS.danger : COLORS.t1, marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>{p.meta}</div>
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:700, color: blocked ? COLORS.danger : COLORS.t2, flexShrink:0 }}>
                      {blocked ? '차단' : `${fmt(p.amount)}원`}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* Face ID 모달 */}
      {showFaceID && (
        <FaceIDModal
          onSuccess={() => { updateCardState(card.id, { revealed: true }); setShowFaceID(false) }}
          onCancel={() => setShowFaceID(false)}
        />
      )}

      {/* 카드 발급 시트 */}
      {showIssue && (
        <IssueCardSheet
          onClose={() => setShowIssue(false)}
          onIssue={handleIssue}
        />
      )}

      {/* 보안 설정 시트 (개인) */}
      {showSecurity && (
        <SecuritySheet
          settings={cs.securitySettings || {}}
          onChange={s => updateCardState(card.id, { securitySettings: s })}
          onClose={() => setShowSecurity(false)}
        />
      )}

      {/* MCC 설정 풀스크린 */}
      {showMCC && (
        <MCCScreen
          mccItems={cs.mccItems}
          onChange={items => updateCardState(card.id, { mccItems: items })}
          onClose={closeMCC}
          singleLimit={cs.singleLimit}
          onLimitChange={limit => updateCardState(card.id, { singleLimit: limit })}
          exiting={mccExiting}
        />
      )}

      {/* 출금 지갑 변경 시트 */}
      {showWalletPicker && (
        <BottomSheet onClose={() => setShowWalletPicker(false)}>
          <div style={{ padding:'16px 16px 32px' }}>
            <div style={{ fontSize:'16px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>출금 지갑 변경</div>
            <div style={{ fontSize:'12px', color: COLORS.t4, marginBottom:'16px' }}>선택한 지갑에서 카드 결제가 차감됩니다.</div>
            <div style={{ background: COLORS.bg, borderRadius: RADIUS.lg, overflow:'hidden', marginBottom:'16px' }}>
              {WALLET_PRIORITY.map((w, i, arr) => {
                const isSelected = cs.walletId === w.id
                return (
                  <button key={w.id} onClick={() => { updateCardState(card.id, { walletId: w.id }); setShowWalletPicker(false) }} style={{ width:'100%', padding:'14px 16px', background: isSelected ? '#fff' : 'transparent', border:'none', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: w.dotColor, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color: isSelected ? theme.brandDark : COLORS.t1, marginBottom:'2px' }}>{w.label}</div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>{w.sub}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'13px', fontWeight:700, color: isSelected ? theme.brandDark : COLORS.t1 }}>{fmt(w.amount)}원</span>
                      {isSelected && (
                        <div style={{ width:'18px', height:'18px', borderRadius:'50%', background: theme.brandDark, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 3.5 6.5 9 1"/></svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setShowWalletPicker(false)} style={{ width:'100%', height:'48px', background: COLORS.bgMuted, color: COLORS.t2, border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              닫기
            </button>
          </div>
        </BottomSheet>
      )}
    </PhoneShell>
  )
}
