import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, FUND_COLORS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useScrollRestore } from '../../hooks/useScrollRestore'

// ─────────────────────────────────────
// 출금 가능 자금
// ─────────────────────────────────────
const CASHABLE_FUNDS = [
  { id:'freelance',  emoji:'🧾', tKey:'freelance',  iconBg: FUND_COLORS.freelance.bg },
  { id:'realestate', emoji:'🏠', tKey:'realestate', iconBg: FUND_COLORS.realestate.bg },
]

// ─────────────────────────────────────
// 권한 자금 (사용처 통제)
// ─────────────────────────────────────
const PERMISSION_FUNDS = [
  { id:'gift',   emoji:'🎁', tKey:'gift',   iconBg: FUND_COLORS.gift.bg },
  { id:'living', emoji:'🛒', tKey:'living', iconBg: FUND_COLORS.living.bg },
  { id:'lend',   emoji:'💸', tKey:'lend',   iconBg: FUND_COLORS.lend.bg },
  { id:'invest', emoji:'🌱', tKey:'invest', iconBg: FUND_COLORS.invest.bg },
]

// 데모 데이터
const MY_BALANCE = 1932000

function fmt(n) {
  return n.toLocaleString()
}

// 카드 1개 — 출금 가능 / 권한 자금 동일 디자인
function FundCard({ item, t, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:'100%', padding:'14px',
        background: COLORS.bgCard,
        border:'none',
        borderRadius: RADIUS.lg,
        boxShadow: SHADOWS.card,
        cursor:'pointer', fontFamily:'inherit',
        textAlign:'left',
        display:'flex', flexDirection:'column', gap:'10px',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{
          width:'42px', height:'42px',
          background: item.iconBg, borderRadius:'12px',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'20px', flexShrink:0,
        }}>
          {item.emoji}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1, marginBottom:'3px' }}>
            {t(`execPersonal.fund.${item.tKey}.label`)}
          </div>
          <div style={{ fontSize:'12px', color: COLORS.t4 }}>
            {t(`execPersonal.fund.${item.tKey}.desc`)}
          </div>
        </div>
        <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
      </div>

      {/* 통제 방식 안내 */}
      <div style={{
        padding:'8px 12px',
        background: COLORS.bgMuted,
        borderRadius:'9px',
        display:'flex', alignItems:'center', gap:'7px',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink:0 }}>
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span style={{ fontSize:'11px', color: COLORS.t3, lineHeight:1.5 }}>
          {t(`execPersonal.fund.${item.tKey}.control`)}
        </span>
      </div>
    </button>
  )
}

export default function ExecutePersonal() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()

  const goToSelect = (purposeId) => () => {
    navigate(`/execute/personal/select?purpose=${purposeId}`)
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 다크 헤더 — theme 분기 자동 (개인=보라) */}
        <div style={{
          background: theme.headerGrad,
          paddingTop:'max(20px, env(safe-area-inset-top))',
          paddingBottom:'28px',
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'4px 16px 20px',
          }}>
            <button onClick={() => navigate('/execute')}
              style={{
                width:'32px', height:'32px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>
              {t('execPersonal.smallTitle')}
            </span>
          </div>

          <div style={{ padding:'0 20px' }}>
            <div style={{
              fontSize:'28px', fontWeight:700, color:'#fff',
              lineHeight:1.25, letterSpacing:'-1px',
              marginBottom:'10px',
              whiteSpace:'pre-line',
            }}>
              {t('execPersonal.bigTitle')}
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
              {t('execPersonal.bigSub')}
            </div>
          </div>
        </div>

        {/* 라이트 영역 */}
        <div style={{ padding:'18px 16px 24px' }}>

          {/* 내 출금 가능 자금 잔액 */}
          <div style={{
            background: COLORS.bgCard,
            border:`0.5px solid ${COLORS.border}`,
            borderRadius:'12px', padding:'12px 14px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:'18px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: COLORS.success, flexShrink:0 }} />
              <span style={{ fontSize:'12px', fontWeight:500, color: COLORS.t3 }}>
                {t('execPersonal.balanceLabel')}
              </span>
            </div>
            <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, letterSpacing:'-0.3px' }}>
              {fmt(MY_BALANCE)}{t('common.won')}
            </span>
          </div>

          {/* 그룹 1: 권한 자금 (사용처 통제) */}
          <div style={{
            fontSize:'11px', fontWeight:700, color: COLORS.t3,
            marginBottom:'10px', padding:'0 4px',
            letterSpacing:'0.3px',
          }}>
            {t('execPersonal.groupPermission')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
            {PERMISSION_FUNDS.map(item => (
              <FundCard key={item.id} item={item} t={t} onClick={goToSelect(item.id)} />
            ))}
          </div>

          {/* 그룹 2: 출금 가능 자금 */}
          <div style={{
            fontSize:'11px', fontWeight:700, color: COLORS.t3,
            marginBottom:'10px', padding:'0 4px',
            letterSpacing:'0.3px',
          }}>
            {t('execPersonal.groupCashable')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'18px' }}>
            {CASHABLE_FUNDS.map(item => (
              <FundCard key={item.id} item={item} t={t} onClick={goToSelect(item.id)} />
            ))}
          </div>

          {/* 안내 박스 */}
          <div style={{
            padding:'12px 14px',
            background: COLORS.infoBg,
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294',
            lineHeight:1.65,
          }}>
            {t('execPersonal.infoBox')}
          </div>

        </div>
      </div>
    </PhoneShell>
  )
}
