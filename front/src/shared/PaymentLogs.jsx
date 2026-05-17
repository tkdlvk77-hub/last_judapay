import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useT } from '../design/i18n'
import { useUser } from '../contexts/UserContext'

// 데모 결제 로그 데이터 (확장)
// id가 PaymentDetail의 PAYMENTS 키와 일치해야 상세 매핑 됨
const ALL_LOGS = [
  // 오늘
  { id:'l1',         name:'스타벅스 강남점',   meta:'09:12',        date:'2026-05-06', amount:-4500,    type:'normal',  mcc:'카페',      category:null,        categoryAuto:false },
  { id:'log_today_2',name:'CU 역삼점',          meta:'07:45',        date:'2026-05-06', amount:-3200,    type:'normal',  mcc:'편의점',    category:null,        categoryAuto:false },

  // 어제
  { id:'l2',         name:'서울시 교육비 지원', meta:'14:00',        date:'2026-05-05', amount:200000,   type:'plus',    mcc:'정부 지원', category:null,        categoryAuto:false, tag:'받은 자금' },
  { id:'p1',         name:'이마트 역삼점',       meta:'14:32',        date:'2026-05-05', amount:-32000,   type:'normal',  mcc:'식료품',    category:'운영',      categoryAuto:true  },
  { id:'log_y_3',    name:'택시 카드결제',       meta:'08:20',        date:'2026-05-05', amount:-12500,   type:'normal',  mcc:'교통',      category:'출장식대',  categoryAuto:true  },

  // 이번 주
  { id:'log_w_1',    name:'박민준에게 빌려줌',   meta:'5월 4일',      date:'2026-05-04', amount:-1000000, type:'normal',  mcc:'개인 송금', category:null,        categoryAuto:false, tag:'빌려주기' },
  { id:'log_w_2',    name:'올리브영 강남점',     meta:'5월 3일',      date:'2026-05-03', amount:-28900,   type:'normal',  mcc:'생활',      category:'개인사용',  categoryAuto:false },

  // 지난 주 - 차단 케이스
  { id:'p2',         name:'GS강남게임센터',      meta:'4월 28일',     date:'2026-04-28', amount:-150000,  type:'blocked', mcc:'오락/게임', category:null,        categoryAuto:false },
  { id:'r1',         name:'강남 룸살롱',          meta:'4월 27일 23:41',date:'2026-04-27',amount:-89000,   type:'risk',    mcc:'유흥/오락', category:null,        categoryAuto:false },
  { id:'r2',         name:'강원랜드 카지노',      meta:'4월 26일 22:15',date:'2026-04-26',amount:-320000,  type:'risk',    mcc:'도박',      category:null,        categoryAuto:false },
  { id:'log_lw_2',   name:'쿠팡 정기결제',        meta:'4월 27일',     date:'2026-04-27', amount:-29900,   type:'normal',  mcc:'쇼핑',      category:'구독료',    categoryAuto:true  },

  // 더 전
  { id:'log_old_1',  name:'박철수 외주비 입금',   meta:'4월 20일',     date:'2026-04-20', amount:1500000,  type:'plus',    mcc:'외주비',    category:null,        categoryAuto:false, tag:'받은 자금' },
  { id:'log_old_2',  name:'이호형에게 송금',       meta:'4월 18일',     date:'2026-04-18', amount:-50000,   type:'normal',  mcc:'개인 송금', category:'개인사용',  categoryAuto:false, tag:'선물' },
]

const PURPOSE_OPTIONS = ['운영', '출장식대', '복리후생', '기타', '개인사용']

// 날짜 그룹핑 헬퍼
function getGroup(dateStr) {
  const today = new Date('2026-05-06')
  const target = new Date(dateStr)
  const diffDays = Math.floor((today - target) / (1000*60*60*24))
  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays <= 7) return '이번 주'
  if (diffDays <= 14) return '지난 주'
  return '더 전'
}

const FILTER_TABS = [
  { id:'all',     label:'전체' },
  { id:'risk',    label:'위험' },
  { id:'blocked', label:'차단' },
  { id:'normal',  label:'정상' },
  { id:'plus',    label:'입금' },
]

// ─── 카테고리 태그 ────────────────────────────────────────
function CategoryTag({ log, override, onClassify }) {
  const cat = override ?? log.category
  const isAuto = !override && log.categoryAuto
  const isUnclassified = cat === null
  const isBlocked = log.type === 'blocked' || log.type === 'risk'
  if (isBlocked) return null

  if (isUnclassified) {
    return (
      <button onClick={e => { e.stopPropagation(); onClassify(log) }}
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

// ─── 분류 바텀시트 ────────────────────────────────────────
function ClassifySheet({ target, onSelect, onClose }) {
  const theme = getAccountTheme()
  const [open, setOpen] = useState(false)
  const [pendingOpt, setPendingOpt] = useState(null)

  useEffect(() => {
    if (target) {
      const id = requestAnimationFrame(() => setOpen(true))
      return () => cancelAnimationFrame(id)
    }
  }, [target])

  const handleClose = () => {
    if (pendingOpt) { setPendingOpt(null); return }
    setOpen(false)
    setTimeout(onClose, 320)
  }

  const handleConfirm = () => {
    setOpen(false)
    setTimeout(() => onSelect(target.id, pendingOpt), 320)
  }

  if (!target) return null
  return (
    <div
      style={{
        position:'absolute', inset:0, zIndex:300,
        background: open ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
        display:'flex', flexDirection:'column', justifyContent:'flex-end',
        transition:'background 0.32s',
      }}
      onClick={handleClose}>
      <div
        style={{
          background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 16px 36px',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition:'transform 0.34s cubic-bezier(0.32,0.72,0,1)',
          position:'relative',
        }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width:'36px', height:'4px', background:'#E9EAEC', borderRadius:'2px', margin:'0 auto 18px' }} />
        <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'4px' }}>결제 목적 분류</div>
        <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px' }}>{target.name}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px' }}>
          {PURPOSE_OPTIONS.map((opt, i) => (
            <button key={opt} onClick={() => setPendingOpt(opt)}
              style={{ padding:'14px 0', background:'#F4F5F7', border:'1px solid #E9EAEC',
                borderRadius:'10px', fontSize:'14px', fontWeight:600, color:'#374151',
                cursor:'pointer', fontFamily:'inherit', textAlign:'center',
                gridColumn: i === PURPOSE_OPTIONS.length - 1 && PURPOSE_OPTIONS.length % 2 === 1 ? 'span 2' : undefined }}>
              {opt}
            </button>
          ))}
        </div>

        {/* 확인 팝업 */}
        {pendingOpt && (
          <div style={{
            position:'absolute', inset:0,
            background:'rgba(255,255,255,0.92)',
            borderRadius:'20px 20px 0 0',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'24px',
          }}
            onClick={e => e.stopPropagation()}>
            <div style={{
              background:'#fff', borderRadius:'16px', padding:'24px 20px',
              width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.14)',
              textAlign:'center',
            }}>
              <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'10px' }}>
                분류 확인
              </div>
              <div style={{ fontSize:'13px', color:'#6B7280', lineHeight:1.7, marginBottom:'20px' }}>
                <strong style={{ color:'#111827' }}>{target.name}</strong>을(를)<br/>
                <strong style={{ color: theme.brandDark }}>{pendingOpt}</strong>으로 분류합니다.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <button onClick={() => setPendingOpt(null)}
                  style={{ height:'44px', borderRadius:'10px', fontSize:'14px', fontWeight:600,
                    background:'#F4F5F7', color:'#6B7280', border:'1px solid #E9EAEC',
                    cursor:'pointer', fontFamily:'inherit' }}>
                  취소
                </button>
                <button onClick={handleConfirm}
                  style={{ height:'44px', borderRadius:'10px', fontSize:'14px', fontWeight:700,
                    background: theme.brandDark, color:'#fff', border:'none',
                    cursor:'pointer', fontFamily:'inherit' }}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── sticky 네비 바 ─────────────────────────────────────
function StickyNav({ cardLabel, onBack, onJustify, selectMode }) {
  const theme = getAccountTheme()
  const { userType } = useUser()
  return (
    <div className="sticky-nav-safe" style={{
      position:'sticky', top:0, zIndex:10,
      background: theme.headerSolid,
      overflow:'hidden',
    }}>
      <div style={{ display:'flex', alignItems:'center', padding:'0 16px 10px', gap:'8px' }}>
        <button onClick={onBack}
          style={{ width:'32px', height:'32px', background:'transparent', border:'none',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontSize:'17px', fontWeight:700, color:'#fff', flex:1, letterSpacing:'-0.3px' }}>
          결제 내역
        </span>
        {userType !== 'personal' && (
          <button onClick={onJustify}
            style={{
              padding:'6px 14px',
              background: selectMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)',
              border:'1px solid rgba(255,255,255,0.3)',
              borderRadius:'20px', color: selectMode ? theme.brandDark : '#fff',
              fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:'5px',
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            내역확인요청
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 히어로 (스크롤 시 접힘) ────────────────────────────
function HeroSection({ cardLabel, count }) {
  const theme = getAccountTheme()
  const hasCard = !!cardLabel
  return (
    <div style={{ background: theme.headerSolid, padding:'4px 20px 22px' }}>
      {hasCard && (
        <div style={{
          display:'inline-flex', alignItems:'center', gap:'5px',
          background:'rgba(255,255,255,0.15)',
          border:'1px solid rgba(255,255,255,0.25)',
          borderRadius:'20px', padding:'3px 10px 3px 7px', marginBottom:'8px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/>
          </svg>
          <span style={{ fontSize:'11px', fontWeight:700, color:'#fff' }}>{cardLabel}</span>
        </div>
      )}
      <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', lineHeight:1.25, letterSpacing:'-1px' }}>
        {hasCard ? `${cardLabel} 결제 내역` : '결제 내역'}
      </div>
      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', marginTop:'4px' }}>
        전체 <strong style={{ color:'#fff' }}>{count}</strong>건
      </div>
    </div>
  )
}

export default function PaymentLogs() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const cardLabel = location.state?.cardLabel || null
  const scrollRef = useScrollRestore()
  const [filter, setFilter] = useState('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [justifyModal, setJustifyModal] = useState(false)
  const [justifyOpen, setJustifyOpen]   = useState(false)
  const [justifyMsg, setJustifyMsg] = useState('')
  const [claimReq, setClaimReq] = useState(true)
  const [evidReq, setEvidReq] = useState(false)

  const openJustify = () => {
    setJustifyModal(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setJustifyOpen(true)))
  }
  const closeJustify = () => {
    setJustifyOpen(false)
    setTimeout(() => setJustifyModal(false), 320)
  }
  const [purposeOverrides, setPurposeOverrides] = useState({})
  const [classifyTarget, setClassifyTarget] = useState(null)

  const handleClassify = (log) => setClassifyTarget(log)
  const handleClassifySelect = (id, purpose) => {
    setPurposeOverrides(prev => ({ ...prev, [id]: purpose }))
    setClassifyTarget(null)
  }

  // 필터 + 검색 적용
  const filtered = useMemo(() => {
    return ALL_LOGS.filter(log => {
      if (filter !== 'all' && log.type !== filter) return false
      return true
    })
  }, [filter])

  // 날짜 그룹핑
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(log => {
      const g = getGroup(log.date)
      if (!groups[g]) groups[g] = []
      groups[g].push(log)
    })
    return groups
  }, [filtered])

  const groupOrder = ['오늘', '어제', '이번 주', '지난 주', '더 전']
  const visibleGroups = groupOrder.filter(g => grouped[g]?.length > 0)

  // 카운트별 (필터 칩 옆에 표시)
  const counts = useMemo(() => ({
    all: ALL_LOGS.length,
    risk: ALL_LOGS.filter(l => l.type === 'risk').length,
    normal: ALL_LOGS.filter(l => l.type === 'normal').length,
    blocked: ALL_LOGS.filter(l => l.type === 'blocked').length,
    plus: ALL_LOGS.filter(l => l.type === 'plus').length,
  }), [])

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        <StickyNav
          cardLabel={cardLabel}
          onBack={() => navigate(-1)}
          selectMode={selectMode}
          onJustify={() => { setSelectMode(v => !v); setSelected([]) }}
        />
        <HeroSection cardLabel={cardLabel} count={ALL_LOGS.length} />

        <div style={{ padding:'18px 16px 24px' }}>


          {/* 선택 모드 바 */}
          {selectMode && (
            <div style={{
              background: COLORS.bgCard, boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg, padding:'10px 14px',
              display:'flex', alignItems:'center', gap:'10px',
              marginBottom:'12px',
            }}>
              <button onClick={() => {
                const allIds = filtered.map(l => l.id)
                setSelected(prev => prev.length === allIds.length ? [] : allIds)
              }}
                style={{
                  width:'22px', height:'22px', borderRadius:'7px', flexShrink:0,
                  border:`2px solid ${selected.length === filtered.length && filtered.length > 0 ? theme.brandDark : COLORS.borderSoft}`,
                  background: selected.length === filtered.length && filtered.length > 0 ? theme.brandDark : '#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', padding:0,
                }}>
                {selected.length === filtered.length && filtered.length > 0 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              <span style={{ flex:1, fontSize:'13px', color: COLORS.t2, fontWeight:600 }}>
                {selected.length > 0 ? `${selected.length}건 선택됨` : '전체 선택'}
              </span>
              {selected.length > 0 && (
                <button onClick={openJustify}
                  style={{
                    padding:'8px 16px',
                    background: theme.activeBtnGrad, border:'none',
                    borderRadius: RADIUS.pill, color:'#fff',
                    fontSize:'12px', fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit',
                    boxShadow: theme.activeShadow,
                  }}>
                  💳 사용내역확인 {selected.length}건
                </button>
              )}
            </div>
          )}

          {/* 필터 탭 (가로 스크롤) */}
          <div style={{
            display:'flex', gap:'6px',
            overflowX:'auto',
            paddingBottom:'4px',
            marginBottom:'14px',
            marginLeft:'-16px', marginRight:'-16px', paddingLeft:'16px', paddingRight:'16px',
            scrollbarWidth:'none',
          }}>
            {FILTER_TABS.map(tab => {
              const active = filter === tab.id
              const count = counts[tab.id] || 0
              return (
                <button key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    flexShrink:0,
                    padding:'8px 14px',
                    background: active ? theme.brandDark : COLORS.bgCard,
                    boxShadow: active ? SHADOWS.buttonBrand : SHADOWS.card,
                    color: active ? '#fff' : COLORS.t2,
                    border:'none',
                    borderRadius: RADIUS.pill,
                    fontSize:'12px', fontWeight: active ? 700 : 600,
                    cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:'6px',
                  }}>
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize:'10px',
                    color: active ? 'rgba(255,255,255,0.7)' : COLORS.t4,
                    fontWeight:600,
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 빈 상태 */}
          {filtered.length === 0 ? (
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'48px 20px',
              textAlign:'center',
            }}>
              <div style={{
                width:'56px', height:'56px',
                background: COLORS.bgMuted,
                borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 14px',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t2, marginBottom:'4px' }}>
                결과가 없어요
              </div>
              <div style={{ fontSize:'12px', color: COLORS.t4 }}>
                {search ? `"${search}" 검색 결과가 없어요` : '해당하는 결제 내역이 없어요'}
              </div>
            </div>
          ) : (
            // 그룹별 리스트
            visibleGroups.map(groupName => (
              <div key={groupName} style={{ marginBottom:'18px' }}>
                <div style={{
                  fontSize:'11px', fontWeight:700,
                  color: COLORS.t4,
                  marginBottom:'8px',
                  padding:'0 4px',
                  textTransform:'uppercase',
                  letterSpacing:'0.5px',
                }}>
                  {groupName} · {grouped[groupName].length}건
                </div>
                <div style={{
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  borderRadius: RADIUS.lg,
                  overflow:'hidden',
                }}>
                  {grouped[groupName].map((log, i, arr) => {
                    const blocked  = log.type === 'blocked' || log.type === 'risk'
                    const incoming = log.type === 'plus'
                    const isSelected = selected.includes(log.id)

                    const dotColor    = blocked ? '#EF4444' : incoming ? '#10B981' : '#D1D5DB'
                    const amountColor = blocked ? '#DC2626' : incoming ? '#047857' : '#111827'
                    const amountText  = blocked
                      ? 'MCC 차단'
                      : `${incoming ? '+' : '-'}${Math.abs(log.amount).toLocaleString()}원`

                    return (
                      <button key={log.id}
                        onClick={() => {
                          if (selectMode) {
                            setSelected(prev => prev.includes(log.id) ? prev.filter(x=>x!==log.id) : [...prev, log.id])
                          } else {
                            navigate(`/payments/${log.id}`)
                          }
                        }}
                        style={{
                          width:'100%', padding:'12px 16px',
                          background: isSelected ? '#F0F6FF' : 'transparent',
                          border:'none',
                          borderBottom: i < arr.length-1 ? `1px solid #F0F1F3` : 'none',
                          display:'flex', alignItems:'center', gap:'10px',
                          cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                          transition:'background 0.1s',
                        }}>

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
                              color: blocked ? '#DC2626' : '#111827',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                              {log.name}
                            </span>
                            <span style={{ fontSize:'13px', fontWeight:700, color: amountColor, flexShrink:0 }}>
                              {amountText}
                            </span>
                          </div>
                          {/* 2줄: 서브정보(좌) + 분류 태그(우) */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                            <span style={{ fontSize:'11px', color:'#9CA3AF',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {log.meta} · {log.mcc}
                              {log.tag && !incoming && (
                                <span style={{ marginLeft:'4px', padding:'1px 6px', borderRadius:'3px',
                                  background:`${theme.brandDark}18`, color: theme.brandDark,
                                  fontSize:'9px', fontWeight:700 }}>
                                  {log.tag}
                                </span>
                              )}
                            </span>
                            {blocked ? (
                              <span style={{ flexShrink:0, padding:'2px 8px', borderRadius:'5px',
                                background:'#FEE2E2', color:'#DC2626',
                                fontSize:'10px', fontWeight:700 }}>
                                MCC 차단
                              </span>
                            ) : (
                              <CategoryTag
                                log={log}
                                override={purposeOverrides[log.id]}
                                onClassify={handleClassify}
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 사용내역확인 모달 */}
      {justifyModal && (() => {
        const selLogs = filtered.filter(l => selected.includes(l.id))
        const canSend = (claimReq || evidReq) && justifyMsg.trim().length >= 1
        return (
          <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div onClick={closeJustify} style={{ flex:1, background: justifyOpen ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)', transition:'background 0.32s' }} />
            <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'20px 20px 36px', maxHeight:'85vh', overflowY:'auto', transform: justifyOpen ? 'translateY(0)' : 'translateY(100%)', transition:'transform 0.34s cubic-bezier(0.32,0.72,0,1)' }}>
              <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:'#E5E7EB', margin:'0 auto 16px' }} />
              <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, marginBottom:'3px' }}>사용내역확인 요청</div>
              <div style={{ fontSize:'12px', color:COLORS.t4, marginBottom:'14px' }}>
                {selLogs.length}건 선택 · 플랫폼 메시지로 전송
              </div>
              {/* 선택 항목 */}
              <div style={{ background:COLORS.bg, borderRadius:RADIUS.md, padding:'10px 12px', marginBottom:'14px', maxHeight:'90px', overflowY:'auto' }}>
                {selLogs.map((l,i) => (
                  <div key={i} style={{ fontSize:'11px', color:COLORS.t2, padding:'2px 0', display:'flex', justifyContent:'space-between' }}>
                    <span>{l.name}</span>
                    <span style={{ fontWeight:700 }}>{Math.abs(l.amount).toLocaleString()}원</span>
                  </div>
                ))}
              </div>
              {/* 요청 유형 */}
              <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t2, marginBottom:'8px' }}>요청 유형</div>
              {[
                { key:'claim', label:'소명 요청', sub:'결제 목적·사유 소명 요청', on: claimReq, set: setClaimReq, color:'#4F46E5', activeBg:'#EEF2FF', activeBorder:'#A5B4FC' },
                { key:'evid',  label:'증빙 요청', sub:'영수증·서류 첨부 요청',     on: evidReq,  set: setEvidReq,  color:'#0891B2', activeBg:'#ECFEFF', activeBorder:'#A5F3FC' },
              ].map(opt => (
                <div key={opt.key} onClick={() => opt.set(v => !v)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 13px', borderRadius:'12px', marginBottom:'7px', cursor:'pointer',
                    background: opt.on ? opt.activeBg : COLORS.bgMuted,
                    border: `1.5px solid ${opt.on ? opt.activeBorder : COLORS.borderSoft}`,
                    transition:'all 0.15s' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color: opt.on ? opt.color : COLORS.t1 }}>{opt.label}</div>
                    <div style={{ fontSize:'11px', color:COLORS.t4, marginTop:'1px' }}>{opt.sub}</div>
                  </div>
                  <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
                    background: opt.on ? opt.color : COLORS.borderSoft,
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
              <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t2, margin:'12px 0 8px' }}>요청 메시지</div>
              <textarea value={justifyMsg} onChange={e => setJustifyMsg(e.target.value)}
                rows={3} placeholder="확인을 요청할 내용을 입력하세요"
                style={{ width:'100%', borderRadius:'10px', border:`1px solid ${COLORS.borderSoft}`,
                  padding:'10px 12px', fontSize:'12px', color:COLORS.t1, fontFamily:'inherit',
                  resize:'none', outline:'none', background:COLORS.bg, marginBottom:'12px',
                  boxSizing:'border-box', lineHeight:1.6 }} />
              {/* 버튼 */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'8px' }}>
                <button onClick={closeJustify}
                  style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:600,
                    background:COLORS.bgMuted, color:COLORS.t2, border:`1px solid ${COLORS.borderSoft}`,
                    cursor:'pointer', fontFamily:'inherit' }}>취소</button>
                <button onClick={() => { if(canSend){ closeJustify(); setSelectMode(false); setSelected([]); setJustifyMsg(''); setClaimReq(true); setEvidReq(false) } }}
                  disabled={!canSend}
                  style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:700,
                    background: canSend ? theme.activeBtnGrad : COLORS.borderSoft,
                    color: canSend ? '#fff' : COLORS.t4, border:'none',
                    cursor: canSend ? 'pointer' : 'default', fontFamily:'inherit',
                    boxShadow: canSend ? theme.activeShadow : 'none' }}>
                  💬 메시지로 전송
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 분류 바텀시트 */}
      <ClassifySheet
        target={classifyTarget}
        onSelect={handleClassifySelect}
        onClose={() => setClassifyTarget(null)}
      />
    </PhoneShell>
  )
}
