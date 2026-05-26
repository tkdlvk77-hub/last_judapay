import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStepHistory } from '../../hooks/useStepHistory'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { addTransaction } from '../../shared/transactionStore'
import { session } from '../../services/api'
import { dialog } from '../../components/Dialog'
import { ensureStepUp } from '../../components/PinModal'

// ─── 기관 메타 ─────────────────────────────────────────────
const AGENCY_META = {
  nhis:   { label:'건강보험공단', icon:'🏥', color:'#065F46', bg:'#D1FAE5', border:'#6EE7B7' },
  nps:    { label:'국민연금공단', icon:'🏛️', color:'#1D4ED8', bg:'#DBEAFE', border:'#93C5FD' },
  comwel: { label:'근로복지공단', icon:'⛑️', color:'#B45309', bg:'#FEF3C7', border:'#FCD34D' },
}

// ─── 보험 종류 메타 ────────────────────────────────────────
const INS_META = {
  health:   { label:'건강보험',     icon:'🏥', color:'#065F46', bg:'#D1FAE5', border:'#6EE7B7', agency:'nhis' },
  longterm: { label:'장기요양보험', icon:'♿', color:'#047857', bg:'#ECFDF5', border:'#A7F3D0', agency:'nhis' },
  national: { label:'국민연금',     icon:'🏛️', color:'#1D4ED8', bg:'#DBEAFE', border:'#93C5FD', agency:'nps' },
  employ:   { label:'고용보험',     icon:'💼', color:'#6D28D9', bg:'#EDE9FE', border:'#C4B5FD', agency:'comwel' },
  indust:   { label:'산재보험',     icon:'⛑️', color:'#B45309', bg:'#FEF3C7', border:'#FCD34D', agency:'comwel' },
}

// ─── 고지서 상태 ───────────────────────────────────────────
const NOTICE_STATUS = {
  due_soon: { label:'납부 임박', color:'#B91C1C', bg:'#FEE2E2', border:'#FCA5A5', dot:'#EF4444' },
  upcoming: { label:'납부 예정', color:'#065F46', bg:'#D1FAE5', border:'#6EE7B7', dot:'#10B981' },
  overdue:  { label:'기한 초과', color:'#7F1D1D', bg:'#FEE2E2', border:'#DC2626', dot:'#DC2626' },
  paid:     { label:'납부 완료', color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB', dot:'#9CA3AF' },
}

// ─── 데모 고지서 (실제: 쿠콘 스크래핑 자동 수집) ─────────
const INIT_NOTICES = [
  {
    id:'i1', type:'health', period:'2026년 5월분',
    coAmount:182300, empAmount:182300,
    dueDate:'2026-06-10', paymentNo:'B2026051000123',
    agency:'nhis', source:'건강보험공단',
    autoOn:true, status:'due_soon', paid:false,
    notifBefore:true, notifDone:true, notifFail:true,
  },
  {
    id:'i2', type:'longterm', period:'2026년 5월분',
    coAmount:23600, empAmount:23600,
    dueDate:'2026-06-10', paymentNo:'B2026051000124',
    agency:'nhis', source:'건강보험공단',
    autoOn:true, status:'due_soon', paid:false,
    notifBefore:true, notifDone:true, notifFail:true,
  },
  {
    id:'i3', type:'national', period:'2026년 5월분',
    coAmount:144000, empAmount:144000,
    dueDate:'2026-06-10', paymentNo:'N2026051098765',
    agency:'nps', source:'국민연금공단',
    autoOn:true, status:'due_soon', paid:false,
    notifBefore:true, notifDone:true, notifFail:false,
  },
  {
    id:'i4', type:'employ', period:'2026년 5월분',
    coAmount:22500, empAmount:13500,
    dueDate:'2026-06-15', paymentNo:'W2026051055432',
    agency:'comwel', source:'근로복지공단',
    autoOn:true, status:'upcoming', paid:false,
    notifBefore:true, notifDone:true, notifFail:true,
  },
  {
    id:'i5', type:'indust', period:'2026년 5월분',
    coAmount:40500, empAmount:0,
    dueDate:'2026-06-15', paymentNo:'W2026051055433',
    agency:'comwel', source:'근로복지공단',
    autoOn:true, status:'upcoming', paid:false,
    notifBefore:false, notifDone:true, notifFail:true,
  },
  // 납부 완료
  {
    id:'i6', type:'health', period:'2026년 4월분',
    coAmount:182300, empAmount:182300,
    dueDate:'2026-05-12', paymentNo:'B2026041000089',
    agency:'nhis', source:'건강보험공단',
    autoOn:true, status:'paid', paid:true, paidDate:'2026-05-12',
    notifBefore:true, notifDone:true, notifFail:true,
  },
  {
    id:'i7', type:'national', period:'2026년 4월분',
    coAmount:144000, empAmount:144000,
    dueDate:'2026-05-12', paymentNo:'N2026041098701',
    agency:'nps', source:'국민연금공단',
    autoOn:true, status:'paid', paid:true, paidDate:'2026-05-12',
    notifBefore:true, notifDone:true, notifFail:false,
  },
]

const DEMO_EMPLOYEES = [
  { id:'e1', name:'김지수', salary:3200000 },
  { id:'e2', name:'박성민', salary:2500000 },
  { id:'e3', name:'이유진', salary:2800000 },
]

function fmt(n) { return Number(Math.floor(n || 0)).toLocaleString('ko-KR') }

// ─── UI 부품 ───────────────────────────────────────────────
function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width:'40px', height:'22px', borderRadius:'11px', border:'none',
      cursor:'pointer', background: on ? (brand || '#059669') : COLORS.bgMuted,
      position:'relative', transition:'background 0.2s', flexShrink:0,
    }}>
      <div style={{
        position:'absolute', top:'3px', left: on ? '21px' : '3px',
        width:'16px', height:'16px', borderRadius:'50%', background:'#fff',
        transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
      }}/>
    </button>
  )
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width:'32px', height:'32px', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
  )
}

function XBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width:'32px', height:'32px', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  )
}

function NoticeStatusBadge({ status }) {
  const s = NOTICE_STATUS[status] || NOTICE_STATUS.upcoming
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px', background: s.bg, border:`1px solid ${s.border}`, borderRadius:'20px', padding:'3px 8px', flexShrink:0 }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background: s.dot }}/>
      <span style={{ fontSize:'10px', fontWeight:700, color: s.color }}>{s.label}</span>
    </div>
  )
}

// ─── 상세 화면 컴포넌트 ───────────────────────────────────
function InsDetailScreen({ selected, theme, onBack, onClose, onUpdateNotice }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const meta        = INS_META[selected.type]
  const agency      = AGENCY_META[selected.agency]
  const totalAmount = selected.coAmount + selected.empAmount

  return (
    <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', flexDirection:'column', background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' : 'none',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)' }}>

        {/* 헤더 */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            <BackBtn onClick={onBack} />
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meta.label}</span>
            <NoticeStatusBadge status={selected.status} />
            <XBtn onClick={onClose} />
          </div>
          <div style={{ margin:'0 16px 16px', padding:'14px 16px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginBottom:'4px' }}>{selected.period} · {agency.label}</div>
            <div style={{ fontSize:'26px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.15, marginBottom:'10px' }}>
              {fmt(totalAmount)}<span style={{ fontSize:'14px', fontWeight:500, opacity:0.7 }}>원</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>회사 부담</span>
                <span style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{fmt(selected.coAmount)}원</span>
              </div>
              {selected.empAmount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>직원 공제</span>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{fmt(selected.empAmount)}원</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>납부 기한</span>
                <span style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{selected.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'12px' }}>

            {/* 납부 정보 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, overflow:'hidden', boxShadow: SHADOWS.card }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'12px' }}>납부 정보</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
                  {[
                    ['수집 출처', selected.source],
                    ['부과 기간', selected.period],
                    ['납부 기한', selected.dueDate],
                    ...(selected.paid ? [['납부 완료일', selected.paidDate]] : []),
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'12px', color: COLORS.t3, flexShrink:0 }}>{k}</span>
                      <span style={{ fontSize:'12px', fontWeight:600, color: k === '납부 완료일' ? '#059669' : COLORS.t1, textAlign:'right' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px', paddingTop:'6px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                    <span style={{ fontSize:'11px', color: COLORS.t4 }}>납부 번호</span>
                    <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1, fontFamily:'monospace', letterSpacing:'0.5px', wordBreak:'break-all' }}>{selected.paymentNo}</span>
                  </div>
                </div>
              </div>
              {selected.empAmount > 0 && (
                <div style={{ padding:'11px 16px', background:'#F0FDF4' }}>
                  <div style={{ fontSize:'11px', color:'#166534', lineHeight:1.6 }}>
                    ✅ 회사 부담 {fmt(selected.coAmount)}원 + 직원 공제 {fmt(selected.empAmount)}원 자동 분리
                  </div>
                </div>
              )}
            </div>

            {/* 직원별 산출 참고 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, overflow:'hidden', boxShadow: SHADOWS.card }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'10px' }}>직원별 산출 참고</div>
                {DEMO_EMPLOYEES.map((emp, i) => {
                  const totalSalary = DEMO_EMPLOYEES.reduce((s, e) => s + e.salary, 0)
                  const ratio = emp.salary / totalSalary
                  const empCo  = selected.coAmount  > 0 ? Math.round(selected.coAmount  * ratio) : 0
                  const empDed = selected.empAmount > 0 ? Math.round(selected.empAmount * ratio) : 0
                  return (
                    <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderTop: i > 0 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                      <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: COLORS.bgMuted, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color: COLORS.t3, flexShrink:0 }}>
                        {emp.name[0]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
                        <div style={{ fontSize:'10px', color: COLORS.t4 }}>{fmt(emp.salary)}원</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1 }}>회사 ≈ {fmt(empCo)}원</div>
                        {empDed > 0 && <div style={{ fontSize:'10px', color: COLORS.t4 }}>공제 ≈ {fmt(empDed)}원</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding:'10px 14px', background:'#FFF7ED' }}>
                <div style={{ fontSize:'10px', color:'#92400E', lineHeight:1.6 }}>
                  ⚠️ 산출 참고용입니다. 실제 납부 금액은 {selected.source} 고지서 기준입니다.
                </div>
              </div>
            </div>

            {/* 자동납부 설정 */}
            {!selected.paid && (
              <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, overflow:'hidden', boxShadow: SHADOWS.card }}>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>자동 납부</div>
                      <div style={{ fontSize:'11px', color: COLORS.t3, marginTop:'2px' }}>납부 기한 당일 자동 처리</div>
                    </div>
                    <Toggle on={selected.autoOn} onChange={v => onUpdateNotice(selected.id, { autoOn: v })} brand={theme.brand} />
                  </div>
                </div>
              </div>
            )}

            {/* 승인 안내 */}
            <div style={{ padding:'11px 14px', background: COLORS.infoBg, borderRadius: RADIUS.md, fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
              <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
            </div>

            {/* 지금 납부하기 — addTransaction 으로 즉시 집행 */}
            {!selected.paid && (
              <button
                onClick={async () => {
                  try { await ensureStepUp() } catch { return }
                  const me = session.user
                  try {
                    addTransaction({
                      type: 'insurance4',
                      fromUserId:   me?.userId,
                      fromUserName: me?.name || '',
                      fromUserType: 'business',
                      recipient: {
                        userId:     null,
                        phone:      null,
                        name:       agency.label,           // 건강보험공단/국민연금공단/근로복지공단
                        verified:   true,
                        isBusiness: true,
                      },
                      amount:      totalAmount,
                      whtAmount:   0,
                      netAmount:   totalAmount,
                      reason:      `${meta.label} ${selected.period}`,
                      walletId:    'my',
                      walletLabel: 'MY 지갑',
                      payDateMode: 'immediate',
                      dealTitle:   `${meta.label} 납부`,
                      dealDescription: `${agency.label} · ${selected.paymentNo || ''}`,
                      dealStatus:  'completed',
                      statusLabel: '지급 완료',
                    })
                    // 로컬도 paid 마킹
                    onUpdateNotice(selected.id, {
                      paid: true,
                      status: 'paid',
                      paidDate: new Date().toISOString().slice(0, 10),
                    })
                    await dialog.alert({
                      title: '납부 요청 완료',
                      message: `${meta.label} ${fmt(totalAmount)}원 납부를 요청했습니다.`,
                      okText: '확인',
                    })
                    onBack && onBack()
                  } catch (e) {
                    console.warn('[ExecuteInsurance4] pay failed', e)
                    await dialog.alert({ title: '납부 실패', message: e?.message || '오류가 발생했습니다.' })
                  }
                }}
                style={{
                  width:'100%', height:'52px',
                  background: `linear-gradient(135deg, ${theme.brand}, ${theme.brandDark})`,
                  color:'#fff', border:'none', borderRadius: RADIUS.md,
                  fontSize:'15px', fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                  boxShadow: `0 4px 14px ${theme.brand}40`,
                }}
              >
                지금 납부하기 · {fmt(totalAmount)}원
              </button>
            )}
          </div>
        </div>
    </div>
  )
}

// ─── 납부완료 목록 화면 컴포넌트 ──────────────────────────
function InsPaidScreen({ paidList, theme, onBack, onClose, onSelect }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  return (
    <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', flexDirection:'column', background: COLORS.bg,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: visible ? 'transform 0.32s cubic-bezier(0.32,0.72,0,1)' : 'none' }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px' }}>
            <BackBtn onClick={onBack} />
            <span style={{ flex:1, fontSize:'15px', fontWeight:600, color:'#fff' }}>납부 완료</span>
            <XBtn onClick={onClose} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {paidList.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color: COLORS.t4, fontSize:'13px' }}>납부 완료 내역이 없습니다</div>
            ) : paidList.map(notice => {
              const m  = INS_META[notice.type]
              const ag = AGENCY_META[notice.agency]
              const total = notice.coAmount + notice.empAmount
              return (
                <button key={notice.id} onClick={() => onSelect(notice.id)}
                  style={{ width:'100%', background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'14px 16px', boxShadow: SHADOWS.card, border:`1px solid ${COLORS.border}`, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>{m.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t2, marginBottom:'2px' }}>{m.label}</div>
                    <div style={{ fontSize:'11px', color: COLORS.t3 }}>{notice.period} · {ag.label}</div>
                    <div style={{ fontSize:'10px', color:'#059669', marginTop:'2px', fontWeight:600 }}>✓ {notice.paidDate} 납부</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t2 }}>{fmt(total)}원</div>
                    <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'2px' }}>회사 {fmt(notice.coAmount)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export default function ExecuteInsurance4() {
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


  const [notices, setNotices] = useState(INIT_NOTICES)
  const [screen, setScreen] = useState('list')   // 'list' | 'paid' | 'detail'
  const [selectedId, setSelectedId] = useState(null)
  const [showEmployees, setShowEmployees] = useState(false)

  const pending  = notices.filter(n => !n.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  const paidList = notices.filter(n => n.paid).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
  const selected = notices.find(n => n.id === selectedId)

  const totalCo  = pending.reduce((s, n) => s + n.coAmount, 0)
  const totalEmp = pending.reduce((s, n) => s + n.empAmount, 0)
  const autoCount = pending.filter(n => n.autoOn).length

  const updateNotice = (id, patch) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n))
  }

  const goToDetail = (id) => { setSelectedId(id); setScreen('detail') }

  // ── 스와이프 백 처리 ───────────────────────────────────────
  const goBack = () => {
    if (screen === 'list')   navigate(-1)
    else if (screen === 'detail') setScreen(selected?.paid ? 'paid' : 'list')
    else setScreen('list') // paid → list
  }
  useStepHistory(goBack, screen === 'list')

  // ── 목록 + 오버레이 화면 ──────────────────────────────────
  const agencyGroups = Object.entries(AGENCY_META).map(([agencyKey, agency]) => ({
    agencyKey, agency,
    items: pending.filter(n => n.agency === agencyKey),
  })).filter(g => g.items.length > 0)

  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg, position:'relative' }}>
        {/* 헤더 */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <BackBtn onClick={() => navigate(-1)} />
            <span style={{ flex:1, fontSize:'15px', fontWeight:600, color:'#fff' }}>4대보험</span>
            {paidList.length > 0 && (
              <button
                onClick={() => setScreen('paid')}
                style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}
              >
                납부완료 {paidList.length}
              </button>
            )}
            <XBtn onClick={() => navigate(-1)} />
          </div>
          <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginBottom:'4px' }}>이번 달 예정 납부 합계</div>
            <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
              {fmt(totalCo + totalEmp)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
            </div>
            <div style={{ display:'flex', gap:'16px', marginTop:'12px' }}>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{fmt(totalCo)}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>회사 부담</div>
              </div>
              <div style={{ width:'1px', background:'rgba(255,255,255,0.15)' }}/>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{fmt(totalEmp)}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>직원 공제</div>
              </div>
              <div style={{ width:'1px', background:'rgba(255,255,255,0.15)' }}/>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{autoCount}/{pending.length}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>자동납부</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'16px 16px 32px' }}>
          {/* 쿠콘 연동 상태 */}
          <div style={{ background:'#F0FDF4', border:'1px solid #6EE7B7', borderRadius: RADIUS.lg, padding:'12px 16px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:'#D1FAE5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>🔐</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#065F46' }}>공동인증서 연동 완료</div>
              <div style={{ fontSize:'11px', color:'#166534', marginTop:'2px' }}>건강보험공단 · 국민연금공단 · 근로복지공단 자동 수집 중</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink:0 }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10B981' }}/>
              <span style={{ fontSize:'10px', color:'#059669', fontWeight:600 }}>자동 수집 중</span>
            </div>
          </div>

          {/* 납부 예정 — 기관별 */}
          {agencyGroups.length > 0 ? (
            <>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'10px' }}>납부 예정 · {pending.length}건</div>
              {agencyGroups.map(({ agencyKey, agency, items }) => (
                <div key={agencyKey} style={{ marginBottom:'14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px', paddingLeft:'2px' }}>
                    <div style={{ width:'20px', height:'20px', borderRadius:'6px', background: agency.bg, border:`1px solid ${agency.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px' }}>
                      {agency.icon}
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:700, color: agency.color }}>{agency.label}</span>
                    <span style={{ fontSize:'10px', color: COLORS.t4 }}>· {fmt(items.reduce((s, n) => s + n.coAmount + n.empAmount, 0))}원</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {items.map(notice => {
                      const m = INS_META[notice.type]
                      const total = notice.coAmount + notice.empAmount
                      return (
                        <button
                          key={notice.id}
                          onClick={() => goToDetail(notice.id)}
                          style={{ width:'100%', background: COLORS.bgCard, borderRadius: RADIUS.md, padding:'13px 14px', boxShadow: SHADOWS.card, border:`1px solid ${COLORS.border}`, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:'10px' }}
                        >
                          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: m.bg, border:`1px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>
                            {m.icon}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', flexWrap:'wrap' }}>
                              <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{m.label}</span>
                              <NoticeStatusBadge status={notice.status} />
                            </div>
                            <div style={{ fontSize:'10px', color: COLORS.t4 }}>{notice.period} · 기한 {notice.dueDate}</div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{fmt(total)}원</div>
                            <div style={{ fontSize:'10px', color: notice.autoOn ? '#059669' : COLORS.t4, fontWeight: notice.autoOn ? 600 : 400 }}>
                              {notice.autoOn ? '자동납부' : '수동납부'}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'24px', textAlign:'center', boxShadow: SHADOWS.card, marginBottom:'14px' }}>
              <div style={{ fontSize:'24px', marginBottom:'8px' }}>✅</div>
              <div style={{ fontSize:'14px', fontWeight:600, color: COLORS.t1 }}>이번 달 납부 예정 고지서가 없습니다</div>
            </div>
          )}

          {/* 직원 목록 토글 */}
          <button
            onClick={() => setShowEmployees(!showEmployees)}
            style={{ width:'100%', padding:'12px 14px', background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow: SHADOWS.card }}
          >
            <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1 }}>👥 등록 직원 ({DEMO_EMPLOYEES.length}명)</span>
            <span style={{ fontSize:'11px', color: COLORS.t4 }}>{showEmployees ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>
          {showEmployees && (
            <div style={{ background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderTop:'none', borderRadius:`0 0 ${RADIUS.lg} ${RADIUS.lg}`, padding:'0 16px', marginBottom:'12px' }}>
              {DEMO_EMPLOYEES.map((emp, i) => (
                <div key={emp.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderTop: i > 0 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{emp.name}</span>
                  <span style={{ fontSize:'12px', color: COLORS.t2 }}>{fmt(emp.salary)}원</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop:'12px', padding:'11px 14px', background:'#EFF6FF', borderRadius: RADIUS.md, fontSize:'11px', color:'#1E40AF', lineHeight:1.7 }}>
            🏛️ 고지서 기준으로 납부하며, 납부 완료 후 납부확인서가 자동 저장됩니다.
          </div>
        </div>
      </div>

      {/* ── 오버레이 화면들 (리스트 위에 덮기) ── */}
      {screen === 'paid' && (
        <InsPaidScreen
          paidList={paidList} theme={theme}
          onBack={() => setScreen('list')}
          onClose={() => navigate(-1)}
          onSelect={(id) => { setSelectedId(id); setScreen('detail') }}
        />
      )}
      {screen === 'detail' && selected && (
        <InsDetailScreen
          selected={selected} theme={theme}
          onBack={() => setScreen(selected.paid ? 'paid' : 'list')}
          onClose={() => navigate(-1)}
          onUpdateNotice={updateNotice}
        />
      )}
    </PhoneShell>
  )
}
