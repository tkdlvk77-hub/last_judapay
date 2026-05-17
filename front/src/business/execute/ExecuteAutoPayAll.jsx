import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'

// ─── 카테고리 정보 ─────────────────────────────────────────
const CATEGORIES = {
  rent:        { label:'임대료',       icon:'🏠', iconBg:'#EDF3FA', route:'/execute/business/operations/rent'         },
  rentlease:   { label:'임차료',       icon:'🔑', iconBg:'#F0FDF4', route:'/execute/business/operations/rent-lease'   },
  subscription:{ label:'구독',         icon:'💻', iconBg:'#F5F3FF', route:'/execute/business/operations/subscription' },
  telecom:     { label:'통신비',       icon:'📱', iconBg:'#EFF6FF', route:'/execute/business/operations/telecom'      },
  utility:     { label:'공과금',       icon:'⚡', iconBg:'#FFFBEB', route:'/execute/business/operations/utility'      },
  insurance:   { label:'보험료',       icon:'🛡️', iconBg:'#F0FDF4', route:'/execute/business/operations/insurance'    },
  tax:         { label:'세금·공과금',  icon:'📋', iconBg:'#FFF7ED', route:'/execute/business/operations/tax'          },
  misc:        { label:'기타 정기지출', icon:'💼', iconBg:'#F5F3FF', route:'/execute/business/operations/misc'        },
}

// ─── 집계 데이터 (각 카테고리 autoOn 항목 대표) ────────────
const ALL_ITEMS = [
  // ── 임대료 ──
  { id:'r1', cat:'rent', name:'강남 사무실 임대료', vendor:'㈜강남부동산', amount:2800000, payDay:'25', cycle:'매월', payMethod:'account', autoOn:true, endDate:'' },
  // ── 임차료 ──
  { id:'rl1', cat:'rentlease', name:'복합기 리스료', vendor:'리코코리아', amount:180000, payDay:'5', cycle:'매월', payMethod:'card', autoOn:true, endDate:'2027-03-31' },
  { id:'rl2', cat:'rentlease', name:'업무용 노트북 렌탈', vendor:'KT렌탈', amount:240000, payDay:'15', cycle:'매월', payMethod:'account', autoOn:true, endDate:'2026-08-31' },
  // ── 구독 ──
  { id:'s1', cat:'subscription', name:'AWS 서버비', vendor:'Amazon Web Services', amount:408000, payDay:'1', cycle:'매월', payMethod:'card', autoOn:true, endDate:'' },
  { id:'s2', cat:'subscription', name:'ChatGPT Team', vendor:'OpenAI', amount:140000, payDay:'15', cycle:'매월', payMethod:'card', autoOn:true, endDate:'' },
  { id:'s3', cat:'subscription', name:'Adobe Creative Cloud', vendor:'Adobe', amount:145200, payDay:'20', cycle:'매월', payMethod:'card', autoOn:true, endDate:'' },
  // ── 통신비 ──
  { id:'t1', cat:'telecom', name:'법인 휴대폰 (대표)', vendor:'SK텔레콤', amount:85000, payDay:'25', cycle:'매월', payMethod:'card', autoOn:true, endDate:'' },
  { id:'t2', cat:'telecom', name:'인터넷 전용선', vendor:'KT', amount:132000, payDay:'10', cycle:'매월', payMethod:'account', autoOn:true, endDate:'' },
  // ── 공과금 ──
  { id:'u1', cat:'utility', name:'전기요금', vendor:'한국전력', amount:320000, payDay:'25', cycle:'매월', payMethod:'account', autoOn:true, endDate:'' },
  { id:'u2', cat:'utility', name:'도시가스', vendor:'서울도시가스', amount:45000, payDay:'말일', cycle:'매월', payMethod:'account', autoOn:true, endDate:'' },
  // ── 보험료 ──
  { id:'i1', cat:'insurance', name:'법인 차량 보험', vendor:'현대해상', amount:90000, payDay:'25', cycle:'매월', payMethod:'card', autoOn:true, endDate:'2026-11-30' },
  { id:'i2', cat:'insurance', name:'직원 단체보험', vendor:'DB손해보험', amount:85000, payDay:'10', cycle:'매월', payMethod:'card', autoOn:true, endDate:'2026-12-31' },
  // ── 세금 ──
  { id:'tx1', cat:'tax', name:'부가가치세', vendor:'국세청', amount:2400000, payDay:'25', cycle:'분기', payMethod:'account', autoOn:true, endDate:'' },
  { id:'tx2', cat:'tax', name:'원천세', vendor:'국세청', amount:320000, payDay:'10', cycle:'매월', payMethod:'account', autoOn:true, endDate:'' },
  // ── 기타 정기지출 ──
  { id:'m1', cat:'misc', name:'사무실 청소비', vendor:'클린파트너스', amount:320000, payDay:'25', cycle:'매월', payMethod:'account', autoOn:true, endDate:'2026-12-31' },
  { id:'m2', cat:'misc', name:'회계 자문료', vendor:'세무법인 한빛', amount:550000, payDay:'말일', cycle:'매월', payMethod:'account', autoOn:true, endDate:'2026-06-30' },
  { id:'m3', cat:'misc', name:'노무 자문료', vendor:'노무법인 동행', amount:420000, payDay:'15', cycle:'매월', payMethod:'account', autoOn:false, endDate:'' },
]

// ─── 필터 옵션 ────────────────────────────────────────────
const FILTER_OPTIONS = ['전체', '급여', '4대보험', '임대료', '렌트리스', '구독료', '통신비', '공과금', '세금', '보험료', '기타 정기지출']

const FILTER_TO_CAT = {
  '임대료':      'rent',
  '렌트리스':    'rentlease',
  '구독료':      'subscription',
  '통신비':      'telecom',
  '공과금':      'utility',
  '보험료':      'insurance',
  '세금':        'tax',
  '기타 정기지출':'misc',
}

// ─── 유틸 ─────────────────────────────────────────────────
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }

function nextPayDate(payDay) {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const lastDay = new Date(y, m + 1, 0).getDate()

  if (payDay === '말일') {
    const thisLast = new Date(y, m + 1, 0)
    if (d <= lastDay) return thisLast
    return new Date(y, m + 2, 0)
  }
  const day = parseInt(payDay)
  if (isNaN(day)) return new Date(y, m + 1, 1)
  if (d <= day) return new Date(y, m, Math.min(day, lastDay))
  const nextMonthLast = new Date(y, m + 2, 0).getDate()
  return new Date(y, m + 1, Math.min(day, nextMonthLast))
}

function daysUntil(date) {
  const today = new Date(); today.setHours(0,0,0,0)
  const t = new Date(date); t.setHours(0,0,0,0)
  return Math.round((t - today) / (1000*60*60*24))
}

function fmtDate(date) {
  return `${date.getMonth()+1}월 ${date.getDate()}일`
}

function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / (1000*60*60*24))
}

function getCycleLabel(cycle) {
  const map = { '매월':'매월', '분기':'분기별', '반기':'반기별', '매년':'매년', '매주':'매주', '매2주':'격주' }
  return map[cycle] || cycle
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export default function ExecuteAutoPayAll() {
  const theme = getAccountTheme()
  const navigate = useNavigate()

  const [screen, setScreen]   = useState('list')
  const [selId, setSelId]     = useState(null)
  const [items, setItems]     = useState(ALL_ITEMS)
  const [showExitModal, setShowExitModal] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [filterLabel, setFilterLabel]     = useState('전체')
  const [showFilterSheet, setShowFilterSheet] = useState(false)

  // [권한] viewer·staff 는 수정 불가
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canEdit = !['viewer', 'staff'].includes(bizRole)

  // 수정 상태
  const [editAmount, setEditAmount]   = useState('')
  const [editPayDay, setEditPayDay]   = useState('')
  const [editAutoOn, setEditAutoOn]   = useState(true)

  const sel = items.find(i => i.id === selId)

  function openDetail(id) {
    const it = items.find(i => i.id === id)
    if (!it) return
    setSelId(id)
    setEditAmount(it.amount)
    setEditPayDay(it.payDay)
    setEditAutoOn(it.autoOn)
    setSaved(false)
    setScreen('detail')
  }

  function handleSave() {
    setItems(prev => prev.map(it => it.id !== selId ? it : {
      ...it,
      amount: Number(String(editAmount).replace(/,/g,'')) || it.amount,
      payDay: editPayDay,
      autoOn: editAutoOn,
    }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  // 정렬: autoOn 항목 먼저, 지급일 빠른 순
  const sortedItems = [...items]
    .filter(it => {
      if (filterLabel === '전체') return true
      const catKey = FILTER_TO_CAT[filterLabel]
      if (!catKey) return false
      return it.cat === catKey
    })
    .map(it => ({
      ...it,
      _nextDate: nextPayDate(it.payDay),
      _daysUntil: daysUntil(nextPayDate(it.payDay)),
    }))
    .sort((a, b) => {
      if (a.autoOn !== b.autoOn) return a.autoOn ? -1 : 1
      return a._daysUntil - b._daysUntil
    })

  const totalMonthly  = items.filter(i => i.autoOn).reduce((s, it) => s + it.amount, 0)
  const expiringSoon  = items.filter(it => { const d=daysLeft(it.endDate); return d!==null && d>=0 && d<=30 }).length

  // 이번 주 / 이후 금액 집계 (autoOn 항목 기준, 정렬된 리스트 기준)
  const allWithDays = items.map(it => ({ ...it, _du: daysUntil(nextPayDate(it.payDay)) }))
  const thisWeekAmt = allWithDays.filter(it => it.autoOn && it._du <= 7).reduce((s, it) => s + it.amount, 0)
  const laterAmt    = allWithDays.filter(it => it.autoOn && it._du > 7).reduce((s, it) => s + it.amount, 0)
  const thisWeekCount = allWithDays.filter(it => it.autoOn && it._du <= 7).length
  const laterCount    = allWithDays.filter(it => it.autoOn && it._du > 7).length

  function FilterSheet() {
    if (!showFilterSheet) return null
    return (
      <div onClick={() => setShowFilterSheet(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', justifyContent:'flex-end', zIndex:900 }}>
        <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'20px 16px 32px' }}>
          <div style={{ width:'36px', height:'4px', background:'#E5E7EB', borderRadius:'2px', margin:'0 auto 16px' }}/>
          <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'14px' }}>카테고리 필터</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {FILTER_OPTIONS.map((opt, i) => {
              const isSelected = filterLabel === opt
              const isLast = i === FILTER_OPTIONS.length - 1 && FILTER_OPTIONS.length % 2 !== 0
              return (
                <button key={opt} onClick={() => { setFilterLabel(opt); setShowFilterSheet(false) }}
                  style={{ gridColumn: isLast ? 'span 2' : undefined, padding:'12px', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:600, border:'none', outline:'none', textAlign:'center', background: isSelected ? theme.brand : COLORS.bgMuted, color: isSelected ? '#fff' : COLORS.t2, boxShadow: isSelected ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function ExitModal() {
    return showExitModal ? (
      <div onClick={() => setShowExitModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' }}>
        <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px', textAlign:'center' }}>나가시겠어요?</div>
          <div style={{ fontSize:'13px', color:'#999', lineHeight:1.6, marginBottom:'20px', textAlign:'center' }}>홈 화면으로 이동합니다.</div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => setShowExitModal(false)} style={{ flex:1, height:'48px', background:'#F3F4F6', color:'#555', border:'none', outline:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
            <button onClick={() => { setShowExitModal(false); navigate('/home-business') }} style={{ flex:1, height:'48px', background:'#EF4444', color:'#fff', border:'none', outline:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
          </div>
        </div>
      </div>
    ) : null
  }

  // ── 상세/수정 화면 ──────────────────────────────────────
  if (screen === 'detail' && sel) {
    const cat = CATEGORIES[sel.cat] || {}
    const nd = nextPayDate(editPayDay || sel.payDay)
    const du = daysUntil(nd)
    const PAY_DAYS_DETAIL = ['1','5','10','15','20','25','말일']
    const isCustom = !PAY_DAYS_DETAIL.includes(editPayDay)

    return (
      <PhoneShell>
        <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
          <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
            {/* 헤더 */}
            <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
                <button onClick={() => setScreen('list')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>{cat.label || '자동 지급'}</span>
                <button onClick={() => navigate(cat.route || '/execute/business/operations')}
                  style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.14)', border:'1px solid rgba(255,255,255,0.22)', padding:'5px 11px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px', outline:'none' }}>
                  상세 설정
                </button>
                <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ padding:'0 20px 18px', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sel.name}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)' }}>{cat.icon} {sel.vendor}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>다음 지급</div>
                  <div style={{ fontSize:'15px', fontWeight:800, color:'#fff' }}>{fmtDate(nd)}</div>
                  <div style={{ fontSize:'10px', color: du<=3 ? '#FCD34D' : 'rgba(255,255,255,0.55)', fontWeight:600 }}>D-{du}</div>
                </div>
              </div>
            </div>

            <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* 지급액 편집 타일 */}
              <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark }}>지급액 ({getCycleLabel(sel.cycle)})</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'3px', background:`${theme.brand}18`, borderRadius:'6px', padding:'2px 6px' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span style={{ fontSize:'9px', fontWeight:700, color:theme.brand }}>수정</span>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:'6px', borderBottom:`1.5px solid ${canEdit ? theme.brand+'50' : COLORS.borderSoft}`, paddingBottom:'6px', marginBottom:'6px' }}>
                  <input type="number" value={editAmount} onChange={e => canEdit && setEditAmount(e.target.value)}
                    readOnly={!canEdit}
                    style={{ flex:1, border:'none', outline:'none', fontSize:'26px', fontWeight:800, color:COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0, cursor: canEdit ? 'text' : 'default' }}/>
                  <span style={{ fontSize:'14px', fontWeight:600, color:COLORS.t3 }}>원</span>
                </div>
                <span style={{ fontSize:'10px', color:COLORS.t4 }}>{canEdit ? '탭하여 수정' : '🔒 조회 전용'}</span>
              </div>

              {/* 자동 지급 토글 */}
              <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>자동 지급</div>
                  <div style={{ fontSize:'11px', color:COLORS.t4 }}>{editAutoOn ? `매월 ${editPayDay==='말일'?'말일':editPayDay+'일'} 자동 집행` : '수동 지급 모드'}</div>
                </div>
                <button onClick={() => canEdit && setEditAutoOn(!editAutoOn)} style={{ width:'40px', height:'22px', borderRadius:'11px', border:'none', outline:'none', cursor: canEdit ? 'pointer' : 'default', background: editAutoOn ? theme.brand : COLORS.bgMuted, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:'3px', left: editAutoOn ? '21px' : '3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                </button>
              </div>

              {/* 지급일 변경 */}
              {editAutoOn && canEdit && (
                <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급일 변경</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {PAY_DAYS_DETAIL.map(d => (
                      <button key={d} onClick={() => setEditPayDay(d)}
                        style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', outline:'none', background: editPayDay===d ? theme.brand : COLORS.bgMuted, color: editPayDay===d ? '#fff' : COLORS.t3, boxShadow: editPayDay===d ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                        {d==='말일' ? '말일' : `${d}일`}
                      </button>
                    ))}
                    <button onClick={() => { if (!isCustom) setEditPayDay('') }}
                      style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', outline:'none', background: isCustom ? theme.brand : COLORS.bgMuted, color: isCustom ? '#fff' : COLORS.t3, transition:'all 0.15s' }}>
                      직접입력
                    </button>
                  </div>
                  {isCustom && (
                    <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'8px', background:COLORS.bgMuted, borderRadius:'10px', padding:'8px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                      <span style={{ fontSize:'12px', color:COLORS.t3 }}>매월</span>
                      <input type="number" min="1" max="31" value={editPayDay}
                        onChange={e => { const v=Math.min(31,Math.max(1,parseInt(e.target.value)||1)); setEditPayDay(String(v)) }}
                        style={{ width:'60px', border:`1.5px solid ${theme.brand}`, borderRadius:'8px', padding:'5px 8px', fontSize:'13px', fontWeight:700, color:COLORS.t1, fontFamily:'inherit', textAlign:'center', outline:'none', background:'#fff' }}/>
                      <span style={{ fontSize:'12px', color:COLORS.t3 }}>일</span>
                    </div>
                  )}
                </div>
              )}

              {/* 메타 정보 */}
              <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
                {[
                  { icon:'🏷️', label:'카테고리', value:cat.label||'—' },
                  { icon:'🏢', label:'거래처',   value:sel.vendor||'—' },
                  { icon:'🔄', label:'주기',     value:getCycleLabel(sel.cycle) },
                  { icon:'💳', label:'지급 방식', value:sel.payMethod==='card'?'카드 자동결제':'계좌 자동송금' },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ padding:'11px 16px', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                    <span style={{ fontSize:'11px', color:COLORS.t4, flexShrink:0, minWidth:'60px' }}>{row.label}</span>
                    <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, textAlign:'right', flex:1 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* 상세 설정 안내 */}
              <button onClick={() => navigate(cat.route || '/execute/business/operations')}
                style={{ width:'100%', padding:'13px 16px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'14px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px', outline:'none', boxShadow:SHADOWS.card }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'12px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>{cat.icon}</div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>{cat.label} 전체 설정</div>
                  <div style={{ fontSize:'11px', color:COLORS.t4 }}>자동 지급 상세 설정</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
            {canEdit ? (
              <button onClick={handleSave}
                style={{ width:'100%', padding:'15px', background: saved ? '#10B981' : theme.brand, color:'#fff', border:'none', outline:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background 0.3s' }}>
                {saved ? '✓ 저장되었습니다' : '저장'}
              </button>
            ) : (
              <div style={{ width:'100%', padding:'13px', background:'#F3F4F6', borderRadius:'14px', textAlign:'center', fontSize:'13px', fontWeight:600, color:'#9CA3AF' }}>
                🔒 조회 전용 — 수정 불가
              </div>
            )}
          </div>
        </div>
        <ExitModal/>
      </PhoneShell>
    )
  }

  // ── 목록 화면 ──────────────────────────────────────────
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
          {/* 헤더 */}
          <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
              <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>자동 지급 예정 전체</span>
              <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* 요약 */}
            <div style={{ padding:'0 20px 20px' }}>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', marginBottom:'4px', letterSpacing:'0.2px' }}>이번 달 자동 지급 합계</div>
              <div style={{ fontSize:'30px', fontWeight:800, color:'#fff', letterSpacing:'-1px', marginBottom:'16px' }}>
                {fmt(totalMonthly)}<span style={{ fontSize:'14px', fontWeight:600, opacity:0.65, marginLeft:'3px' }}>원</span>
              </div>
              {/* 이번 주 / 이후 카드 */}
              <div style={{ display:'flex', gap:'8px' }}>
                {/* 이번 주 */}
                <div style={{ flex:1, background:'rgba(255,255,255,0.13)', borderRadius:'14px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.18)', backdropFilter:'blur(4px)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'6px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#FCD34D', flexShrink:0 }}/>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.6)', letterSpacing:'0.2px' }}>이번 주</span>
                    <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.38)', marginLeft:'auto' }}>{thisWeekCount}건</span>
                  </div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>
                    {fmt(thisWeekAmt)}<span style={{ fontSize:'11px', fontWeight:500, opacity:0.6, marginLeft:'2px' }}>원</span>
                  </div>
                </div>
                {/* 이후 */}
                <div style={{ flex:1, background:'rgba(255,255,255,0.08)', borderRadius:'14px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'6px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(255,255,255,0.4)', flexShrink:0 }}/>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.2px' }}>이후</span>
                    <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>{laterCount}건</span>
                  </div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:'rgba(255,255,255,0.75)', letterSpacing:'-0.5px' }}>
                    {fmt(laterAmt)}<span style={{ fontSize:'11px', fontWeight:500, opacity:0.6, marginLeft:'2px' }}>원</span>
                  </div>
                </div>
                {/* 만료 임박 */}
                {expiringSoon > 0 && (
                  <div style={{ flex:1, background:'rgba(245,158,11,0.22)', borderRadius:'14px', padding:'12px 14px', border:'1px solid rgba(245,158,11,0.38)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'6px' }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#FCD34D', flexShrink:0 }}/>
                      <span style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.6)' }}>만료 임박</span>
                    </div>
                    <div style={{ fontSize:'16px', fontWeight:800, color:'#FCD34D', letterSpacing:'-0.5px' }}>
                      {expiringSoon}<span style={{ fontSize:'11px', fontWeight:500, opacity:0.8, marginLeft:'2px' }}>건</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 필터 바 - 항상 표시 */}
          <div style={{ margin:'14px 16px 0', background:COLORS.bgCard, borderRadius:'14px', padding:'11px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:SHADOWS.card, border:`1px solid ${COLORS.borderSoft}` }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'5px' }}>
              <span style={{ fontSize:'20px', fontWeight:800, color:COLORS.t1, letterSpacing:'-0.5px' }}>{sortedItems.length}</span>
              <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t3 }}>건</span>
              {filterLabel !== '전체' && (
                <span style={{ fontSize:'11px', color:theme.brand, fontWeight:700, background:`${theme.brand}12`, padding:'2px 7px', borderRadius:'6px', marginLeft:'4px' }}>{filterLabel}</span>
              )}
            </div>
            <button onClick={() => setShowFilterSheet(true)}
              style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 13px', borderRadius:'20px', background: filterLabel !== '전체' ? theme.brand : COLORS.bgMuted, border:'none', cursor:'pointer', fontFamily:'inherit', outline:'none', boxShadow: filterLabel !== '전체' ? `0 2px 10px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={filterLabel !== '전체' ? '#fff' : COLORS.t3} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              <span style={{ fontSize:'12px', fontWeight:700, color: filterLabel !== '전체' ? '#fff' : COLORS.t3 }}>
                {filterLabel === '전체' ? '필터' : filterLabel}
              </span>
              {filterLabel !== '전체' && (
                <span onClick={e => { e.stopPropagation(); setFilterLabel('전체') }}
                  style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)', fontWeight:700, marginLeft:'1px' }}>✕</span>
              )}
            </button>
          </div>

          {/* 리스트 */}
          <div style={{ padding:'10px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {sortedItems.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:COLORS.t3 }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>📋</div>
                <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'8px' }}>해당 카테고리 항목이 없습니다</div>
                <button onClick={() => setFilterLabel('전체')}
                  style={{ padding:'8px 18px', borderRadius:'20px', background:COLORS.bgMuted, border:'none', outline:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, color:COLORS.t3 }}>
                  필터 초기화
                </button>
              </div>
            )}
            {sortedItems.map((item, idx) => {
              const cat = CATEGORIES[item.cat] || {}
              const du = item._daysUntil
              const isUrgent = du <= 3
              const isSoon   = du <= 7

              // 날짜 구분선 (D-day 그룹)
              const prevDu = idx > 0 ? sortedItems[idx-1]._daysUntil : -999
              const showDivider = idx === 0 || (du > 7 && prevDu <= 7) || (du > 3 && prevDu <= 3)
              const dividerLabel = isUrgent ? '🔴 3일 이내' : isSoon ? '🟡 이번 주' : '📅 이후'

              return (
                <div key={item.id}>
                  {showDivider && (
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:`${idx === 0 ? '6px' : '16px'} 4px 8px` }}>
                      <span style={{ fontSize:'13px', fontWeight:700, color: isUrgent ? '#EF4444' : isSoon ? '#D97706' : COLORS.t3 }}>{dividerLabel}</span>
                      <div style={{ flex:1, height:'1px', background:COLORS.borderSoft }}/>
                    </div>
                  )}
                  <button onClick={() => navigate(cat.route || '/execute/business/operations')} style={{ width:'100%', padding:0, background:'none', border:'none', outline:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ background:COLORS.bgCard, border:`1px solid ${isUrgent ? '#FCA5A5' : COLORS.borderSoft}`, borderRadius:'16px', padding:'13px 14px', boxShadow: isUrgent ? '0 2px 12px rgba(239,68,68,0.12)' : SHADOWS.card }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                        {/* 아이콘 */}
                        <div style={{ width:'42px', height:'42px', borderRadius:'13px', background:cat.iconBg||`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                          {cat.icon||'💼'}
                        </div>
                        {/* 내용 */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                            <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</span>
                            {!item.autoOn && (
                              <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 6px', background:COLORS.bgMuted, color:COLORS.t4, borderRadius:'4px', flexShrink:0 }}>수동</span>
                            )}
                          </div>
                          <div style={{ fontSize:'11px', color:COLORS.t3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {cat.label} · {item.vendor}
                          </div>
                        </div>
                        {/* 지급일 + 금액 */}
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:800, color:COLORS.t1, marginBottom:'3px' }}>{fmt(item.amount)}원</div>
                          <div style={{ display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:'10px', fontWeight:700, color: isUrgent ? '#EF4444' : isSoon ? '#D97706' : COLORS.t3 }}>
                              {fmtDate(item._nextDate)}
                            </span>
                            <span style={{ fontSize:'10px', fontWeight:600, padding:'1px 5px', borderRadius:'5px', background: isUrgent ? '#FEE2E2' : isSoon ? '#FEF3C7' : COLORS.bgMuted, color: isUrgent ? '#DC2626' : isSoon ? '#B45309' : COLORS.t4 }}>
                              D-{du}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <FilterSheet/>
      <ExitModal/>
    </PhoneShell>
  )
}
