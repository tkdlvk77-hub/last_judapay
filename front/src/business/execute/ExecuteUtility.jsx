import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { addTransaction } from '../../shared/transactionStore'
import { ensureStepUp } from '../../components/PinModal'

// ─── 상수 ─────────────────────────────────────────────────
const PAY_DAYS = ['1','5','10','15','20','25','28','말일']
const VAT_RATE = 0.1
const DEMO_CARDS = [
  { id:'c1', name:'법인카드 (현대카드)', last4:'7842', color:'#1D4ED8' },
  { id:'c2', name:'법인카드 (신한카드)', last4:'3391', color:'#059669' },
]
const DEMO_BANKS = ['국민','신한','우리','하나','기업','농협','카카오뱅크','토스뱅크']

const UTILITY_TYPES = [
  { id:'electric', icon:'⚡', label:'전기',     sub:'한국전력 (KEPCO)' },
  { id:'gas',      icon:'🔥', label:'가스',     sub:'도시가스 · LPG' },
  { id:'water',    icon:'💧', label:'수도',     sub:'상하수도' },
  { id:'heat',     icon:'🌡️', label:'지역난방', sub:'한국지역난방공사 등' },
  { id:'mgmt',     icon:'🏢', label:'관리비',   sub:'건물 공용 관리비' },
  { id:'etc',      icon:'📋', label:'기타',     sub:'직접 입력' },
]

// 계약 상태는 서버가 자동 판단 (사용자 입력 X)
// autoOn=false → 정지 | autoOn=true + lastPayStatus='fail' → 미납 | 나머지 → 정상
const STATUS_MAP = {
  active:  { label:'자동지급 ON',  bg:'#D1FAE5', color:'#059669' },
  overdue: { label:'미납 중',      bg:'#FEF3C7', color:'#D97706' },
  paused:  { label:'자동지급 OFF', bg:'#F3F4F6', color:'#6B7280' },
}

function getComputedStatus(item) {
  if (!item.autoOn) return 'paused'
  if (item.lastPayStatus === 'fail') return 'overdue'
  return 'active'
}

const DEMO_ITEMS = [
  {
    id:'u1', type:'electric', icon:'⚡', name:'사무실 전기',
    supplier:'한국전력 (KEPCO)', customerNo:'1234-5678-9012',
    address:'서울시 강남구 테헤란로 123 5층',
    amount:380000, vatMode:'none', lastPayStatus:'success',
    autoOn:true, payDay:'말일', payMethod:'account',
    bankName:'국민', bankAccount:'110-123-456789', selectedCard:'c1',
    approvalEnabled:false, limitEnabled:true, limitAmount:600000, limitAction:'alert',
    hasTax:false, hasReceipt:true,
    notifBefore:true, notifDone:true, notifFail:true, notifSurge:true, notifLimit:true,
    status:'active',
  },
  {
    id:'u2', type:'gas', icon:'🔥', name:'사무실 가스',
    supplier:'서울도시가스', customerNo:'98765-43210',
    address:'서울시 강남구 테헤란로 123 5층',
    amount:72000, vatMode:'none', lastPayStatus:'fail',
    autoOn:true, payDay:'20', payMethod:'account',
    bankName:'신한', bankAccount:'110-987-654321', selectedCard:'c1',
    approvalEnabled:false, limitEnabled:false, limitAmount:200000, limitAction:'alert',
    hasTax:false, hasReceipt:true,
    notifBefore:true, notifDone:true, notifFail:true, notifSurge:true, notifLimit:false,
    status:'active',
  },
  {
    id:'u3', type:'mgmt', icon:'🏢', name:'건물 관리비',
    supplier:'강남파크빌딩 관리사무소', customerNo:'B-405',
    address:'서울시 강남구 테헤란로 123 5층',
    amount:210000, vatMode:'include', lastPayStatus:null,
    autoOn:false, payDay:'10', payMethod:'account',
    bankName:'', bankAccount:'', selectedCard:'c1',
    approvalEnabled:true, limitEnabled:false, limitAmount:300000, limitAction:'alert',
    hasTax:true, hasReceipt:true,
    notifBefore:true, notifDone:true, notifFail:true, notifSurge:false, notifLimit:false,
    status:'manual',
  },
]

const DEMO_LOGS = [
  { date:'2026.05.31', status:'success', note:'' },
  { date:'2026.04.30', status:'success', note:'' },
  { date:'2026.03.31', status:'fail',    note:'계좌 잔액 부족 → 실패, 익일 재시도' },
  { date:'2026.02.29', status:'success', note:'' },
  { date:'2026.01.31', status:'success', note:'' },
]

// ─── 유틸 ─────────────────────────────────────────────────
function fmt(n) { return Number(Math.floor(n || 0)).toLocaleString('ko-KR') }
function calcTotal(item) {
  const base = item.amount || 0
  const vat  = item.vatMode === 'exclude' ? Math.floor(base * VAT_RATE) : 0
  return { base, vat, total: base + vat }
}

// ─── 공통 UI ─────────────────────────────────────────────
function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{ width:'46px', height:'26px', borderRadius:'13px', border:'none', cursor:'pointer',
        background: on ? brand : COLORS.bgMuted, position:'relative', transition:'background 0.2s', padding:0, flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '23px' : '3px', width:'20px', height:'20px',
        borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
    </button>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.active
  return (
    <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'20px', background:s.bg, color:s.color }}>
      {s.label}
    </span>
  )
}

function ContractBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.active
  return (
    <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'20px', background:s.bg, color:s.color }}>
      {s.label}
    </span>
  )
}

function SecLabel({ label, brand }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:brand, flexShrink:0 }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color:brand, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
    </div>
  )
}

// ─── VAT + 자동지급 섹션 ──────────────────────────────────
function SectionControl({ theme, vatMode, setVatMode, autoOn, setAutoOn, payDay, setPayDay, payMethod, setPayMethod, selectedCard, setSelectedCard, bankName, setBankName, bankAccount, setBankAccount, baseAmount }) {
  const isCustomDay = !PAY_DAYS.includes(payDay)
  const [customDayInput, setCustomDayInput] = useState(isCustomDay ? payDay : '')
  const vat = vatMode === 'exclude' ? Math.floor(baseAmount * VAT_RATE) : 0
  const brand = theme.brand

  return (
    <>
      <SecLabel label="VAT 설정" brand={brand} />
      <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
          <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>VAT 처리 방식</span>
          <span style={{ fontSize:'10px', color:COLORS.t4 }}>
            {vatMode === 'exclude' && vat > 0 ? `+${fmt(vat)}원 추가` : vatMode === 'include' ? '금액에 포함됨' : '면세'}
          </span>
        </div>
        <div style={{ display:'flex', background:COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
          {[{ key:'exclude', label:'VAT 별도' },{ key:'include', label:'VAT 포함' },{ key:'none', label:'면세' }].map(opt => (
            <button key={opt.key} onClick={() => setVatMode(opt.key)}
              style={{ flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', fontSize:'11px', fontWeight:700, transition:'all 0.15s', background: vatMode === opt.key ? '#fff' : 'transparent', color: vatMode === opt.key ? brand : COLORS.t4, boxShadow: vatMode === opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop:'12px', padding:'10px 12px', background:'#FFFBEB', borderRadius:'10px', fontSize:'10px', color:'#854F0B', lineHeight:1.65 }}>
          💡 전기·가스·수도는 대부분 면세, 관리비는 VAT 포함인 경우가 많습니다.
        </div>
      </div>

      <SecLabel label="자동 지급 설정" brand={brand} />
      <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: autoOn ? '16px' : 0 }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>자동 지급</div>
            <div style={{ fontSize:'11px', color:COLORS.t4 }}>{autoOn ? `매월 ${payDay}일 자동 이체` : '수동 지급 모드'}</div>
          </div>
          <Toggle on={autoOn} onChange={() => setAutoOn(!autoOn)} brand={brand} />
        </div>

        {autoOn && (
          <>
            <div style={{ height:'1px', background:COLORS.borderSoft, marginBottom:'16px' }} />
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>매월 지급일</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {PAY_DAYS.map(d => (
                  <button key={d} onClick={() => setPayDay(d)}
                    style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', background: payDay === d ? brand : COLORS.bgMuted, color: payDay === d ? '#fff' : COLORS.t3, boxShadow: payDay === d ? `0 2px 8px ${brand}40` : 'none', transition:'all 0.15s' }}>
                    {d === '말일' ? '말일' : `${d}일`}
                  </button>
                ))}
                <button onClick={() => { if (!isCustomDay) { setPayDay(''); setCustomDayInput('') } }}
                  style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', background: isCustomDay ? brand : COLORS.bgMuted, color: isCustomDay ? '#fff' : COLORS.t3, transition:'all 0.15s' }}>
                  직접 입력
                </button>
              </div>
              {isCustomDay && (
                <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'8px', background:COLORS.bg, borderRadius:'10px', padding:'10px 14px', border:`1px solid ${brand}40` }}>
                  <span style={{ fontSize:'12px', color:COLORS.t3, flexShrink:0 }}>매월</span>
                  <input type="number" min="1" max="31" value={customDayInput}
                    onChange={e => { setCustomDayInput(e.target.value); if (e.target.value) setPayDay(e.target.value) }}
                    placeholder="일 입력"
                    style={{ flex:1, border:'none', outline:'none', fontSize:'16px', fontWeight:700, color:brand, background:'transparent', fontFamily:'inherit', textAlign:'center' }}/>
                  <span style={{ fontSize:'12px', color:COLORS.t3, flexShrink:0 }}>일</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급 방식</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {[
                  { id:'account', label:'계좌 자동이체',  sub:'지정 계좌에서 공과금 자동 납부' },
                  { id:'card',    label:'카드 자동결제',  sub:'법인카드 자동 납부 (기관 등록 필요)' },
                ].map(pm => (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                    style={{ width:'100%', padding:'11px 14px', textAlign:'left', background: payMethod === pm.id ? `${brand}10` : COLORS.bgMuted, border:`1px solid ${payMethod === pm.id ? `${brand}40` : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${payMethod === pm.id ? brand : COLORS.border}`, background: payMethod === pm.id ? brand : '#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {payMethod === pm.id && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#fff' }}/>}
                    </div>
                    <div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{pm.label}</div>
                      <div style={{ fontSize:'10px', color:COLORS.t4, marginTop:'1px' }}>{pm.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {payMethod === 'account' && (
                <div style={{ marginTop:'10px', background:COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t3, marginBottom:'10px' }}>출금 계좌 정보</div>
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'6px' }}>은행 선택</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                      {DEMO_BANKS.map(b => (
                        <button key={b} onClick={() => setBankName(b)}
                          style={{ padding:'5px 10px', borderRadius:'20px', border:`1px solid ${bankName === b ? brand : COLORS.borderSoft}`, background: bankName === b ? brand : '#fff', color: bankName === b ? '#fff' : COLORS.t3, fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:'#fff', borderRadius:'8px', border:`1px solid ${COLORS.borderSoft}`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'4px' }}>계좌번호</div>
                    <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="계좌번호 입력 (- 없이)"
                      style={{ width:'100%', border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
                  </div>
                </div>
              )}

              {payMethod === 'card' && (
                <div style={{ marginTop:'10px', background:COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t3, marginBottom:'10px' }}>법인카드 선택</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {DEMO_CARDS.map(card => (
                      <button key={card.id} onClick={() => setSelectedCard(card.id)}
                        style={{ padding:'10px 12px', background: selectedCard === card.id ? `${card.color}12` : '#fff', border:`1.5px solid ${selectedCard === card.id ? card.color : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px', textAlign:'left' }}>
                        <div style={{ width:'36px', height:'24px', borderRadius:'5px', background:card.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontSize:'8px', fontWeight:800, color:'#fff' }}>CARD</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:COLORS.t4 }}>**** **** **** {card.last4}</div>
                        </div>
                        {selectedCard === card.id && (
                          <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:card.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 월 총 지급액 */}
            <div style={{ background:`linear-gradient(135deg, ${brand}14, ${brand}08)`, border:`1px solid ${brand}22`, borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, marginBottom:'8px', letterSpacing:'0.3px' }}>매월 총 지급액</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:COLORS.t3, marginBottom:'4px' }}>
                <span>공과금 (기본)</span><span style={{ fontWeight:600 }}>{fmt(baseAmount)}원</span>
              </div>
              {vat > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:COLORS.t3, marginBottom:'4px' }}>
                  <span>부가세 10%</span><span style={{ fontWeight:600, color:'#D97706' }}>+{fmt(vat)}원</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', borderTop:`1px dashed ${brand}25`, fontSize:'17px', fontWeight:800, color:brand, marginTop:'4px', letterSpacing:'-0.3px' }}>
                <span>합계</span><span>{fmt(baseAmount + vat)}원</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── 승인 및 통제 공통 섹션 ──────────────────────────────
function CommonBottomSections({ theme }) {
  return (
    <>
      {/* ── 승인 및 통제 */}
      <div style={{ marginTop:'8px', padding:'11px 14px', background: COLORS.infoBg, borderRadius: RADIUS.md, fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
        <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
      </div>
    </>
  )
}

// ─── 납부 로그 오버레이 컴포넌트 ─────────────────────────
function UtilityLogScreen({ theme, selectedItem, onBack }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const logAmount = calcTotal(selectedItem).total

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:10,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>납부내역보기</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:'3px' }}>{selectedItem.name}</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>반복 납부 이력 · 매월 {fmt(logAmount)}원</div>
          </div>
        </div>
        <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {DEMO_LOGS.map((log, i) => (
            <div key={i} style={{ background:COLORS.bgCard, borderRadius:'14px', padding:'14px 16px', boxShadow:SHADOWS.card, display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0, background: log.status === 'success' ? '#D1FAE5' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>
                {log.status === 'success' ? '✅' : '❌'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>{log.date}</div>
                {log.note
                  ? <div style={{ fontSize:'11px', color:'#B91C1C' }}>{log.note}</div>
                  : <div style={{ fontSize:'11px', color:COLORS.t4 }}>{log.status === 'success' ? '정상 납부' : '납부 실패'}</div>
                }
              </div>
              {log.status === 'success'
                ? <div style={{ fontSize:'14px', fontWeight:700, color:'#065F46' }}>{fmt(logAmount)}원</div>
                : <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t4 }}>—</div>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 유형 선택 오버레이 컴포넌트 (등록 step 1) ───────────
function UtilityAddTypeScreen({ theme, skipAnim, setScreen, resetShared, setAddType, setEditName }) {
  const [visible, setVisible] = useState(skipAnim ? true : false)
  useEffect(() => {
    if (!skipAnim) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
  }, []) // 마운트 시에만 실행 — skipAnim 변경 시 재실행 방지

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:10,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            <button onClick={() => setScreen('list')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>공과금 추가</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', lineHeight:1.3, letterSpacing:'-0.5px' }}>어떤 공과금인가요?</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', marginTop:'4px', marginBottom:'18px' }}>유형을 선택하면 관련 설정이 자동으로 적용됩니다</div>
          </div>
        </div>
        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {UTILITY_TYPES.map(tp => (
            <button key={tp.id} onClick={() => { setAddType(tp); resetShared(); setEditName(tp.id === 'etc' ? '' : tp.label); setScreen('addForm') }}
              style={{ width:'100%', padding:'14px 16px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'16px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', boxShadow:SHADOWS.card }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>{tp.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1 }}>{tp.label}</div>
                <div style={{ fontSize:'11px', color:COLORS.t4, marginTop:'2px' }}>{tp.sub}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 등록 폼 오버레이 컴포넌트 (등록 step 2) ─────────────
function UtilityAddFormScreen({
  theme, addType,
  editName, setEditName, editSupplier, setEditSupplier,
  editCustomerNo, setEditCustomerNo, editAddress, setEditAddress,
  editAmount, setEditAmount,
  vatMode, setVatMode, autoOn, setAutoOn, payDay, setPayDay,
  payMethod, setPayMethod, selectedCard, setSelectedCard,
  bankName, setBankName, bankAccount, setBankAccount,
  handleAddSubmit, setScreen,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const detailBase = parseInt(editAmount) || 0
  const isValid = !!(editName && parseInt(editAmount) >= 100)

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:20,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            <button onClick={() => setScreen('addType')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>{addType.icon} {addType.label} 등록</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', lineHeight:1.3, letterSpacing:'-0.5px' }}>납부 정보를 입력해주세요</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', marginTop:'4px', marginBottom:'18px' }}>{addType.sub}</div>
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>
          <SecLabel label="공과금 정보" brand={theme.brand} />

          {/* 요금 타일 */}
          <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, marginBottom:'10px' }}>월 납부 금액 (예상)</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'8px' }}>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="0"
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'24px', fontWeight:800, color:COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'14px', fontWeight:600, color:COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <div style={{ fontSize:'10px', color:COLORS.t4, lineHeight:1.5 }}>실제 요금은 매월 변동될 수 있으며, 청구서 수신 후 자동 업데이트됩니다.</div>
          </div>

          {/* 기본 정보 카드 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden', marginBottom:'4px' }}>
            {/* 항목명 */}
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'5px' }}>항목명</div>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="예: 사무실 전기, 건물 가스"
                style={{ width:'100%', border:'none', outline:'none', fontSize:'14px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
            </div>
            {/* 공급자 */}
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'5px' }}>공급자</div>
              <input value={editSupplier} onChange={e => setEditSupplier(e.target.value)} placeholder="예: 한국전력, 서울도시가스"
                style={{ width:'100%', border:'none', outline:'none', fontSize:'14px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
            </div>
            {/* 고객 번호 */}
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'5px' }}>고객 번호 · 계약 번호</div>
              <input value={editCustomerNo} onChange={e => setEditCustomerNo(e.target.value)} placeholder="예: 1234-5678-9012"
                style={{ width:'100%', border:'none', outline:'none', fontSize:'14px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
            </div>
            {/* 주소 */}
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'5px' }}>납부 대상 주소</div>
              <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="예: 서울시 강남구 테헤란로 123 5층"
                style={{ width:'100%', border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
            </div>
          </div>

          <SectionControl
            theme={theme} vatMode={vatMode} setVatMode={setVatMode}
            autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            payMethod={payMethod} setPayMethod={setPayMethod}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
            baseAmount={detailBase}
          />

          <CommonBottomSections theme={theme} />

          <div style={{ padding:'12px 14px', background:'#FFFBEB', borderRadius:'12px', fontSize:'11px', color:'#854F0B', lineHeight:1.65, border:'1px solid #FDE68A', marginTop:'6px' }}>
            ⓘ 공과금은 전액 운영비로 처리됩니다. 세금계산서·이체확인증이 자동 수집됩니다.
          </div>
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={handleAddSubmit}
          style={{ width:'100%', padding:'15px', background: isValid ? theme.activeBtnGrad : COLORS.bgMuted, color: isValid ? '#fff' : COLORS.t4, border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor: isValid ? 'pointer' : 'default', fontFamily:'inherit', boxShadow: isValid ? theme.activeShadow : 'none', transition:'all 0.2s' }}>
          등록하기
        </button>
      </div>

      {showExitModal && (
        <div onClick={() => setShowExitModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px', textAlign:'center' }}>나가시겠어요?</div>
            <div style={{ fontSize:'13px', color:'#999', lineHeight:1.6, marginBottom:'20px', textAlign:'center' }}>입력 중인 내용은 저장되지 않습니다.</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowExitModal(false)} style={{ flex:1, height:'48px', background:'#F3F4F6', color:'#555', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>계속 작성</button>
              <button onClick={() => { setShowExitModal(false); navigate('/home-business') }} style={{ flex:1, height:'48px', background:'#EF4444', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 상세 화면 오버레이 컴포넌트 ─────────────────────────
function UtilityDetailScreen({
  theme, selectedItem,
  editName, setEditName, editSupplier, setEditSupplier,
  editCustomerNo, setEditCustomerNo, editAddress, setEditAddress,
  editAmount, setEditAmount,
  vatMode, setVatMode, autoOn, setAutoOn, payDay, setPayDay,
  payMethod, setPayMethod, selectedCard, setSelectedCard,
  bankName, setBankName, bankAccount, setBankAccount,
  saved, handleSave, onBack, navigate,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const item = selectedItem
  const typeInfo = UTILITY_TYPES.find(tp => tp.id === item.type)
  const detailBase  = parseInt(editAmount) || 0
  const detailVat   = vatMode === 'exclude' ? Math.floor(detailBase * VAT_RATE) : 0
  const detailTotal = detailBase + detailVat

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:10,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>공과금 자동 설정</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', letterSpacing:'-0.3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {typeInfo?.icon} {item.name}
              </div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {editSupplier || item.supplier} · {typeInfo?.label}
              </div>
            </div>
            {detailTotal > 0 && (
              <div style={{ textAlign:'right', marginBottom:'20px', flexShrink:0 }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>매월 납부</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>{fmt(detailTotal)}<span style={{ fontSize:'11px', opacity:0.6 }}>원</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>
          <SecLabel label="공과금 정보" brand={theme.brand} />

          {/* 요금 타일 */}
          <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark }}>월 납부 금액</span>
              <StatusBadge status={selectedItem ? getComputedStatus(selectedItem) : 'active'} />
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'8px' }}>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'24px', fontWeight:800, color:COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'14px', fontWeight:600, color:COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <div style={{ fontSize:'10px', color:COLORS.t4, lineHeight:1.5 }}>실제 요금은 매월 변동될 수 있으며, 청구서 수신 후 자동 업데이트됩니다.</div>
          </div>

          {/* 메타 정보 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {[
              { icon:'🏢', label:'공급자',      value: editSupplier || '—' },
              { icon:'🔢', label:'고객 번호',    value: editCustomerNo || '—' },
              { icon:'📍', label:'납부 대상 주소', value: editAddress || '—' },
              { icon:'📂', label:'유형',          value: typeInfo?.label || '—' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ padding:'11px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                <span style={{ fontSize:'11px', color:COLORS.t4, flexShrink:0, minWidth:'72px' }}>{row.label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, textAlign:'right', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <SectionControl
            theme={theme} vatMode={vatMode} setVatMode={setVatMode}
            autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            payMethod={payMethod} setPayMethod={setPayMethod}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
            baseAmount={detailBase}
          />

          <CommonBottomSections theme={theme} />

          <div style={{ padding:'12px 16px', background:`${theme.brandDark}0A`, border:`1px solid ${theme.brandDark}15`, borderRadius:'12px', fontSize:'11px', color:theme.brandDark, lineHeight:1.7, display:'flex', gap:'8px', alignItems:'flex-start', marginTop:'6px' }}>
            <span style={{ flexShrink:0, marginTop:'1px' }}>ⓘ</span>
            <span>공과금은 매월 자동 납부됩니다. 세금계산서·이체확인증이 자동 수집됩니다.</span>
          </div>
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={handleSave}
          style={{ width:'100%', padding:'15px', background: saved ? '#10B981' : theme.activeBtnGrad, boxShadow: saved ? 'none' : theme.activeShadow, color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.25s', letterSpacing:'-0.2px' }}>
          {saved ? '✓  저장 완료' : '자동 설정 저장'}
        </button>
      </div>

      {showExitModal && (
        <div onClick={() => setShowExitModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px', textAlign:'center' }}>나가시겠어요?</div>
            <div style={{ fontSize:'13px', color:'#999', lineHeight:1.6, marginBottom:'20px', textAlign:'center' }}>변경 내용은 저장되지 않습니다.</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowExitModal(false)} style={{ flex:1, height:'48px', background:'#F3F4F6', color:'#555', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>계속 작성</button>
              <button onClick={() => { setShowExitModal(false); navigate('/home-business') }} style={{ flex:1, height:'48px', background:'#EF4444', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export default function ExecuteUtility() {
  const theme    = getAccountTheme()
  const navigate = useNavigate()
  // ── 권한 체크: staff/viewer는 조회 전용 — 이 화면 접근 차단 ──
  const _bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canEdit  = !['viewer', 'staff'].includes(_bizRole)
  if (!canEdit) return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'32px 24px', background:'#F8F9FB', textAlign:'center' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'22px', background:'#FFF7ED', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px', fontSize:'32px' }}>🔒</div>
        <div style={{ fontSize:'18px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>설정 권한이 없습니다</div>
        <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7, marginBottom:'24px' }}>
          {_bizRole === 'staff' ? '일반구성원 권한으로는 자동지급 설정을 변경할 수 없습니다.\n관리자에게 설정 변경을 요청하세요.' : '조회전용 권한으로는 이 화면에 접근할 수 없습니다.'}
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'8px 18px', borderRadius:'20px', background:'#FFF7ED', color:'#92400E', fontSize:'12px', fontWeight:700, marginBottom:'28px' }}>
          <span>{_bizRole === 'staff' ? '👤' : '👁️'}</span>
          <span>내 권한: {_bizRole === 'staff' ? '일반구성원' : '조회전용'}</span>
        </div>
        <button onClick={() => navigate(-1)}
          style={{ width:'100%', maxWidth:'280px', height:'48px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          뒤로가기
        </button>
      </div>
    </PhoneShell>
  )


  const [items, setItems]               = useState(DEMO_ITEMS)
  const [screen, setScreen]             = useState('list')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [saved, setSaved]               = useState(false)

  // 편집 상태
  const [editName, setEditName]           = useState('')
  const [editSupplier, setEditSupplier]   = useState('')
  const [editCustomerNo, setEditCustomerNo] = useState('')
  const [editAddress, setEditAddress]     = useState('')
  // 계약 상태는 서버 계산값 — 사용자 입력 없음
  const [editAmount, setEditAmount]       = useState('')
  const [vatMode, setVatMode]             = useState('none')
  const [autoOn, setAutoOn]               = useState(true)
  const [payDay, setPayDay]               = useState('말일')
  const [payMethod, setPayMethod]         = useState('account')
  const [selectedCard, setSelectedCard]   = useState('c1')
  const [bankName, setBankName]           = useState('')
  const [bankAccount, setBankAccount]     = useState('')
  // addForm 전용
  const [addType, setAddType] = useState(UTILITY_TYPES[0])

  // ─── 스와이프 백 가드 ─────────────────────────────────────
  const handleBack = () => {
    if (screen === 'addForm') setScreen('addType')
    else setScreen('list')
  }
  useStepHistory(handleBack, screen === 'list')

  const resetShared = () => {
    setEditName(''); setEditSupplier(''); setEditCustomerNo(''); setEditAddress('')
    setEditAmount(''); setVatMode('none')
    setAutoOn(true); setPayDay('말일'); setPayMethod('account')
    setSelectedCard('c1'); setBankName(''); setBankAccount('')
    setSaved(false)
  }

  const openDetail = (item) => {
    setSelectedItem(item)
    setEditName(item.name); setEditSupplier(item.supplier); setEditCustomerNo(item.customerNo)
    setEditAddress(item.address)
    setEditAmount(String(item.amount)); setVatMode(item.vatMode)
    setAutoOn(item.autoOn); setPayDay(item.payDay); setPayMethod(item.payMethod)
    setSelectedCard(item.selectedCard || 'c1'); setBankName(item.bankName || ''); setBankAccount(item.bankAccount || '')
    setSaved(false)
    setScreen('detail')
  }

  const handleSave = async () => {
    if (!selectedItem) return
    try { await ensureStepUp() } catch { return }
    const amtNum = parseInt(editAmount) || 0
    setItems(prev => prev.map(it =>
      it.id === selectedItem.id
        ? { ...it, name:editName, supplier:editSupplier, customerNo:editCustomerNo,
            address:editAddress,
            amount:amtNum, vatMode, autoOn, payDay, payMethod, selectedCard, bankName, bankAccount }
        : it
    ))
    addTransaction({
      type: 'utility',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient: { id: null, name: editSupplier || editName, phone: '', verified: true, isBusiness: true },
      amount: amtNum,
      reason: editName,
      walletId: 'my', walletLabel: 'MY 지갑',
      payDateMode: 'immediate', status: 'completed',
    })
    setSaved(true)
    setTimeout(() => setScreen('list'), 800)
  }

  const handleAddSubmit = () => {
    const amtNum = parseInt(editAmount) || 0
    if (!editName || amtNum < 100) return
    const newItem = {
      id:`u${Date.now()}`, type:addType.id, icon:addType.icon,
      name:editName, supplier:editSupplier, customerNo:editCustomerNo,
      address:editAddress, lastPayStatus: null,
      amount:amtNum, vatMode, autoOn, payDay, payMethod, selectedCard, bankName, bankAccount,
    }
    setItems(prev => [newItem, ...prev])
    resetShared()
    setScreen('list')
  }

  // ── 계산 ──────────────────────────────────────────────────
  const activeItems  = items.filter(i => getComputedStatus(i) === 'active')
  const pausedItems  = items.filter(i => getComputedStatus(i) === 'paused')
  const overdueItems = items.filter(i => getComputedStatus(i) === 'overdue')
  const totalMonthly = items.filter(i => i.autoOn).reduce((s, i) => s + calcTotal(i).total, 0)

  // ═══════════════════════════════════════════════════════════
  // ── 리스트 화면 (항상 렌더) + 오버레이 ───────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        {/* List always rendered */}
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

          {/* 헤더 */}
          <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
              <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>공과금 자동 납부</span>
              <div style={{ flex:1 }}/>
              <button onClick={() => { if (!selectedItem) { const t = items[0]; if (t) setSelectedItem(t); } setScreen('log') }} style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px' }}>납부내역보기</button>
              <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* 월 요약 유리 카드 */}
            <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', fontWeight:500, marginBottom:'4px', letterSpacing:'0.3px' }}>
                    이번 달 공과금 · {items.length}건
                  </div>
                  <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
                    {fmt(totalMonthly)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
                  </div>
                </div>
                {overdueItems.length > 0 && (
                  <div style={{ background:'rgba(239,68,68,0.3)', borderRadius:'10px', padding:'6px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:800, color:'#FCA5A5', lineHeight:1 }}>{overdueItems.length}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.7)', marginTop:'2px' }}>미납</div>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:'16px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>정상납부</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{activeItems.length}건</div>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>정지</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{pausedItems.length}건</div>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>미납</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: overdueItems.length > 0 ? '#FCA5A5' : 'rgba(255,255,255,0.85)' }}>{overdueItems.length}건</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding:'16px 16px 36px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
              {items.map(item => {
                const { total } = calcTotal(item)
                const typeInfo  = UTILITY_TYPES.find(t => t.id === item.type)
                const computedStatus = getComputedStatus(item)
                const isUnpaid  = computedStatus === 'overdue'
                return (
                  <div key={item.id} onClick={() => openDetail(item)}
                    style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, border: isUnpaid ? '1px solid #FECACA' : `1px solid ${COLORS.borderSoft}`, cursor:'pointer', overflow:'hidden' }}>
                    <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                        {item.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize:'11px', color:COLORS.t4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.supplier}
                          {item.autoOn ? ` · 매월 ${item.payDay}일` : ' · 수동'}
                        </div>
                        {item.address && (
                          <div style={{ fontSize:'10px', color:COLORS.t4, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>📍 {item.address}</div>
                        )}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'15px', fontWeight:800, color:COLORS.t1, marginBottom:'5px' }}>{fmt(total)}원</div>
                        <StatusBadge status={computedStatus} />
                      </div>
                    </div>
                    {isUnpaid && (
                      <div style={{ padding:'7px 16px', background:'#FEF2F2', borderTop:'1px solid #FECACA', display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'12px' }}>🚨</span>
                        <span style={{ fontSize:'11px', fontWeight:600, color:'#DC2626' }}>
                          미납 상태 · 즉시 납부 필요
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Fixed bottom add button */}
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
          <button onClick={() => { resetShared(); setScreen('addType') }}
            style={{ width:'100%', padding:'15px', background:theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:theme.activeShadow }}>
            <span style={{ fontSize:'18px' }}>+</span> 공과금 추가
          </button>
        </div>

        {/* Overlays */}
        {screen === 'log' && selectedItem && (
          <UtilityLogScreen
            theme={theme}
            selectedItem={selectedItem}
            onBack={() => setScreen('list')}
          />
        )}

        {(screen === 'addType' || screen === 'addForm') && (
          <UtilityAddTypeScreen
            theme={theme}
            skipAnim={screen === 'addForm'}
            setScreen={setScreen}
            resetShared={resetShared}
            setAddType={setAddType}
            setEditName={setEditName}
          />
        )}

        {screen === 'addForm' && (
          <UtilityAddFormScreen
            theme={theme}
            addType={addType}
            editName={editName} setEditName={setEditName}
            editSupplier={editSupplier} setEditSupplier={setEditSupplier}
            editCustomerNo={editCustomerNo} setEditCustomerNo={setEditCustomerNo}
            editAddress={editAddress} setEditAddress={setEditAddress}
            editAmount={editAmount} setEditAmount={setEditAmount}
            vatMode={vatMode} setVatMode={setVatMode}
            autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            payMethod={payMethod} setPayMethod={setPayMethod}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
            handleAddSubmit={handleAddSubmit}
            setScreen={setScreen}
          />
        )}

        {screen === 'detail' && selectedItem && (
          <UtilityDetailScreen
            theme={theme}
            selectedItem={selectedItem}
            editName={editName} setEditName={setEditName}
            editSupplier={editSupplier} setEditSupplier={setEditSupplier}
            editCustomerNo={editCustomerNo} setEditCustomerNo={setEditCustomerNo}
            editAddress={editAddress} setEditAddress={setEditAddress}
            editAmount={editAmount} setEditAmount={setEditAmount}
            vatMode={vatMode} setVatMode={setVatMode}
            autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            payMethod={payMethod} setPayMethod={setPayMethod}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
            saved={saved} handleSave={handleSave}
            onBack={() => setScreen('list')}
            navigate={navigate}
          />
        )}

        {/* Exit modal only on list screen */}
        {showExitModal && screen === 'list' && (
          <div onClick={() => setShowExitModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
              <div style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px', textAlign:'center' }}>나가시겠어요?</div>
              <div style={{ fontSize:'13px', color:'#999', lineHeight:1.6, marginBottom:'20px', textAlign:'center' }}>홈 화면으로 이동합니다.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setShowExitModal(false)} style={{ flex:1, height:'48px', background:'#F3F4F6', color:'#555', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
                <button onClick={() => { setShowExitModal(false); navigate('/home-business') }} style={{ flex:1, height:'48px', background:'#EF4444', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  )
}
