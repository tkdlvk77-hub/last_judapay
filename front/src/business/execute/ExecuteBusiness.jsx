import { useNavigate } from 'react-router-dom'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { dialog } from '../../components/Dialog'

// ─────────────────────────────────────
// 사업자에게 지급 — 5개 메뉴
// ─────────────────────────────────────
const VENDOR_FUNDS = [
  { id:'freelance',    emoji:'🧾', iconBg:'#EDF3FA', tKey:'freelance' },
  { id:'marketing',    emoji:'📢', iconBg:'#FBE9E0', tKey:'marketing' },
  { id:'realestate',   emoji:'🏠', iconBg:'#F2EFE9', tKey:'realestate' },
  { id:'vendorLoan',   emoji:'💸', iconBg:'#EEE8F7', tKey:'vendorLoan' },
  { id:'vendorInvest', emoji:'📈', iconBg:'#E6F5EF', tKey:'vendorInvest' },
]

const CORP_BALANCE = 47820000

// 메뉴 → 다음 화면 매핑 (모두 SelectRecipientBusiness로)
const MENU_STATUS = {
  freelance:    'select',
  marketing:    'select',
  realestate:   'select',
  vendorLoan:   'select',
  vendorInvest: 'select',
}

function fmt(n) {
  return Number(n).toLocaleString('ko-KR')
}

export default function ExecuteBusiness() {
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const theme = getAccountTheme()
  const t = useT()

  const handleClick = (item) => {
    const status = MENU_STATUS[item.id]
    if (status === 'select') {
      navigate(`/execute/business/select-vendor?menu=${item.id}`)
    } else if (status === 'todo') {
      dialog.alert({ title: t(`execBiz.fund.${item.tKey}.label`), message: '준비 중인 기능입니다.' })
    }
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 다크 헤더 — 기업 네이비 그라데이션 */}
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
              {t('execBiz.smallTitle')}
            </span>
          </div>

          <div style={{ padding:'0 20px' }}>
            <div style={{
              fontSize:'28px', fontWeight:700, color:'#fff',
              lineHeight:1.25, letterSpacing:'-1px',
              marginBottom:'10px',
            }}>
              {t('execBiz.bigTitle')}
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
              {t('execBiz.bigSub')}
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
                {t('execBiz.balanceLabel')}
              </span>
            </div>
            <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, letterSpacing:'-0.3px' }}>
              {fmt(CORP_BALANCE)}{t('common.won')}
            </span>
          </div>

          {/* 자금 카드 리스트 */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {VENDOR_FUNDS.map(item => {
              const status = MENU_STATUS[item.id]
              const isTodo = status === 'todo'
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  style={{
                    width:'100%',
                    background: COLORS.bgCard,
                    boxShadow: SHADOWS.card,
                    border:'none',
                    borderRadius: RADIUS.lg,
                    padding:'14px',
                    cursor:'pointer',
                    textAlign:'left',
                    display:'flex', flexDirection:'column', gap:'10px',
                    fontFamily:'inherit',
                    opacity: isTodo ? 0.55 : 1,
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{
                      width:'44px', height:'44px',
                      background: item.iconBg,
                      borderRadius:'12px',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0,
                      fontSize:'22px',
                    }}>
                      {item.emoji}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1 }}>
                          {t(`execBiz.fund.${item.tKey}.label`)}
                        </span>
                        {isTodo && (
                          <span style={{
                            fontSize:'9px', fontWeight:600,
                            color: COLORS.t4,
                            background: COLORS.bgMuted,
                            padding:'2px 7px',
                            borderRadius:'4px',
                          }}>
                            준비중
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:'12px', color: COLORS.t4 }}>
                        {t(`execBiz.fund.${item.tKey}.sub`)}
                      </div>
                    </div>
                    <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
                  </div>

                  <div style={{
                    padding:'8px 11px',
                    background: COLORS.bgMuted,
                    borderRadius:'9px',
                    display:'flex', alignItems:'center', gap:'6px',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink:0 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span style={{ fontSize:'11px', color: COLORS.t3, lineHeight:1.5 }}>
                      {t(`execBiz.fund.${item.tKey}.control`)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 자동 처리 안내 박스 */}
          <div style={{
            marginTop:'14px',
            padding:'11px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px',
            color:'#2D6BB0',
            lineHeight:1.65,
          }}>
            <strong style={{ color:'#1E5294' }}>{t('execBiz.notice.title')}</strong><br />
            {t('execBiz.notice.body')}
          </div>

        </div>
      </div>
    </PhoneShell>
  )
}
