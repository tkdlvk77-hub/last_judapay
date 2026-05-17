import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { addTransaction } from '../../shared/transactionStore'

// ─── 상수 ─────────────────────────────────────────────────
const PAY_DAYS = ['1','5','10','15','20','25','28','말일']
const VAT_RATE = 0.1

const DEMO_CARDS = [
  { id:'c1', name:'법인카드 (현대카드)', last4:'7842', color:'#1D4ED8' },
  { id:'c2', name:'법인카드 (신한카드)', last4:'3391', color:'#059669' },
]
const DEMO_BANKS = ['국민','신한','우리','하나','기업','농협','카카오뱅크','토스뱅크']

const LEASE_TYPES = [
  { id:'vehicle',   icon:'🚗', label:'차량 렌트',    sub:'법인 차량 월 렌트' },
  { id:'carlease',  icon:'🚙', label:'차량 리스',    sub:'금융·운용 리스' },
  { id:'equipment', icon:'🖨️', label:'사무기기 렌트', sub:'복합기 · 에어컨 등' },
  { id:'facility',  icon:'🏗️', label:'장비 렌트',    sub:'중장비 · 설비 임대' },
  { id:'etc',       icon:'📋', label:'기타',         sub:'직접 입력' },
]

const DEMO_ITEMS = [
  {
    id:'l1', type:'vehicle', icon:'🚗',
    name:'법인 차량 렌트 (아이오닉6)', vendor:'AJ렌터카',
    amount:980000, payDay:'1', vatMode:'exclude',
    contractStart:'2025-01-01', contractEnd:'2027-01-01',
    autoEnabled:true, lastPayStatus:'success',
    hasTax:true, hasContract:true, hasReceipt:true, payMethod:'card',
    carNo:'12가 3456', carModel:'현대 아이오닉6', carDriver:'김대표', insuranceEnd:'2026-12-31',
  },
  {
    id:'l2', type:'equipment', icon:'🖨️',
    name:'복합기 렌트', vendor:'리코코리아',
    amount:120000, payDay:'25', vatMode:'include',
    contractStart:'2024-06-01', contractEnd:'2026-06-01',
    autoEnabled:true, lastPayStatus:'fail',
    hasTax:true, hasContract:false, hasReceipt:true, payMethod:'card',
    carNo:'', carModel:'', carDriver:'', insuranceEnd:'',
  },
  {
    id:'l3', type:'carlease', icon:'🚙',
    name:'차량 리스 (BMW 520)', vendor:'현대캐피탈',
    amount:1450000, payDay:'5', vatMode:'exclude',
    contractStart:'2023-03-01', contractEnd:'2026-03-01',
    autoEnabled:false, lastPayStatus:null,
    hasTax:true, hasContract:true, hasReceipt:true, payMethod:'account',
    carNo:'34나 5678', carModel:'BMW 5시리즈 520d', carDriver:'이부장', insuranceEnd:'2026-03-01',
  },
]

const DEMO_LOGS = [
  { date:'2026.05.01', status:'success', amount:980000, note:'' },
  { date:'2026.04.01', status:'success', amount:980000, note:'' },
  { date:'2026.03.01', status:'fail',    amount:0,       note:'잔액 부족 → 재시도 후 실패' },
  { date:'2026.02.01', status:'success', amount:980000, note:'' },
  { date:'2026.01.01', status:'success', amount:980000, note:'' },
]

// ─── 유틸 ─────────────────────────────────────────────────
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / (1000*60*60*24))
}
function calcMonthly(amount, vatMode) {
  const a = amount || 0
  const vat = vatMode === 'exclude' ? Math.floor(a * VAT_RATE) : 0
  return { base: a, vat, total: a + vat }
}

// ─── 상태 스타일 ───────────────────────────────────────────
const STATUS_MAP = {
  active:  { label:'자동지급 ON',  bg:'#D1FAE5', color:'#059669' },
  overdue: { label:'미납 중',      bg:'#FEF3C7', color:'#D97706' },
  paused:  { label:'자동지급 OFF', bg:'#F3F4F6', color:'#6B7280' },
}
function getComputedStatus(item) {
  if (!item.autoEnabled) return 'paused'
  if (item.lastPayStatus === 'fail') return 'overdue'
  return 'active'
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.active
  return (
    <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'20px', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{ width:'46px', height:'26px', borderRadius:'13px', border:'none', cursor:'pointer', background: on ? brand : COLORS.bgMuted, position:'relative', transition:'background 0.2s', padding:0, flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '23px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
    </button>
  )
}

// ─── 공통 섹션들 (등록폼 & 상세화면 모두 사용) ────────────
function SectionControl({ theme, autoOn, setAutoOn, payDay, setPayDay, vatMode, setVatMode, payMethod, setPayMethod, autoEnd, setAutoEnd, amountVal, secLabel, selectedCard, setSelectedCard, bankName, setBankName, bankAccount, setBankAccount }) {
  const c = calcMonthly(amountVal, vatMode)
  // 직접 입력 모드: PAY_DAYS에 없는 값이면 custom으로 간주
  const isCustomDay = !PAY_DAYS.includes(payDay)
  const [customDayInput, setCustomDayInput] = useState(isCustomDay ? payDay : '')
  return (
    <>
      {secLabel('VAT 설정')}
      <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
          <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>VAT 처리 방식</span>
          <span style={{ fontSize:'10px', color: COLORS.t4 }}>
            {vatMode === 'exclude' && c.vat > 0 ? `+${fmt(c.vat)}원 추가` : vatMode === 'include' ? '금액에 포함됨' : '면세'}
          </span>
        </div>
        <div style={{ display:'flex', background: COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
          {[{ key:'exclude', label:'VAT 별도' }, { key:'include', label:'VAT 포함' }, { key:'none', label:'면세' }].map(opt => (
            <button key={opt.key} onClick={() => setVatMode(opt.key)}
              style={{ flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', fontSize:'11px', fontWeight:700, transition:'all 0.15s', background: vatMode === opt.key ? '#fff' : 'transparent', color: vatMode === opt.key ? theme.brand : COLORS.t4, boxShadow: vatMode === opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {secLabel('자동 지급 설정')}
      <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: autoOn ? '16px' : 0 }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>자동 지급</div>
            <div style={{ fontSize:'11px', color: COLORS.t4 }}>{autoOn ? `매월 ${payDay}일 집행` : '수동 지급 모드'}</div>
          </div>
          <Toggle on={autoOn} onChange={() => setAutoOn(!autoOn)} brand={theme.brand} />
        </div>

        {autoOn && (
          <>
            <div style={{ height:'1px', background: COLORS.borderSoft, marginBottom:'16px' }} />

            {/* 매월 지급일 */}
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>매월 지급일</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {PAY_DAYS.map(d => (
                  <button key={d} onClick={() => { setPayDay(d) }}
                    style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', background: payDay === d ? theme.brand : COLORS.bgMuted, color: payDay === d ? '#fff' : COLORS.t3, boxShadow: payDay === d ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                    {d === '말일' ? '말일' : `${d}일`}
                  </button>
                ))}
                {/* 직접 입력 칩 */}
                <button onClick={() => { if (!isCustomDay) { setPayDay(''); setCustomDayInput('') } }}
                  style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', background: isCustomDay ? theme.brand : COLORS.bgMuted, color: isCustomDay ? '#fff' : COLORS.t3, boxShadow: isCustomDay ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                  직접 입력
                </button>
              </div>
              {/* 직접 입력 시 숫자 입력란 */}
              {isCustomDay && (
                <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'8px', background: COLORS.bg, borderRadius:'10px', padding:'10px 14px', border:`1px solid ${theme.brand}40` }}>
                  <span style={{ fontSize:'12px', color: COLORS.t3, flexShrink:0 }}>매월</span>
                  <input
                    type="number" min="1" max="31"
                    value={customDayInput}
                    onChange={e => { setCustomDayInput(e.target.value); if (e.target.value) setPayDay(e.target.value) }}
                    placeholder="일 입력"
                    style={{ flex:1, border:'none', outline:'none', fontSize:'16px', fontWeight:700, color: theme.brand, background:'transparent', fontFamily:'inherit', textAlign:'center' }}
                  />
                  <span style={{ fontSize:'12px', color: COLORS.t3, flexShrink:0 }}>일</span>
                </div>
              )}
            </div>

            {/* 지급 방식 */}
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급 방식</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {[
                  { id:'card',    label:'카드 자동결제형',  sub:'발급된 법인카드로 자동 결제' },
                  { id:'account', label:'계좌 자동송금형',  sub:'지정 계좌로 자동 이체' },
                  { id:'link',    label:'링크 수취형',      sub:'수신인에게 링크 발송 후 수취' },
                ].map(pm => (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                    style={{ width:'100%', padding:'11px 14px', textAlign:'left', background: payMethod === pm.id ? theme.brand+'10' : COLORS.bgMuted, border:`1px solid ${payMethod === pm.id ? theme.brand+'40' : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${payMethod === pm.id ? theme.brand : COLORS.border}`, background: payMethod === pm.id ? theme.brand : '#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {payMethod === pm.id && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#fff' }}/>}
                    </div>
                    <div>
                      <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t1 }}>{pm.label}</div>
                      <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'1px' }}>{pm.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 카드 자동결제형 선택 시 */}
              {payMethod === 'card' && (
                <div style={{ marginTop:'10px', background: COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t3, marginBottom:'10px' }}>발급된 법인카드 선택</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {DEMO_CARDS.map(card => (
                      <button key={card.id} onClick={() => setSelectedCard(card.id)}
                        style={{ padding:'10px 12px', background: selectedCard === card.id ? card.color+'12' : '#fff', border:`1.5px solid ${selectedCard === card.id ? card.color : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px', textAlign:'left' }}>
                        <div style={{ width:'36px', height:'24px', borderRadius:'5px', background: card.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontSize:'8px', fontWeight:800, color:'#fff' }}>CARD</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t1 }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color: COLORS.t4 }}>**** **** **** {card.last4}</div>
                        </div>
                        {selectedCard === card.id && (
                          <div style={{ width:'16px', height:'16px', borderRadius:'50%', background: card.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop:'10px', padding:'8px 10px', background:'#EFF6FF', borderRadius:'8px', fontSize:'10px', color:'#1D4ED8', lineHeight:1.6 }}>
                    ℹ️ 해당 카드를 자동 이체로 등록하시면 매월 지급일에 자동 결제됩니다.
                  </div>
                </div>
              )}

              {/* 계좌 자동송금형 선택 시 */}
              {payMethod === 'account' && (
                <div style={{ marginTop:'10px', background: COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t3, marginBottom:'10px' }}>수취 계좌 정보</div>
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'6px' }}>은행 선택</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                      {DEMO_BANKS.map(b => (
                        <button key={b} onClick={() => setBankName(b)}
                          style={{ padding:'5px 10px', borderRadius:'20px', border:`1px solid ${bankName === b ? theme.brand : COLORS.borderSoft}`, background: bankName === b ? theme.brand : '#fff', color: bankName === b ? '#fff' : COLORS.t3, fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:'#fff', borderRadius:'8px', border:`1px solid ${COLORS.borderSoft}`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'4px' }}>계좌번호</div>
                    <input value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                      placeholder="계좌번호 입력 (- 없이)"
                      style={{ width:'100%', border:'none', outline:'none', fontSize:'13px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
                  </div>
                </div>
              )}

              {/* 링크 수취형 선택 시 — 발주 정보 인라인 */}
              {payMethod === 'link' && (
                <div style={{ marginTop:'10px', background: COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t3, marginBottom:'10px' }}>발주 정보 (수신인)</div>
                  {[
                    { label:'이름',   icon:'👤', value:'', placeholder:'렌트사 담당자', type:'text' },
                    { label:'휴대폰', icon:'📱', value:'', placeholder:'010-0000-0000', type:'tel' },
                    { label:'이메일', icon:'✉️', value:'', placeholder:'example@email.com', type:'email' },
                  ].map((field, i, arr) => (
                    <div key={field.label} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                      <span style={{ fontSize:'13px', width:'18px', textAlign:'center', flexShrink:0 }}>{field.icon}</span>
                      <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0, width:'40px' }}>{field.label}</span>
                      <input type={field.type} placeholder={field.placeholder}
                        style={{ flex:1, border:'none', outline:'none', textAlign:'right', fontSize:'12px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
                    </div>
                  ))}
                  <div style={{ marginTop:'8px', fontSize:'10px', color: COLORS.t4, lineHeight:1.6 }}>
                    미가입 수신인에게 결제 링크가 발송됩니다.
                  </div>
                </div>
              )}
            </div>

            {/* 월 총 지급액 */}
            <div style={{ background:`linear-gradient(135deg, ${theme.brand}14, ${theme.brand}08)`, border:`1px solid ${theme.brand}22`, borderRadius:'12px', padding:'14px 16px', marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark, marginBottom:'8px', letterSpacing:'0.3px' }}>매월 총 지급액</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: COLORS.t3, marginBottom:'4px' }}>
                <span>납부액</span><span style={{ fontWeight:600 }}>{fmt(amountVal)}원</span>
              </div>
              {c.vat > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: COLORS.t3, marginBottom:'4px' }}>
                  <span>부가세 10%</span><span style={{ fontWeight:600, color:'#D97706' }}>+{fmt(c.vat)}원</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', borderTop:`1px dashed ${theme.brand}25`, fontSize:'17px', fontWeight:800, color: theme.brand, marginTop:'4px', letterSpacing:'-0.3px' }}>
                <span>합계</span><span>{fmt(c.total)}원</span>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'14px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, marginBottom:'2px' }}>계약 종료 시 자동 종료</div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>만료일 이후 자동 지급 중단</div>
              </div>
              <Toggle on={autoEnd} onChange={() => setAutoEnd(!autoEnd)} brand={theme.brand} />
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── 납부 로그 오버레이 컴포넌트 ─────────────────────────
function LeaseLogScreen({ theme, selectedItem, onBack }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:10,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>납부내역보기</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:'3px' }}>{selectedItem.name}</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>반복 납부 이력</div>
          </div>
        </div>
        <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {DEMO_LOGS.map((log, i) => (
            <div key={i} style={{ background: COLORS.bgCard, borderRadius:'14px', padding:'14px 16px', boxShadow: SHADOWS.card, display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0, background: log.status === 'success' ? '#D1FAE5' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>
                {log.status === 'success' ? '✅' : '❌'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, marginBottom:'2px' }}>{log.date}</div>
                {log.note ? <div style={{ fontSize:'11px', color:'#B91C1C' }}>{log.note}</div>
                  : <div style={{ fontSize:'11px', color: COLORS.t4 }}>{log.status === 'success' ? '정상 납부' : '납부 실패'}</div>}
              </div>
              {log.amount > 0 && <div style={{ fontSize:'14px', fontWeight:700, color: log.status === 'success' ? '#065F46' : COLORS.t4 }}>{fmt(log.amount)}원</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 유형 선택 오버레이 컴포넌트 (등록 step 1) ───────────
function LeaseAddTypeScreen({ theme, skipAnim, setScreen, resetShared, setAddType, setAddName }) {
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
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <button onClick={() => setScreen('list')} style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.15)', borderRadius:'10px', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>렌트&리스 추가</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', lineHeight:1.3, letterSpacing:'-0.5px' }}>어떤 유형인가요?</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', marginTop:'4px' }}>자산 종류를 선택해 주세요</div>
          </div>
        </div>
        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {LEASE_TYPES.map(tp => (
            <button key={tp.id} onClick={() => { setAddType(tp); resetShared(); setAddName(tp.id === 'etc' ? '' : tp.label); setScreen('addForm') }}
              style={{ width:'100%', padding:'14px 16px', background: COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'16px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', boxShadow: SHADOWS.card }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'14px', background: theme.brand+'12', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>{tp.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{tp.label}</div>
                <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px' }}>{tp.sub}</div>
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
function LeaseAddFormScreen({
  theme, addType, addName, setAddName, addVendor, setAddVendor,
  addContractStart, setAddContractStart, addContractEnd, setAddContractEnd,
  editAmount, setEditAmount,
  autoOn, setAutoOn, payDay, setPayDay, vatMode, setVatMode,
  payMethod, setPayMethod, autoEnd, setAutoEnd,
  selectedCard, setSelectedCard, bankName, setBankName, bankAccount, setBankAccount,
  carNo, setCarNo, carModel, setCarModel, carDriver, setCarDriver, insuranceEnd, setInsuranceEnd,
  handleAddSubmit, setScreen,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const isVehicle = addType.id === 'vehicle' || addType.id === 'carlease'
  const amountVal = parseInt(String(editAmount).replace(/,/g,'')) || 0
  const isValid = !!(addName && editAmount && amountVal >= 100)

  const secLabel = (label) => (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: theme.brand, flexShrink:0 }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
    </div>
  )

  const renderCommonBottomSections = () => (
    <div style={{ marginTop:'8px', padding:'11px 14px', background:'#EDF3FA', borderRadius:'8px', fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
      <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
    </div>
  )

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:20,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            {/* 백버튼: 그냥 이전 화면으로 */}
            <button onClick={() => setScreen('addType')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>{addType.icon} {addType.label} 등록</span>
            {/* X버튼: 나가기 모달 */}
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px', overflow:'hidden' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{addName || '계약명 입력'}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{addVendor || '렌트·리스사 입력'}</div>
            </div>
            {amountVal > 0 && (
              <div style={{ textAlign:'right', marginBottom:'20px', flexShrink:0, maxWidth:'120px' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>매월 납부</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>{fmt(calcMonthly(amountVal, vatMode).total)}<span style={{ fontSize:'11px', opacity:0.6 }}>원</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>

          {secLabel('기본 정보')}

          {/* 월 납부액 — 가로 전체, 슬림 */}
          <div style={{ background: COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark }}>월 납부액</span>
              <div style={{ display:'flex', alignItems:'center', gap:'3px', background: theme.brand+'18', borderRadius:'6px', padding:'2px 6px' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span style={{ fontSize:'9px', fontWeight:700, color: theme.brand }}>수정</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'4px' }}>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'22px', fontWeight:800, color: COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'14px', fontWeight:600, color: COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <span style={{ fontSize:'10px', color: COLORS.t4 }}>탭하여 수정</span>
          </div>

          <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden', marginBottom:'4px' }}>
            {[
              { label:'계약명', value: addName, setter: setAddName, placeholder:'예: 법인 차량 렌트, 복합기 렌트' },
              { label:'렌트·리스사', value: addVendor, setter: setAddVendor, placeholder:'예: AJ렌터카, 현대캐피탈' },
            ].map((f, i, arr) => (
              <div key={f.label} style={{ padding:'13px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'5px' }}>{f.label}</div>
                <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                  style={{ width:'100%', border:'none', outline:'none', fontSize:'14px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
              </div>
            ))}
          </div>

          {secLabel('계약 기간')}
          <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden' }}>
            {[
              { label:'계약 시작일', value: addContractStart, setter: setAddContractStart },
              { label:'계약 종료일', value: addContractEnd,   setter: setAddContractEnd },
            ].map((f, i, arr) => (
              <div key={f.label} style={{ padding:'13px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'13px', color: COLORS.t3, fontWeight:500 }}>{f.label}</span>
                <div style={{ overflow:'hidden', borderRadius: RADIUS.lg }}>
                  <input type="date" value={f.value} onChange={e => f.setter(e.target.value)}
                    style={{ border:'none', outline:'none', fontSize:'13px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance:'none', appearance:'none' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* 차량 전용 */}
          {isVehicle && (
            <>
              {secLabel('차량 정보 (선택)')}
              <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden' }}>
                {[
                  { label:'차량번호', value: carNo,         setter: setCarNo,         placeholder:'12가 3456', type:'text' },
                  { label:'차종',    value: carModel,      setter: setCarModel,      placeholder:'현대 아이오닉6', type:'text' },
                  { label:'운행자',  value: carDriver,     setter: setCarDriver,     placeholder:'홍길동', type:'text' },
                  { label:'보험만료', value: insuranceEnd,  setter: setInsuranceEnd,  placeholder:'YYYY-MM-DD', type:'date' },
                ].map((f, i, arr) => (
                  <div key={f.label} style={{ padding:'13px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                    <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'5px' }}>{f.label}</div>
                    <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                      style={{ width:'100%', border:'none', outline:'none', fontSize:'14px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance: f.type === 'date' ? 'none' : undefined, appearance: f.type === 'date' ? 'none' : undefined }}/>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 공통 하단 섹션 (VAT + 자동지급 + 발주 + 승인 + 증빙 + 알림) */}
          <SectionControl
            theme={theme} autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            vatMode={vatMode} setVatMode={setVatMode}
            payMethod={payMethod} setPayMethod={setPayMethod}
            autoEnd={autoEnd} setAutoEnd={setAutoEnd}
            amountVal={parseInt(String(editAmount).replace(/,/g,'')) || 0}
            secLabel={secLabel}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
          />
          {renderCommonBottomSections()}

          <div style={{ padding:'12px 14px', background:'#FFFBEB', borderRadius:'12px', fontSize:'11px', color:'#854F0B', lineHeight:1.65, border:'1px solid #FDE68A', marginTop:'6px' }}>
            ⓘ 렌트·리스료는 전액 손금 처리됩니다. 계약서·세금계산서가 자동 수집됩니다.
          </div>
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 20px', background: COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
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
function LeaseDetailScreen({
  theme, selectedItem, items, setItems,
  autoOn, setAutoOn, payDay, setPayDay, vatMode, setVatMode,
  editAmount, setEditAmount, payMethod, setPayMethod, autoEnd, setAutoEnd,
  selectedCard, setSelectedCard, bankName, setBankName, bankAccount, setBankAccount,
  carNo, setCarNo, carModel, setCarModel, carDriver, setCarDriver, insuranceEnd, setInsuranceEnd,
  saved, setSaved, handleSave, onBack, navigate,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const item = selectedItem
  const amountVal = parseInt(String(editAmount).replace(/,/g,'')) || 0
  const c = calcMonthly(amountVal, vatMode)
  const dDay = daysUntil(item.contractEnd)
  const isVehicle = item.type === 'vehicle' || item.type === 'carlease'

  const secLabel = (label) => (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: theme.brand, flexShrink:0 }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
    </div>
  )

  const renderCommonBottomSections = () => (
    <div style={{ marginTop:'8px', padding:'11px 14px', background:'#EDF3FA', borderRadius:'8px', fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
      <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
    </div>
  )

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:10,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            {/* 백버튼: 그냥 리스트로 */}
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>렌트&리스 자동 설정</span>
            {/* X버튼: 나가기 모달 */}
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px', overflow:'hidden' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', letterSpacing:'-0.3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.vendor}</div>
            </div>
            {c.total > 0 && (
              <div style={{ textAlign:'right', marginBottom:'20px', flexShrink:0, maxWidth:'120px' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>매월 납부</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>{fmt(c.total)}<span style={{ fontSize:'11px', opacity:0.6 }}>원</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>

          {secLabel('계약 정보')}

          {/* 월 납부액 — 가로 전체, 슬림 */}
          <div style={{ background: COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark }}>월 납부액</span>
              <div style={{ display:'flex', alignItems:'center', gap:'3px', background: theme.brand+'18', borderRadius:'6px', padding:'2px 6px' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span style={{ fontSize:'9px', fontWeight:700, color: theme.brand }}>수정</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'4px' }}>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'22px', fontWeight:800, color: COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'14px', fontWeight:600, color: COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <span style={{ fontSize:'10px', color: COLORS.t4 }}>탭하여 수정</span>
          </div>

          {/* 계약 메타 */}
          <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden' }}>
            {[
              { icon:'🏢', label:'렌트·리스사', value: item.vendor || '—' },
              { icon:'📂', label:'카테고리',    value: LEASE_TYPES.find(tp=>tp.id===item.type)?.label || '—' },
              { icon:'📅', label:'계약 기간',   value: item.contractStart && item.contractEnd ? `${item.contractStart} ~ ${item.contractEnd}` : '—' },
              { icon:'📋', label:'계약서',      value: item.hasContract ? '첨부 완료 ✅' : '미첨부' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ padding:'11px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'flex-start', gap:'10px' }}>
                <span style={{ fontSize:'14px', marginTop:'1px', width:'18px', textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0, minWidth:'56px', marginTop:'1px' }}>{row.label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1, textAlign:'right', flex:1, lineHeight:1.4 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* 계약 만료 임박 */}
          {dDay !== null && dDay > 0 && dDay <= 30 && (
            <div style={{ padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'12px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <span style={{ fontSize:'18px', flexShrink:0, lineHeight:1 }}>⏰</span>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E', marginBottom:'2px' }}>계약 만료 D-{dDay}</div>
                <div style={{ fontSize:'11px', color:'#B45309', lineHeight:1.5 }}>갱신 또는 종료 여부를 확인해주세요.</div>
              </div>
            </div>
          )}

          {/* 차량 정보 (차량 유형만) */}
          {isVehicle && (
            <>
              {secLabel('차량 정보')}
              <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden' }}>
                {[
                  { label:'차량번호', icon:'🔢', value: carNo,        setter: setCarNo,        placeholder:'12가 3456', type:'text' },
                  { label:'차종',    icon:'🚗', value: carModel,     setter: setCarModel,     placeholder:'현대 아이오닉6', type:'text' },
                  { label:'운행자',  icon:'👤', value: carDriver,    setter: setCarDriver,    placeholder:'홍길동', type:'text' },
                  { label:'보험만료', icon:'🛡️', value: insuranceEnd, setter: setInsuranceEnd, placeholder:'YYYY-MM-DD', type:'date' },
                ].map((field, i, arr) => (
                  <div key={field.label} style={{ padding:'12px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{field.icon}</span>
                    <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0, width:'48px' }}>{field.label}</span>
                    <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                      style={{ flex:1, border:'none', outline:'none', textAlign:'right', fontSize:'13px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance: field.type === 'date' ? 'none' : undefined, appearance: field.type === 'date' ? 'none' : undefined }}/>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 공통 하단 섹션 (VAT + 자동지급 + 발주 + 승인 + 증빙 + 알림) */}
          <SectionControl
            theme={theme} autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            vatMode={vatMode} setVatMode={setVatMode}
            payMethod={payMethod} setPayMethod={setPayMethod}
            autoEnd={autoEnd} setAutoEnd={setAutoEnd}
            amountVal={amountVal}
            secLabel={secLabel}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
          />
          {renderCommonBottomSections()}

          <div style={{ padding:'12px 16px', background: theme.brandDark+'0A', border:`1px solid ${theme.brandDark}15`, borderRadius:'12px', fontSize:'11px', color: theme.brandDark, lineHeight:1.7, display:'flex', gap:'8px', alignItems:'flex-start', marginTop:'6px' }}>
            <span style={{ flexShrink:0, marginTop:'1px' }}>ⓘ</span>
            <span>자금 집행 이력 기반으로 반복 납부를 자동 감지하여 운영 비용으로 분류합니다.</span>
          </div>
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 20px', background: COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
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

// ═══════════════════════════════════════════════════════════
export default function ExecuteRentLease() {
  const theme = getAccountTheme()
  const t = useT()
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


  const [items, setItems] = useState(DEMO_ITEMS)
  const [screen, setScreen] = useState('list') // list | detail | log | addType | addForm

  const [selectedItem, setSelectedItem] = useState(null)

  // ── 공통 편집 상태 (상세 & 등록폼 공유) ──────────────────
  const [autoOn, setAutoOn]             = useState(false)
  const [payDay, setPayDay]             = useState('1')
  const [vatMode, setVatMode]           = useState('exclude')
  const [editAmount, setEditAmount]     = useState('0')
  const [payMethod, setPayMethod]       = useState('app')
  const [autoEnd, setAutoEnd]           = useState(true)
  const [hasTax, setHasTax]            = useState(true)
  const [hasContractFile, setHasContractFile] = useState(false)
  const [hasReceipt, setHasReceipt]     = useState(true)
  const [orderName, setOrderName]       = useState('')
  const [orderPhone, setOrderPhone]     = useState('')
  const [orderEmail, setOrderEmail]     = useState('')
  const [saved, setSaved]               = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  // 카드/계좌 전용
  const [selectedCard, setSelectedCard] = useState('c1')
  const [bankName, setBankName]         = useState('')
  const [bankAccount, setBankAccount]   = useState('')
  // 차량 전용
  const [carNo, setCarNo]               = useState('')
  const [carModel, setCarModel]         = useState('')
  const [carDriver, setCarDriver]       = useState('')
  const [insuranceEnd, setInsuranceEnd] = useState('')

  // ── 등록폼 전용 상태 ──────────────────────────────────────
  const [addType, setAddType]     = useState(LEASE_TYPES[0])
  const [addName, setAddName]     = useState('')
  const [addVendor, setAddVendor] = useState('')
  const [addContractStart, setAddContractStart] = useState('')
  const [addContractEnd, setAddContractEnd]     = useState('')

  // ─── 스와이프 백 가드 ─────────────────────────────────────
  const handleBack = () => {
    if (screen === 'addForm') setScreen('addType')
    else setScreen('list')
  }
  useStepHistory(handleBack, screen === 'list')

  // ─── 상태 초기화 헬퍼 ────────────────────────────────────
  const resetShared = () => {
    setAutoOn(false); setPayDay('1'); setVatMode('exclude'); setEditAmount('0')
    setPayMethod('card'); setAutoEnd(true); setHasTax(true); setHasContractFile(false)
    setHasReceipt(true); setOrderName(''); setOrderPhone(''); setOrderEmail('')
    setSaved(false); setCarNo(''); setCarModel(''); setCarDriver(''); setInsuranceEnd('')
    setSelectedCard('c1'); setBankName(''); setBankAccount('')
  }

  const activeItems = items.filter(i => i.autoEnabled)
  const totalMonthly = activeItems.reduce((s,i) => s + calcMonthly(i.amount, i.vatMode).total, 0)
  const expiringCount = items.filter(i => { const d = daysUntil(i.contractEnd); return d !== null && d > 0 && d <= 30 }).length

  // ─── 상세 열기 ────────────────────────────────────────────
  const openDetail = (item) => {
    setSelectedItem(item)
    setAutoOn(item.autoEnabled); setPayDay(String(item.payDay || '1'))
    setVatMode(item.vatMode || 'exclude'); setEditAmount(String(item.amount || 0))
    setPayMethod(item.payMethod || 'card'); setHasTax(item.hasTax ?? true)
    setHasContractFile(item.hasContract ?? false); setHasReceipt(item.hasReceipt ?? true)
    setCarNo(item.carNo || ''); setCarModel(item.carModel || '')
    setCarDriver(item.carDriver || ''); setInsuranceEnd(item.insuranceEnd || '')
    setOrderName(item.vendor || ''); setOrderPhone(''); setOrderEmail('')
    setSaved(false); setScreen('detail')
  }

  const handleSave = () => {
    if (!selectedItem) return
    const amtNum = parseInt(String(editAmount).replace(/,/g,'')) || selectedItem.amount
    setItems(prev => prev.map(it =>
      it.id === selectedItem.id
        ? { ...it, autoEnabled: autoOn, payDay, vatMode, amount: amtNum }
        : it
    ))
    addTransaction({
      type: 'rentLease',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient: { id: null, name: selectedItem.vendor || selectedItem.name, phone: '', verified: true, isBusiness: true },
      amount: amtNum,
      reason: selectedItem.name,
      walletId: 'my', walletLabel: 'MY 지갑',
      payDateMode: 'immediate', status: 'completed',
    })
    setSaved(true)
    setTimeout(() => setScreen('list'), 800)
  }

  const handleAddSubmit = () => {
    if (!addName || !editAmount) return
    const newItem = {
      id: `l${Date.now()}`, type: addType.id, icon: addType.icon,
      name: addName, vendor: addVendor,
      amount: parseInt(editAmount) || 0,
      payDay, vatMode, contractStart: addContractStart, contractEnd: addContractEnd,
      autoEnabled: autoOn, status: 'active',
      hasTax, hasContract: hasContractFile, hasReceipt, payMethod,
      carNo, carModel, carDriver, insuranceEnd,
    }
    setItems(prev => [newItem, ...prev])
    resetShared(); setAddName(''); setAddVendor(''); setAddContractStart(''); setAddContractEnd('')
    setScreen('list')
  }

  // ═══════════════════════════════════════════════════════════
  // ── 리스트 화면 (항상 렌더) + 오버레이 ───────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        {/* List always rendered */}
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

          {/* 헤더 */}
          <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
              <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>렌트&리스 자동 지급</span>
              <div style={{ flex:1 }}/>
              <button onClick={() => { if (!selectedItem) { const t = items[0]; if (t) setSelectedItem(t); } setScreen('log') }} style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px' }}>납부내역보기</button>
              <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* 월 요약 카드 */}
            <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', fontWeight:500, marginBottom:'4px', letterSpacing:'0.3px' }}>
                    이번 달 렌트&리스 · {activeItems.length}건
                  </div>
                  <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
                    {fmt(totalMonthly)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
                  </div>
                </div>
                {expiringCount > 0 && (
                  <div style={{ background:'rgba(251,191,36,0.25)', borderRadius:'10px', padding:'6px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:800, color:'#FCD34D', lineHeight:1 }}>{expiringCount}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.7)', marginTop:'2px' }}>만료예정</div>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:'16px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>활성 계약</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{activeItems.length}건</div>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>자동납부</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{items.filter(i=>i.autoEnabled).length}건</div>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>만료예정</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: expiringCount > 0 ? '#FCD34D' : 'rgba(255,255,255,0.85)' }}>{expiringCount}건</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding:'16px 16px 36px' }}>

            {/* 목록 */}
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
              {items.map(item => {
                const c = calcMonthly(item.amount, item.vatMode)
                const dDay = daysUntil(item.contractEnd)
                const isExpiring = dDay !== null && dDay > 0 && dDay <= 30

                return (
                  <div key={item.id} onClick={() => openDetail(item)}
                    style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, border: isExpiring ? '1px solid #FDE68A' : `1px solid ${COLORS.borderSoft}`, cursor:'pointer', overflow:'hidden' }}>
                    <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                      {/* 아이콘 */}
                      <div style={{ width:'44px', height:'44px', borderRadius:'14px', background: theme.brand+'12', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                        {item.icon}
                      </div>
                      {/* 정보 */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                          {item.vendor} · 매월 {item.payDay}일
                        </div>
                      </div>
                      {/* 금액 + 상태 */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'15px', fontWeight:800, color: COLORS.t1, marginBottom:'5px' }}>
                          {fmt(c.total)}원
                        </div>
                        <StatusBadge status={getComputedStatus(item)} />
                      </div>
                    </div>
                    {/* 만료 임박 스트립 */}
                    {isExpiring && (
                      <div style={{ padding:'7px 16px', background:'#FFFBEB', borderTop:`1px solid #FDE68A`, display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'12px' }}>⏰</span>
                        <span style={{ fontSize:'11px', fontWeight:600, color:'#D97706' }}>계약 만료 D-{dDay} · 갱신 여부를 확인해 주세요</span>
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
            style={{ width:'100%', padding:'15px', background: theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow: theme.activeShadow }}>
            <span style={{ fontSize:'18px' }}>+</span> 렌트&리스 추가
          </button>
        </div>

        {/* Overlays */}
        {screen === 'log' && selectedItem && (
          <LeaseLogScreen
            theme={theme}
            selectedItem={selectedItem}
            onBack={() => setScreen('list')}
          />
        )}

        {(screen === 'addType' || screen === 'addForm') && (
          <LeaseAddTypeScreen
            theme={theme}
            skipAnim={screen === 'addForm'}
            setScreen={setScreen}
            resetShared={resetShared}
            setAddType={setAddType}
            setAddName={setAddName}
          />
        )}

        {screen === 'addForm' && (
          <LeaseAddFormScreen
            theme={theme}
            addType={addType}
            addName={addName} setAddName={setAddName}
            addVendor={addVendor} setAddVendor={setAddVendor}
            addContractStart={addContractStart} setAddContractStart={setAddContractStart}
            addContractEnd={addContractEnd} setAddContractEnd={setAddContractEnd}
            editAmount={editAmount} setEditAmount={setEditAmount}
            autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            vatMode={vatMode} setVatMode={setVatMode}
            payMethod={payMethod} setPayMethod={setPayMethod}
            autoEnd={autoEnd} setAutoEnd={setAutoEnd}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
            carNo={carNo} setCarNo={setCarNo}
            carModel={carModel} setCarModel={setCarModel}
            carDriver={carDriver} setCarDriver={setCarDriver}
            insuranceEnd={insuranceEnd} setInsuranceEnd={setInsuranceEnd}
            handleAddSubmit={handleAddSubmit}
            setScreen={setScreen}
          />
        )}

        {screen === 'detail' && selectedItem && (
          <LeaseDetailScreen
            theme={theme}
            selectedItem={selectedItem}
            items={items} setItems={setItems}
            autoOn={autoOn} setAutoOn={setAutoOn}
            payDay={payDay} setPayDay={setPayDay}
            vatMode={vatMode} setVatMode={setVatMode}
            editAmount={editAmount} setEditAmount={setEditAmount}
            payMethod={payMethod} setPayMethod={setPayMethod}
            autoEnd={autoEnd} setAutoEnd={setAutoEnd}
            selectedCard={selectedCard} setSelectedCard={setSelectedCard}
            bankName={bankName} setBankName={setBankName}
            bankAccount={bankAccount} setBankAccount={setBankAccount}
            carNo={carNo} setCarNo={setCarNo}
            carModel={carModel} setCarModel={setCarModel}
            carDriver={carDriver} setCarDriver={setCarDriver}
            insuranceEnd={insuranceEnd} setInsuranceEnd={setInsuranceEnd}
            saved={saved} setSaved={setSaved}
            handleSave={handleSave}
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
