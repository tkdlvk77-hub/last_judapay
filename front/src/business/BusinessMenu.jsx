import { useNavigate } from 'react-router-dom'
import { getAccountTheme } from '../design/accountTokens'
import { COLORS } from '../design/tokens'
import { useT } from '../design/i18n'
import BottomTab from '../components/BottomTab'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useNoSwipeBack } from '../hooks/useNoSwipeBack'
import { dialog } from '../components/Dialog'

// ─────────────────────────────────────
// 데모 데이터
// ─────────────────────────────────────
const COMPANY = {
  name: '㈜주다컴퍼니',
  monthLabel: '2026년 5월',
}

// 한도 임박 경고
const LIMIT_WARNING = {
  expected: 380000,
  limit: 400000,
  dueDate: '5.15',
}

// 지급 예정 (이 합계가 "월말까지 추가"가 됨)
const SCHEDULED = [
  { id:'s1', icon:'💼', iconBg:'#E6F5EF', date:'5.25', daysLater:20, amount:15400000, status:'auto', statusColor:'#085041', kind:'salary' },
  { id:'s2', icon:'🏢', iconBg:'#EDF3FA', date:'5.10', daysLater:5,  amount:5800000,  status:'auto', statusColor:'#085041', kind:'rent' },
  { id:'s3', icon:'💻', iconBg:'#F5F3FF', date:'5.15', daysLater:8,  amount:693200,   status:'approval', statusColor:'#1D4ED8', kind:'subscription' },
]

// kind → 상세 화면 라우트 매핑
const KIND_ROUTE = {
  salary:       '/execute/business/operations/salary',
  rent:         '/execute/business/operations/rent',
  rentlease:    '/execute/business/operations/rent-lease',
  subscription: '/execute/business/operations/subscription',
  telecom:      '/execute/business/operations/telecom',
  utility:      '/execute/business/operations/utility',
  insurance:    '/execute/business/operations/insurance',
  tax:          '/execute/business/operations/tax',
  misc:         '/execute/business/operations/misc',
}

// 이번 달 누계
const SPENT_SO_FAR = 32400000
const PREV_DIFF_PCT = 8

// 카드 현황
const CARDS = [
  { id: 'c1', name: '주 카드 (운영비)',    used: 3200000, limit: 5000000, color: '#0EA5E9' },
  { id: 'c2', name: '법인카드 B (마케팅)', used: 1850000, limit: 3000000, color: '#6366F1' },
  { id: 'c3', name: '임직원 카드 (복지)',  used: 420000,  limit: 1000000, color: '#10B981' },
]

// 통계 3단
const EMPLOYEE_COUNT = 12
const AUTO_PAYMENT_COUNT = 12
const CARD_COUNT = 3

// 카테고리별 지출
const CATEGORIES_DATA = [
  { id:'salary',  amount:16200000, pct:50, color:'#2A7D5E' },
  { id:'mktg',    amount: 7128000, pct:22, color:'#C8821A' },
  { id:'ops',     amount: 5832000, pct:18, color:'#7B4DC0' },
  { id:'etc',     amount: 3240000, pct:10, color:'#9B9990' },
]

// ─────────────────────────────────────
// 유틸
// ─────────────────────────────────────
function getDayProgress() {
  const now = new Date()
  const current = now.getDate()
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dateStr = `${now.getMonth() + 1}.${current}`
  return { current, total, dateStr }
}

function fmt(n) {
  return n.toLocaleString()
}

// 간단한 템플릿 치환
function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

export default function BusinessMenu() {
  useNoSwipeBack()
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const todo = (label) => () => dialog.alert({ title: label, message: '개발 예정 기능입니다.' })

  // 월말까지 추가 = SCHEDULED 합계
  const toGoTotal = SCHEDULED.reduce((sum, s) => sum + s.amount, 0)
  const expectedTotal = SPENT_SO_FAR + toGoTotal
  const { current: dayCurrent, total: dayTotal, dateStr } = getDayProgress()

  // 카테고리 라벨 매핑
  const CATEGORIES = CATEGORIES_DATA.map(c => ({
    ...c,
    label: t(`businessMenu.cat.${c.id}`),
  }))

  // 통계 3단
  const STATS = [
    {
      id: 'employees',
      value: String(EMPLOYEE_COUNT),
      unit: t('businessMenu.employeesUnit'),
      label: t('businessMenu.employees'),
      subAction: t('businessMenu.payrollSetting'),
      route: '/execute/business/operations/salary',
    },
    {
      id: 'autopayments',
      value: String(AUTO_PAYMENT_COUNT),
      unit: t('businessMenu.autoPaymentsUnit'),
      label: t('businessMenu.autoPayments'),
      subAction: t('businessMenu.opsExpense'),
      route: '/execute/business/operations/auto-pay-all',
    },
    {
      id: 'cards',
      value: String(CARD_COUNT),
      unit: t('businessMenu.cardsUnit'),
      label: t('businessMenu.cards'),
      subAction: t('businessMenu.cardManagement'),
      route: '/card-payment',
    },
  ]

  // 지급 예정 라벨/서브 라벨
  const scheduledItems = SCHEDULED.map(s => {
    const label = t(`businessMenu.sched.${s.kind}`)
    let sub = ''
    if (s.kind === 'salary') {
      sub = fill(t('businessMenu.sched.salarySub'), { date: s.date, days: s.daysLater })
    } else if (s.kind === 'rent') {
      sub = fill(t('businessMenu.sched.rentSub'), { date: s.date, days: s.daysLater })
    } else if (s.kind === 'subscription') {
      sub = fill(t('businessMenu.sched.subscriptionSub'), { date: s.date })
    }
    const statusLabel = s.status === 'auto'
      ? t('businessMenu.statusAuto')
      : s.status === 'approval'
      ? '승인 대기'
      : t('businessMenu.statusReview')
    return { ...s, label, sub, statusLabel }
  })

  return (
    <div className="phone flex flex-col" style={{ background: COLORS.bg }}>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>

        {/* 헤더 — 기업 다크 (theme 분기 자동) */}
        <div style={{
          background: theme.headerGrad,
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          paddingRight: '20px',
          paddingBottom: '24px',
          paddingLeft: '20px',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <div style={{ fontSize:'24px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>
              {t('business.menu')}
            </div>
            <span style={{
              padding:'3px 10px',
              background:'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.25)',
              color:'#fff', borderRadius:'20px',
              fontSize:'10px', fontWeight:800, letterSpacing:'1px',
            }}>{t('businessMenu.badge')}</span>
          </div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)' }}>
            {COMPANY.name} · {COMPANY.monthLabel}
          </div>
        </div>

        <div style={{ padding:'0 16px 24px' }}>

          {/* 한도 임박 경고 */}
          <button
            onClick={todo('한도 관리')}
            style={{
              width:'100%', padding:'12px 14px', marginTop:'14px',
              background: COLORS.warningBg, border:`0.5px solid ${COLORS.warning}40`,
              borderRadius:'12px',
              display:'flex', alignItems:'center', gap:'10px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              marginBottom:'14px',
            }}>
            <span style={{
              display:'inline-flex', width:'18px', height:'18px', borderRadius:'50%',
              background:'#C8821A', color:'#fff', alignItems:'center', justifyContent:'center',
              fontSize:'11px', fontWeight:'700', flexShrink:0,
            }}>!</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#854F0B', marginBottom:'1px' }}>
                {t('businessMenu.warningCategory')} {t('businessMenu.limitWarning')}
              </div>
              <div style={{ fontSize:'11px', color:'#854F0B' }}>
                {fill(t('businessMenu.limitDetail'), {
                  expected: fmt(LIMIT_WARNING.expected),
                  limit: fmt(LIMIT_WARNING.limit),
                  dueDate: LIMIT_WARNING.dueDate,
                })}
              </div>
            </div>
            <span style={{ color:'#854F0B', fontSize:'14px', flexShrink:0 }}>›</span>
          </button>

          {/* 지금까지 / 월말까지 추가 (2단 + 합계) */}
          <div style={{
            background: COLORS.bgCard, border:`0.5px solid ${COLORS.border}`,
            borderRadius:'14px', overflow:'hidden',
            marginBottom:'14px',
          }}>
            <div style={{ display:'flex' }}>
              {/* 지금까지 */}
              <button
                onClick={() => navigate('/stats')}
                style={{
                  flex:1, padding:'14px',
                  background:'transparent', border:'none',
                  borderRight:`0.5px solid ${COLORS.border}`,
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  minWidth:0,
                }}>
                <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t2, marginBottom:'2px' }}>
                  {t('businessMenu.spentSoFar')}
                </div>
                <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'8px' }}>
                  {fill(t('businessMenu.spentSoFarSub'), { date: dateStr })}
                </div>
                <div style={{ fontSize:'18px', fontWeight:'700', color: COLORS.t1, marginBottom:'4px', letterSpacing:'-0.5px' }}>
                  {fmt(SPENT_SO_FAR)}
                </div>
                <div style={{ fontSize:'10px', color: COLORS.danger, fontWeight:'500' }}>
                  {fill(t('businessMenu.prevDiff'), { pct: PREV_DIFF_PCT })}
                </div>
              </button>

              {/* 월말까지 추가 */}
              <button
                onClick={() => navigate('/execute/business/operations/auto-pay-all')}
                style={{
                  flex:1, padding:'14px',
                  background:'transparent', border:'none',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  minWidth:0,
                }}>
                <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t2, marginBottom:'2px' }}>
                  {t('businessMenu.toGo')}
                </div>
                <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'8px' }}>
                  {fill(t('businessMenu.dayProgress'), { current: dayCurrent, total: dayTotal })}
                </div>
                <div style={{ fontSize:'18px', fontWeight:'700', color: theme.brandDark, marginBottom:'4px', letterSpacing:'-0.5px' }}>
                  +{fmt(toGoTotal)}
                </div>
                <div style={{ fontSize:'10px', color: COLORS.t3 }}>
                  {t('businessMenu.toGoSub')}
                </div>
              </button>
            </div>

            {/* 예상 총합 (하단 띠) */}
            <div style={{
              padding:'10px 14px',
              background: COLORS.bgMuted,
              borderTop:`0.5px solid ${COLORS.border}`,
              fontSize:'12px', color: COLORS.t2, fontWeight:'600',
              textAlign:'center',
            }}>
              {fill(t('businessMenu.expectedTotal'), { amount: fmt(expectedTotal) })}
            </div>
          </div>

          {/* 자동 지급 예정 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', padding:'0 4px' }}>
              <span style={{ fontSize:'12px', fontWeight:'700', color: COLORS.t1 }}>
                {t('businessMenu.scheduled')}
              </span>
              <button onClick={() => navigate('/execute/business/operations/auto-pay-all')}
                style={{ fontSize:'11px', fontWeight:600, color:theme.brandDark, background:`${theme.brand}12`, border:`1px solid ${theme.brand}25`, borderRadius:'20px', padding:'4px 10px', cursor:'pointer', fontFamily:'inherit', outline:'none' }}>
                전체보기
              </button>
            </div>
            <div style={{ background: COLORS.bgCard, border:`0.5px solid ${COLORS.border}`, borderRadius:'14px', overflow:'hidden' }}>
              {scheduledItems.map((s, i, arr) => (
                <button
                  key={s.id}
                  onClick={() => navigate(KIND_ROUTE[s.kind])}
                  style={{
                    width:'100%', padding:'12px 14px',
                    background: COLORS.bgCard, border:'none',
                    borderBottom: i < arr.length-1 ? `0.5px solid ${COLORS.border}` : 'none',
                    display:'flex', alignItems:'center', gap:'10px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}>
                  <div style={{
                    width:'34px', height:'34px',
                    background: s.iconBg, borderRadius:'9px',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'17px', flexShrink:0,
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'600', color: COLORS.t1, marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize:'10px', color: COLORS.t3 }}>{s.sub}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'700', color: COLORS.t1, marginBottom:'2px' }}>
                      {fmt(s.amount)}{t('common.won')}
                    </div>
                    <div style={{ fontSize:'10px', color: s.statusColor, fontWeight:'600' }}>
                      {s.statusLabel}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 통계 3단 */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
            {STATS.map(stat => (
              <button
                key={stat.id}
                onClick={() => navigate(stat.route)}
                style={{
                  flex:1, padding:'14px 12px',
                  background: COLORS.bgCard, border:`0.5px solid ${COLORS.border}`,
                  borderRadius:'14px',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  minWidth:0,
                }}>
                <div style={{ fontSize:'10px', color: COLORS.t3, marginBottom:'6px' }}>{stat.label}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:'2px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'22px', fontWeight:'700', color: COLORS.t1, letterSpacing:'-1px' }}>
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span style={{ fontSize:'12px', color: COLORS.t3 }}>{stat.unit}</span>
                  )}
                </div>
                <div style={{ fontSize:'10px', color: theme.brandDark, fontWeight:'500' }}>
                  {stat.subAction} ›
                </div>
              </button>
            ))}
          </div>

          {/* 카드 현황 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', padding:'0 4px' }}>
              <span style={{ fontSize:'12px', fontWeight:'700', color: COLORS.t1 }}>카드 현황</span>
              <button onClick={() => navigate('/card-payment')}
                style={{ fontSize:'11px', fontWeight:600, color: theme.brandDark, background:`${theme.brand}12`, border:`1px solid ${theme.brand}25`, borderRadius:'20px', padding:'4px 10px', cursor:'pointer', fontFamily:'inherit' }}>
                관리
              </button>
            </div>
            <div style={{ background: COLORS.bgCard, border:`0.5px solid ${COLORS.border}`, borderRadius:'14px', overflow:'hidden' }}>
              {CARDS.map((card, i, arr) => {
                const pct = Math.round(card.used / card.limit * 100)
                return (
                  <button key={card.id} onClick={() => navigate('/card-payment')}
                    style={{ width:'100%', padding:'12px 14px', background:'transparent', border:'none',
                      borderBottom: i < arr.length-1 ? `0.5px solid ${COLORS.border}` : 'none',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    {/* 카드명 + 사용률 */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'7px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: card.color, flexShrink:0 }} />
                        <span style={{ fontSize:'12px', fontWeight:'600', color: COLORS.t1 }}>{card.name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'12px', fontWeight:'700',
                          color: pct>=80?COLORS.danger : pct>=60?'#C8821A' : COLORS.t1 }}>{pct}%</span>
                        <span style={{ fontSize:'10px', color: COLORS.t3 }}>
                          {fmt(card.used/10000)}만 / {fmt(card.limit/10000)}만원
                        </span>
                      </div>
                    </div>
                    {/* 프로그레스 바 */}
                    <div style={{ height:'3px', borderRadius:'2px', background: COLORS.bgMuted, overflow:'hidden' }}>
                      <div style={{ width:pct+'%', height:'100%', borderRadius:'2px', transition:'width 0.5s',
                        background: pct>=80?COLORS.danger : pct>=60?'#C8821A' : card.color }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 카테고리별 지출 */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', padding:'0 4px' }}>
              <span style={{ fontSize:'12px', fontWeight:'700', color: COLORS.t1 }}>
                {t('businessMenu.byCategory')}
              </span>
              <button onClick={() => navigate('/stats')}
                style={{ fontSize:'11px', fontWeight:600, color:theme.brandDark, background:`${theme.brand}12`, border:`1px solid ${theme.brand}25`, borderRadius:'20px', padding:'4px 10px', cursor:'pointer', fontFamily:'inherit', outline:'none' }}>
                전체보기
              </button>
            </div>
            <div style={{
              background: COLORS.bgCard, border:`0.5px solid ${COLORS.border}`,
              borderRadius:'14px', padding:'14px',
            }}>
              {CATEGORIES.map((c, i, arr) => (
                <div key={c.id} style={{
                  paddingBottom: i < arr.length-1 ? '12px' : 0,
                  marginBottom: i < arr.length-1 ? '12px' : 0,
                  borderBottom: i < arr.length-1 ? `0.5px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ width:'8px', height:'8px', borderRadius:'2px', background:c.color, flexShrink:0 }} />
                      <span style={{ fontSize:'12px', fontWeight:'600', color: COLORS.t1 }}>{c.label}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <span style={{ fontSize:'12px', fontWeight:'600', color: COLORS.t1 }}>
                        {fmt(c.amount)}{t('common.won')}
                      </span>
                      <span style={{ fontSize:'10px', color: COLORS.t3, fontWeight:'500', minWidth:'28px', textAlign:'right' }}>
                        {c.pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height:'4px', borderRadius:'2px', background: COLORS.bgMuted, overflow:'hidden' }}>
                    <div style={{
                      width:`${c.pct}%`, height:'100%',
                      background: c.color,
                      transition:'width .2s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <BottomTab />
    </div>
  )
}
