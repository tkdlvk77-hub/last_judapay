import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useStoreData } from '../../hooks/useStoreData'
import {
  addTransaction,
  getDiscoveredRentDeals,
  getRegisteredRentAssets,
  registerRentFromDeal,
  unregisterRent,
  updateRentAsset,
} from '../../shared/transactionStore'

// ─── 상수 ────────────────────────────────────────────────
const PAY_DAYS = ['1','5','10','15','20','25','28','말일']
const VAT_RATE = 0.1

// ─── 데모 납부 로그 ───────────────────────────────────────
const DEMO_LOGS = [
  { date:'2026.05.25', status:'success', amount:2800000, note:'' },
  { date:'2026.04.25', status:'success', amount:2800000, note:'' },
  { date:'2026.03.25', status:'fail',    amount:0,       note:'잔액 부족 → 보류' },
  { date:'2026.02.25', status:'success', amount:2800000, note:'' },
  { date:'2026.01.25', status:'success', amount:2700000, note:'관리비 조정 전' },
]

// ─── 유틸 ────────────────────────────────────────────────
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / (1000*60*60*24))
}
function calcMonthly({ rent, maint, vatMode }) {
  const r = rent || 0
  const m = maint || 0
  const vat = vatMode === 'exclude' ? Math.floor(r * VAT_RATE) : 0
  return { rent: r, vat, maint: m, total: r + vat + m }
}

// ─── 부동산 거래 ↔ 등록 자산 통합 row 빌더 ───────────────
function buildRows(discovered, registered) {
  const rows = []
  registered.forEach(a => {
    rows.push({
      kind: 'registered', asset: a, tx: null,
      key: `r_${a.assetId}`,
      label: a.alias || a.address,
      address: a.address,
      buildingName: a.buildingName || '',
      lessorName: a.lessor?.name || '—',
      lessorType: a.lessor?.type || 'individual',
      lessorIdentifier: a.lessor?.identifier || '',
      lessorVerified: a.lessor?.verified ?? false,
      monthlyRent: a.rent || 0,
      rentPayDay: a.rentPayDay || 25,
      deposit: a.deposit || 0,
      contractStart: a.contractStart || '',
      contractEnd: a.contractEnd || '',
      vatMode: a.vatMode || 'exclude',
      maint: a.maint || 0,
      payable: a.payable ?? false,
      lastPay: a.lastPay || null,
      sourceTxId: a.sourceTxId || null,
      hasContract: a.hasContract ?? false,
      autoEnabled: a.autoEnabled ?? false,
    })
  })
  discovered.forEach(tx => {
    const m = tx.rentalMeta || {}
    rows.push({
      kind: 'discovered', asset: null, tx,
      key: `d_${tx.id}`,
      label: m.address || tx.dealTitle || '임대 자산',
      address: m.address || tx.dealTitle || '',
      buildingName: '',
      lessorName: tx.toRecipientName || '—',
      lessorType: tx.toRecipientIsBusiness ? 'business' : 'individual',
      lessorIdentifier: tx.toRecipientPhone || '',
      lessorVerified: tx.toRecipientVerified ?? false,
      monthlyRent: m.monthlyRent || 0,
      rentPayDay: m.rentPayDay || 25,
      deposit: m.depositAmount || 0,
      contractStart: m.contractStart || '',
      contractEnd: m.contractEnd || '',
      vatMode: m.defaultVatMode || 'exclude',
      maint: m.defaultMaint || 0,
      payable: tx.toRecipientVerified ?? false,
      lastPay: null,
      sourceTxId: tx.id,
      hasContract: false,
      autoEnabled: false,
    })
  })
  return rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'registered' ? -1 : 1
    return 0
  })
}

// ─── 섹션 헤더 ───────────────────────────────────────────
function SectionHeader({ label, color }) {
  return (
    <div style={{ fontSize:'11px', fontWeight:700, color: color || COLORS.t3, letterSpacing:'0.5px', marginBottom:'8px', marginTop:'4px' }}>
      {label}
    </div>
  )
}

// ─── 토글 스위치 ─────────────────────────────────────────
function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{
        width:'46px', height:'26px', borderRadius:'13px', border:'none', cursor:'pointer',
        background: on ? brand : COLORS.bgMuted,
        position:'relative', transition:'background 0.2s', padding:0, flexShrink:0,
      }}>
      <div style={{
        position:'absolute', top:'3px',
        left: on ? '23px' : '3px',
        width:'20px', height:'20px', borderRadius:'50%',
        background:'#fff', transition:'left 0.2s',
        boxShadow:'0 1px 3px rgba(0,0,0,0.25)',
      }}/>
    </button>
  )
}

// ─── 체크박스 행 ─────────────────────────────────────────
function CheckRow({ checked, label, sub, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{
        width:'100%', display:'flex', alignItems:'flex-start', gap:'10px',
        padding:'10px 12px', background: checked ? brand+'10' : COLORS.bgMuted,
        border:`1px solid ${checked ? brand+'40' : COLORS.borderSoft}`,
        borderRadius: RADIUS.md, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        marginBottom:'6px',
      }}>
      <div style={{
        width:'18px', height:'18px', borderRadius:'5px', flexShrink:0, marginTop:'1px',
        background: checked ? brand : '#fff',
        border:`2px solid ${checked ? brand : COLORS.border}`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div>
        <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{label}</div>
        {sub && <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px', lineHeight:1.5 }}>{sub}</div>}
      </div>
    </button>
  )
}

const RENT_CARDS = [
  { id:'c1', name:'법인카드 (현대카드)', last4:'7842', color:'#1D4ED8' },
  { id:'c2', name:'법인카드 (신한카드)', last4:'3391', color:'#059669' },
]
const RENT_BANKS = ['국민','신한','우리','하나','기업','농협','카카오뱅크','토스뱅크']

// ─── 납부 로그 오버레이 컴포넌트 ─────────────────────────
function RentLogScreen({ theme, selectedRow, onBack, navigate }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])
  const logs = selectedRow?.kind === 'registered' ? DEMO_LOGS : []
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
            <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>납부내역보기</span>
            <div style={{ flex:1 }}/>
            <button onClick={() => navigate('/home-business')} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:'4px' }}>{selectedRow.label}</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>반복 결제 내역</div>
          </div>
        </div>

        <div style={{ padding:'18px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {logs.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', color: COLORS.t4, fontSize:'13px' }}>
              아직 납부 내역이 없어요
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} style={{
              background: COLORS.bgCard, borderRadius: RADIUS.md, padding:'14px 16px',
              boxShadow: SHADOWS.card, display:'flex', alignItems:'center', gap:'12px',
            }}>
              <div style={{
                width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                background: log.status === 'success' ? '#D1FAE5' : '#FEE2E2',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px',
              }}>
                {log.status === 'success' ? '✅' : '❌'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, marginBottom:'2px' }}>{log.date}</div>
                {log.note
                  ? <div style={{ fontSize:'11px', color:'#B91C1C' }}>{log.note}</div>
                  : <div style={{ fontSize:'11px', color: COLORS.t4 }}>{log.status === 'success' ? '정상 납부' : '납부 실패'}</div>
                }
              </div>
              {log.amount > 0 && (
                <div style={{ fontSize:'14px', fontWeight:700, color: log.status === 'success' ? '#065F46' : COLORS.t4 }}>
                  {fmt(log.amount)}원
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 상세 편집 오버레이 컴포넌트 ─────────────────────────
function RentDetailScreen({
  theme, row,
  autoOn, setAutoOn,
  payDay, setPayDay,
  inclMaint, setInclMaint,
  autoEnd, setAutoEnd,
  saved, setSaved,
  editRent, setEditRent,
  editDeposit, setEditDeposit,
  detailVatMode, setDetailVatMode,
  orderName, setOrderName,
  orderPhone, setOrderPhone,
  orderEmail, setOrderEmail,
  payMethod, setPayMethod,
  selectedCard, setSelectedCard,
  bankName, setBankName,
  bankAccount, setBankAccount,
  customDayInput, setCustomDayInput,
  showExitModal, setShowExitModal,
  handleSave, handleImmediatePay,
  onBack, navigate,
}) {
  const [visible, setVisible] = useState(false)
  const [showPayConfirm, setShowPayConfirm] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const rentEditVal = parseInt(String(editRent).replace(/,/g,'')) || 0
  const depositEditVal = parseInt(String(editDeposit).replace(/,/g,'')) || 0
  const c = calcMonthly({ rent: rentEditVal, maint: 0, vatMode: detailVatMode })
  const dDay = daysUntil(row.contractEnd)
  const isRegistered = row.kind === 'registered'

  const secLabel = (label) => (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: theme.brand, flexShrink:0 }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
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

          {/* ── 헤더 ─────────────────────────────────── */}
          <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
              <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>임대료 자동 설정</span>
              <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* 헤더 하단 — 건물명 + 월 납부 미리보기 */}
            <div style={{ padding:'0 20px 0', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'12px' }}>
              <div>
                <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'3px', letterSpacing:'-0.3px' }}>{row.label}</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'18px' }}>{row.lessorName}</div>
              </div>
              {c.total > 0 && (
                <div style={{ textAlign:'right', marginBottom:'20px', flexShrink:0 }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>매월 납부</div>
                  <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>{fmt(c.total)}<span style={{ fontSize:'11px', opacity:0.6 }}>원</span></div>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding:'16px 16px 36px', display:'flex', flexDirection:'column', gap:'6px' }}>

            {/* ── A. 기본 계약 정보 ─────────────────── */}
            {secLabel('계약 정보')}

            {/* 월세 + 보증금 편집 타일 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'4px' }}>
              {/* 월세 */}
              <div style={{ background: COLORS.bgCard, border:`2px solid ${theme.brand}`, borderRadius:'14px', padding:'12px 14px', boxShadow:`0 0 0 3px ${theme.brand}14` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <span style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark }}>월세</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'3px', background: theme.brand+'18', borderRadius:'6px', padding:'2px 6px' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span style={{ fontSize:'9px', fontWeight:700, color: theme.brand }}>수정</span>
                  </div>
                </div>
                <div style={{ borderBottom:`1.5px solid ${theme.brand}50`, paddingBottom:'6px', marginBottom:'4px' }}>
                  <input
                    type="number"
                    value={editRent}
                    onChange={e => setEditRent(e.target.value)}
                    style={{ width:'100%', border:'none', outline:'none', fontSize:'18px', fontWeight:800, color: COLORS.t1, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}
                  />
                </div>
                <span style={{ fontSize:'10px', color: COLORS.t4 }}>원 · 탭하여 수정</span>
              </div>
              {/* 보증금 */}
              <div style={{ background: COLORS.bgCard, border:`2px solid ${COLORS.border}`, borderRadius:'14px', padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <span style={{ fontSize:'11px', fontWeight:700, color: COLORS.t2 }}>보증금</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'3px', background:'#FEE2E2', borderRadius:'6px', padding:'2px 6px' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span style={{ fontSize:'9px', fontWeight:700, color:'#B91C1C' }}>수정</span>
                  </div>
                </div>
                <div style={{ borderBottom:`1.5px solid ${COLORS.border}`, paddingBottom:'6px', marginBottom:'4px' }}>
                  <input
                    type="number"
                    value={editDeposit}
                    onChange={e => setEditDeposit(e.target.value)}
                    style={{ width:'100%', border:'none', outline:'none', fontSize:'18px', fontWeight:800, color: COLORS.t2, background:'transparent', fontFamily:'inherit', letterSpacing:'-0.5px', padding:0 }}
                  />
                </div>
                <span style={{ fontSize:'10px', color: COLORS.t4 }}>원 · 탭하여 수정</span>
              </div>
            </div>

            {/* 계약 메타 정보 */}
            <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden' }}>
              {[
                { icon:'👤', label:'임대인', value: row.lessorName },
                { icon:'📍', label:'주소', value: row.address || '—' },
                { icon:'📅', label:'계약 기간', value: row.contractStart && row.contractEnd ? `${row.contractStart} ~ ${row.contractEnd}` : '—' },
                { icon:'📋', label:'계약서', value: row.hasContract ? '첨부 완료 ✅' : '미첨부' },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ padding:'11px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'flex-start', gap:'10px' }}>
                  <span style={{ fontSize:'14px', marginTop:'1px', width:'18px', textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                  <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0, minWidth:'52px', marginTop:'1px' }}>{item.label}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1, textAlign:'right', flex:1, lineHeight:1.4 }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* 보증금 안내 */}
            {depositEditVal > 0 && (
              <div style={{ padding:'10px 14px', background:'#FFF0F0', border:'1px solid #FECACA', borderRadius:'12px', fontSize:'11px', color:'#B91C1C', lineHeight:1.6, display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>⚠️</span>
                <span>보증금 {fmt(depositEditVal)}원은 자동지급에서 제외됩니다. 월세만 집행됩니다.</span>
              </div>
            )}

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

            {/* ── B. 자동 지급 설정 ─────────────────── */}
            {secLabel('자동 지급 설정')}

            {/* VAT 세그먼트 컨트롤 */}
            <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>VAT 설정</span>
                <span style={{ fontSize:'10px', color: COLORS.t4 }}>
                  {detailVatMode === 'exclude' ? `+${fmt(c.vat)}원 추가` : detailVatMode === 'include' ? '월세에 포함됨' : '면세'}
                </span>
              </div>
              <div style={{ display:'flex', background: COLORS.bgMuted, borderRadius:'10px', padding:'3px', gap:'2px' }}>
                {[
                  { key:'exclude', label:'VAT 별도' },
                  { key:'include', label:'VAT 포함' },
                  { key:'none',    label:'VAT 없음' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setDetailVatMode(opt.key)}
                    style={{
                      flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit',
                      border:'none', fontSize:'11px', fontWeight:700, transition:'all 0.15s',
                      background: detailVatMode === opt.key ? '#fff' : 'transparent',
                      color: detailVatMode === opt.key ? theme.brand : COLORS.t4,
                      boxShadow: detailVatMode === opt.key ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 자동 지급 ON/OFF */}
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

                  {/* 지급일 선택 */}
                  <div style={{ marginBottom:'16px' }}>
                    <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4, marginBottom:'10px', letterSpacing:'0.3px' }}>매월 지급일</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {PAY_DAYS.map(d => (
                        <button key={d} onClick={() => setPayDay(d)}
                          style={{
                            padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit',
                            fontSize:'12px', fontWeight:600, border:'none',
                            background: payDay === d ? theme.brand : COLORS.bgMuted,
                            color: payDay === d ? '#fff' : COLORS.t3,
                            boxShadow: payDay === d ? `0 2px 8px ${theme.brand}40` : 'none',
                            transition:'all 0.15s',
                          }}>
                          {d === '말일' ? '말일' : `${d}일`}
                        </button>
                      ))}
                      {/* 직접 입력 칩 */}
                      {(() => {
                        const isCustom = !PAY_DAYS.includes(payDay)
                        return (
                          <button onClick={() => { if (!isCustom) { setPayDay(''); setCustomDayInput('') } }}
                            style={{ padding:'6px 13px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:600, border:'none', background: isCustom ? theme.brand : COLORS.bgMuted, color: isCustom ? '#fff' : COLORS.t3, boxShadow: isCustom ? `0 2px 8px ${theme.brand}40` : 'none', transition:'all 0.15s' }}>
                            직접 입력
                          </button>
                        )
                      })()}
                    </div>
                    {/* 직접 입력 시 숫자 입력란 */}
                    {!PAY_DAYS.includes(payDay) && (
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

                    {/* 카드 자동결제형 */}
                    {payMethod === 'card' && (
                      <div style={{ marginTop:'10px', background: COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t3, marginBottom:'10px' }}>발급된 법인카드 선택</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                          {RENT_CARDS.map(card => (
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

                    {/* 계좌 자동송금형 */}
                    {payMethod === 'account' && (
                      <div style={{ marginTop:'10px', background: COLORS.bg, borderRadius:'12px', padding:'12px 14px', border:`1px solid ${COLORS.borderSoft}` }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t3, marginBottom:'10px' }}>수취 계좌 정보</div>
                        <div style={{ marginBottom:'8px' }}>
                          <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'6px' }}>은행 선택</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                            {RENT_BANKS.map(b => (
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
                  </div>

                  {/* 월 지급액 요약 */}
                  <div style={{ background: `linear-gradient(135deg, ${theme.brand}14, ${theme.brand}08)`, border:`1px solid ${theme.brand}22`, borderRadius:'12px', padding:'14px 16px' }}>
                    <div style={{ fontSize:'11px', fontWeight:700, color: theme.brandDark, marginBottom:'8px', letterSpacing:'0.3px' }}>매월 총 지급액</div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: COLORS.t3, marginBottom:'4px' }}>
                      <span>월세</span><span style={{ fontWeight:600 }}>{fmt(rentEditVal)}원</span>
                    </div>
                    {c.vat > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: COLORS.t3, marginBottom:'4px' }}>
                        <span>부가세 10%</span><span style={{ fontWeight:600, color:'#D97706' }}>+{fmt(c.vat)}원</span>
                      </div>
                    )}
                    {detailVatMode === 'include' && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: COLORS.t4, marginBottom:'4px' }}>
                        <span>VAT</span><span>월세 포함</span>
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', borderTop:`1px dashed ${theme.brand}25`, fontSize:'17px', fontWeight:800, color: theme.brand, marginTop:'4px', letterSpacing:'-0.3px' }}>
                      <span>합계</span><span>{fmt(c.total)}원</span>
                    </div>
                  </div>

                  {/* 계약 종료 시 자동 종료 */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'16px', paddingTop:'14px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, marginBottom:'2px' }}>계약 종료 시 자동 종료</div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>만료 후 자동 지급 중단</div>
                    </div>
                    <Toggle on={autoEnd} onChange={() => setAutoEnd(!autoEnd)} brand={theme.brand} />
                  </div>
                </>
              )}
            </div>

            {/* 즉시 납부 버튼 */}
            {row.payable && (
              <button onClick={() => setShowPayConfirm(true)}
                style={{
                  width:'100%', padding:'14px',
                  background: COLORS.bgCard, border:`1.5px solid ${theme.brand}`,
                  borderRadius:'14px', cursor:'pointer', fontFamily:'inherit',
                  fontSize:'13px', fontWeight:700, color: theme.brand,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                  boxShadow:`0 2px 8px ${theme.brand}18`,
                }}>
                ⚡ 이번 달 즉시 납부 — {fmt(c.total)}원
              </button>
            )}

            {/* ── C. 발주 정보 (수신인) ─────────────── */}
            {secLabel('발주 정보')}

            <div style={{ background: COLORS.bgCard, borderRadius:'16px', boxShadow: SHADOWS.card, overflow:'hidden' }}>
              {/* 수신인 아바타 */}
              <div style={{ padding:'16px 16px 0', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'14px', background: theme.brand+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>
                    {orderName || row.lessorName || '수신인 미입력'}
                  </div>
                  <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px' }}>
                    {orderPhone || '연락처 미입력'}
                  </div>
                </div>
              </div>
              <div style={{ height:'1px', background: COLORS.borderSoft, margin:'14px 0 0' }}/>
              {[
                { label:'이름', icon:'👤', value: orderName, setter: setOrderName, placeholder:'임대인 이름', type:'text' },
                { label:'휴대폰', icon:'📱', value: orderPhone, setter: setOrderPhone, placeholder:'010-0000-0000', type:'tel' },
                { label:'이메일', icon:'✉️', value: orderEmail, setter: setOrderEmail, placeholder:'example@email.com', type:'email' },
              ].map((field, i, arr) => (
                <div key={field.label} style={{ padding:'12px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{field.icon}</span>
                  <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0, width:'40px' }}>{field.label}</span>
                  <input
                    type={field.type}
                    inputMode={field.type === 'tel' ? 'numeric' : undefined}
                    value={field.value}
                    onChange={e => {
                      // 휴대폰 필드(type='tel')는 010-XXXX-XXXX 자동 포맷
                      if (field.type === 'tel') {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 11)
                        const f = d.length <= 3 ? d
                          : d.length <= 7 ? `${d.slice(0,3)}-${d.slice(3)}`
                          : `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`
                        field.setter(f)
                      } else {
                        field.setter(e.target.value)
                      }
                    }}
                    placeholder={field.placeholder}
                    style={{ flex:1, border:'none', outline:'none', textAlign:'right', fontSize:'13px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit' }}
                  />
                </div>
              ))}
              <div style={{ padding:'10px 16px 14px', display:'flex', gap:'6px', alignItems:'flex-start' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:'1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div style={{ fontSize:'11px', color: COLORS.t4, lineHeight:1.55 }}>
                  미가입 수신인은 휴대폰 번호로 외부 링크가 발송됩니다. 정보 변경 시 반드시 갱신해주세요.
                </div>
              </div>
            </div>

            {/* ── D. 승인 및 통제 ───────────────────── */}
            <div style={{ marginTop:'8px', padding:'11px 14px', background: COLORS.infoBg, borderRadius: RADIUS.md, fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
              <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
            </div>

            <div style={{ padding:'12px 16px', background: theme.brandDark+'0A', border:`1px solid ${theme.brandDark}15`, borderRadius:'12px', fontSize:'11px', color: theme.brandDark, lineHeight:1.7, display:'flex', gap:'8px', alignItems:'flex-start' }}>
              <span style={{ flexShrink:0, marginTop:'1px' }}>ⓘ</span>
              <span>월세 집행 이력을 기반으로 반복 임대료를 자동 운영비로 전환합니다. 보증금은 자동 집행 대상에서 제외됩니다.</span>
            </div>
          </div>
        </div>

        {/* 하단 저장 바 */}
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background: COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
          <button onClick={handleSave}
            style={{
              width:'100%', padding:'15px',
              background: saved ? '#10B981' : theme.activeBtnGrad,
              boxShadow: saved ? 'none' : theme.activeShadow,
              color:'#fff', border:'none', borderRadius:'14px',
              fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              transition:'all 0.25s', letterSpacing:'-0.2px',
            }}>
            {saved ? '✓  저장 완료' : (isRegistered ? '자동 설정 저장' : '자동 지급 등록하기')}
          </button>
        </div>

      {/* 즉시 납부 확인 모달 */}
      {showPayConfirm && (
        <div onClick={() => setShowPayConfirm(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:'24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'13px', color:'#999', textAlign:'center', marginBottom:'6px' }}>이번 달 즉시 납부</div>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#111', textAlign:'center', marginBottom:'4px', letterSpacing:'-0.5px' }}>{fmt(c.total)}<span style={{ fontSize:'14px', fontWeight:500 }}>원</span></div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', textAlign:'center', marginBottom:'22px' }}>{row.label} · {row.lessorName}</div>
            <div style={{ background:'#FFF7ED', border:'1px solid #FDE68A', borderRadius:'12px', padding:'10px 14px', fontSize:'12px', color:'#92400E', lineHeight:1.6, marginBottom:'20px' }}>
              ⚡ 즉시 납부하면 취소가 어렵습니다. 금액과 수신인을 확인해 주세요.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowPayConfirm(false)} style={{ flex:1, height:'48px', background:'#F3F4F6', color:'#555', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
              <button onClick={() => { setShowPayConfirm(false); handleImmediatePay() }} style={{ flex:1, height:'48px', background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>납부하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 나가기 확인 모달 */}
      {showExitModal && (
        <div onClick={() => setShowExitModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 18px', width:'100%', maxWidth:'320px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px', textAlign:'center' }}>나가시겠어요?</div>
            <div style={{ fontSize:'13px', color:'#999', lineHeight:1.6, marginBottom:'20px', textAlign:'center' }}>작성 중인 내용은 저장되지 않습니다.</div>
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

export default function ExecuteRent() {
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

  const [showExitModal, setShowExitModal] = useState(false)

  // store 구독
  const discovered = useStoreData(() => getDiscoveredRentDeals({ userId: 'biz_juda' }))
  const registered  = useStoreData(() => getRegisteredRentAssets())

  const rows = buildRows(discovered, registered)

  // ── 화면 상태: 'list' | 'detail' | 'log' ─────────────
  const [screen, setScreen] = useState('list')
  const [selectedRow, setSelectedRow] = useState(null)

  // ── 스와이프 백 가드: 오버레이 화면에서 뒤로가면 list 로 ──
  const handleBack = () => { setScreen('list') }
  useStepHistory(handleBack, screen === 'list')

  // ── 상세 화면 상태 ────────────────────────────────────
  const [autoOn, setAutoOn]               = useState(false)
  const [payDay, setPayDay]               = useState('25')
  const [inclMaint, setInclMaint]         = useState(true)
  const [autoEnd, setAutoEnd]             = useState(true)
  const [saved, setSaved]                 = useState(false)
  const [editRent, setEditRent]           = useState('0')
  const [editDeposit, setEditDeposit]     = useState('0')
  const [detailVatMode, setDetailVatMode] = useState('exclude')
  const [orderName, setOrderName]         = useState('')
  const [orderPhone, setOrderPhone]       = useState('')
  const [orderEmail, setOrderEmail]       = useState('')
  const [payMethod, setPayMethod]         = useState('card')
  const [selectedCard, setSelectedCard]   = useState('c1')
  const [bankName, setBankName]           = useState('')
  const [bankAccount, setBankAccount]     = useState('')
  const [customDayInput, setCustomDayInput] = useState('')

  // ── 행 선택 ───────────────────────────────────────────
  const openDetail = (row) => {
    setSelectedRow(row)
    setAutoOn(row.autoEnabled)
    setPayDay(String(row.rentPayDay || 25))
    setEditRent(String(row.monthlyRent || 0))
    setEditDeposit(String(row.deposit || 0))
    setDetailVatMode(row.vatMode || 'exclude')
    setOrderName(row.lessorName !== '—' ? row.lessorName : '')
    setOrderPhone(row.lessorIdentifier || '')
    setOrderEmail('')
    setSaved(false)
    setScreen('detail')
  }

  const closeDetail = () => {
    setSelectedRow(null)
    setScreen('list')
  }

  // ── 저장 / 집행 ───────────────────────────────────────
  const handleSave = () => {
    if (!selectedRow) return
    const rentVal = parseInt(String(editRent).replace(/,/g,'')) || 0
    const depositVal = parseInt(String(editDeposit).replace(/,/g,'')) || 0
    if (selectedRow.kind === 'discovered') {
      registerRentFromDeal(selectedRow.tx.id, {
        kind: 'office', vatMode: detailVatMode, maint: 0,
        rent: rentVal, deposit: depositVal,
      })
    } else {
      updateRentAsset(selectedRow.asset.assetId, {
        autoEnabled: autoOn, rentPayDay: payDay,
        vatMode: detailVatMode, maint: 0,
        rent: rentVal, deposit: depositVal,
      })
    }
    setSaved(true)
    setTimeout(() => setScreen('list'), 800)
  }

  const handleImmediatePay = () => {
    if (!selectedRow) return
    const c = calcMonthly(selectedRow)
    addTransaction({
      type: 'rent',
      fromUserId: 'biz_juda', fromUserName: '㈜주다컴퍼니', fromUserType: 'business',
      recipient: {
        id: selectedRow.key, name: selectedRow.lessorName,
        verified: selectedRow.lessorVerified,
        isBusiness: selectedRow.lessorType === 'business',
      },
      amount: c.total, netAmount: c.total,
      reason: `즉시 임대료 — ${selectedRow.label}`,
      walletLabel: '법인 자금',
      statusLabel: '납부 완료',
    })
    setSaved(true)
    setTimeout(() => navigate('/home-business', { replace:true }), 600)
  }

  // ── 합계 (등록 + 자동 활성 행만) ─────────────────────
  const activeRows = rows.filter(r => r.kind === 'registered')
  const totalMonthly = activeRows.reduce((s, r) => {
    const c = calcMonthly({ rent: r.monthlyRent, maint: r.maint, vatMode: r.vatMode })
    return s + c.total
  }, 0)
  const totalRent = activeRows.reduce((s, r) => s + (r.monthlyRent || 0), 0)
  const totalMaint = activeRows.reduce((s, r) => s + (r.maint || 0), 0)
  const nextPayDay = activeRows.length > 0 ? (activeRows[0].rentPayDay || 25) : null
  const expiringRows = activeRows.filter(r => {
    const d = daysUntil(r.contractEnd)
    return d !== null && d > 0 && d <= 30
  })

  // ═══════════════════════════════════════════════════════
  // ── 리스트 화면 (항상 렌더) + 오버레이 ───────────────
  // ═══════════════════════════════════════════════════════
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 헤더 */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
            <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>임대료 자동 지급</span>
            <div style={{ flex:1 }}/>
            <button onClick={() => { if (!selectedRow) { const t = rows.find(r => r.kind === 'registered') || rows[0]; if (t) setSelectedRow(t); } setScreen('log') }} style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px' }}>납부내역보기</button>
            <button onClick={() => setShowExitModal(true)} style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* 월 납부 요약 카드 */}
          <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
            {activeRows.length > 0 ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', fontWeight:500, marginBottom:'4px', letterSpacing:'0.3px' }}>
                      매월 {nextPayDay}일 자동 납부 · {activeRows.length}건
                    </div>
                    <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
                      {fmt(totalMonthly)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
                    </div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'6px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', lineHeight:1 }}>{nextPayDay}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>매월</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>월세</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{fmt(totalRent)}원</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>합계</div>
                    <div style={{ fontSize:'13px', fontWeight:800, color:'#fff' }}>{fmt(totalMonthly)}원</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', marginBottom:'4px' }}>이번 달 자동 납부</div>
                  <div style={{ fontSize:'22px', fontWeight:800, color:'rgba(255,255,255,0.35)', letterSpacing:'-0.5px' }}>—</div>
                </div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', lineHeight:1.5, textAlign:'right' }}>
                  등록된<br/>내역 없음
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 32px' }}>

          {/* 만료 임박 경고 */}
          {expiringRows.length > 0 && (
            <div style={{ padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius: RADIUS.md, marginBottom:'12px', display:'flex', gap:'10px', alignItems:'center' }}>
              <span style={{ fontSize:'16px', flexShrink:0 }}>⚠️</span>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#991B1B', marginBottom:'2px' }}>계약 만료 임박</div>
                <div style={{ fontSize:'11px', color:'#B91C1C', lineHeight:1.5 }}>
                  {expiringRows.map(r => `${r.label.slice(0,14)} D-${daysUntil(r.contractEnd)}`).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* 임대 자산 카드 목록 */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'14px' }}>

            {/* 빈 상태 */}
            {rows.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 24px', background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
                <div style={{ fontSize:'48px', marginBottom:'14px' }}>🏢</div>
                <div style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1, marginBottom:'8px' }}>
                  등록된 부동산 내역이 없습니다
                </div>
                <div style={{ fontSize:'12px', color: COLORS.t4, lineHeight:1.8, marginBottom:'22px' }}>
                  월세 또는 보증금 집행을 한 차례 완료하시면<br/>해당 내역을 선택하여 자동 납부를<br/>손쉽게 설정하실 수 있습니다.
                </div>
                <button onClick={() => navigate('/execute/business')} style={{
                  padding:'13px 28px', background: theme.activeBtnGrad,
                  boxShadow: theme.activeShadow, color:'#fff',
                  border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                  부동산 자금 집행하기
                </button>
              </div>
            )}

            {rows.map(row => {
              const isRegistered = row.kind === 'registered'
              const dDay = daysUntil(row.contractEnd)
              const isExpiring = dDay !== null && dDay > 0 && dDay <= 30
              const monthly = calcMonthly({ rent: row.monthlyRent, maint: row.maint, vatMode: row.vatMode })

              return (
                <div key={row.key} style={{
                  background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card,
                  border: isExpiring ? '1.5px solid #FECACA'
                        : isRegistered ? `1.5px solid ${theme.brand}30`
                        : `1px solid ${COLORS.border}`,
                  overflow:'hidden',
                }}>
                  <div style={{ padding:'14px 16px 12px' }}>

                    {/* 상단: 이름 + 총액 + 뱃지 */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'3px' }}>
                          <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{row.label}</span>
                          {isExpiring && (
                            <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', background:'#FEE2E2', color:'#B91C1C', borderRadius:'20px' }}>
                              D-{dDay}
                            </span>
                          )}
                        </div>
                        {row.lessorName && row.lessorName !== '—' && (
                          <div style={{ fontSize:'11px', color: COLORS.t4 }}>{row.lessorName}</div>
                        )}
                      </div>
                      {/* 총액 + 자동납부 뱃지 */}
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:'12px' }}>
                        {/* 자동납부 상태 뱃지 */}
                        {isRegistered && (
                          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'4px' }}>
                            <span style={{
                              fontSize:'9px', fontWeight:700, padding:'2px 8px',
                              borderRadius:'20px', letterSpacing:'0.2px',
                              background: row.autoEnabled ? '#D1FAE5' : '#F3F4F6',
                              color: row.autoEnabled ? '#059669' : '#6B7280',
                            }}>
                              {row.autoEnabled ? '자동지급 ON' : '자동지급 OFF'}
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize:'16px', fontWeight:800, color: isRegistered ? theme.brandDark : COLORS.t1, letterSpacing:'-0.5px' }}>
                          {fmt(monthly.total)}원
                        </div>
                        <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'1px' }}>매월 {row.rentPayDay}일</div>
                      </div>
                    </div>

                    {/* 금액 세부 */}
                    <div style={{
                      display:'flex', gap:'0',
                      background: COLORS.bg, borderRadius: RADIUS.md,
                      padding:'10px 12px', marginBottom:'10px',
                    }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'9px', color: COLORS.t4, marginBottom:'2px', fontWeight:600, letterSpacing:'0.3px' }}>월세</div>
                        <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t2 }}>{fmt(row.monthlyRent)}원</div>
                      </div>
                      {monthly.vat > 0 && (
                        <div style={{ flex:1, borderLeft:`1px solid ${COLORS.border}`, paddingLeft:'12px' }}>
                          <div style={{ fontSize:'9px', color: COLORS.t4, marginBottom:'2px', fontWeight:600, letterSpacing:'0.3px' }}>VAT</div>
                          <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t2 }}>{fmt(monthly.vat)}원</div>
                        </div>
                      )}
                    </div>

                    {/* 최근 지급 */}
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                      {row.lastPay
                        ? <span>최근 지급 <span style={{ color: COLORS.t2, fontWeight:600 }}>{row.lastPay.date}</span></span>
                        : '최근 지급 이력 없음'}
                    </div>
                  </div>

                  {/* 하단 액션 */}
                  <button onClick={() => openDetail(row)} style={{
                    width:'100%', padding:'11px 16px',
                    background: isRegistered ? `${theme.brand}08` : theme.activeBtnGrad,
                    boxShadow: isRegistered ? 'none' : theme.activeShadow,
                    color: isRegistered ? theme.brandDark : '#fff',
                    border:'none', borderTop: isRegistered ? `1px solid ${theme.brand}20` : 'none',
                    cursor:'pointer', fontFamily:'inherit',
                    fontSize:'13px', fontWeight:700,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                  }}>
                    {isRegistered ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.brandDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        설정 변경
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        자동 납부 설정
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 정책 안내 */}
          <div style={{ padding:'12px 14px', background: theme.brandDark+'0D', border:`1px solid ${theme.brandDark}20`, borderRadius: RADIUS.md, fontSize:'11px', color: theme.brandDark, lineHeight:1.7 }}>
            <div style={{ fontWeight:700, marginBottom:'4px' }}>ⓘ 임대료 자동 지급 정책</div>
            자동 지급 대상: 월세 (VAT 설정에 따라 부가세 포함)<br/>
            자동 지급 제외: 보증금 (반복성 없음, 고액 사고 위험)<br/>
            납부 후 세금계산서·이체확인증이 자동 수집되어 통합 증빙 센터에 저장됩니다.
          </div>
        </div>
      </div>

      {/* 로그 오버레이 */}
      {screen === 'log' && selectedRow && (
        <RentLogScreen
          theme={theme}
          selectedRow={selectedRow}
          onBack={() => setScreen('list')}
          navigate={navigate}
        />
      )}

      {/* 상세 오버레이 */}
      {screen === 'detail' && selectedRow && (
        <RentDetailScreen
          theme={theme}
          row={selectedRow}
          autoOn={autoOn} setAutoOn={setAutoOn}
          payDay={payDay} setPayDay={setPayDay}
          inclMaint={inclMaint} setInclMaint={setInclMaint}
          autoEnd={autoEnd} setAutoEnd={setAutoEnd}
          saved={saved} setSaved={setSaved}
          editRent={editRent} setEditRent={setEditRent}
          editDeposit={editDeposit} setEditDeposit={setEditDeposit}
          detailVatMode={detailVatMode} setDetailVatMode={setDetailVatMode}
          orderName={orderName} setOrderName={setOrderName}
          orderPhone={orderPhone} setOrderPhone={setOrderPhone}
          orderEmail={orderEmail} setOrderEmail={setOrderEmail}
          payMethod={payMethod} setPayMethod={setPayMethod}
          selectedCard={selectedCard} setSelectedCard={setSelectedCard}
          bankName={bankName} setBankName={setBankName}
          bankAccount={bankAccount} setBankAccount={setBankAccount}
          customDayInput={customDayInput} setCustomDayInput={setCustomDayInput}
          showExitModal={showExitModal} setShowExitModal={setShowExitModal}
          handleSave={handleSave}
          handleImmediatePay={handleImmediatePay}
          onBack={() => setScreen('list')}
          navigate={navigate}
        />
      )}

      {/* 나가기 확인 모달 (리스트 화면용) */}
      {showExitModal && screen === 'list' && (
        <div onClick={() => setShowExitModal(false)} style={{
          position:'absolute', inset:0, background:'rgba(0,0,0,0.55)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:'24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'#fff', borderRadius:'16px',
            padding:'22px 20px 16px', width:'100%', maxWidth:'320px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontSize:'17px', fontWeight:700, color:'#111', marginBottom:'8px', textAlign:'center' }}>나가시겠어요?</div>
            <div style={{ fontSize:'13px', color:'#888', lineHeight:1.55, marginBottom:'18px', textAlign:'center' }}>작성 중인 내용은 저장되지 않습니다.</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowExitModal(false)} style={{ flex:1, height:'46px', background:'#F3F4F6', color:'#444', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>계속 작성</button>
              <button onClick={() => { setShowExitModal(false); navigate('/home-business') }} style={{ flex:1, height:'46px', background:'#EF4444', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PhoneShell>
  )
}
