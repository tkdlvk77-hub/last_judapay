import { useNavigate } from 'react-router-dom'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { dialog } from '../../components/Dialog'

// ─────────────────────────────────────
// 출금 가능 자금 (5개)
// 모든 카드 → SelectRecipientBusiness로 진입 (사람 풀에서 선택)
// ─────────────────────────────────────
const CASHABLE_FUNDS = [
  { id:'freelance',   emoji:'🧾', iconBg:'#EDF3FA', tKey:'freelance',   badgeBg:'#EDF3FA', badgeColor:'#1E5294' },
  { id:'bonus',       emoji:'🎉', iconBg:'#FBE9E0', tKey:'bonus',       badgeBg:'#FFF4E0', badgeColor:'#854F0B' },
  { id:'condolence',  emoji:'💐', iconBg:'#F2EFE9', tKey:'condolence',  badgeBg:'#E6F5EF', badgeColor:'#085041' },
  { id:'otherIncome', emoji:'📋', iconBg:'#EEE8F7', tKey:'otherIncome', badgeBg:'#EEE8F7', badgeColor:'#5D2E92' },
  { id:'lend',        emoji:'💸', iconBg:'#FBE9E0', tKey:'lend',        badgeBg:'#FBE9E0', badgeColor:'#C25018' },
]

// ─────────────────────────────────────
// 권한 자금 (자금 지원 — 별도 강조)
// ─────────────────────────────────────
const PERMISSION_FUND = {
  id: 'support',
  emoji: '🌱',
  tKey: 'support',
}

// 메뉴별 다음 화면 매핑
// - 사람 선택 화면이 준비된 메뉴: 'select' (SelectRecipientBusiness로)
// - 아직 준비 안 된 메뉴: 'todo' (개발 예정 안내)
const MENU_STATUS = {
  freelance:   'select',
  bonus:       'select',
  condolence:  'select',
  otherIncome: 'select',
  lend:        'select',
  support:     'select',
}

// ─────────────────────────────────────
// 데모 데이터
// ─────────────────────────────────────
const CORP_BALANCE = 47820000

function fmt(n) {
  return n.toLocaleString()
}

export default function ExecuteToPersonal() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const todo = (label) => () => dialog.alert({ title: label, message: '개발 예정 기능입니다.' })

  const handleClick = (item) => () => {
    const status = MENU_STATUS[item.id]
    if (status === 'select') {
      // 사람 선택 화면으로 (메뉴 정보를 query param으로)
      navigate(`/execute/business/select-recipient?menu=${item.id}`)
    } else {
      todo(t(`execToPersonal.fund.${item.tKey}.label`))()
    }
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 다크 헤더 — theme 분기 자동 (기업=네이비) */}
        <div style={{
          background: theme.headerGrad,
          paddingTop:'max(20px, env(safe-area-inset-top))',
          paddingBottom:'28px',
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'4px 16px 20px',
          }}>
            <button onClick={() => navigate(-1)}
              style={{
                width:'32px', height:'32px',
                background:'none', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>
              {t('execToPersonal.smallTitle')}
            </span>
          </div>

          <div style={{ padding:'0 20px' }}>
            <div style={{
              fontSize:'28px', fontWeight:700, color:'#fff',
              lineHeight:1.25, letterSpacing:'-1px',
              marginBottom:'10px',
              whiteSpace:'pre-line',
            }}>
              {t('execToPersonal.bigTitle')}
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
              {t('execToPersonal.bigSub')}
            </div>
          </div>
        </div>

        {/* 라이트 영역 */}
        <div style={{ padding:'18px 16px 24px' }}>

          {/* 법인 출금 가능 자금 잔액 */}
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
                {t('execToPersonal.balanceLabel')}
              </span>
            </div>
            <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, letterSpacing:'-0.3px' }}>
              {fmt(CORP_BALANCE)}{t('common.won')}
            </span>
          </div>

          {/* 그룹 1: 출금 가능 자금 */}
          <div style={{
            fontSize:'11px', fontWeight:700, color: COLORS.t3,
            marginBottom:'10px', padding:'0 4px',
            letterSpacing:'0.3px',
          }}>
            {t('execToPersonal.groupCashable')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
            {CASHABLE_FUNDS.map(item => (
              <button
                key={item.id}
                onClick={handleClick(item)}
                style={{
                  width:'100%', padding:'14px',
                  background: COLORS.bgCard,
                  border:'none',
                  borderRadius: RADIUS.lg,
                  boxShadow: SHADOWS.card,
                  cursor:'pointer', fontFamily:'inherit',
                  textAlign:'left',
                  display:'flex', alignItems:'center', gap:'12px',
                }}>
                <div style={{
                  width:'42px', height:'42px',
                  background: item.iconBg, borderRadius:'12px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'20px', flexShrink:0,
                }}>
                  {item.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1 }}>
                      {t(`execToPersonal.fund.${item.tKey}.label`)}
                    </span>
                    <span style={{
                      display:'inline-block', padding:'2px 7px',
                      background: item.badgeBg, color: item.badgeColor,
                      borderRadius:'5px', fontSize:'10px', fontWeight:700,
                    }}>
                      {t(`execToPersonal.fund.${item.tKey}.badge`)}
                    </span>
                  </div>
                  <div style={{ fontSize:'12px', color: COLORS.t4 }}>
                    {t(`execToPersonal.fund.${item.tKey}.desc`)}
                  </div>
                </div>
                <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
              </button>
            ))}
          </div>

          {/* 그룹 2: 권한 자금 (강조) */}
          <div style={{
            fontSize:'11px', fontWeight:700, color: COLORS.t3,
            marginBottom:'10px', padding:'0 4px',
            letterSpacing:'0.3px',
          }}>
            {t('execToPersonal.groupPermission')}
          </div>
          <button
            onClick={handleClick(PERMISSION_FUND)}
            style={{
              width:'100%', padding:'14px',
              background:'#FFF8EC',
              border:'1px solid #F7D98A',
              borderRadius: RADIUS.lg,
              cursor:'pointer', fontFamily:'inherit',
              textAlign:'left',
              display:'flex', alignItems:'center', gap:'12px',
              marginBottom:'18px',
            }}>
            <div style={{
              width:'42px', height:'42px',
              background:'#fff', borderRadius:'12px',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'20px', flexShrink:0,
              border:'0.5px solid #F7D98A',
            }}>
              {PERMISSION_FUND.emoji}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                <span style={{ fontSize:'15px', fontWeight:700, color:'#854F0B' }}>
                  {t(`execToPersonal.fund.${PERMISSION_FUND.tKey}.label`)}
                </span>
                <span style={{
                  display:'inline-block', padding:'2px 7px',
                  background:'#fff', color:'#854F0B',
                  borderRadius:'5px', fontSize:'10px', fontWeight:700,
                  border:'0.5px solid #F7D98A',
                }}>
                  {t(`execToPersonal.fund.${PERMISSION_FUND.tKey}.badge`)}
                </span>
              </div>
              <div style={{ fontSize:'12px', color:'#854F0B' }}>
                {t(`execToPersonal.fund.${PERMISSION_FUND.tKey}.desc`)}
              </div>
            </div>
            <span style={{ color:'#854F0B', fontSize:'18px', flexShrink:0 }}>›</span>
          </button>

          {/* 안내 박스 */}
          <div style={{
            padding:'12px 14px',
            background: COLORS.infoBg,
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294',
            lineHeight:1.65,
          }}>
            <strong>ⓘ</strong> {t('execToPersonal.notice')}
          </div>
        </div>

      </div>
    </PhoneShell>
  )
}
