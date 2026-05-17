import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { addTransaction } from '../../shared/transactionStore'

// ─── 상수 ────────────────────────────────────────────────
const INS_TYPES = [
  { id:'fire',      icon:'🔥', label:'화재보험',     sub:'사무실·시설 화재 리스크 보호' },
  { id:'liability', icon:'🛡️', label:'배상책임보험', sub:'대인·대물 배상책임 보호' },
  { id:'car',       icon:'🚗', label:'자동차보험',   sub:'법인 차량 사고·손해 보호' },
  { id:'driver',    icon:'🧑', label:'운전자보험',   sub:'운전자 상해·사고 보호' },
  { id:'medical',   icon:'🏥', label:'실손보험',     sub:'의료비 실손 보상' },
  { id:'group',     icon:'👥', label:'단체보험',     sub:'직원 단체 생명·상해 보험' },
  { id:'equipment', icon:'⚙️', label:'장비보험',     sub:'기계·장비 손해 보험' },
  { id:'other',     icon:'📋', label:'기타 보험',    sub:'직접 입력' },
]
const INS_STATUS = {
  normal:  { label:'정상',    color:'#065F46', bg:'#D1FAE5', border:'#6EE7B7', dot:'#10B981' },
  soon:    { label:'만료임박', color:'#B45309', bg:'#FEF3C7', border:'#FCD34D', dot:'#F59E0B' },
  expired: { label:'만료됨',  color:'#7F1D1D', bg:'#FEE2E2', border:'#FCA5A5', dot:'#EF4444' },
}
const INSURERS    = ['삼성화재', '현대해상', 'DB손해보험', 'KB손해보험', '메리츠화재', '기타']
const CYCLES      = [{ key:'매월', label:'매월' }, { key:'분기', label:'분기별' }, { key:'반기', label:'반기별' }, { key:'연 1회', label:'연 1회' }]
const PAY_DAYS    = ['10', '25', '말일']
const PAY_METHODS = [
  { id:'card',    label:'카드 자동결제형', sub:'발급된 법인카드로 자동 결제' },
  { id:'account', label:'계좌 자동송금형', sub:'지정 계좌로 자동 이체' },
]
const DEMO_CARDS  = [
  { id:'c1', name:'법인카드 (현대카드)', last4:'7842', color:'#1D4ED8' },
  { id:'c2', name:'법인카드 (신한카드)', last4:'3391', color:'#059669' },
]

const DEMO_BANKS = ['국민은행','신한은행','하나은행','우리은행','기업은행','카카오뱅크','토스뱅크']

// ─── 유틸 ────────────────────────────────────────────────
function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / (1000*60*60*24))
}
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function calcMonthly(amount, cycle) {
  const map = { '매월':1, '분기':3, '반기':6, '연 1회':12 }
  return Math.round((amount||0) / (map[cycle]||1))
}
function getStatus(endDate) {
  const d = daysLeft(endDate)
  if (d === null) return 'normal'
  if (d < 0) return 'expired'
  if (d <= 30) return 'soon'
  return 'normal'
}

// ─── 데모 데이터 ──────────────────────────────────────────
const INIT_ITEMS = [
  { id:'p1', typeId:'car', insurer:'현대해상', name:'법인 차량 보험',
    amount:540000, cycle:'반기', payDay:'25', payMethod:'card', selectedCard:'c1',
    dept:'차량팀', startDate:'2025-12-01', endDate:'2026-11-30',
    autoOn:true, autoEnd:true, approvalEnabled:false, limitEnabled:false, limitAmount:'', limitAction:'block',
    evidenceConfirm:true, evidenceReceipt:true,
    notifBefore:true, notifDone:true, notifFail:true, notifExpiry:true,
    linkedVehicle:'12가 3456', headcount:null,
    logs:[{ date:'2025-12-01', amount:540000, status:'success' },{ date:'2026-06-01', amount:540000, status:'success' }] },
  { id:'p2', typeId:'fire', insurer:'삼성화재', name:'사무실 화재보험',
    amount:120000, cycle:'연 1회', payDay:'말일', payMethod:'account', selectedCard:'',
    dept:'총무팀', startDate:'2025-03-01', endDate:'2026-02-28',
    autoOn:true, autoEnd:false, approvalEnabled:true, limitEnabled:false, limitAmount:'', limitAction:'block',
    evidenceConfirm:true, evidenceReceipt:false,
    notifBefore:true, notifDone:true, notifFail:true, notifExpiry:true,
    linkedVehicle:null, headcount:null,
    logs:[{ date:'2025-03-01', amount:120000, status:'success' }] },
  { id:'p3', typeId:'group', insurer:'DB손해보험', name:'직원 단체보험',
    amount:85000, cycle:'매월', payDay:'10', payMethod:'card', selectedCard:'c2',
    dept:'운영팀', startDate:'2026-01-01', endDate:'2026-12-31',
    autoOn:true, autoEnd:true, approvalEnabled:false, limitEnabled:true, limitAmount:'100000', limitAction:'approve',
    evidenceConfirm:true, evidenceReceipt:true,
    notifBefore:true, notifDone:true, notifFail:false, notifExpiry:true,
    linkedVehicle:null, headcount:12,
    logs:[{ date:'2026-01-10', amount:85000, status:'success' },{ date:'2026-02-10', amount:85000, status:'success' }] },
  { id:'p4', typeId:'liability', insurer:'KB손해보험', name:'배상책임보험',
    amount:95000, cycle:'연 1회', payDay:'25', payMethod:'card', selectedCard:'c1',
    dept:'운영팀', startDate:'2024-06-01', endDate:'2026-05-20',
    autoOn:false, autoEnd:false, approvalEnabled:false, limitEnabled:false, limitAmount:'', limitAction:'block',
    evidenceConfirm:false, evidenceReceipt:true,
    notifBefore:true, notifDone:true, notifFail:true, notifExpiry:true,
    linkedVehicle:null, headcount:null,
    logs:[{ date:'2024-06-01', amount:95000, status:'success' },{ date:'2025-06-01', amount:95000, status:'success' }] },
]


// ─── 공통 UI ──────────────────────────────────────────────
function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width:'40px', height:'22px', borderRadius:'11px', border:'none', outline:'none', cursor:'pointer', background: on ? (brand||'#059669') : COLORS.bgMuted, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '21px' : '3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </button>
  )
}
function StatusBadge({ endDate }) {
  const s = INS_STATUS[getStatus(endDate)]
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:'20px', padding:'3px 8px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:s.dot }}/>
      <span style={{ fontSize:'10px', fontWeight:700, color:s.color }}>{s.label}</span>
    </div>
  )
}

// ─── 자동 지급 섹션 렌더 헬퍼 ────────────────────────────
function renderAutoPaySection(theme, autoOn, setAutoOn, payDay, setPayDay, payMethod, setPayMethod, card, setCard, autoEnd, setAutoEnd, amountVal, cycle, customDay, setCustomDay, bankName, setBankName, bankAccount, setBankAccount) {
  const monthly = calcMonthly(amountVal, cycle)
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
        <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:theme.brand, flexShrink:0 }}/>
        <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>자동 지급 설정</span>
      </div>
      <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: autoOn ? '16px' : 0 }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>자동 지급</div>
            <div style={{ fontSize:'11px', color:COLORS.t4 }}>{autoOn ? `${payDay==='말일'?'말일':'매월 '+payDay+'일'} 집행` : '수동 지급 모드'}</div>
          </div>
          <Toggle on={autoOn} onChange={() => setAutoOn(!autoOn)} brand={theme.brand} />
        </div>
        {autoOn && (<>
          <div style={{ height:'1px', background:COLORS.borderSoft, marginBottom:'16px' }} />
          {/* 납부일 칩 */}
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>납부일</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {PAY_DAYS.map(d => (
                <button key={d} onClick={() => { setPayDay(d); setCustomDay('') }}
                  style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', outline:'none', background: payDay===d ? theme.brand : COLORS.bgMuted, color: payDay===d ? '#fff' : COLORS.t3, boxShadow: payDay===d ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                  {d==='말일' ? '말일' : `${d}일`}
                </button>
              ))}
              <button onClick={() => { if (PAY_DAYS.includes(payDay)) { setPayDay(''); setCustomDay('') } }}
                style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', outline:'none', background: !PAY_DAYS.includes(payDay) ? theme.brand : COLORS.bgMuted, color: !PAY_DAYS.includes(payDay) ? '#fff' : COLORS.t3, boxShadow: !PAY_DAYS.includes(payDay) ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                직접 입력
              </button>
            </div>
            {!PAY_DAYS.includes(payDay) && (
              <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'8px', background:COLORS.bgMuted, borderRadius:'10px', padding:'8px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>매월</span>
                <input type="number" min="1" max="31" value={customDay}
                  onChange={e => { const v = Math.min(31, Math.max(1, parseInt(e.target.value)||1)); setCustomDay(String(v)); setPayDay(String(v)) }}
                  placeholder="일 입력"
                  style={{ width:'60px', border:`1.5px solid ${theme.brand}`, borderRadius:'8px', padding:'5px 8px', fontSize:'13px', fontWeight:700, color:COLORS.t1, fontFamily:'inherit', textAlign:'center', outline:'none', background:'#fff' }}/>
                <span style={{ fontSize:'12px', color:COLORS.t3 }}>일</span>
              </div>
            )}
          </div>
          {/* 지급 방식 라디오 */}
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
            {payMethod==='card' && (
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
                <div style={{ marginTop:'10px', padding:'8px 10px', background:'#EFF6FF', borderRadius:'8px', fontSize:'10px', color:'#1D4ED8', lineHeight:1.6 }}>
                  ℹ️ 해당 카드를 자동 이체로 등록하시면 납부일에 자동 결제됩니다.
                </div>
              </div>
            )}
            {payMethod==='account' && (
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
          </div>
          {/* 납부액 요약 */}
          <div style={{ background:`linear-gradient(135deg, ${theme.brand}14, ${theme.brand}08)`, border:`1px solid ${theme.brand}22`, borderRadius:'12px', padding:'14px 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, marginBottom:'8px', letterSpacing:'0.3px' }}>월 환산 납부액</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:COLORS.t3, marginBottom:'4px' }}>
              <span>보험료</span><span style={{ fontWeight:600 }}>{fmt(amountVal)}원 / {cycle}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', borderTop:`1px dashed ${theme.brand}25`, fontSize:'17px', fontWeight:800, color:theme.brand, marginTop:'4px', letterSpacing:'-0.3px' }}>
              <span>합계</span><span>{fmt(monthly)}원</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'14px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>만료 시 자동 종료</div>
              <div style={{ fontSize:'11px', color:COLORS.t4 }}>계약 만료 시 자동 지급 중단</div>
            </div>
            <Toggle on={autoEnd} onChange={() => setAutoEnd(!autoEnd)} brand={theme.brand} />
          </div>
        </>)}
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
function InsuranceLogScreen({ theme, sel, onBack }) {
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
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>납부 이력</div>
          </div>
        </div>
        <div style={{ padding:'18px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {(!sel.logs||sel.logs.length===0)
            ? <div style={{ textAlign:'center', padding:'48px 0', color:COLORS.t3, fontSize:'13px' }}>납부 내역이 없습니다</div>
            : sel.logs.map((log, i) => (
              <div key={i} style={{ background:COLORS.bgCard, borderRadius:'14px', padding:'14px 16px', boxShadow:SHADOWS.card, display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0, background: log.status==='success' ? '#D1FAE5' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>
                  {log.status==='success' ? '✅' : '❌'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1 }}>{log.date}</div>
                  <div style={{ fontSize:'11px', color:COLORS.t3, marginTop:'2px' }}>{sel.insurer} · {sel.payMethod==='card'?'카드 자동결제':'계좌 이체'}</div>
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

// ─── 보험 종류 선택 오버레이 컴포넌트 (등록 step 1) ────────
function InsuranceAddTypeScreen({ theme, skipAnim, setScreen, setAddType, setAddName, setAddInsurer, setAddAmount, setAddStart, setAddEnd, setAddVehicle, setAddHeadcount }) {
  const [visible, setVisible] = useState(skipAnim ? true : false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

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
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <button onClick={() => setScreen('list')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>보험 추가</span>
            <div style={{ flex:1 }}/>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', lineHeight:1.3, letterSpacing:'-0.5px' }}>어떤 보험인가요?</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', marginTop:'4px' }}>보험 종류를 선택해 주세요</div>
          </div>
        </div>
        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {INS_TYPES.map(tp => (
            <button key={tp.id}
              onClick={() => { setAddType(tp); setAddName(tp.id==='other'?'':tp.label); setAddInsurer(''); setAddAmount(''); setAddStart(''); setAddEnd(''); setAddVehicle(''); setAddHeadcount(1); setScreen('addForm') }}
              style={{ width:'100%', padding:'14px 16px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'16px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', boxShadow:SHADOWS.card, outline:'none' }}>
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

// ─── 등록 폼 오버레이 컴포넌트 (등록 step 2) ─────────────
function InsuranceAddFormScreen({
  theme, addType,
  addName, setAddName, addInsurer, setAddInsurer,
  addAmount, setAddAmount, addCycle, setAddCycle,
  addPayDay, setAddPayDay, addPayMethod, setAddPayMethod,
  addCard, setAddCard, addCustomDay, setAddCustomDay,
  addBankName, setAddBankName, addBankAccount, setAddBankAccount,
  addStart, setAddStart, addEnd, setAddEnd,
  addVehicle, setAddVehicle, addHeadcount, setAddHeadcount,
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
  const monthly = calcMonthly(amountVal, addCycle)
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
            <button onClick={() => setScreen('addType')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>{addType.icon} {addType.label} 등록</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px', overflow:'hidden' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{addName||'보험명 입력'}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{addInsurer||'보험사 선택'}</div>
            </div>
            {monthly > 0 && (
              <div style={{ textAlign:'right', marginBottom:'20px', flexShrink:0 }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>월 환산</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>{fmt(monthly)}<span style={{ fontSize:'11px', opacity:0.6 }}>원</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
            <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:theme.brand, flexShrink:0 }}/>
            <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>보험 정보</span>
          </div>

          {/* 보험료 입력 타일 */}
          <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark }}>보험료</span>
              <div style={{ display:'flex', alignItems:'center', gap:'3px', background:`${theme.brand}18`, borderRadius:'6px', padding:'2px 6px' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span style={{ fontSize:'9px', fontWeight:700, color:theme.brand }}>입력</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', overflow:'hidden', borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'8px' }}>
              <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0"
                style={{ flex:1, minWidth:0, border:'none', outline:'none', fontSize:'24px', fontWeight:800, color:COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}/>
              <span style={{ fontSize:'14px', fontWeight:600, color:COLORS.t3, flexShrink:0 }}>원</span>
            </div>
            <span style={{ fontSize:'10px', color:COLORS.t4 }}>탭하여 입력</span>
          </div>

          {/* 납부 주기 세그먼트 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>납부 주기</div>
            <div style={{ display:'flex', background:COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
              {CYCLES.map(opt => (
                <button key={opt.key} onClick={() => setAddCycle(opt.key)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', outline:'none', fontSize:'11px', fontWeight:700, transition:'all 0.15s', background: addCycle===opt.key ? '#fff' : 'transparent', color: addCycle===opt.key ? theme.brand : COLORS.t4, boxShadow: addCycle===opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 보험 이름 / 보험사 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden', marginBottom:'4px' }}>
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'5px' }}>보험 이름</div>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder={addType.label}
                style={{ width:'100%', border:'none', outline:'none', fontSize:'14px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
            </div>
            <div style={{ padding:'13px 16px' }}>
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'8px' }}>보험사</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {INSURERS.map(ins => (
                  <button key={ins} onClick={() => setAddInsurer(ins)}
                    style={{ padding:'5px 12px', borderRadius:'20px', border:`1.5px solid ${addInsurer===ins ? theme.brand : COLORS.borderSoft}`, background: addInsurer===ins ? theme.brand : '#fff', color: addInsurer===ins ? '#fff' : COLORS.t3, fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', outline:'none', transition:'all 0.15s' }}>
                    {ins}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 계약 기간 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {[{ label:'계약 시작일', val:addStart, set:setAddStart },{ label:'계약 만료일', val:addEnd, set:setAddEnd }].map((row, i, arr) => (
              <div key={row.label} style={{ padding:'12px 16px', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'13px', color:COLORS.t3 }}>{row.label}</span>
                <div style={{ overflow:'hidden', borderRadius:'8px' }}>
                  <input type="date" value={row.val} onChange={e => row.set(e.target.value)}
                    style={{ border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit', cursor:'pointer', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance:'none', appearance:'none' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* 차량번호 (자동차보험) */}
          {addType.id === 'car' && (
            <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'13px', color:COLORS.t3 }}>🚗 차량번호</span>
              <input value={addVehicle} onChange={e => setAddVehicle(e.target.value)} placeholder='예) 12가 3456'
                style={{ border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:COLORS.t1, background:'transparent', fontFamily:'inherit', textAlign:'right', width:'120px' }}/>
            </div>
          )}

          {/* 피보험 직원수 (단체보험) */}
          {addType.id === 'group' && (
            <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>👥 피보험 직원수</div>
                <div style={{ fontSize:'11px', color:COLORS.t4 }}>인당 단가 × 인원수 자동 계산</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <button onClick={() => setAddHeadcount(Math.max(1, addHeadcount-1))}
                  style={{ width:'28px', height:'28px', borderRadius:'50%', border:`1.5px solid ${COLORS.borderSoft}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', outline:'none', fontSize:'16px', fontWeight:700, color:COLORS.t2 }}>−</button>
                <span style={{ fontSize:'16px', fontWeight:800, color:COLORS.t1, minWidth:'28px', textAlign:'center' }}>{addHeadcount}</span>
                <button onClick={() => setAddHeadcount(addHeadcount+1)}
                  style={{ width:'28px', height:'28px', borderRadius:'50%', border:'none', background:theme.brand, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', outline:'none', fontSize:'16px', fontWeight:700, color:'#fff' }}>+</button>
              </div>
            </div>
          )}

          {renderAutoPaySection(theme, addAutoOn, setAddAutoOn, addPayDay, setAddPayDay, addPayMethod, setAddPayMethod, addCard, setAddCard, addAutoEnd, setAddAutoEnd, amountVal, addCycle, addCustomDay, setAddCustomDay, addBankName, setAddBankName, addBankAccount, setAddBankAccount)}
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
function InsuranceDetailScreen({
  theme, sel,
  editAmount, setEditAmount, editCycle, setEditCycle,
  editAutoOn, setEditAutoOn, editAutoEnd, setEditAutoEnd,
  editPayDay, setEditPayDay, editPayMethod, setEditPayMethod,
  editCard, setEditCard, editCustomDay, setEditCustomDay,
  editBankName, setEditBankName, editBankAccount, setEditBankAccount,
  editEvConfirm, setEditEvConfirm, editEvReceipt, setEditEvReceipt,
  saved, handleSave, onBack,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const typeInfo = INS_TYPES.find(t => t.id === sel.typeId) || INS_TYPES[7]
  const amountVal = Number(String(editAmount).replace(/,/g,'')) || 0
  const monthly = calcMonthly(amountVal, editCycle)
  const d = daysLeft(sel.endDate)

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
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>보험료 자동 설정</span>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px 0', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sel.name}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px' }}>{typeInfo.icon} {typeInfo.label} · {sel.insurer}</div>
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
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
            <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:theme.brand, flexShrink:0 }}/>
            <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>보험 정보</span>
          </div>

          {/* 보험료 편집 타일 */}
          <div style={{ background:COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 16px', boxShadow:`0 0 0 3px ${theme.brand}14`, marginBottom:'4px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark }}>보험료</span>
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

          {/* 납부 주기 세그먼트 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>납부 주기</div>
            <div style={{ display:'flex', background:COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
              {CYCLES.map(opt => (
                <button key={opt.key} onClick={() => setEditCycle(opt.key)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', outline:'none', fontSize:'11px', fontWeight:700, transition:'all 0.15s', background: editCycle===opt.key ? '#fff' : 'transparent', color: editCycle===opt.key ? theme.brand : COLORS.t4, boxShadow: editCycle===opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 계약 메타 정보 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
            {[
              { icon:'🏢', label:'보험사', value:sel.insurer||'—' },
              { icon:'📅', label:'계약 기간', value:`${sel.startDate} ~ ${sel.endDate}` },
              sel.linkedVehicle && { icon:'🚗', label:'차량번호', value:sel.linkedVehicle },
              sel.headcount && { icon:'👥', label:'피보험 직원', value:`${sel.headcount}명` },
            ].filter(Boolean).map((row, i, arr) => (
              <div key={row.label} style={{ padding:'11px 16px', borderBottom: i<arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                <span style={{ fontSize:'11px', color:COLORS.t4, flexShrink:0, minWidth:'60px' }}>{row.label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, textAlign:'right', flex:1 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* 계약 상태 */}
          <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'4px' }}>계약 상태</div>
              {d !== null && <div style={{ fontSize:'11px', color: d<=30 ? '#B45309' : COLORS.t4 }}>{d>=0 ? `만료까지 D-${d}` : '계약 만료됨'}</div>}
            </div>
            <StatusBadge endDate={sel.endDate} />
          </div>

          {/* 만료 임박 경고 */}
          {d !== null && d >= 0 && d <= 30 && (
            <div style={{ padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'12px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <span style={{ fontSize:'18px', flexShrink:0, lineHeight:1 }}>⏰</span>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E', marginBottom:'2px' }}>계약 만료 D-{d}</div>
                <div style={{ fontSize:'11px', color:'#B45309', lineHeight:1.5 }}>갱신 또는 종료 여부를 확인해주세요.</div>
              </div>
            </div>
          )}

          {renderAutoPaySection(theme, editAutoOn, setEditAutoOn, editPayDay, setEditPayDay, editPayMethod, setEditPayMethod, editCard, setEditCard, editAutoEnd, setEditAutoEnd, amountVal, editCycle, editCustomDay, setEditCustomDay, editBankName, setEditBankName, editBankAccount, setEditBankAccount)}
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

// ─── 메인 컴포넌트 ────────────────────────────────────────
export default function ExecuteInsurancePremium() {
  const theme = getAccountTheme()
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

  const [items, setItems]   = useState(INIT_ITEMS)
  const [screen, setScreen] = useState('list')
  const [selId, setSelId]   = useState(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [saved, setSaved]   = useState(false)

  // 상세 편집 상태
  const [editAmount, setEditAmount]           = useState('')
  const [editCycle, setEditCycle]             = useState('매월')
  const [editAutoOn, setEditAutoOn]           = useState(true)
  const [editAutoEnd, setEditAutoEnd]         = useState(true)
  const [editPayDay, setEditPayDay]           = useState('25')
  const [editPayMethod, setEditPayMethod]     = useState('card')
  const [editCard, setEditCard]               = useState('c1')
  const [editCustomDay, setEditCustomDay]     = useState('')
  const [editBankName, setEditBankName]       = useState('')
  const [editBankAccount, setEditBankAccount] = useState('')
  const [editEvConfirm, setEditEvConfirm]     = useState(true)
  const [editEvReceipt, setEditEvReceipt]     = useState(true)

  // 추가 폼 상태
  const [addType, setAddType]         = useState(INS_TYPES[0])
  const [addName, setAddName]         = useState('')
  const [addInsurer, setAddInsurer]   = useState('')
  const [addAmount, setAddAmount]     = useState('')
  const [addCycle, setAddCycle]       = useState('매월')
  const [addPayDay, setAddPayDay]     = useState('25')
  const [addPayMethod, setAddPayMethod] = useState('card')
  const [addCard, setAddCard]         = useState('c1')
  const [addCustomDay, setAddCustomDay]   = useState('')
  const [addBankName, setAddBankName]     = useState('')
  const [addBankAccount, setAddBankAccount] = useState('')
  const [addStart, setAddStart]       = useState('')
  const [addEnd, setAddEnd]           = useState('')
  const [addVehicle, setAddVehicle]   = useState('')
  const [addHeadcount, setAddHeadcount] = useState(1)
  const [addAutoOn, setAddAutoOn]     = useState(true)
  const [addAutoEnd, setAddAutoEnd]   = useState(true)
  const [addEvConfirm, setAddEvConfirm] = useState(true)
  const [addEvReceipt, setAddEvReceipt] = useState(true)

  // ─── 스와이프 백 가드 ─────────────────────────────────────
  const handleBack = () => {
    if (screen === 'addForm') setScreen('addType')
    else setScreen('list')
  }
  useStepHistory(handleBack, screen === 'list')

  const sel = items.find(i => i.id === selId)
  const totalMonthly = items.reduce((s,it) => s + calcMonthly(it.amount, it.cycle), 0)
  const expiringCount = items.filter(it => { const d=daysLeft(it.endDate); return d!==null && d>=0 && d<=30 }).length

  function openDetail(id) {
    const it = items.find(i => i.id === id)
    if (!it) return
    setSelId(id)
    setEditAmount(it.amount)
    setEditCycle(it.cycle)
    setEditAutoOn(it.autoOn); setEditAutoEnd(it.autoEnd)
    setEditPayDay(it.payDay); setEditPayMethod(it.payMethod); setEditCard(it.selectedCard||'c1')
    setEditEvConfirm(it.evidenceConfirm); setEditEvReceipt(it.evidenceReceipt)
    setSaved(false)
    setScreen('detail')
  }

  function handleSave() {
    const amtNum = Number(String(editAmount).replace(/,/g,'')) || 0
    const selItem = items.find(i => i.id === selId)
    setItems(prev => prev.map(it => it.id !== selId ? it : {
      ...it, amount: amtNum || it.amount,
      cycle:editCycle, autoOn:editAutoOn, autoEnd:editAutoEnd,
      payDay:editPayDay, payMethod:editPayMethod, selectedCard:editCard,
      evidenceConfirm:editEvConfirm, evidenceReceipt:editEvReceipt,
    }))
    if (selItem) {
      addTransaction({
        type: 'insurancePremium',
        fromUserId: 'biz_juda',
        fromUserName: '㈜주다컴퍼니',
        fromUserType: 'business',
        recipient: { id: null, name: selItem.insurer || selItem.name, phone: '', verified: true, isBusiness: true },
        amount: amtNum || selItem.amount || 0,
        reason: selItem.name,
        walletId: 'my', walletLabel: 'MY 지갑',
        payDateMode: 'immediate', status: 'completed',
      })
    }
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  function handleAdd() {
    setItems(prev => [...prev, {
      id:'p'+Date.now(), typeId:addType.id,
      insurer:addInsurer, name:addName||addType.label,
      amount:Number(String(addAmount).replace(/,/g,''))||0,
      cycle:addCycle, payDay:addPayDay, payMethod:addPayMethod, selectedCard:addCard,
      startDate:addStart, endDate:addEnd,
      autoOn:addAutoOn, autoEnd:addAutoEnd,
      evidenceConfirm:addEvConfirm, evidenceReceipt:addEvReceipt,
      linkedVehicle:addType.id==='car' ? addVehicle : null,
      headcount:addType.id==='group' ? addHeadcount : null,
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
        {/* List always rendered */}
        <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
          <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
              <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>보험료 관리</span>
              <div style={{ flex:1 }}/>
              <button onClick={() => { if (!selId) { const t = items[0]; if (t) setSelId(t.id); } setScreen('log') }} style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px' }}>납부내역보기</button>
              <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', fontWeight:500, marginBottom:'4px', letterSpacing:'0.3px' }}>계약 중 · {items.length}건</div>
                  <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
                    {fmt(totalMonthly)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
                  </div>
                </div>
                {expiringCount > 0 && (
                  <div style={{ background:'rgba(251,191,36,0.2)', border:'1px solid rgba(251,191,36,0.4)', borderRadius:'10px', padding:'6px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:'18px', fontWeight:800, color:'#FCD34D', lineHeight:1 }}>{expiringCount}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>만료임박</div>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:'0', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>월 환산 합계</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{fmt(totalMonthly)}원</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>자동납부</div>
                  <div style={{ fontSize:'13px', fontWeight:800, color:'#fff' }}>{items.filter(i => i.autoOn).length}건</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding:'16px 16px 32px' }}>
            {expiringCount > 0 && (
              <div style={{ padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'12px', marginBottom:'12px', display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ fontSize:'16px', flexShrink:0 }}>⚠️</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#991B1B', marginBottom:'2px' }}>계약 만료 임박</div>
                  <div style={{ fontSize:'11px', color:'#B91C1C', lineHeight:1.5 }}>
                    {items.filter(it => { const d=daysLeft(it.endDate); return d!==null&&d>=0&&d<=30 }).map(it => `${it.name} D-${daysLeft(it.endDate)}`).join(' · ')}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'14px' }}>
              {items.length === 0 && (
                <div style={{ textAlign:'center', padding:'48px 24px', background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card }}>
                  <div style={{ fontSize:'48px', marginBottom:'14px' }}>🛡️</div>
                  <div style={{ fontSize:'15px', fontWeight:700, color:COLORS.t1, marginBottom:'8px' }}>등록된 보험이 없습니다</div>
                  <div style={{ fontSize:'12px', color:COLORS.t4, lineHeight:1.8 }}>아래 버튼으로 보험을 추가하세요</div>
                </div>
              )}
              {items.map(item => {
                const typeInfo = INS_TYPES.find(t => t.id === item.typeId) || INS_TYPES[7]
                const monthly = calcMonthly(item.amount, item.cycle)
                return (
                  <div key={item.id} onClick={() => openDetail(item.id)}
                    style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'16px', padding:'14px 16px', boxShadow:SHADOWS.card, cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>{typeInfo.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</span>
                          <StatusBadge endDate={item.endDate} />
                        </div>
                        <div style={{ fontSize:'12px', color:COLORS.t3 }}>{item.insurer} · {item.payDay==='말일'?'말일':`매월 ${item.payDay}일`}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                    <div style={{ paddingTop:'10px', borderTop:`1px solid ${COLORS.borderSoft}`, display:'flex', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'2px' }}>월 환산</div>
                        <div style={{ fontSize:'14px', fontWeight:800, color:COLORS.t1 }}>{fmt(monthly)}원</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'2px' }}>만료일</div>
                        <div style={{ fontSize:'12px', fontWeight:600, color:COLORS.t2 }}>{item.endDate||'—'}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Fixed bottom add button */}
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
          <button onClick={() => setScreen('addType')}
            style={{ width:'100%', padding:'15px', background:theme.activeBtnGrad || theme.brand, color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:theme.activeShadow, outline:'none' }}>
            <span style={{ fontSize:'18px' }}>+</span> 보험 추가
          </button>
        </div>

        {/* Overlays */}
        {screen === 'log' && sel && (
          <InsuranceLogScreen
            theme={theme}
            sel={sel}
            onBack={() => setScreen('list')}
          />
        )}

        {(screen === 'addType' || screen === 'addForm') && (
          <InsuranceAddTypeScreen
            theme={theme}
            skipAnim={screen === 'addForm'}
            setScreen={setScreen}
            setAddType={setAddType}
            setAddName={setAddName}
            setAddInsurer={setAddInsurer}
            setAddAmount={setAddAmount}
            setAddStart={setAddStart}
            setAddEnd={setAddEnd}
            setAddVehicle={setAddVehicle}
            setAddHeadcount={setAddHeadcount}
          />
        )}

        {screen === 'addForm' && (
          <InsuranceAddFormScreen
            theme={theme}
            addType={addType}
            addName={addName} setAddName={setAddName}
            addInsurer={addInsurer} setAddInsurer={setAddInsurer}
            addAmount={addAmount} setAddAmount={setAddAmount}
            addCycle={addCycle} setAddCycle={setAddCycle}
            addPayDay={addPayDay} setAddPayDay={setAddPayDay}
            addPayMethod={addPayMethod} setAddPayMethod={setAddPayMethod}
            addCard={addCard} setAddCard={setAddCard}
            addCustomDay={addCustomDay} setAddCustomDay={setAddCustomDay}
            addBankName={addBankName} setAddBankName={setAddBankName}
            addBankAccount={addBankAccount} setAddBankAccount={setAddBankAccount}
            addStart={addStart} setAddStart={setAddStart}
            addEnd={addEnd} setAddEnd={setAddEnd}
            addVehicle={addVehicle} setAddVehicle={setAddVehicle}
            addHeadcount={addHeadcount} setAddHeadcount={setAddHeadcount}
            addAutoOn={addAutoOn} setAddAutoOn={setAddAutoOn}
            addAutoEnd={addAutoEnd} setAddAutoEnd={setAddAutoEnd}
            handleAdd={handleAdd}
            setScreen={setScreen}
          />
        )}

        {screen === 'detail' && sel && (
          <InsuranceDetailScreen
            theme={theme}
            sel={sel}
            editAmount={editAmount} setEditAmount={setEditAmount}
            editCycle={editCycle} setEditCycle={setEditCycle}
            editAutoOn={editAutoOn} setEditAutoOn={setEditAutoOn}
            editAutoEnd={editAutoEnd} setEditAutoEnd={setEditAutoEnd}
            editPayDay={editPayDay} setEditPayDay={setEditPayDay}
            editPayMethod={editPayMethod} setEditPayMethod={setEditPayMethod}
            editCard={editCard} setEditCard={setEditCard}
            editCustomDay={editCustomDay} setEditCustomDay={setEditCustomDay}
            editBankName={editBankName} setEditBankName={setEditBankName}
            editBankAccount={editBankAccount} setEditBankAccount={setEditBankAccount}
            editEvConfirm={editEvConfirm} setEditEvConfirm={setEditEvConfirm}
            editEvReceipt={editEvReceipt} setEditEvReceipt={setEditEvReceipt}
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
