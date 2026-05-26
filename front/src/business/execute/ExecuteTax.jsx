import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { addTransaction } from '../../shared/transactionStore'
import { ensureStepUp } from '../../components/PinModal'

const TAX_META = {
  vat:         { icon:'🧾', label:'부가가치세',    color:'#1D4ED8', bg:'#EFF6FF',  border:'#BFDBFE' },
  corporate:   { icon:'🏛️', label:'법인세',        color:'#7C3AED', bg:'#F5F3FF',  border:'#DDD6FE' },
  withholding: { icon:'💳', label:'원천징수세',    color:'#B45309', bg:'#FEF3C7',  border:'#FDE68A' },
  local:       { icon:'🗂️', label:'지방소득세',    color:'#065F46', bg:'#ECFDF5',  border:'#6EE7B7' },
  acquisition: { icon:'🏠', label:'취득세·등록세', color:'#B91C1C', bg:'#FEE2E2',  border:'#FCA5A5' },
}

const NOTICE_STATUS = {
  due_soon: { label:'납부 임박', color:'#B91C1C', bg:'#FEE2E2', border:'#FCA5A5', dot:'#EF4444' },
  upcoming: { label:'납부 예정', color:'#065F46', bg:'#D1FAE5', border:'#6EE7B7', dot:'#10B981' },
  overdue:  { label:'기한 초과', color:'#7F1D1D', bg:'#FEE2E2', border:'#DC2626', dot:'#DC2626' },
  paid:     { label:'납부 완료', color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB', dot:'#9CA3AF' },
}

const INIT_NOTICES = [
  { id:'n1', type:'withholding', period:'2026년 5월분', amount:1240000, dueDate:'2026-06-10',
    paymentNo:'2109-2026-05-1234567', office:'강남세무서', source:'홈택스',
    autoOn:true, status:'due_soon', paid:false, notifBefore:true, notifDone:true, notifFail:true },
  { id:'n2', type:'vat', period:'2026년 1기', amount:3800000, dueDate:'2026-07-25',
    paymentNo:'1101-2026-01-9876543', office:'강남세무서', source:'홈택스',
    autoOn:true, status:'upcoming', paid:false, notifBefore:true, notifDone:true, notifFail:true },
  { id:'n3', type:'local', period:'2026년 1기', amount:380000, dueDate:'2026-07-25',
    paymentNo:'4101-2026-01-1122334', office:'강남구청', source:'위택스',
    autoOn:true, status:'upcoming', paid:false, notifBefore:true, notifDone:true, notifFail:true },
  { id:'n4', type:'corporate', period:'2026년 중간예납', amount:0, dueDate:'2026-09-30',
    paymentNo:null, office:'강남세무서', source:'홈택스',
    autoOn:false, status:'upcoming', paid:false, notifBefore:true, notifDone:true, notifFail:true },
  { id:'n5', type:'withholding', period:'2026년 4월분', amount:1180000, dueDate:'2026-05-10',
    paymentNo:'2109-2026-04-7654321', office:'강남세무서', source:'홈택스',
    autoOn:true, status:'paid', paid:true, paidDate:'2026.05.10', notifBefore:true, notifDone:true, notifFail:true },
  { id:'n6', type:'vat', period:'2025년 2기', amount:2140000, dueDate:'2026-01-25',
    paymentNo:'1101-2025-02-5544332', office:'강남세무서', source:'홈택스',
    autoOn:true, status:'paid', paid:true, paidDate:'2026.01.25', notifBefore:true, notifDone:true, notifFail:true },
]

function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / (1000*60*60*24))
}
function fmtDate(iso) { return iso ? iso.replace(/-/g, '.') : '' }
function fmtPayNo(no) { return no ? no.split('-').join(' - ') : null }

function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{ width:'46px', height:'26px', borderRadius:'13px', border:'none', outline:'none',
        cursor:'pointer', background: on ? brand : COLORS.bgMuted,
        position:'relative', transition:'background 0.2s', padding:0, flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '23px' : '3px', width:'20px', height:'20px',
        borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
    </button>
  )
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
  )
}

function XBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:'32px', height:'32px', background:'none', border:'none', outline:'none',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  )
}

function SecLabel({ brand, brandDark, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:brand }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color:brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{children}</span>
    </div>
  )
}

function NoticeStatusBadge({ status }) {
  const s = NOTICE_STATUS[status] || NOTICE_STATUS.upcoming
  return (
    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'20px',
      background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{s.label}</span>
  )
}

// ─── 납부완료 목록 오버레이 컴포넌트 ─────────────────────────
function TaxPaidScreen({ theme, paidList, onBack, onOpenDetail }) {
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
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
            <BackBtn onClick={onBack} />
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>납부 완료</span>
            <XBtn onClick={() => setShowExitModal(true)} />
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', lineHeight:1.2 }}>
              {paidList.length}<span style={{ fontSize:'16px', fontWeight:600, marginLeft:'4px' }}>건</span>
            </div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginTop:'4px' }}>납부 완료된 고지서 내역</div>
          </div>
        </div>

        <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'10px' }}>
          {paidList.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:COLORS.t4, fontSize:'13px' }}>납부 완료 내역이 없습니다</div>
          ) : paidList.map(n => {
            const m = TAX_META[n.type] || {}
            return (
              <div key={n.id} onClick={() => onOpenDetail(n, 'paid')}
                style={{ background:'#fff', borderRadius:'14px', padding:'14px 16px',
                  boxShadow:SHADOWS.card, cursor:'pointer', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'#F3F4F6',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                  {m.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t2 }}>{m.label}</span>
                    <NoticeStatusBadge status="paid" />
                  </div>
                  <div style={{ fontSize:'11px', color:COLORS.t3 }}>{n.period} · {n.office}</div>
                  <div style={{ fontSize:'11px', color:COLORS.t3, marginTop:'2px' }}>납부일 {n.paidDate}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:800, color:COLORS.t2 }}>{fmt(n.amount)}원</div>
                  <div style={{ fontSize:'10px', color:COLORS.t4, marginTop:'4px' }}>{n.source}</div>
                </div>
              </div>
            )
          })}
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

// ─── 상세 화면 오버레이 컴포넌트 ─────────────────────────────
function TaxDetailScreen({
  theme, sel, prevScreen,
  detailAutoOn, setDetailAutoOn,
  saved, handleSave,
  onBack,
}) {
  const [visible, setVisible] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const m = TAX_META[sel.type] || {}
  const days = daysUntil(sel.dueDate)

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:prevScreen === 'paid' ? 20 : 10,
      display:'flex', flexDirection:'column',
      background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
    }}>
      <div style={{ flex:1, overflowY:'auto', background:COLORS.bg }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            <BackBtn onClick={onBack} />
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {m.icon} {m.label}
            </span>
            <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px',
              background:'rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.9)',
              border:'1px solid rgba(255,255,255,0.28)', flexShrink:0 }}>
              {sel.source}
            </span>
            <XBtn onClick={() => setShowExitModal(true)} />
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'4px' }}>{sel.period}</div>
            {sel.amount > 0
              ? <div style={{ fontSize:'30px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', lineHeight:1.2 }}>
                  {fmt(sel.amount)}<span style={{ fontSize:'16px', fontWeight:600, marginLeft:'3px' }}>원</span>
                </div>
              : <div style={{ fontSize:'18px', fontWeight:700, color:'rgba(255,255,255,0.55)' }}>고지 예정</div>
            }
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px' }}>
              <NoticeStatusBadge status={sel.status} />
              {sel.paid && sel.paidDate
                ? <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)' }}>납부일 {sel.paidDate}</span>
                : days !== null
                  ? <span style={{ fontSize:'11px', color: days <= 3 ? '#FCA5A5' : 'rgba(255,255,255,0.55)' }}>
                      납부기한 {fmtDate(sel.dueDate)} ({days > 0 ? 'D-'+days : days === 0 ? 'D-Day' : '기한초과'})
                    </span>
                  : null
              }
            </div>
          </div>
        </div>

        <div style={{ padding:'20px 16px 32px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'16px 18px', boxShadow:SHADOWS.card }}>
            <SecLabel brand={theme.brand} brandDark={theme.brandDark}>고지서 정보</SecLabel>
            {[
              { label:'세금 종류', value: (m.icon||'') + ' ' + (m.label||'—') },
              { label:'과세 기간', value: sel.period },
              { label:'납부 기관', value: sel.office },
              { label:'수집 출처', value: sel.source },
              { label:'납부번호',  value: sel.paymentNo ? fmtPayNo(sel.paymentNo) : '고지 전' },
              { label:'납부기한',  value: fmtDate(sel.dueDate) },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'10px' }}>
                <span style={{ fontSize:'12px', color:COLORS.t3, flexShrink:0 }}>{row.label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, textAlign:'right', wordBreak:'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>
          {!sel.paid && (
            <div style={{ background:'#fff', borderRadius:'16px', padding:'16px 18px', boxShadow:SHADOWS.card }}>
              <SecLabel brand={theme.brand} brandDark={theme.brandDark}>자동 납부 설정</SecLabel>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:600, color:COLORS.t1 }}>자동 납부</div>
                  <div style={{ fontSize:'12px', color:COLORS.t3, marginTop:'2px' }}>납부기한 당일 자동으로 납부합니다</div>
                </div>
                <Toggle on={detailAutoOn} onChange={() => setDetailAutoOn(v => !v)} brand={theme.brand} />
              </div>
              {!sel.paymentNo && (
                <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:'10px', padding:'10px 12px', marginTop:'8px' }}>
                  <div style={{ fontSize:'11px', color:'#B45309', fontWeight:600 }}>⚠ 납부번호 미수집</div>
                  <div style={{ fontSize:'11px', color:'#92400E', marginTop:'3px' }}>고지서 발행 시 쿠콘이 자동 수집합니다</div>
                </div>
              )}
            </div>
          )}
          {/* ── 승인 및 통제 */}
          <div style={{ marginTop:'8px', padding:'11px 14px', background: COLORS.infoBg, borderRadius: RADIUS.md, fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
            <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
          </div>
        </div>
      </div>

      {/* 고정 하단 저장 버튼 */}
      {!sel.paid && (
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
          <button onClick={handleSave}
            style={{ width:'100%', padding:'15px', background: saved ? '#10B981' : theme.activeBtnGrad || theme.brand,
              color:'#fff', border:'none', outline:'none', borderRadius:'14px',
              fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              transition:'background 0.3s', boxShadow: saved ? 'none' : theme.activeShadow }}>
            {saved ? '✓ 저장되었습니다' : '설정 저장'}
          </button>
        </div>
      )}

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

// ─── 메인 컴포넌트 ─────────────────────────────────────────────
export default function ExecuteTax() {
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

  const [notices, setNotices]           = useState(INIT_NOTICES)
  const [screen, setScreen]             = useState('list')
  const [sel, setSel]                   = useState(null)
  const [prevScreen, setPrevScreen]     = useState('list')
  const [detailAutoOn, setDetailAutoOn] = useState(true)
  const [saved, setSaved]               = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  const handleBack = () => {
    if (screen === 'detail') setScreen(prevScreen)
    else setScreen('list')
  }
  useStepHistory(handleBack, screen === 'list')

  const pending      = notices.filter(n => !n.paid).sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate))
  const paidList     = notices.filter(n =>  n.paid).sort((a,b) => new Date(b.dueDate)-new Date(a.dueDate))
  const totalPending = pending.reduce((s,n) => s + (n.amount||0), 0)
  const autoCount    = pending.filter(n => n.autoOn).length
  const nextDays     = pending.map(n => daysUntil(n.dueDate)).filter(d => d !== null)
  const minDays      = nextDays.length > 0 ? Math.min(...nextDays) : null

  function openDetail(n, from) {
    setSel(n)
    setDetailAutoOn(n.autoOn)
    setSaved(false)
    setPrevScreen(from || 'list')
    setScreen('detail')
  }

  async function handleSave() {
    if (sel && sel.amount > 0) {
      try { await ensureStepUp() } catch { return }
    }
    setNotices(prev => prev.map(n => n.id === sel.id
      ? { ...n, autoOn:detailAutoOn }
      : n
    ))
    if (sel && sel.amount > 0) {
      addTransaction({
        type: 'tax',
        fromUserId: 'biz_juda',
        fromUserName: '㈜주다컴퍼니',
        fromUserType: 'business',
        recipient: { id: null, name: sel.office || sel.source || '세무서', phone: '', verified: true, isBusiness: true },
        amount: sel.amount,
        reason: `${sel.source || ''} ${sel.period || ''}`.trim(),
        walletId: 'my', walletLabel: 'MY 지갑',
        payDateMode: 'immediate', status: 'completed',
      })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  // ═══════════════════════════════════════════════════════════
  // ── 리스트 화면 (항상 렌더) + 오버레이 ───────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
          {/* 헤더 */}
          <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
              <BackBtn onClick={() => navigate(-1)} />
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1 }}>세금 관리</span>
              {paidList.length > 0 && (
                <button onClick={() => { if (!sel) { const t = paidList[0]; if (t) setSel(t); } setScreen('paid') }}
                  style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)',
                    background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)',
                    padding:'4px 10px', borderRadius:'20px', cursor:'pointer',
                    fontFamily:'inherit', outline:'none', flexShrink:0 }}>
                  납부완료 {paidList.length}건
                </button>
              )}
              <XBtn onClick={() => setShowExitModal(true)} />
            </div>
            <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)',
              border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
              {pending.length > 0 ? (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                    <div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginBottom:'4px' }}>미납 합계</div>
                      <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>
                        {fmt(totalPending)}<span style={{ fontSize:'13px', marginLeft:'2px' }}>원</span>
                      </div>
                    </div>
                    {minDays !== null && (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginBottom:'4px' }}>최근 납부기한</div>
                        <div style={{ fontSize:'16px', fontWeight:800, color: minDays <= 7 ? '#FCA5A5' : '#fff' }}>D-{minDays}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:'20px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                    {[
                      { label:'고지서',     value: pending.length+'건' },
                      { label:'자동납부 ON', value: autoCount+'건' },
                      { label:'납부 임박',   value: pending.filter(n=>n.status==='due_soon').length+'건',
                        red: pending.filter(n=>n.status==='due_soon').length > 0 },
                    ].map(col => (
                      <div key={col.label}>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>{col.label}</div>
                        <div style={{ fontSize:'13px', fontWeight:700, color: col.red ? '#FCA5A5' : 'rgba(255,255,255,0.85)' }}>{col.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:'8px 0' }}>
                  <div style={{ fontSize:'22px', fontWeight:800, color:'rgba(255,255,255,0.35)' }}>—</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'4px' }}>납부 예정 세금 없음</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ margin:'16px 16px 0', padding:'10px 14px', background:'#EFF6FF',
            border:'1px solid #BFDBFE', borderRadius:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#3B82F6', flexShrink:0 }}/>
            <span style={{ fontSize:'11px', color:'#1D4ED8', fontWeight:500, lineHeight:1.5 }}>
              쿠콘 홈택스·위택스 연동 — 고지서 자동 수집 중
            </span>
          </div>

          <div style={{ padding:'16px 16px 8px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'10px' }}>
              납부 예정 ({pending.length}건)
            </div>
            {pending.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:COLORS.t4, fontSize:'13px' }}>납부 예정 세금이 없습니다</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {pending.map(n => {
                  const m = TAX_META[n.type] || {}
                  const d = daysUntil(n.dueDate)
                  return (
                    <div key={n.id} onClick={() => openDetail(n, 'list')}
                      style={{ background:'#fff', borderRadius:'14px', padding:'14px 16px',
                        boxShadow:SHADOWS.card, cursor:'pointer', display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:m.bg,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                        {m.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{m.label}</span>
                          <NoticeStatusBadge status={n.status} />
                        </div>
                        <div style={{ fontSize:'11px', color:COLORS.t3 }}>{n.period} · {n.office}</div>
                        <div style={{ fontSize:'11px', color:COLORS.t3, marginTop:'2px' }}>
                          납부기한 {fmtDate(n.dueDate)}{d !== null ? ' (D-'+d+')' : ''}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'14px', fontWeight:800, color:COLORS.t1 }}>
                          {n.amount > 0 ? fmt(n.amount)+'원' : '고지 예정'}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end', marginTop:'4px' }}>
                          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: n.autoOn ? theme.brand : COLORS.bgMuted }}/>
                          <span style={{ fontSize:'10px', color: n.autoOn ? theme.brandDark : COLORS.t4, fontWeight:600 }}>
                            {n.autoOn ? '자동' : '수동'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ height:32 }}/>
        </div>

        {/* Overlays */}
        {screen === 'paid' && (
          <TaxPaidScreen
            theme={theme}
            paidList={paidList}
            onBack={() => setScreen('list')}
            onOpenDetail={openDetail}
          />
        )}

        {screen === 'detail' && sel && (
          <TaxDetailScreen
            theme={theme}
            sel={sel}
            prevScreen={prevScreen}
            detailAutoOn={detailAutoOn}
            setDetailAutoOn={setDetailAutoOn}
            saved={saved}
            handleSave={handleSave}
            onBack={() => setScreen(prevScreen)}
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
