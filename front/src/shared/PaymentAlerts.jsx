import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'
import { autoClassify } from './merchantCategoryMapper'

// ─── 데이터 ───────────────────────────────────────────────
// type: 'mine' | 'external' | 'auto' | 'anomaly'
// status: 'normal' | 'blocked' | 'incoming'
// category: string | null (null = 미분류)
// categoryAuto: true = 자동추천
const ALL_PAYMENTS = [
  { id:'a1',   type:'anomaly',  status:'blocked',  merchant:'㈜오로라 · MCC 차단',    amount:0,        time:'방금',       user:'㈜오로라', wallet:'투자 자금',    card:'-',     mainCat:null,     category:null,         categoryAuto:false },
  { id:'pay7', type:'external', status:'normal',   merchant:'카페 결제',               amount:-4500,    time:'오늘 09:05', user:'박민준',   wallet:'외주비',       card:'-',     mainCat:'운영비', category:'출장식대',   categoryAuto:true  },
  { id:'a2',   type:'auto',     status:'normal',   merchant:'강남 임대료',             amount:-5800000, time:'오늘 09:00', user:'자동',     wallet:'법인 자금',    card:'주 카드', mainCat:'운영비', category:'임대료',    categoryAuto:true  },
  { id:'pay3', type:'mine',     status:'normal',   merchant:'스타벅스 강남점',         amount:-4500,    time:'오늘 09:12', user:'나',       wallet:'MY 지갑',      card:'주 카드', mainCat:null,     category:null,         categoryAuto:false },
  { id:'pay8', type:'external', status:'normal',   merchant:'사무용품 구매',           amount:-89000,   time:'오늘 11:30', user:'㈜오로라', wallet:'투자',         card:'-',     mainCat:'운영비', category:'기타 정기지출', categoryAuto:true },
  { id:'pay4', type:'mine',     status:'normal',   merchant:'이마트 역삼점',           amount:-32000,   time:'어제 14:32', user:'나',       wallet:'MY 지갑',      card:'주 카드', mainCat:null,     category:null,         categoryAuto:false },
  { id:'pay2', type:'auto',     status:'normal',   merchant:'AWS 클라우드',            amount:-847000,  time:'어제 15:22', user:'자동',     wallet:'법인 자금',    card:'법인카드B', mainCat:'운영비', category:'구독료',  categoryAuto:true  },
  { id:'pay9', type:'external', status:'normal',   merchant:'편의점 결제',             amount:-3200,    time:'어제 18:44', user:'이민형',   wallet:'대여금',       card:'-',     mainCat:'운영비', category:'출장식대',   categoryAuto:true  },
  { id:'pay5', type:'anomaly',  status:'blocked',  merchant:'GS강남게임센터',          amount:0,        time:'4.28 22:14', user:'나',       wallet:'MY 지갑',      card:'주 카드', mainCat:null,     category:null,         categoryAuto:false },
  { id:'a3',   type:'anomaly',  status:'blocked',  merchant:'카지노 결제 시도',        amount:0,        time:'4.29 23:11', user:'㈜오로라', wallet:'투자',         card:'-',     mainCat:null,     category:null,         categoryAuto:false },
  { id:'pay11',type:'external', status:'normal',   merchant:'마트 결제',               amount:-52000,   time:'4.29 10:20', user:'박민준',   wallet:'외주비',       card:'-',     mainCat:'운영비', category:'출장식대',   categoryAuto:true  },
  { id:'pay6', type:'mine',     status:'normal',   merchant:'올리브영 강남점',         amount:-23000,   time:'4.27 16:44', user:'나',       wallet:'MY 지갑',      card:'주 카드', mainCat:'운영비', category:'복리후생',   categoryAuto:false },
  { id:'pay12',type:'external', status:'normal',   merchant:'의료 결제',               amount:-18000,   time:'4.27 11:00', user:'서울시청', wallet:'자금 지원',    card:'-',     mainCat:'운영비', category:'복리후생',   categoryAuto:true  },
  { id:'a4',   type:'anomaly',  status:'blocked',  merchant:'주류 구매 시도',          amount:0,        time:'4.28 01:33', user:'이민형',   wallet:'대여금',       card:'-',     mainCat:null,     category:null,         categoryAuto:false },
  { id:'pay14',type:'external', status:'normal',   merchant:'장비 구매',               amount:-450000,  time:'4.27 15:00', user:'㈜오로라', wallet:'투자',         card:'-',     mainCat:'운영비', category:'기타 정기지출', categoryAuto:true },
  { id:'pay13',type:'auto',     status:'normal',   merchant:'쿠팡 구독 자동결제',      amount:-29900,   time:'4.27 03:00', user:'자동',     wallet:'법인 자금',    card:'법인카드B', mainCat:'운영비', category:'구독료',  categoryAuto:true  },
]

// ─── 가맹점명 기반 자동 분류 적용 ─────────────────────────
const PROCESSED_PAYMENTS = ALL_PAYMENTS.map(p => {
  // 이미 수동 분류된 것 or 차단건은 그대로
  if (!p.categoryAuto || p.status === 'blocked') return p
  const { mainCat, subCat, matched } = autoClassify(p.merchant, p.mcc ?? null)
  return { ...p, mainCat, category: subCat, categoryAuto: matched }
})

const TABS = [
  { key:'all',      label:'전체' },
  { key:'mine',     label:'내 결제' },
  { key:'external', label:'외부 사용' },
  { key:'auto',     label:'자동 결제' },
  { key:'anomaly',  label:'이상 거래' },
]

// 대분류 → 중분류 그룹 (우리 카테고리 체계 동일)
const CATEGORY_GROUPS = [
  { main:'인건비', subs:['급여','외주비','상여금','경조사비','기타소득','4대보험'] },
  { main:'운영비', subs:['임대료','렌트&리스','구독료','통신비','공과금','보험료','출장식대','복리후생','기타 정기지출','개인사용'] },
  { main:'사업비', subs:['마케팅비'] },
  { main:'금융',   subs:['투자','대여금'] },
  { main:'세금',   subs:['세금'] },
  { main:'미분류', subs:['미분류'] },
]

const CARD_STYLE = {
  background:'#FFFFFF',
  borderRadius:'14px',
  border:'1px solid #E9EAEC',
  overflow:'hidden',
}

function fmt(n) { return Math.abs(n).toLocaleString('ko-KR') }

// ─── 카테고리 태그 ────────────────────────────────────────
function CategoryTag({ item, override, onClassify }) {
  const cat = override ?? item.category
  const isAuto = !override && item.categoryAuto
  const isUnclassified = cat === null
  const isBlocked = item.status === 'blocked'
  if (isBlocked) return null

  if (isUnclassified) {
    return (
      <button onClick={e => { e.stopPropagation(); onClassify(item) }}
        style={{ display:'inline-flex', alignItems:'center', gap:'4px',
          padding:'2px 8px', borderRadius:'5px',
          background:'#FFFBEB', border:'1px solid #FDE68A',
          fontSize:'10px', fontWeight:700, color:'#92400E',
          cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
        ⚠ 미분류 · 분류하기
      </button>
    )
  }
  if (isAuto) {
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'3px',
        padding:'2px 8px', borderRadius:'5px',
        background:'#F0FDF4', border:'1px solid #BBF7D0',
        fontSize:'10px', fontWeight:700, color:'#047857', flexShrink:0 }}>
        ✦ {cat} · 자동
      </span>
    )
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'3px',
      padding:'2px 8px', borderRadius:'5px',
      background:'#EFF6FF', border:'1px solid #BFDBFE',
      fontSize:'10px', fontWeight:700, color:'#1D4ED8', flexShrink:0 }}>
      ✓ {cat}
    </span>
  )
}

// ─── 결제 리스트 아이템 ───────────────────────────────────
function PaymentRow({ item, override, onClassify, onClick, theme, selectMode, isSelected, onToggle }) {
  const isBlocked  = item.status === 'blocked'
  const isIncoming = item.status === 'incoming'
  const isExternal = item.type === 'external'
  const hasExternalUser = isExternal && item.user && item.user !== '나' && item.user !== '자동'

  const dotColor = isBlocked ? '#EF4444' : isIncoming ? '#10B981' : '#D1D5DB'

  const amountColor = isBlocked ? '#DC2626' : isIncoming ? '#047857' : '#111827'
  const amountText  = isBlocked
    ? 'MCC 차단'
    : isIncoming
    ? `+${fmt(item.amount)}원`
    : `-${fmt(item.amount)}원`

  // 서브 정보 파츠 — 사용자는 별도 렌더링하므로 제외
  const subParts = [item.time]
  if (item.wallet && item.wallet !== '-') subParts.push(item.wallet)
  if (item.card && item.card !== '-') subParts.push(item.card)

  // 외부 사용자가 아닌 경우엔 기존대로 user도 포함
  if (!hasExternalUser && item.user !== '나' && item.user !== '자동') subParts.splice(1, 0, item.user)

  const handleClick = () => {
    if (selectMode) { onToggle(item.id); return }
    onClick()
  }

  return (
    <button onClick={handleClick}
      style={{ width:'100%', padding:'12px 16px', background: isSelected ? '#F0F6FF' : 'transparent',
        border:'none', borderBottom:'1px solid #F0F1F3',
        display:'flex', alignItems:'center', gap:'10px',
        cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        transition:'background 0.1s' }}>

      {/* 선택 체크박스 */}
      {selectMode && (
        <div style={{ width:'22px', height:'22px', borderRadius:'7px', flexShrink:0,
          border:`2px solid ${isSelected ? theme.brandDark : '#D1D5DB'}`,
          background: isSelected ? theme.brandDark : '#fff',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      )}

      {/* 상태 도트 */}
      <div style={{ width:'6px', height:'6px', borderRadius:'50%', flexShrink:0,
        background: dotColor }} />

      {/* 메인 콘텐츠 — 2줄 레이아웃 */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* 1줄: 가맹점명(좌) + 금액(우) */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px', marginBottom:'4px' }}>
          <span style={{ fontSize:'13px', fontWeight:600,
            color: isBlocked ? '#DC2626' : '#111827',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {item.merchant}
          </span>
          <span style={{ fontSize:'13px', fontWeight:700, color: amountColor, flexShrink:0 }}>
            {amountText}
          </span>
        </div>
        {/* 2줄: 사용자명(브랜드 컬러) + 서브정보(좌) + 카테고리 태그(우) */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'4px', flex:1, minWidth:0,
            overflow:'hidden' }}>
            {hasExternalUser && (
              <>
                <span style={{ fontSize:'11px', fontWeight:700,
                  color: theme.brandDark, flexShrink:0 }}>
                  {item.user}
                </span>
                {subParts.length > 0 && (
                  <span style={{ fontSize:'11px', color:'#D1D5DB', flexShrink:0 }}>·</span>
                )}
              </>
            )}
            <span style={{ fontSize:'11px', color:'#9CA3AF',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {subParts.join(' · ')}
            </span>
          </div>
          {!isBlocked && (
            <div style={{ flexShrink:0 }}>
              <CategoryTag item={item} override={override} onClassify={onClassify} />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── 분류 바텀시트 (대분류 섹션 + 중분류 선택) ──────────────
function ClassifySheet({ target, onSelect, onClose, theme }) {
  const [selMain, setSelMain] = useState(null)
  const [visible, setVisible] = useState(false)
  const [displayTarget, setDisplayTarget] = useState(null)
  const [pending, setPending] = useState(null) // { sub, selMain } — 확인 대기 중

  useEffect(() => {
    if (target) {
      setDisplayTarget(target)
      setSelMain(null)
      setPending(null)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setDisplayTarget(null), 340)
      return () => clearTimeout(t)
    }
  }, [target])

  if (!displayTarget) return null
  const subs = selMain ? (CATEGORY_GROUPS.find(g => g.main === selMain)?.subs || []) : null
  return (
    <div style={{ position:'absolute', inset:0, zIndex:300,
      display:'flex', flexDirection:'column', justifyContent:'flex-end',
      background: visible ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
      transition:'background 0.28s ease' }}
      onClick={pending ? undefined : onClose}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 16px 36px', maxHeight:'80%', overflowY:'auto',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform 0.34s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width:'36px', height:'4px', background:'#E9EAEC', borderRadius:'2px', margin:'0 auto 18px' }} />

        {/* ── 확인 팝업 ── */}
        {pending ? (
          <>
            <div style={{ textAlign:'center', padding:'8px 0 20px' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'14px',
                background: theme?.brandDark ? `${theme.brandDark}18` : '#EEF2FF',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 14px', fontSize:'22px' }}>
                ✓
              </div>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>
                분류 확인
              </div>
              <div style={{ fontSize:'13px', color:'#6B7280', lineHeight:1.6 }}>
                <span style={{ fontWeight:600, color:'#111827' }}>{displayTarget.merchant}</span>을<br/>
                <span style={{ fontWeight:700, color: theme?.brandDark || '#1E3A5F' }}>
                  {pending.selMain} · {pending.sub}
                </span>
                (으)로 분류할까요?
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <button onClick={() => setPending(null)}
                style={{ height:'46px', borderRadius:'13px', fontSize:'14px', fontWeight:600,
                  background:'#F4F5F7', color:'#374151', border:'1px solid #E9EAEC',
                  cursor:'pointer', fontFamily:'inherit' }}>
                취소
              </button>
              <button onClick={() => onSelect(displayTarget.id, pending.sub, pending.selMain)}
                style={{ height:'46px', borderRadius:'13px', fontSize:'14px', fontWeight:700,
                  background: theme?.activeBtnGrad || theme?.brandDark || '#1E3A5F',
                  color:'#fff', border:'none',
                  cursor:'pointer', fontFamily:'inherit',
                  boxShadow: theme?.activeShadow || 'none' }}>
                확인
              </button>
            </div>
          </>
        ) : selMain ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <button onClick={() => setSelMain(null)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:'0 4px 0 0', display:'flex', alignItems:'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>{selMain} · 중분류 선택</span>
            </div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px', paddingLeft:'26px' }}>{displayTarget.merchant}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px' }}>
              {subs.map((sub, i) => {
                const isLast = i === subs.length - 1 && subs.length % 2 !== 0
                return (
                  <button key={sub} onClick={() => setPending({ sub, selMain })}
                    style={{ padding:'14px 0', gridColumn: isLast ? 'span 2' : undefined,
                      background: theme?.brandDark || '#1E3A5F', border:'none',
                      borderRadius:'10px', fontSize:'14px', fontWeight:600, color:'#fff',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'center',
                      boxShadow:`0 2px 8px ${theme?.brandDark || '#1E3A5F'}40` }}>
                    {sub}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'4px' }}>결제 목적 분류</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px' }}>{displayTarget.merchant}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px' }}>
              {CATEGORY_GROUPS.map((g, i) => {
                const isLast = i === CATEGORY_GROUPS.length - 1 && CATEGORY_GROUPS.length % 2 !== 0
                return (
                  <button key={g.main} onClick={() => setSelMain(g.main)}
                    style={{ padding:'14px 0', gridColumn: isLast ? 'span 2' : undefined,
                      background:'#F4F5F7', border:'1px solid #E9EAEC',
                      borderRadius:'10px', fontSize:'14px', fontWeight:600, color:'#374151',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                    {g.main}
                    <span style={{ display:'block', fontSize:'10px', color:'#9CA3AF', fontWeight:400, marginTop:'2px' }}>
                      {g.subs.slice(0,3).join(' · ')}{g.subs.length > 3 ? ' …' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function PaymentAlerts() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const { userType } = useUser()
  const scrollRef  = useRef(null)
  const title1Ref  = useRef(null)
  const title2Ref  = useRef(null)

  // 헤더 색상 — 상세화면은 그라데이션 대신 원색
  const NAV_COLOR    = theme.headerSolid

  // 타이틀 크로스페이드 (직접 DOM 조작)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const FADE_START = 60, FADE_END = 110
    let raf = null
    const update = () => {
      const p = Math.min(1, Math.max(0, (el.scrollTop - FADE_START) / (FADE_END - FADE_START)))
      if (title1Ref.current) title1Ref.current.style.opacity = String(Math.max(0, 1 - p * 1.6))
      if (title2Ref.current) title2Ref.current.style.opacity = String(Math.max(0, (p - 0.4) * 1.8))
      raf = null
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const [activeTab, setActiveTab] = useState('all')
  const [purposeOverrides, setPurposeOverrides] = useState({})
  const [classifyTarget, setClassifyTarget] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [justifyModal, setJustifyModal] = useState(false)
  const [justifyOpen,  setJustifyOpen]  = useState(false)
  const [justifyMsg, setJustifyMsg] = useState('')
  const [claimReq, setClaimReq] = useState(true)
  const [evidReq, setEvidReq] = useState(false)
  const [toast, setToast] = useState(null)

  const toggleSelect = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )
  const toggleAll = () => {
    const allIds = filtered.map(p => p.id)
    setSelected(prev => prev.length === allIds.length ? [] : allIds)
  }
  const openJustify = () => {
    setJustifyMsg('')
    setClaimReq(true)
    setEvidReq(false)
    setJustifyModal(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setJustifyOpen(true)))
  }
  const closeJustify = () => {
    setJustifyOpen(false)
    setTimeout(() => setJustifyModal(false), 340)
  }
  const handleJustifySend = () => {
    closeJustify()
    setSelectMode(false)
    setSelected([])
    setToast('💬 소명요청 메시지 발송 완료')
    setTimeout(() => setToast(null), 2400)
  }

  // 탭별 필터
  const filtered = PROCESSED_PAYMENTS.filter(p => {
    if (activeTab === 'all') return true
    return p.type === activeTab
  })

  const totalBlocked = PROCESSED_PAYMENTS.filter(p => p.status === 'blocked').length
  const unclassified = PROCESSED_PAYMENTS.filter(p =>
    !p.categoryAuto && p.category === null && !purposeOverrides[p.id] && p.status !== 'blocked'
  ).length

  const handleClassify = (id, value) => {
    setPurposeOverrides(prev => ({ ...prev, [id]: value }))
    setClassifyTarget(null)
  }

  return (
    <PhoneShell>
      {/* ── 전체 스크롤 컨테이너 ── */}
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
            style={{ width:'32px', height:'32px', background:'transparent', border:'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', padding:0, flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          {/* 타이틀 크로스페이드 */}
          <span style={{ flex:1, position:'relative', height:'22px', overflow:'hidden' }}>
            <span ref={title1Ref} style={{ position:'absolute', inset:0, fontSize:'15px', fontWeight:600, color:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center' }}>
              실시간 결제
            </span>
            <span ref={title2Ref} style={{ position:'absolute', inset:0, fontSize:'15px', fontWeight:700, color:'#fff', display:'flex', alignItems:'center', opacity:0 }}>
              실시간 결제
            </span>
          </span>

          {/* 소명요청 버튼 — 개인은 숨김 */}
          {userType !== 'personal' && (
            <button onClick={() => { setSelectMode(v => !v); setSelected([]) }}
              style={{ padding:'6px 12px', flexShrink:0,
                background: selectMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)',
                border:'1px solid rgba(255,255,255,0.3)', borderRadius:'20px',
                color: selectMode ? NAV_COLOR : '#fff',
                fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', gap:'5px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              내역확인요청
            </button>
          )}
        </div>

        {/* ── ② 프로필 히어로 (자연스럽게 스크롤됨) ── */}
        <div style={{ background: NAV_COLOR, padding:'12px 20px 18px' }}>
          <div style={{ fontSize:'28px', fontWeight:700, color:'#fff', lineHeight:1.25, letterSpacing:'-1px' }}>
            실시간 결제
          </div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', marginTop:'4px' }}>
            전체 <strong style={{ color:'#fff' }}>{ALL_PAYMENTS.length}</strong>건
            {totalBlocked > 0 && <span style={{ color:'#FCA5A5', fontWeight:600 }}> · 차단 {totalBlocked}건</span>}
            {unclassified > 0 && <span style={{ color:'#FDE68A', fontWeight:600 }}> · 미분류 {unclassified}건</span>}
          </div>
        </div>

        {/* ── ③ Sticky 탭 바 ── */}
        <div className="sticky-tabs-safe" style={{
          position:'sticky', top:'66px', zIndex:9,
          background: NAV_COLOR,
          display:'flex', overflowX:'auto',
          borderTop:'1px solid rgba(255,255,255,0.12)',
          scrollbarWidth:'none', msOverflowStyle:'none',
          padding:'0 4px',
        }}>
          {(userType === 'personal' ? TABS.filter(t => t.key !== 'auto') : TABS).map(tab => {
            const count = tab.key === 'anomaly'
              ? PROCESSED_PAYMENTS.filter(p => p.type === 'anomaly').length : 0
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ flexShrink:0, padding:'10px 14px',
                  background:'none', border:'none',
                  borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
                  cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ fontSize:'13px', fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                  {tab.label}
                </span>
                {tab.key === 'anomaly' && count > 0 && (
                  <span style={{ fontSize:'10px', fontWeight:700, color:'#FCA5A5',
                    background:'rgba(239,68,68,0.25)', padding:'1px 6px', borderRadius:'10px' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── ④ 선택 모드 바 ── */}
        {selectMode && (
          <div style={{ background:'#fff', borderBottom:'1px solid #F0F1F3',
            padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
            <button onClick={toggleAll}
              style={{ width:'22px', height:'22px', borderRadius:'7px', flexShrink:0,
                border:`2px solid ${selected.length === filtered.length && filtered.length > 0 ? theme.brandDark : '#D1D5DB'}`,
                background: selected.length === filtered.length && filtered.length > 0 ? theme.brandDark : '#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0 }}>
              {selected.length === filtered.length && filtered.length > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
            <span style={{ flex:1, fontSize:'13px', color:'#374151', fontWeight:600 }}>
              {selected.length > 0 ? `${selected.length}건 선택됨` : '전체 선택'}
            </span>
            {selected.length > 0 && (
              <button onClick={openJustify}
                style={{ padding:'6px 14px', background: theme.activeBtnGrad, color:'#fff',
                  border:'none', borderRadius:'20px', fontSize:'12px', fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit' }}>
                요청보내기
              </button>
            )}
          </div>
        )}

        {/* ── ⑤ 리스트 ── */}
        <div style={{ background:'#F4F5F7', padding:'10px 14px 80px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'60px 0', textAlign:'center', color:'#9CA3AF', fontSize:'14px' }}>
              해당 내역이 없어요
            </div>
          ) : (
            <div style={CARD_STYLE}>
              {filtered.map((item, i) => (
                <PaymentRow
                  key={item.id}
                  item={item}
                  override={purposeOverrides[item.id] ?? null}
                  onClassify={setClassifyTarget}
                  onClick={() => navigate('/payments/' + item.id, { state: { paymentType: item.type } })}
                  theme={theme}
                  selectMode={selectMode}
                  isSelected={selected.includes(item.id)}
                  onToggle={toggleSelect}
                />
              ))}
              <style>{`.payment-last { border-bottom: none !important; }`}</style>
            </div>
          )}

          {/* 외부 결제 안내 */}
          {(activeTab === 'all' || activeTab === 'external') && (
            <div style={{ marginTop:'10px', padding:'12px 16px', background:'#FFFFFF',
              borderRadius:'12px', border:'1px solid #E9EAEC' }}>
              <div style={{ fontSize:'11px', color:'#9CA3AF', lineHeight:1.6, textAlign:'center' }}>
                🔒 외부 사용자의 정확한 가맹점명은 단계형 공개 정책에 따라 보호됩니다
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── 분류 바텀시트 ── */}
      <ClassifySheet
        target={classifyTarget}
        onSelect={handleClassify}
        onClose={() => setClassifyTarget(null)}
      />

        {/* ── 사용내역확인 모달 (ApprovalCenter 추가요청 스타일) ── */}
        {justifyModal && (() => {
          const selItems = filtered.filter(p => selected.includes(p.id))
          const canSend = (claimReq || evidReq) && justifyMsg.trim().length >= 1
          return (
            <div style={{ position:'absolute', inset:0, zIndex:400,
              display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
              <div onClick={closeJustify}
                style={{ flex:1, background:'rgba(0,0,0,0.5)',
                  opacity: justifyOpen ? 1 : 0,
                  transition:'opacity 0.28s ease' }} />
              <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'20px 20px 36px',
                maxHeight:'85vh', overflowY:'auto',
                transform: justifyOpen ? 'translateY(0)' : 'translateY(100%)',
                transition:'transform 0.34s cubic-bezier(0.32,0.72,0,1)' }}>
                {/* 핸들 */}
                <div style={{ width:'36px', height:'4px', borderRadius:'2px',
                  background:'#E5E7EB', margin:'0 auto 16px' }} />
                <div style={{ fontSize:'16px', fontWeight:700, color:'#111827', marginBottom:'3px' }}>
                  사용내역확인 요청
                </div>
                <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'14px' }}>
                  {selItems.length}건 선택 · 플랫폼 메시지로 전송
                </div>

                {/* 선택된 항목 목록 */}
                <div style={{ background:'#F8F9FF', borderRadius:'10px',
                  padding:'10px 12px', marginBottom:'14px', maxHeight:'90px', overflowY:'auto' }}>
                  {selItems.map((p, i) => (
                    <div key={i} style={{ fontSize:'11px', color:'#374151',
                      padding:'2px 0', display:'flex', justifyContent:'space-between' }}>
                      <span>{p.merchant}</span>
                      <span style={{ fontWeight:700, color:'#111827' }}>
                        {p.amount === 0 ? 'MCC 차단' : `${Math.abs(p.amount).toLocaleString()}원`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 요청 유형 선택 */}
                <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>
                  요청 유형
                </div>
                {[
                  { key:'claim', label:'소명 요청', sub:'결제 목적·사유 소명 요청', on: claimReq, set: setClaimReq, color:'#4F46E5' },
                  { key:'evid',  label:'증빙 요청', sub:'영수증·서류 첨부 요청',     on: evidReq,  set: setEvidReq,  color:'#0891B2' },
                ].map(opt => (
                  <div key={opt.key} onClick={() => opt.set(v => !v)}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 13px', borderRadius:'12px', marginBottom:'7px', cursor:'pointer',
                      background: opt.on ? (opt.key==='claim' ? '#EEF2FF' : '#ECFEFF') : '#F9FAFB',
                      border: `1.5px solid ${opt.on ? (opt.key==='claim' ? '#A5B4FC' : '#A5F3FC') : '#E9EAEC'}`,
                      transition:'all 0.15s' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color: opt.on ? opt.color : '#374151' }}>{opt.label}</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>{opt.sub}</div>
                    </div>
                    <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
                      background: opt.on ? opt.color : '#E9EAEC',
                      display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                      {opt.on && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  </div>
                ))}

                {/* 메시지 */}
                <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', margin:'12px 0 8px',
                  display:'flex', alignItems:'center', gap:'5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  요청 메시지
                </div>
                <textarea value={justifyMsg} onChange={e => setJustifyMsg(e.target.value)}
                  rows={3} placeholder="확인을 요청할 내용을 입력하세요"
                  style={{ width:'100%', borderRadius:'10px', border:'1px solid #E9EAEC',
                    padding:'10px 12px', fontSize:'12px', color:'#111827', fontFamily:'inherit',
                    resize:'none', outline:'none', background:'#F8F9FF', marginBottom:'12px',
                    boxSizing:'border-box', lineHeight:1.6 }} />

                {/* 버튼 */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'8px' }}>
                  <button onClick={closeJustify}
                    style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:600,
                      background:'#F4F5F7', color:'#374151', border:'1px solid #E9EAEC',
                      cursor:'pointer', fontFamily:'inherit' }}>
                    취소
                  </button>
                  <button onClick={handleJustifySend} disabled={!canSend}
                    style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:700,
                      background: canSend ? theme.activeBtnGrad : '#E9EAEC',
                      color: canSend ? '#fff' : '#9CA3AF', border:'none',
                      cursor: canSend ? 'pointer' : 'default', fontFamily:'inherit',
                      boxShadow: canSend ? theme.activeShadow : 'none' }}>
                    💬 메시지로 전송
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── 토스트 ── */}
        {toast && (
          <div style={{ position:'absolute', bottom:'90px', left:'50%', transform:'translateX(-50%)',
            background:'#111827', color:'#fff', padding:'9px 18px', borderRadius:'20px',
            fontSize:'12px', fontWeight:600, whiteSpace:'nowrap', zIndex:500,
          }}>
            {toast}
          </div>
        )}

    </PhoneShell>
  )
}
