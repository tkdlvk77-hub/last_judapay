import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { addTransaction } from '../../shared/transactionStore'
import { ensureStepUp } from '../../components/PinModal'

// ─── 상수 ─────────────────────────────────────────────────
const CYCLES = [
  { key:'매주',   label:'매주',   multi:52/12 },
  { key:'매2주',  label:'2주',    multi:26/12 },
  { key:'매월',   label:'매월',   multi:1     },
  { key:'분기',   label:'분기',   multi:1/3   },
  { key:'반기',   label:'반기',   multi:1/6   },
  { key:'매년',   label:'매년',   multi:1/12  },
]
const PAY_DAYS = ['5', '10', '15', '20', '25', '말일', '영업일']
const PAY_METHODS = [
  { id:'account', label:'계좌 자동송금형', sub:'지정 계좌로 자동 이체'      },
  { id:'card',    label:'카드 자동결제형', sub:'발급된 법인카드로 자동 결제' },
]
const VAT_OPTIONS = [
  { id:'include',  label:'VAT 포함',  sub:'금액에 부가세 포함',     icon:'📊', bg:'#EFF6FF', color:'#1D4ED8' },
  { id:'separate', label:'VAT 별도',  sub:'세금계산서 발행 기준',   icon:'🧾', bg:'#FFF7ED', color:'#B45309' },
  { id:'exempt',   label:'면세',      sub:'부가세 면세 거래',       icon:'✅', bg:'#F0FDF4', color:'#065F46' },
]
const DEMO_CARDS = [
  { id:'c1', name:'법인카드 (현대카드)', last4:'7842', color:'#1D4ED8' },
  { id:'c2', name:'법인카드 (신한카드)', last4:'3391', color:'#059669' },
]
const DEMO_BANKS = ['국민은행','신한은행','하나은행','우리은행','기업은행','카카오뱅크','토스뱅크']
const EXPENSE_STATUS = {
  active:  { label:'정상',    color:'#065F46', bg:'#D1FAE5', border:'#6EE7B7', dot:'#10B981' },
  soon:    { label:'만료임박', color:'#B45309', bg:'#FEF3C7', border:'#FCD34D', dot:'#F59E0B' },
  expired: { label:'만료됨',  color:'#7F1D1D', bg:'#FEE2E2', border:'#FCA5A5', dot:'#EF4444' },
}

// ─── 유틸 ─────────────────────────────────────────────────
function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / (1000*60*60*24))
}
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function calcMonthly(amount, cycle) {
  const c = CYCLES.find(x => x.key === cycle)
  return Math.round((amount||0) * (c ? c.multi : 1))
}
function getStatus(endDate) {
  if (!endDate) return 'active'
  const d = daysLeft(endDate)
  if (d === null) return 'active'
  if (d < 0) return 'expired'
  if (d <= 30) return 'soon'
  return 'active'
}

// ─── 데모 데이터 ───────────────────────────────────────────
const INIT_ITEMS = [
  { id:'e1', name:'사무실 청소비', memo:'주 2회 청소 대행', vendor:'클린파트너스',
    amount:320000, cycle:'매월', payDay:'25', payMethod:'account', selectedCard:'c1',
    bankName:'신한은행', bankAccount:'110-234-567890', vat:'include',
    startDate:'2026-01-01', endDate:'2026-12-31',
    autoOn:true, autoEnd:true, customDay:'', bizDay:'',
    approvalEnabled:false, limitEnabled:false, limitAmount:'', limitAction:'block',
    evTax:false, evReceipt:true, evContract:false, evCenter:true,
    notifBefore:true, notifDone:true, notifFail:true, notifReceive:false,
    logs:[{ date:'2026-01-25', amount:320000, status:'success' },{ date:'2026-02-25', amount:320000, status:'success' }] },
  { id:'e2', name:'회계 자문료', memo:'월간 세무·회계 자문', vendor:'세무법인 한빛',
    amount:550000, cycle:'매월', payDay:'말일', payMethod:'account', selectedCard:'',
    bankName:'국민은행', bankAccount:'598-21-0012345', vat:'separate',
    startDate:'2025-07-01', endDate:'2026-06-30',
    autoOn:true, autoEnd:true, customDay:'', bizDay:'',
    approvalEnabled:true, limitEnabled:false, limitAmount:'', limitAction:'block',
    evTax:true, evReceipt:false, evContract:true, evCenter:true,
    notifBefore:true, notifDone:true, notifFail:true, notifReceive:true,
    logs:[{ date:'2026-01-31', amount:550000, status:'success' },{ date:'2026-02-28', amount:550000, status:'success' }] },
  { id:'e3', name:'보안 서비스 이용료', memo:'출입 관리 시스템 구독', vendor:'세이프가드',
    amount:180000, cycle:'매월', payDay:'10', payMethod:'card', selectedCard:'c1',
    bankName:'', bankAccount:'', vat:'include',
    startDate:'2026-03-01', endDate:'2026-05-15',
    autoOn:true, autoEnd:false, customDay:'', bizDay:'',
    approvalEnabled:false, limitEnabled:true, limitAmount:'200000', limitAction:'approve',
    evTax:false, evReceipt:true, evContract:false, evCenter:true,
    notifBefore:true, notifDone:false, notifFail:true, notifReceive:false,
    logs:[{ date:'2026-03-10', amount:180000, status:'success' }] },
  { id:'e4', name:'노무 자문료', memo:'근로계약·취업규칙 자문', vendor:'노무법인 동행',
    amount:420000, cycle:'매월', payDay:'15', payMethod:'account', selectedCard:'',
    bankName:'하나은행', bankAccount:'123-456789-01234', vat:'separate',
    startDate:'2025-04-01', endDate:'2026-03-31',
    autoOn:false, autoEnd:false, customDay:'', bizDay:'',
    approvalEnabled:false, limitEnabled:false, limitAmount:'', limitAction:'block',
    evTax:true, evReceipt:false, evContract:true, evCenter:true,
    notifBefore:true, notifDone:true, notifFail:true, notifReceive:false,
    logs:[{ date:'2025-04-15', amount:420000, status:'success' },{ date:'2025-05-15', amount:420000, status:'success' }] },
]

// ─── 공통 UI ───────────────────────────────────────────────
function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width:'40px', height:'22px', borderRadius:'11px', border:'none', outline:'none', cursor:'pointer', background: on ? (brand||'#059669') : COLORS.bgMuted, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '21px' : '3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </button>
  )
}
function StatusBadge({ endDate }) {
  const s = EXPENSE_STATUS[getStatus(endDate)]
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:'20px', padding:'3px 8px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:s.dot }}/>
      <span style={{ fontSize:'10px', fontWeight:700, color:s.color }}>{s.label}</span>
    </div>
  )
}

// ─── 공통 렌더 헬퍼 (standalone) ───────────────────────────
function secLabel(theme, label) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:theme.brand, flexShrink:0 }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
    </div>
  )
}

function renderAutoPaySection(theme, autoOn, setAutoOn, payDay, setPayDay, payMethod, setPayMethod, card, setCard, autoEnd, setAutoEnd, amountVal, cycle, customDay, setCustomDay, bizDay, setBizDay, bankName, setBankName, bankAccount, setBankAccount) {
  const monthly = calcMonthly(amountVal, cycle)
  const cycleLabel = CYCLES.find(c => c.key === cycle)?.label || cycle
  const isCustomDay = !PAY_DAYS.includes(payDay) && payDay !== '' && payDay !== '영업일'
  return (
    <>
      {secLabel(theme, '자동 지급 설정')}
      <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: autoOn ? '16px' : 0 }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>자동 지급</div>
            <div style={{ fontSize:'11px', color:COLORS.t4 }}>{autoOn ? (payDay==='말일' ? '매월 말일 집행' : payDay==='영업일' ? `매월 ${bizDay||'1'}번째 영업일` : `매월 ${payDay}일 집행`) : '수동 지급 모드'}</div>
          </div>
          <Toggle on={autoOn} onChange={() => setAutoOn(!autoOn)} brand={theme.brand} />
        </div>
        {autoOn && (<>
          <div style={{ height:'1px', background:COLORS.borderSoft, marginBottom:'16px' }} />

          {/* 지급일 */}
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급일</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {PAY_DAYS.map(d => (
                <button key={d} onClick={() => { setPayDay(d); setCustomDay(''); setBizDay('') }}
                  style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', outline:'none', background: payDay===d ? theme.brand : COLORS.bgMuted, color: payDay===d ? '#fff' : COLORS.t3, boxShadow: payDay===d ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                  {d==='말일' ? '말일' : d==='영업일' ? '영업일' : `${d}일`}
                </button>
              ))}
              <button onClick={() => { if (!isCustomDay) { setPayDay(''); setCustomDay('') } }}
                style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', outline:'none', background: isCustomDay ? theme.brand : COLORS.bgMuted, color: isCustomDay ? '#fff' : COLORS.t3, boxShadow: isCustomDay ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                직접 입력
              </button>
            </div>
            {isCustomDay && (
              <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'8px', background:COLORS.bgMuted, borderRadius:'10px', padding:'8px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>매월</span>
                <input type="number" min="1" max="31" value={customDay}
                  onChange={e => { const v = Math.min(31, Math.max(1, parseInt(e.target.value)||1)); setCustomDay(String(v)); setPayDay(String(v)) }}
                  placeholder="일 입력"
                  style={{ width:'60px', border:`1.5px solid ${theme.brand}`, borderRadius:'8px', padding:'5px 8px', fontSize:'13px', fontWeight:700, color:COLORS.t1, fontFamily:'inherit', textAlign:'center', outline:'none', background:'#fff' }}/>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>일</span>
              </div>
            )}
            {payDay === '영업일' && (
              <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'8px', background:COLORS.bgMuted, borderRadius:'10px', padding:'8px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>매월</span>
                <input type="number" min="1" max="5" value={bizDay}
                  onChange={e => { const v = Math.min(5, Math.max(1, parseInt(e.target.value)||1)); setBizDay(String(v)) }}
                  placeholder="1"
                  style={{ width:'50px', border:`1.5px solid ${theme.brand}`, borderRadius:'8px', padding:'5px 8px', fontSize:'13px', fontWeight:700, color:COLORS.t1, fontFamily:'inherit', textAlign:'center', outline:'none', background:'#fff' }}/>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>번째 영업일</span>
              </div>
            )}
          </div>

          {/* 지급 방식 */}
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급 방식</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {PAY_METHODS.map(pm => (
                <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                  style={{ width:'100%', padding:'11px 14px', textAlign:'left', background: payMethod===pm.id ? theme.brand+'10' : COLORS.bgMuted, border:`1px solid ${payMethod===pm.id ? theme.brand+'40' : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px', outline:'none' }}>
                  <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${payMethod===pm.id ? theme.brand : COLORS.border}`, background: payMethod===pm.id ? theme.brand : '#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {payMethod===pm.id && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#fff' }}/>}
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
                <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t3, marginBottom:'10px' }}>수취 계좌 정보</div>
                <div style={{ marginBottom:'10px' }}>
                  <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'7px' }}>은행 선택</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                    {DEMO_BANKS.map(b => (
                      <button key={b} onClick={() => setBankName(b)}
                        style={{ padding:'5px 11px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'11px', fontWeight:600, border:'none', outline:'none', background: bankName===b ? theme.brand : COLORS.bgMuted, color: bankName===b ? '#fff' : COLORS.t3, boxShadow: bankName===b ? `0 2px 6px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background:'#fff', borderRadius:'8px', padding:'9px 12px', border:`1px solid ${COLORS.borderSoft}` }}>
                  <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'4px' }}>계좌번호</div>
                  <input value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                    placeholder="계좌번호 입력 (- 없이)"
                    style={{ width:'100%', border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:COLORS.t1, fontFamily:'inherit', background:'transparent', boxSizing:'border-box' }}/>
                </div>
              </div>
            )}
            {payMethod === 'card' && (
              <div style={{ marginTop:'10px', background:COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t3, marginBottom:'10px' }}>발급된 법인카드 선택</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {DEMO_CARDS.map(c => (
                    <button key={c.id} onClick={() => setCard(c.id)}
                      style={{ padding:'10px 12px', background: card===c.id ? c.color+'12' : '#fff', border:`1.5px solid ${card===c.id ? c.color : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px', textAlign:'left', outline:'none' }}>
                      <div style={{ width:'36px', height:'24px', borderRadius:'5px', background:c.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:'8px', fontWeight:800, color:'#fff' }}>CARD</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{c.name}</div>
                        <div style={{ fontSize:'10px', color:COLORS.t4 }}>**** **** **** {c.last4}</div>
                      </div>
                      {card===c.id && (
                        <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:c.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 월 환산 요약 */}
          <div style={{ background:`linear-gradient(135deg, ${theme.brand}14, ${theme.brand}08)`, border:`1px solid ${theme.brand}22`, borderRadius:'12px', padding:'14px 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, marginBottom:'8px', letterSpacing:'0.3px' }}>월 환산 지급액</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:COLORS.t3, marginBottom:'4px' }}>
              <span>지급액</span><span style={{ fontWeight:600 }}>{fmt(amountVal)}원 / {cycleLabel}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', borderTop:`1px dashed ${theme.brand}25`, fontSize:'17px', fontWeight:800, color:theme.brand, marginTop:'4px', letterSpacing:'-0.3px' }}>
              <span>월 환산</span><span>{fmt(monthly)}원</span>
            </div>
          </div>

          {/* 종료 시 자동 중단 */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'14px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>종료 시 자동 중단</div>
              <div style={{ fontSize:'11px', color:COLORS.t4 }}>계약 종료일에 자동 지급 중단</div>
            </div>
            <Toggle on={autoEnd} onChange={() => setAutoEnd(!autoEnd)} brand={theme.brand} />
          </div>
        </>)}
      </div>
    </>
  )
}

function renderVatSection(theme, vat, setVat) {
  const selected = VAT_OPTIONS.find(v => v.id === vat) || VAT_OPTIONS[0]
  return (
    <>
      {secLabel(theme, 'VAT 설정')}
      <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {VAT_OPTIONS.map(v => (
            <button key={v.id} onClick={() => setVat(v.id)}
              style={{ width:'100%', padding:'11px 14px', textAlign:'left', background: vat===v.id ? v.color+'0E' : COLORS.bgMuted, border:`1px solid ${vat===v.id ? v.color+'40' : COLORS.borderSoft}`, borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'10px', outline:'none' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:v.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>{v.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{v.label}</div>
                <div style={{ fontSize:'10px', color:COLORS.t4, marginTop:'1px' }}>{v.sub}</div>
              </div>
              <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${vat===v.id ? v.color : COLORS.borderSoft}`, background: vat===v.id ? v.color : '#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {vat===v.id && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#fff' }}/>}
              </div>
            </button>
          ))}
        </div>
        {vat === 'separate' && (
          <div style={{ marginTop:'10px', padding:'9px 12px', background:'#FFF7ED', borderRadius:'8px', display:'flex', gap:'6px', alignItems:'flex-start' }}>
            <span style={{ fontSize:'13px', flexShrink:0 }}>📌</span>
            <div style={{ fontSize:'11px', color:'#92400E', lineHeight:1.6 }}>VAT 별도 선택 시 세금계산서를 자동으로 수집합니다.</div>
          </div>
        )}
      </div>
    </>
  )
}

function renderControlSection() {
  return (
    <div style={{ marginTop:'8px', padding:'11px 14px', background:'#EDF3FA', borderRadius:'8px', fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
      <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
    </div>
  )
}

// ─── 납부 로그 오버레이 컴포넌트 ─────────────────────────
function OtherLogScreen({ theme, sel, onBack }) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

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
      <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>납부내역보기</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:'3px' }}>{sel.name}</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>{sel.vendor} · 지급 이력</div>
          </div>
        </div>
        <div style={{ padding:'18px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {(!sel.logs||sel.logs.length===0)
            ? <div style={{ textAlign:'center', padding:'48px 0', color:COLORS.t3, fontSize:'13px' }}>지급 내역이 없습니다</div>
            : sel.logs.map((log, i) => (
              <div key={i} style={{ background:COLORS.bgCard, borderRadius:'14px', padding:'14px 16px', boxShadow:SHADOWS.card, display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0, background: log.status==='success' ? '#D1FAE5' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>
                  {log.status==='success' ? '✅' : '❌'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1 }}>{log.date}</div>
                  <div style={{ fontSize:'11px', color:COLORS.t3, marginTop:'2px' }}>{sel.vendor} · {sel.payMethod==='card'?'카드 자동결제':'계좌 이체'}</div>
                </div>
                <div style={{ fontSize:'15px', fontWeight:700, color:COLORS.t1 }}>{fmt(log.amount)}원</div>
              </div>
            ))
          }
        </div>
      </div>

      {showExitModal && (
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
      )}
    </div>
  )
}

// ─── 추가 폼 오버레이 컴포넌트 ────────────────────────────
function OtherAddFormScreen({
  theme,
  addName, setAddName, addMemo, setAddMemo, addVendor, setAddVendor,
  addAmount, setAddAmount, addCycle, setAddCycle,
  addCustomCycle, setAddCustomCycle,
  addPayDay, setAddPayDay, addCustomDay, setAddCustomDay, addBizDay, setAddBizDay,
  addPayMethod, setAddPayMethod, addCard, setAddCard,
  addBankName, setAddBankName, addBankAccount, setAddBankAccount,
  addVat, setAddVat,
  addStart, setAddStart, addEnd, setAddEnd,
  addAutoOn, setAddAutoOn, addAutoEnd, setAddAutoEnd,
  handleAdd, setScreen,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const amountVal = Number(String(addAmount).replace(/,/g,'')) || 0
  const isValid = !!(addName && amountVal > 0)

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
            <button onClick={() => setScreen('list')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>정기 지출 추가</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px 18px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', lineHeight:1.3, letterSpacing:'-0.5px' }}>정기 지출 등록</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', marginTop:'4px' }}>반복 운영비를 자동 지급으로 설정하세요</div>
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>
          {secLabel(theme, '기본 정보')}

          {/* 항목명 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'8px', letterSpacing:'0.3px' }}>항목명 *</div>
            <input value={addName} onChange={e => setAddName(e.target.value)}
              placeholder="예) 사무실 청소비, 회계 자문료"
              style={{ width:'100%', border:'none', outline:'none', fontSize:'15px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit', borderBottom:`1.5px solid ${theme.brand}40`, paddingBottom:'6px', boxSizing:'border-box' }}/>
          </div>

          {/* 설명 / 거래처 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {[
              { label:'거래처명 / 수취인', val:addVendor, set:setAddVendor, placeholder:'예) 세무법인 한빛' },
              { label:'설명 / 메모',       val:addMemo,   set:setAddMemo,   placeholder:'예) 월간 세무 자문' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ padding:'12px 16px', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                <span style={{ fontSize:'12px', color:COLORS.t3, flexShrink:0 }}>{row.label}</span>
                <input value={row.val} onChange={e => row.set(e.target.value)} placeholder={row.placeholder}
                  style={{ border:'none', outline:'none', fontSize:'12px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit', textAlign:'right', flex:1, minWidth:0 }}/>
              </div>
            ))}
          </div>

          {secLabel(theme, '지급 정보')}

          {/* 지급액 입력 타일 */}
          <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14` }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, marginBottom:'10px' }}>지급액 *</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'6px' }}>
              <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                placeholder="0"
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'28px', fontWeight:800, color:COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'16px', fontWeight:600, color:COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <span style={{ fontSize:'10px', color:COLORS.t4 }}>회당 지급 금액</span>
          </div>

          {/* 지급 주기 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급 주기</div>
            <div style={{ display:'flex', background:COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
              {CYCLES.map(opt => (
                <button key={opt.key} onClick={() => setAddCycle(opt.key)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', outline:'none', fontSize:'10px', fontWeight:700, transition:'all 0.15s', background: addCycle===opt.key ? '#fff' : 'transparent', color: addCycle===opt.key ? theme.brand : COLORS.t4, boxShadow: addCycle===opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {addCycle === '매주' && (
              <div style={{ marginTop:'10px', padding:'9px 12px', background:'#EFF6FF', borderRadius:'8px', fontSize:'11px', color:'#1D4ED8', lineHeight:1.6 }}>
                ℹ️ 매주 지급 · 월 환산 약 {fmt(Math.round(amountVal * 52/12))}원
              </div>
            )}
            {addCycle === '매2주' && (
              <div style={{ marginTop:'10px', padding:'9px 12px', background:'#EFF6FF', borderRadius:'8px', fontSize:'11px', color:'#1D4ED8', lineHeight:1.6 }}>
                ℹ️ 격주 지급 · 월 환산 약 {fmt(Math.round(amountVal * 26/12))}원
              </div>
            )}
          </div>

          {/* 계약 기간 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {[{ label:'계약 시작일', val:addStart, set:setAddStart },{ label:'계약 종료일', val:addEnd, set:setAddEnd }].map((row, i, arr) => (
              <div key={row.label} style={{ padding:'12px 16px', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'13px', color:COLORS.t3 }}>{row.label}</span>
                <div style={{ overflow:'hidden', borderRadius:'8px' }}>
                  <input type="date" value={row.val} onChange={e => row.set(e.target.value)}
                    style={{ border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit', cursor:'pointer', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance:'none', appearance:'none' }}/>
                </div>
              </div>
            ))}
          </div>

          {renderAutoPaySection(theme, addAutoOn, setAddAutoOn, addPayDay, setAddPayDay, addPayMethod, setAddPayMethod, addCard, setAddCard, addAutoEnd, setAddAutoEnd, amountVal, addCycle, addCustomDay, setAddCustomDay, addBizDay, setAddBizDay, addBankName, setAddBankName, addBankAccount, setAddBankAccount)}
          {renderVatSection(theme, addVat, setAddVat)}
          {renderControlSection()}
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={handleAdd} disabled={!isValid}
          style={{ width:'100%', padding:'15px', background: isValid ? theme.brand : COLORS.bgMuted, color: isValid ? '#fff' : COLORS.t4, border:'none', outline:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor: isValid ? 'pointer' : 'default', fontFamily:'inherit', transition:'all 0.2s' }}>
          등록하기
        </button>
      </div>

      {showExitModal && (
        <div onClick={() => setShowExitModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px', textAlign:'center' }}>나가시겠어요?</div>
            <div style={{ fontSize:'13px', color:'#999', lineHeight:1.6, marginBottom:'20px', textAlign:'center' }}>입력 중인 내용은 저장되지 않습니다.</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowExitModal(false)} style={{ flex:1, height:'48px', background:'#F3F4F6', color:'#555', border:'none', outline:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>계속 작성</button>
              <button onClick={() => { setShowExitModal(false); navigate('/home-business') }} style={{ flex:1, height:'48px', background:'#EF4444', color:'#fff', border:'none', outline:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 상세 화면 오버레이 컴포넌트 ─────────────────────────
function OtherDetailScreen({
  theme, sel,
  editAmount, setEditAmount, editCycle, setEditCycle,
  editAutoOn, setEditAutoOn, editAutoEnd, setEditAutoEnd,
  editPayDay, setEditPayDay, editPayMethod, setEditPayMethod,
  editCard, setEditCard, editCustomDay, setEditCustomDay, editBizDay, setEditBizDay,
  editBankName, setEditBankName, editBankAccount, setEditBankAccount,
  editVat, setEditVat,
  saved, handleSave, onBack,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const amountVal = Number(String(editAmount).replace(/,/g,'')) || 0
  const monthly = calcMonthly(amountVal, editCycle)
  const d = daysLeft(sel.endDate)
  const vatInfo = VAT_OPTIONS.find(v => v.id === (sel.vat||'include'))

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
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>기타 정기 지출</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px 0', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sel.name}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px' }}>🏢 {sel.vendor||'—'}{sel.memo ? ` · ${sel.memo}` : ''}</div>
            </div>
            {monthly > 0 && (
              <div style={{ textAlign:'right', marginBottom:'20px', flexShrink:0 }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>월 환산</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>{fmt(monthly)}<span style={{ fontSize:'11px', opacity:0.6 }}>원</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>
          {secLabel(theme, '지출 정보')}

          {/* 지급액 편집 타일 */}
          <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark }}>지급액</span>
              <div style={{ display:'flex', alignItems:'center', gap:'3px', background:`${theme.brand}18`, borderRadius:'6px', padding:'2px 6px' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span style={{ fontSize:'9px', fontWeight:700, color:theme.brand }}>수정</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'8px' }}>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'24px', fontWeight:800, color:COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'14px', fontWeight:600, color:COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <span style={{ fontSize:'10px', color:COLORS.t4 }}>탭하여 수정</span>
          </div>

          {/* 지급 주기 세그먼트 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>지급 주기</div>
            <div style={{ display:'flex', background:COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
              {CYCLES.map(opt => (
                <button key={opt.key} onClick={() => setEditCycle(opt.key)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', outline:'none', fontSize:'10px', fontWeight:700, transition:'all 0.15s', background: editCycle===opt.key ? '#fff' : 'transparent', color: editCycle===opt.key ? theme.brand : COLORS.t4, boxShadow: editCycle===opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 계약 메타 정보 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {[
              { icon:'🏢', label:'거래처', value:sel.vendor||'—' },
              { icon:'📝', label:'메모', value:sel.memo||'—' },
              { icon:'📅', label:'계약 기간', value: sel.startDate ? `${sel.startDate} ~ ${sel.endDate||'—'}` : '—' },
              { icon:'💸', label:'VAT', value: vatInfo ? vatInfo.label : '—' },
            ].filter(Boolean).map((row, i, arr) => (
              <div key={row.label} style={{ padding:'11px 16px', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                <span style={{ fontSize:'11px', color:COLORS.t4, flexShrink:0, minWidth:'60px' }}>{row.label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, textAlign:'right', flex:1 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* 계약 상태 */}
          {sel.endDate && (
            <>
              <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'4px' }}>계약 상태</div>
                  {d !== null && <div style={{ fontSize:'11px', color: d<=30 ? '#B45309' : COLORS.t4 }}>{d>=0 ? `만료까지 D-${d}` : '계약 만료됨'}</div>}
                </div>
                <StatusBadge endDate={sel.endDate} />
              </div>
              {d !== null && d >= 0 && d <= 30 && (
                <div style={{ padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'12px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'18px', flexShrink:0, lineHeight:1 }}>⏰</span>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E', marginBottom:'2px' }}>계약 만료 D-{d}</div>
                    <div style={{ fontSize:'11px', color:'#B45309', lineHeight:1.5 }}>갱신 또는 종료 여부를 확인해주세요.</div>
                  </div>
                </div>
              )}
            </>
          )}

          {renderAutoPaySection(theme, editAutoOn, setEditAutoOn, editPayDay, setEditPayDay, editPayMethod, setEditPayMethod, editCard, setEditCard, editAutoEnd, setEditAutoEnd, amountVal, editCycle, editCustomDay, setEditCustomDay, editBizDay, setEditBizDay, editBankName, setEditBankName, editBankAccount, setEditBankAccount)}
          {renderVatSection(theme, editVat, setEditVat)}
          {renderControlSection()}
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={handleSave}
          style={{ width:'100%', padding:'15px', background: saved ? '#10B981' : theme.brand, color:'#fff', border:'none', outline:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background 0.3s' }}>
          {saved ? '✓ 저장되었습니다' : '설정 저장'}
        </button>
      </div>

      {showExitModal && (
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
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export default function ExecuteOtherExpense() {
  const theme = getAccountTheme()
  const navigate = useNavigate()

  const [items, setItems]   = useState(INIT_ITEMS)
  const [screen, setScreen] = useState('list')
  const [selId, setSelId]   = useState(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [saved, setSaved]   = useState(false)

  // 상세/수정 상태
  const [editAmount, setEditAmount]     = useState('')
  const [editCycle, setEditCycle]       = useState('매월')
  const [editAutoOn, setEditAutoOn]     = useState(true)
  const [editAutoEnd, setEditAutoEnd]   = useState(true)
  const [editPayDay, setEditPayDay]     = useState('25')
  const [editCustomDay, setEditCustomDay] = useState('')
  const [editBizDay, setEditBizDay]     = useState('')
  const [editPayMethod, setEditPayMethod] = useState('account')
  const [editCard, setEditCard]         = useState('c1')
  const [editBankName, setEditBankName] = useState('')
  const [editBankAccount, setEditBankAccount] = useState('')
  const [editVat, setEditVat]           = useState('include')

  // 추가 폼 상태
  const [addName, setAddName]           = useState('')
  const [addMemo, setAddMemo]           = useState('')
  const [addVendor, setAddVendor]       = useState('')
  const [addAmount, setAddAmount]       = useState('')
  const [addCycle, setAddCycle]         = useState('매월')
  const [addCustomCycle, setAddCustomCycle] = useState('')
  const [addPayDay, setAddPayDay]       = useState('25')
  const [addCustomDay, setAddCustomDay] = useState('')
  const [addBizDay, setAddBizDay]       = useState('')
  const [addPayMethod, setAddPayMethod] = useState('account')
  const [addCard, setAddCard]           = useState('c1')
  const [addBankName, setAddBankName]   = useState('')
  const [addBankAccount, setAddBankAccount] = useState('')
  const [addVat, setAddVat]             = useState('include')
  const [addStart, setAddStart]         = useState('')
  const [addEnd, setAddEnd]             = useState('')
  const [addAutoOn, setAddAutoOn]       = useState(true)
  const [addAutoEnd, setAddAutoEnd]     = useState(true)

  const handleBack = () => {
    if (screen === 'addForm') setScreen('list')
    else setScreen('list')
  }
  useStepHistory(handleBack, screen === 'list')

  const selectedItem = items.find(i => i.id === selId)
  const totalMonthly = items.reduce((s,it) => s + calcMonthly(it.amount, it.cycle), 0)
  const expiringCount = items.filter(it => { const d=daysLeft(it.endDate); return d!==null && d>=0 && d<=30 }).length
  const expiringItems = items.filter(it => { const d=daysLeft(it.endDate); return d!==null && d>=0 && d<=30 })

  function openDetail(id) {
    const it = items.find(i => i.id === id)
    if (!it) return
    setSelId(id)
    setEditAmount(it.amount); setEditCycle(it.cycle)
    setEditAutoOn(it.autoOn); setEditAutoEnd(it.autoEnd)
    setEditPayDay(it.payDay); setEditCustomDay(it.customDay||''); setEditBizDay(it.bizDay||'')
    setEditPayMethod(it.payMethod); setEditCard(it.selectedCard||'c1')
    setEditBankName(it.bankName||''); setEditBankAccount(it.bankAccount||'')
    setEditVat(it.vat||'include')
    setSaved(false); setScreen('detail')
  }

  function handleSave() {
    setItems(prev => prev.map(it => it.id !== selId ? it : {
      ...it, amount:Number(String(editAmount).replace(/,/g,''))||it.amount,
      cycle:editCycle, autoOn:editAutoOn, autoEnd:editAutoEnd,
      payDay:editPayDay, customDay:editCustomDay, bizDay:editBizDay,
      payMethod:editPayMethod, selectedCard:editCard,
      bankName:editBankName, bankAccount:editBankAccount, vat:editVat,
    }))
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  async function handleAdd() {
    try { await ensureStepUp() } catch { return }
    const _amtNum = Number(String(addAmount).replace(/,/g,''))||0
    addTransaction({
      type: 'otherExpense',
      fromUserId: 'biz_juda', fromUserName: '㈜주다컴퍼니', fromUserType: 'business',
      recipient: { id: null, name: addVendor || addName, phone: '', verified: true, isBusiness: true },
      amount: _amtNum,
      reason: addName,
      walletId: 'my', walletLabel: 'MY 지갑',
      payDateMode: 'immediate', status: 'completed',
      mainCat: '미분류', subCat: '미분류',
    })
    setItems(prev => [...prev, {
      id:'e'+Date.now(), name:addName, memo:addMemo, vendor:addVendor,
      amount:Number(String(addAmount).replace(/,/g,''))||0,
      cycle:addCycle, payDay:addPayDay, customDay:addCustomDay, bizDay:addBizDay,
      payMethod:addPayMethod, selectedCard:addCard,
      bankName:addBankName, bankAccount:addBankAccount, vat:addVat,
      startDate:addStart, endDate:addEnd,
      autoOn:addAutoOn, autoEnd:addAutoEnd,
      logs:[],
    }])
    setScreen('list')
  }

  // ═══════════════════════════════════════════════════════════
  // ── 리스트 화면 (항상 렌더) + 오버레이 ───────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
          {/* 헤더 */}
          <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
              <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>기타 정기 지출</span>
              <button onClick={() => { if (!selectedItem) { const t = items[0]; if (t) setSelId(t.id); } setScreen('log') }} style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px' }}>납부내역보기</button>
              <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* 요약 */}
            <div style={{ padding:'0 20px 20px' }}>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginBottom:'4px' }}>이번 달 정기 지출</div>
              <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', marginBottom:'10px' }}>
                {fmt(totalMonthly)}<span style={{ fontSize:'14px', fontWeight:600, opacity:0.7 }}>원</span>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <div style={{ flex:1, background:'rgba(255,255,255,0.14)', borderRadius:'12px', padding:'10px 12px', border:'1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginBottom:'3px' }}>등록 항목</div>
                  <div style={{ fontSize:'17px', fontWeight:800, color:'#fff' }}>{items.length}<span style={{ fontSize:'11px', fontWeight:500, opacity:0.7 }}>개</span></div>
                </div>
                <div style={{ flex:1, background:'rgba(255,255,255,0.14)', borderRadius:'12px', padding:'10px 12px', border:'1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginBottom:'3px' }}>자동 지급 중</div>
                  <div style={{ fontSize:'17px', fontWeight:800, color:'#fff' }}>{items.filter(i=>i.autoOn).length}<span style={{ fontSize:'11px', fontWeight:500, opacity:0.7 }}>개</span></div>
                </div>
                {expiringCount > 0 && (
                  <div style={{ flex:1, background:'rgba(245,158,11,0.25)', borderRadius:'12px', padding:'10px 12px', border:'1px solid rgba(245,158,11,0.4)' }}>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.65)', marginBottom:'3px' }}>만료 임박</div>
                    <div style={{ fontSize:'17px', fontWeight:800, color:'#FCD34D' }}>{expiringCount}<span style={{ fontSize:'11px', fontWeight:500, opacity:0.8 }}>건</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {/* 만료 임박 배너 */}
            {expiringItems.length > 0 && (
              <div style={{ padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'14px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <span style={{ fontSize:'18px', flexShrink:0, lineHeight:1.2 }}>⏰</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E', marginBottom:'3px' }}>계약 만료 임박 {expiringItems.length}건</div>
                  <div style={{ fontSize:'11px', color:'#B45309', lineHeight:1.5 }}>{expiringItems.map(i=>i.name).join(', ')} · 갱신 여부를 확인하세요</div>
                </div>
              </div>
            )}

            {/* 항목 없음 */}
            {items.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:COLORS.t3 }}>
                <div style={{ fontSize:'36px', marginBottom:'12px' }}>📋</div>
                <div style={{ fontSize:'15px', fontWeight:700, color:COLORS.t1, marginBottom:'8px' }}>등록된 정기 지출이 없습니다</div>
                <div style={{ fontSize:'12px', color:COLORS.t4, lineHeight:1.8 }}>아래 버튼으로 항목을 추가하세요</div>
              </div>
            )}

            {/* 항목 카드 */}
            {items.map(item => {
              const monthly = calcMonthly(item.amount, item.cycle)
              const cycleInfo = CYCLES.find(c => c.key === item.cycle)
              const vatInfo = VAT_OPTIONS.find(v => v.id === (item.vat||'include'))
              return (
                <div key={item.id} onClick={() => openDetail(item.id)}
                  style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'16px', padding:'14px 16px', boxShadow:SHADOWS.card, cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>📋</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</span>
                        {item.endDate && <StatusBadge endDate={item.endDate} />}
                      </div>
                      <div style={{ fontSize:'12px', color:COLORS.t3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.vendor||'—'} · {cycleInfo?.label||item.cycle}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  <div style={{ paddingTop:'10px', borderTop:`1px solid ${COLORS.borderSoft}`, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'2px' }}>월 환산</div>
                      <div style={{ fontSize:'14px', fontWeight:800, color:COLORS.t1 }}>{fmt(monthly)}원</div>
                    </div>
                    <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                      {vatInfo && (
                        <div style={{ fontSize:'10px', fontWeight:600, padding:'3px 7px', background:vatInfo.bg, color:vatInfo.color, borderRadius:'6px' }}>{vatInfo.label}</div>
                      )}
                      <div style={{ fontSize:'10px', fontWeight:600, padding:'3px 7px', background: item.autoOn ? `${theme.brand}15` : COLORS.bgMuted, color: item.autoOn ? theme.brandDark : COLORS.t4, borderRadius:'6px' }}>
                        {item.autoOn ? '자동' : '수동'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

          </div>
        </div>

        {/* 고정 하단 추가 버튼 */}
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
          <button onClick={() => { setAddName(''); setAddMemo(''); setAddVendor(''); setAddAmount(''); setAddCycle('매월'); setAddCustomCycle(''); setAddPayDay('25'); setAddCustomDay(''); setAddBizDay(''); setAddPayMethod('account'); setAddCard('c1'); setAddBankName(''); setAddBankAccount(''); setAddVat('include'); setAddStart(''); setAddEnd(''); setAddAutoOn(true); setAddAutoEnd(true); setScreen('addForm') }}
            style={{ width:'100%', padding:'15px', background:theme.activeBtnGrad || theme.brand, color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:theme.activeShadow, outline:'none' }}>
            <span style={{ fontSize:'18px' }}>+</span> 정기 지출 추가
          </button>
        </div>

        {/* Overlays */}
        {screen === 'log' && selectedItem && (
          <OtherLogScreen
            theme={theme}
            sel={selectedItem}
            onBack={() => setScreen('list')}
          />
        )}

        {screen === 'addForm' && (
          <OtherAddFormScreen
            theme={theme}
            addName={addName} setAddName={setAddName}
            addMemo={addMemo} setAddMemo={setAddMemo}
            addVendor={addVendor} setAddVendor={setAddVendor}
            addAmount={addAmount} setAddAmount={setAddAmount}
            addCycle={addCycle} setAddCycle={setAddCycle}
            addCustomCycle={addCustomCycle} setAddCustomCycle={setAddCustomCycle}
            addPayDay={addPayDay} setAddPayDay={setAddPayDay}
            addCustomDay={addCustomDay} setAddCustomDay={setAddCustomDay}
            addBizDay={addBizDay} setAddBizDay={setAddBizDay}
            addPayMethod={addPayMethod} setAddPayMethod={setAddPayMethod}
            addCard={addCard} setAddCard={setAddCard}
            addBankName={addBankName} setAddBankName={setAddBankName}
            addBankAccount={addBankAccount} setAddBankAccount={setAddBankAccount}
            addVat={addVat} setAddVat={setAddVat}
            addStart={addStart} setAddStart={setAddStart}
            addEnd={addEnd} setAddEnd={setAddEnd}
            addAutoOn={addAutoOn} setAddAutoOn={setAddAutoOn}
            addAutoEnd={addAutoEnd} setAddAutoEnd={setAddAutoEnd}
            handleAdd={handleAdd}
            setScreen={setScreen}
          />
        )}

        {screen === 'detail' && selectedItem && (
          <OtherDetailScreen
            theme={theme}
            sel={selectedItem}
            editAmount={editAmount} setEditAmount={setEditAmount}
            editCycle={editCycle} setEditCycle={setEditCycle}
            editAutoOn={editAutoOn} setEditAutoOn={setEditAutoOn}
            editAutoEnd={editAutoEnd} setEditAutoEnd={setEditAutoEnd}
            editPayDay={editPayDay} setEditPayDay={setEditPayDay}
            editPayMethod={editPayMethod} setEditPayMethod={setEditPayMethod}
            editCard={editCard} setEditCard={setEditCard}
            editCustomDay={editCustomDay} setEditCustomDay={setEditCustomDay}
            editBizDay={editBizDay} setEditBizDay={setEditBizDay}
            editBankName={editBankName} setEditBankName={setEditBankName}
            editBankAccount={editBankAccount} setEditBankAccount={setEditBankAccount}
            editVat={editVat} setEditVat={setEditVat}
            saved={saved} handleSave={handleSave}
            onBack={() => setScreen('list')}
          />
        )}

        {/* Exit modal only on list screen */}
        {showExitModal && screen === 'list' && (
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
        )}
      </div>
    </PhoneShell>
  )
}
