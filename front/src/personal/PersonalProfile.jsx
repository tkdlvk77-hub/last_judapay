import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'

// ─── 데모 데이터 ──────────────────────────────────────────
const USER = {
  name:       '이호형',
  initial:    '이',
  status:     '정상 이용 중',
  lastActive: '10분 전',
  joinedAt:   '2025.08 가입',
  statusMsg:  '외주 작업 진행 중입니다 🖥️',
  kyc:        'KYC 2단계',
}

const CERTS = [
  { icon:'✅', label:'본인 확인 완료', done:true  },
  { icon:'🏦', label:'계좌 인증 완료', done:true  },
  { icon:'📱', label:'휴대폰 인증 완료', done:true },
  { icon:'📄', label:'사업자 등록 미인증', done:false },
]

const TRUST = [
  { label:'거래 완료율',   value:'98%',     icon:'✅', color:'#047857', bg:'#F0FDF4', border:'#BBF7D0' },
  { label:'상환 지연',     value:'없음',    icon:'🔒', color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE' },
  { label:'거래 성공 횟수', value:'24회',   icon:'🤝', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  { label:'평균 응답 속도', value:'1.2시간', icon:'⚡', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
]

const ACTIVITY_FEED = [
  { id:'a1', type:'payment',  icon:'💸', label:'지급',     name:'박민준에게 지급',       amount:300000,  date:'5.25', status:'완료',  color:'#EF4444' },
  { id:'a2', type:'refund',   icon:'🔄', label:'상환 수령', name:'이유진 상환 수령',      amount:100000,  date:'5.22', status:'완료',  color:'#047857' },
  { id:'a3', type:'data',     icon:'📁', label:'자료 제출', name:'계약서 제출',           amount:null,    date:'5.20', status:'완료',  color:'#7C3AED' },
  { id:'a4', type:'payment',  icon:'💸', label:'지급',     name:'김창업에게 지급',        amount:200000,  date:'5.18', status:'완료',  color:'#EF4444' },
  { id:'a5', type:'refund',   icon:'🔄', label:'상환',     name:'박철수 대여금 일부 상환', amount:500000, date:'5.15', status:'완료',  color:'#047857' },
  { id:'a6', type:'data',     icon:'📁', label:'자료 제출', name:'신분 확인 자료 제출',   amount:null,    date:'5.10', status:'완료',  color:'#7C3AED' },
  { id:'a7', type:'payment',  icon:'💸', label:'지급',     name:'이유진에게 생활비 지급', amount:150000,  date:'5.08', status:'완료',  color:'#EF4444' },
]

const DEALS = [
  {
    id:'d1', category:'외주 거래', icon:'🧑‍💻', color:'#0EA5E9',
    name:'박철수 · UI 디자인 외주', amount:1500000, progress:60,
    status:'진행 중', statusColor:'#D97706', statusBg:'#FFFBEB',
    detail:'마일스톤 2/3 완료 · 잔금 600,000원 대기 중',
    date:'2026.05.01',
  },
  {
    id:'d2', category:'빌려주기', icon:'🤝', color:'#7C3AED',
    name:'김창업 · 사업 운영 자금', amount:500000, progress:40,
    status:'상환 중', statusColor:'#7C3AED', statusBg:'#F5F3FF',
    detail:'200,000원 상환 완료 · 300,000원 잔액',
    date:'2026.04.15',
  },
  {
    id:'d3', category:'부동산', icon:'🏠', color:'#10B981',
    name:'월세 · 서울 마포구', amount:300000, progress:100,
    status:'자동 결제', statusColor:'#047857', statusBg:'#F0FDF4',
    detail:'매월 25일 자동 집행 · 관리비 별도',
    date:'2026.05.25',
  },
  {
    id:'d4', category:'투자', icon:'📈', color:'#2563EB',
    name:'삼성전자 · 주식', amount:1200000, progress:null,
    status:'보유 중', statusColor:'#1D4ED8', statusBg:'#EFF6FF',
    detail:'평가금액 1,380,000원 · +15%',
    date:'2026.03.10',
  },
  {
    id:'d5', category:'외주 거래', icon:'🧑‍💻', color:'#0EA5E9',
    name:'이유진 · 번역 외주', amount:200000, progress:100,
    status:'완료', statusColor:'#047857', statusBg:'#F0FDF4',
    detail:'검수 완료 · 잔금 200,000원 지급 완료',
    date:'2026.04.28',
  },
]

// ─── 유틸 ─────────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString('ko-KR') }

// ─── 소개 탭 ──────────────────────────────────────────────
function IntroTab({ theme }) {
  const [statusMsg,      setStatusMsg]      = useState(USER.statusMsg)
  const [editingStatus,  setEditingStatus]  = useState(false)
  const [draft,          setDraft]          = useState(statusMsg)

  return (
    <div style={{ padding:'20px 16px 40px', display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* 기본 정보 카드 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t4, letterSpacing:'0.8px', marginBottom:'12px' }}>BASIC INFO</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {[
            { icon:'🟢', label:'계정 상태',   value: USER.status,     valueColor:'#047857' },
            { icon:'🕐', label:'최근 활동',   value: USER.lastActive },
            { icon:'📅', label:'가입',        value: USER.joinedAt   },
            { icon:'🔐', label:'인증 수준',   value: USER.kyc        },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'14px' }}>{row.icon}</span>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>{row.label}</span>
              </div>
              <span style={{ fontSize:'13px', fontWeight:600, color: row.valueColor || COLORS.t1 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 인증 현황 카드 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t4, letterSpacing:'0.8px', marginBottom:'12px' }}>VERIFICATION</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {CERTS.map(c => (
            <div key={c.label} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'12px', background: c.done ? '#F0FDF4' : '#F9FAFB', border:`1px solid ${c.done ? '#BBF7D0' : COLORS.borderSoft}` }}>
              <span style={{ fontSize:'16px' }}>{c.icon}</span>
              <span style={{ fontSize:'13px', fontWeight:600, color: c.done ? '#047857' : COLORS.t3, flex:1 }}>{c.label}</span>
              {c.done
                ? <span style={{ fontSize:'10px', fontWeight:700, color:'#047857', background:'#D1FAE5', padding:'2px 8px', borderRadius:'6px' }}>완료</span>
                : <span style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', background:COLORS.bgMuted, padding:'2px 8px', borderRadius:'6px' }}>미완료</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* 거래 신뢰 지표 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t4, letterSpacing:'0.8px', marginBottom:'12px' }}>TRUST SCORE</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          {TRUST.map(t => (
            <div key={t.label} style={{ padding:'12px', borderRadius:'12px', background:t.bg, border:`1px solid ${t.border}` }}>
              <div style={{ fontSize:'18px', marginBottom:'6px' }}>{t.icon}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:t.color, letterSpacing:'-0.5px', marginBottom:'3px' }}>{t.value}</div>
              <div style={{ fontSize:'10px', color: t.color, fontWeight:600, opacity:0.75 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 상태 메시지 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
          <span style={{ fontSize:'11px', fontWeight:700, color:COLORS.t4, letterSpacing:'0.8px' }}>STATUS MESSAGE</span>
          {!editingStatus && (
            <button onClick={() => { setDraft(statusMsg); setEditingStatus(true) }}
              style={{ padding:'4px 10px', background: theme.brandDark+'12', border:'none', borderRadius:'20px', color:theme.brandDark, fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ✏️ 수정
            </button>
          )}
        </div>
        {editingStatus ? (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={80}
              placeholder="지금 하고 있는 일을 간단히 남겨보세요"
              style={{ width:'100%', minHeight:'72px', padding:'10px 12px', borderRadius:'12px', border:`1.5px solid ${COLORS.borderSoft}`, fontSize:'13px', color:COLORS.t1, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', lineHeight:1.7 }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'6px' }}>
              <span style={{ fontSize:'10px', color:COLORS.t4 }}>{draft.length}/80</span>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setEditingStatus(false)}
                  style={{ padding:'7px 14px', background:COLORS.bgMuted, border:'none', borderRadius:'10px', color:COLORS.t3, fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  취소
                </button>
                <button onClick={() => { setStatusMsg(draft); setEditingStatus(false) }}
                  style={{ padding:'7px 16px', background:theme.activeBtnGrad, border:'none', borderRadius:'10px', color:'#fff', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
                  저장
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize:'14px', color:COLORS.t1, lineHeight:1.7, fontWeight:500 }}>
            {statusMsg || <span style={{ color:COLORS.t5 }}>상태 메시지를 입력하세요</span>}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── 활동 탭 ──────────────────────────────────────────────
function ActivityTab({ theme }) {
  const [filter, setFilter] = useState('전체')
  const filters = ['전체', '지급', '상환', '자료 제출']

  const filtered = filter === '전체'
    ? ACTIVITY_FEED
    : ACTIVITY_FEED.filter(a =>
        filter === '지급'     ? a.type === 'payment'
      : filter === '상환'     ? a.type === 'refund'
      : a.type === 'data'
    )

  const typeStats = [
    { label:'이번달 지급', count: ACTIVITY_FEED.filter(a=>a.type==='payment').length, color:'#EF4444', bg:'#FEF2F2', icon:'💸' },
    { label:'상환 수령',   count: ACTIVITY_FEED.filter(a=>a.type==='refund').length,  color:'#047857', bg:'#F0FDF4', icon:'🔄' },
    { label:'자료 제출',   count: ACTIVITY_FEED.filter(a=>a.type==='data').length,    color:'#7C3AED', bg:'#F5F3FF', icon:'📁' },
  ]

  return (
    <div style={{ padding:'20px 16px 40px', display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* 활동 요약 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px' }}>
        {typeStats.map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:'14px', padding:'12px 10px', textAlign:'center', border:`1px solid ${s.color}20` }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:s.color, letterSpacing:'-0.5px', marginBottom:'3px' }}>{s.count}</div>
            <div style={{ fontSize:'10px', color:s.color, fontWeight:600, opacity:0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 필터 칩 */}
      <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'2px' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink:0, padding:'6px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'inherit',
              background: f === filter ? theme.activeBtnGrad : COLORS.bgMuted,
              color:      f === filter ? '#fff' : COLORS.t3,
              fontSize:'12px', fontWeight:700,
              boxShadow:  f === filter ? theme.activeShadow : 'none' }}>
            {f}
          </button>
        ))}
      </div>

      {/* 활동 리스트 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
        {filtered.map((a, i) => (
          <div key={a.id} style={{ padding:'13px 16px', borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'11px', background: a.color + '18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
              {a.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {a.name}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'10px', fontWeight:700, color: a.color, background: a.color + '14', padding:'1px 6px', borderRadius:'4px' }}>{a.label}</span>
                <span style={{ fontSize:'10px', color:COLORS.t4 }}>{a.date}</span>
                <span style={{ fontSize:'10px', color:'#047857', fontWeight:600 }}>{a.status}</span>
              </div>
            </div>
            {a.amount !== null && (
              <span style={{ fontSize:'14px', fontWeight:800, color: a.type === 'refund' ? '#047857' : COLORS.t1, flexShrink:0 }}>
                {a.type === 'refund' ? '+' : '-'}{fmt(a.amount)}원
              </span>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}

// ─── 거래 탭 ──────────────────────────────────────────────
function DealTab({ theme }) {
  const [catFilter, setCatFilter] = useState('전체')
  const cats = ['전체', '외주 거래', '빌려주기', '부동산', '투자']

  const filtered = catFilter === '전체'
    ? DEALS
    : DEALS.filter(d => d.category === catFilter)

  const ongoing   = DEALS.filter(d => d.status !== '완료').length
  const completed = DEALS.filter(d => d.status === '완료').length

  return (
    <div style={{ padding:'20px 16px 40px', display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* 진행 요약 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'16px 18px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t4, letterSpacing:'0.8px', marginBottom:'12px' }}>DEAL OVERVIEW</div>
        <div style={{ display:'flex', gap:'10px' }}>
          <div style={{ flex:1, padding:'12px', borderRadius:'12px', background:'#EFF6FF', border:'1px solid #BFDBFE', textAlign:'center' }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#1D4ED8', letterSpacing:'-0.5px' }}>{ongoing}</div>
            <div style={{ fontSize:'11px', color:'#1D4ED8', fontWeight:600, marginTop:'2px' }}>진행 중</div>
          </div>
          <div style={{ flex:1, padding:'12px', borderRadius:'12px', background:'#F0FDF4', border:'1px solid #BBF7D0', textAlign:'center' }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#047857', letterSpacing:'-0.5px' }}>{completed}</div>
            <div style={{ fontSize:'11px', color:'#047857', fontWeight:600, marginTop:'2px' }}>완료</div>
          </div>
          <div style={{ flex:1, padding:'12px', borderRadius:'12px', background:'#F5F3FF', border:'1px solid #DDD6FE', textAlign:'center' }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#7C3AED', letterSpacing:'-0.5px' }}>{DEALS.length}</div>
            <div style={{ fontSize:'11px', color:'#7C3AED', fontWeight:600, marginTop:'2px' }}>전체</div>
          </div>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'2px' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ flexShrink:0, padding:'6px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'inherit',
              background: c === catFilter ? theme.activeBtnGrad : COLORS.bgMuted,
              color:      c === catFilter ? '#fff' : COLORS.t3,
              fontSize:'12px', fontWeight:700,
              boxShadow:  c === catFilter ? theme.activeShadow : 'none' }}>
            {c}
          </button>
        ))}
      </div>

      {/* 거래 카드 목록 */}
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {filtered.map(d => (
          <div key={d.id} style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {/* 상단 헤더 */}
            <div style={{ background: d.color + '14', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px', borderBottom:`1px solid ${d.color}20` }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: d.color + '20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                {d.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                <div style={{ fontSize:'10px', color: d.color, fontWeight:600, marginTop:'2px' }}>{d.category} · {d.date}</div>
              </div>
              <span style={{ padding:'3px 9px', background:d.statusBg, color:d.statusColor, borderRadius:'8px', fontSize:'10px', fontWeight:700, flexShrink:0 }}>
                {d.status}
              </span>
            </div>
            {/* 본문 */}
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: d.progress !== null ? '10px' : '0' }}>
                <span style={{ fontSize:'12px', color:COLORS.t3, lineHeight:1.5 }}>{d.detail}</span>
                <span style={{ fontSize:'15px', fontWeight:800, color:COLORS.t1, flexShrink:0, marginLeft:'10px' }}>{fmt(d.amount)}원</span>
              </div>
              {d.progress !== null && (
                <>
                  <div style={{ height:'5px', background:COLORS.bgMuted, borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${d.progress}%`, background: d.progress === 100 ? '#10B981' : d.color, borderRadius:'3px', transition:'width .4s' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px' }}>
                    <span style={{ fontSize:'10px', color:COLORS.t4 }}>진행률</span>
                    <span style={{ fontSize:'10px', fontWeight:700, color: d.progress === 100 ? '#047857' : d.color }}>{d.progress}%</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0', color:COLORS.t4, fontSize:'13px' }}>
            <div style={{ fontSize:'32px', marginBottom:'10px' }}>📭</div>
            해당 거래가 없어요
          </div>
        )}
      </div>

    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────
export default function PersonalProfile() {
  const navigate = useNavigate()
  const theme    = getAccountTheme()
  const { currentUser } = useUser()
  // 실명 우선 — 로그인 사용자 이름, 없으면 데모 USER.name
  const liveName    = currentUser?.name || USER.name
  const liveInitial = (currentUser?.name?.charAt(0)) || USER.initial

  // ── refs ──
  const scrollRef  = useRef(null)
  const title1Ref  = useRef(null)   // "내 프로필"
  const title2Ref  = useRef(null)   // USER.name

  const [tab, setTab] = useState('소개')
  const TABS = ['소개', '활동', '거래']

  // ── 타이틀 크로스페이드 (직접 DOM 조작) ──
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const FADE_START = 60
    const FADE_END   = 110
    let raf = null
    const update = () => {
      const p = Math.min(1, Math.max(0, (el.scrollTop - FADE_START) / (FADE_END - FADE_START)))
      if (title1Ref.current)
        title1Ref.current.style.opacity = String(Math.max(0, 1 - p * 1.6))
      if (title2Ref.current)
        title2Ref.current.style.opacity = String(Math.max(0, (p - 0.4) * 1.8))
      raf = null
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // 헤더 색상 — 집행 통계와 동일한 토큰 사용 (상단 전체 일관)
  const NAV_COLOR = theme.headerSolid   // sticky 네비·탭 바 + 히어로 모두 동일 solid

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', minHeight:0 }}>

        {/* ── ① Sticky 네비 바 ── */}
        <div className="sticky-nav-safe" style={{
          position:'sticky', top:0, zIndex:10,
          background: NAV_COLOR,
          display:'flex', alignItems:'center', gap:'8px',
          padding:'20px 16px 14px',
          overflow:'hidden',
        }}>
          <button onClick={() => navigate(-1)}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          {/* 타이틀 크로스페이드 */}
          <span style={{ flex:1, position:'relative', height:'22px', overflow:'hidden' }}>
            <span ref={title1Ref} style={{ position:'absolute', inset:0, fontSize:'15px', fontWeight:600, color:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center' }}>
              내 프로필
            </span>
            <span ref={title2Ref} style={{ position:'absolute', inset:0, fontSize:'15px', fontWeight:700, color:'#fff', display:'flex', alignItems:'center', opacity:0 }}>
              {liveName}
            </span>
          </span>
        </div>

        {/* ── ② 프로필 히어로 (자연스럽게 스크롤됨) ── */}
        <div style={{ background: NAV_COLOR, padding:'12px 20px 20px', display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:'68px', height:'68px', borderRadius:'20px', background:'rgba(255,255,255,0.2)', border:'2.5px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:800, color:'#fff' }}>
              {liveInitial}
            </div>
            <div style={{ position:'absolute', bottom:'-2px', right:'-2px', width:'14px', height:'14px', borderRadius:'50%', background:'#34D399', border:'2.5px solid white' }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', marginBottom:'5px' }}>{liveName}</div>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
              <span style={{ padding:'3px 9px', background:'rgba(52,211,153,0.25)', color:'#D1FAE5', borderRadius:'8px', fontSize:'10px', fontWeight:700, border:'1px solid rgba(52,211,153,0.3)' }}>
                {USER.status}
              </span>
              <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)' }}>· {USER.kyc}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>🕐 최근 활동 {USER.lastActive}</span>
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>📅 {USER.joinedAt}</span>
            </div>
          </div>
        </div>

        {/* ── ③ Sticky 탭 바 ── */}
        <div className="sticky-tabs-safe" style={{
          position:'sticky', top:'66px', zIndex:9,
          background: NAV_COLOR,
          display:'flex', borderTop:'1px solid rgba(255,255,255,0.12)',
        }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'12px 0', background:'none', border:'none',
                borderBottom: t === tab ? '2.5px solid #fff' : '2.5px solid transparent',
                color: t === tab ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize:'13px', fontWeight: t === tab ? 700 : 500,
                cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── ④ 탭 콘텐츠 ── */}
        <div style={{ background:'#F4F5F7' }}>
          {tab === '소개' && <IntroTab theme={theme} />}
          {tab === '활동' && <ActivityTab theme={theme} />}
          {tab === '거래' && <DealTab theme={theme} />}
        </div>

      </div>
    </PhoneShell>
  )
}
