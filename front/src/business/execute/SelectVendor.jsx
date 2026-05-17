import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useScrollRestore } from '../../hooks/useScrollRestore'

// ─────────────────────────────────────────────────────────
// 데모 — 최근 거래 사업자 (실제는 백엔드에서)
// ─────────────────────────────────────────────────────────
const RECENT_BUSINESSES = [
  {
    id:'b1', name:'(주)오로라', initial:'오',
    bizNumber:'123-45-67890', representative:'김대표',
    industry:'정보통신업', address:'서울 강남구',
    establishedAt:'2018.03.15', taxType:'일반과세자',
    avatarBg:'#DBEAFE', avatarFg:'#1E3A8A',
    status:'normal', lastUsedFor:'freelance', lastUsedAt:'3일 전',
  },
  {
    id:'b2', name:'(주)벨라부동산중개', initial:'벨',
    bizNumber:'456-78-90123', representative:'박벨라',
    industry:'부동산 임대', address:'서울 강남구',
    establishedAt:'2020.06.01', taxType:'일반과세자',
    avatarBg:'#FCE7F3', avatarFg:'#9D174D',
    status:'normal', lastUsedFor:'realestate', lastUsedAt:'2주 전',
  },
  {
    id:'b3', name:'그로스마케팅', initial:'그',
    bizNumber:'234-11-55678', representative:'정마케',
    industry:'광고대행업', address:'서울 마포구',
    establishedAt:'2021.05.10', taxType:'일반과세자',
    avatarBg:'#FEF3C7', avatarFg:'#92400E',
    status:'normal', lastUsedFor:'marketing', lastUsedAt:'1주 전',
  },
  {
    id:'b4', name:'(주)네오컴퍼니', initial:'네',
    bizNumber:'789-01-23456', representative:'최네오',
    industry:'소프트웨어 개발', address:'서울 성수동',
    establishedAt:'2022.11.20', taxType:'일반과세자',
    avatarBg:'#E0E7FF', avatarFg:'#3730A3',
    status:'normal', lastUsedFor:'vendorLoan', lastUsedAt:'1개월 전',
  },
]

// ─────────────────────────────────────────────────────────
// 메뉴 → 다음 화면 라우트
// ─────────────────────────────────────────────────────────
const MENU_NEXT_PATH = {
  freelance:    '/execute/business/freelance',
  marketing:    '/execute/business/freelance',     // 마케팅비도 외주비 화면 재사용
  realestate:   '/execute/personal/realestate',    // 공용 화면
  vendorLoan:   '/execute/business/vendor-loan',
  vendorInvest: '/execute/business/vendor-invest', // 2차시
}

const MENU_LABEL_KEY = {
  freelance:    'execBiz.fund.freelance.label',
  marketing:    'execBiz.fund.marketing.label',
  realestate:   'execBiz.fund.realestate.label',
  vendorLoan:   'execBiz.fund.vendorLoan.label',
  vendorInvest: 'execBiz.fund.vendorInvest.label',
}

// 사업자번호 정규화 (123-45-67890)
function formatBizNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0,3)}-${digits.slice(3)}`
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function SelectVendor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const theme = getAccountTheme()
  const t = useT()
  const scrollRef = useScrollRestore()

  const menuId = searchParams.get('menu') || 'freelance'
  const nextPath = MENU_NEXT_PATH[menuId] || '/execute/business/freelance'
  const menuLabelKey = MENU_LABEL_KEY[menuId] || 'execBiz.fund.freelance.label'
  const menuLabel = t(menuLabelKey)

  const [mode, setMode] = useState('input')     // 'input' | 'result'
  const [bizInput, setBizInput] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [vendorEmail, setVendorEmail] = useState('')

  const bizDigits = bizInput.replace(/\D/g, '')
  const bizValid = bizDigits.length === 10

  // 이메일 형식 검증 (간단)
  const emailValid = /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(vendorEmail.trim())

  const handleBack = () => {
    if (mode === 'result') {
      setMode('input')
      setLookupResult(null)
      return
    }
    navigate(-1)
  }

  // 사업자 조회 시뮬레이션
  const handleLookup = () => {
    if (!bizValid) return

    // 데모: '234-56-78901'은 폐업
    if (bizDigits === '2345678901') {
      setLookupResult({
        status: 'risk',
        business: {
          id:`biz-${bizDigits}`,
          name:'(주)한빛홀딩스', initial:'한',
          bizNumber: bizInput,
          representative:'박홀딩',
          industry:'투자업',
          address:'서울 종로구',
          establishedAt:'2015.04.10',
          taxType:'일반과세자',
          status:'closed',
          closedAt:'2025.08.31',
          monthsClosed: 8,
          avatarBg:'#FEE2E2', avatarFg:'#991B1B',
        },
      })
    } else {
      setLookupResult({
        status: 'normal',
        business: {
          id:`biz-${bizDigits}`,
          name:'(주)오로라', initial:'오',
          bizNumber: bizInput,
          representative:'김대표',
          industry:'정보통신업',
          address:'서울 강남구',
          establishedAt:'2018.03.15',
          taxType:'일반과세자',
          avatarBg:'#DBEAFE', avatarFg:'#1E3A8A',
          status:'normal',
          phone:'02-1234-5678',
          isJudaUser: false,    // 신규 조회 사업자는 미가입 (이메일 입력 필요)
        },
      })
    }
    setMode('result')
    setVendorEmail('')
  }

  const handleSelectRecent = (b) => {
    const recipient = {
      ...b,
      isBusiness: true,
      verified: true,
      kyc: '국세청 검증 ✓',
      phone: b.phone || '02-0000-0000',
      // 호환 별칭 (다른 화면이 사용하는 필드명)
      brn: b.bizNumber,
      ceo: b.representative,
    }
    navigate(`${nextPath}?menu=${menuId}`, { state: { recipient } })
  }

  const handleProceed = () => {
    if (!lookupResult) return
    const b = lookupResult.business
    // 미가입자는 verified=false (외부링크 인증 대기)
    const isJudaUser = b.isJudaUser === true
    const recipient = {
      ...b,
      isBusiness: true,
      verified: lookupResult.status === 'normal' && isJudaUser,
      isJudaUser,
      vendorEmail: vendorEmail.trim() || null,
      riskAccepted: lookupResult.status === 'risk',
      kyc: lookupResult.status === 'normal'
        ? (isJudaUser ? '국세청 검증 ✓ · 주다페이 가입자' : '국세청 검증 ✓ · 미가입 (이메일 발송)')
        : '폐업 사업자 (위험 감수)',
      phone: b.phone || '02-0000-0000',
      // 호환 별칭
      brn: b.bizNumber,
      ceo: b.representative,
    }
    navigate(`${nextPath}?menu=${menuId}`, { state: { recipient } })
  }

  // ───────────── 결과 화면: 정상 사업자 ─────────────
  if (mode === 'result' && lookupResult?.status === 'normal') {
    const b = lookupResult.business
    return (
      <PhoneShell>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
          <DarkHeader
            smallTitle="사업자 조회 결과"
            badge="국세청 검증 ✓"
            badgeTone="cashable"
            bigTitle="정상 사업자예요"
            sub="국세청 사업자등록 정보와 일치합니다"
            onBack={handleBack}
            headerGrad={theme.headerGrad}
            exitTo="/home-business"
          />

          <div style={{ padding:'18px 16px 100px' }}>

            {/* 정상 사업자 카드 (녹색) */}
            <div style={{
              background:'#ECFDF5',
              border:'1px solid #10B981',
              borderRadius: RADIUS.lg,
              padding:'16px',
              marginBottom:'14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <div style={{
                  width:'22px', height:'22px', borderRadius:'50%',
                  background:'#10B981',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>
                  정상 사업자 · 국세청 확인
                </span>
              </div>
              <div style={{ fontSize:'22px', fontWeight:700, color: COLORS.t1, marginBottom:'4px', letterSpacing:'-0.5px' }}>
                {b.name}
              </div>
              <div style={{ fontSize:'13px', color:'#047857', fontWeight:600 }}>{b.bizNumber}</div>
            </div>

            {/* 회사 정보 */}
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
              marginBottom:'14px',
            }}>
              {[
                { label:'대표자', value: b.representative },
                { label:'업종',   value: b.industry },
                { label:'소재지', value: b.address },
                { label:'개업일', value: b.establishedAt },
                { label:'과세 유형', value: b.taxType },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  padding:'14px 16px',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <span style={{ fontSize:'12px', color: COLORS.t4 }}>{row.label}</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, textAlign:'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* 미가입 안내 + 이메일 입력 (조회로 찾은 사업자는 미가입자) */}
            {!b.isJudaUser && (
              <div style={{
                background:'#FFFBEB',
                border:'1px solid #FCD34D',
                borderRadius: RADIUS.lg,
                padding:'14px',
                marginBottom:'14px',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                  <div style={{
                    width:'22px', height:'22px', borderRadius:'50%',
                    background:'#F59E0B', color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'13px', fontWeight:800, flexShrink:0,
                  }}>📩</div>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#854F0B' }}>
                    주다페이 미가입 사업자
                  </span>
                </div>
                <div style={{ fontSize:'11px', color:'#854F0B', lineHeight:1.65, marginBottom:'12px' }}>
                  입력하신 이메일로 <strong>거래 계약서</strong>가 발송됩니다.<br />
                  사업자등록번호와 정보가 일치하면 금액이 지급되고,<br />
                  사업자가 거부 시 자동 환불됩니다.
                </div>

                <div style={{ fontSize:'11px', color: COLORS.t3, fontWeight:600, marginBottom:'6px' }}>
                  사업자 이메일 <span style={{ color:'#DC2626' }}>*</span>
                </div>
                <input
                  type="email"
                  inputMode="email"
                  value={vendorEmail}
                  onChange={e => setVendorEmail(e.target.value)}
                  placeholder="contact@company.com"
                  style={{
                    width:'100%', height:'44px',
                    padding:'0 12px',
                    background: COLORS.bgCard,
                    border:`1px solid ${vendorEmail && !emailValid ? '#FCA5A5' : COLORS.border}`,
                    borderRadius: RADIUS.md,
                    fontSize:'13px', color: COLORS.t1,
                    fontFamily:'inherit', outline:'none',
                  }}
                />
                {vendorEmail && !emailValid && (
                  <div style={{ fontSize:'10px', color:'#DC2626', marginTop:'4px' }}>
                    올바른 이메일 형식이 아닙니다
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 하단 액션 */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            padding:'12px 16px 24px',
            borderTop:`1px solid ${COLORS.borderSoft}`,
            background: COLORS.bgCard,
          }}>
            {(() => {
              const needEmail = !b.isJudaUser
              const canProceed = !needEmail || emailValid
              return (
                <button onClick={canProceed ? handleProceed : undefined}
                  disabled={!canProceed}
                  style={{
                    width:'100%', height:'52px',
                    background: canProceed ? theme.brandDark : COLORS.bgMuted,
                    color: canProceed ? '#fff' : COLORS.t5,
                    border:'none', borderRadius: RADIUS.md,
                    fontSize:'15px', fontWeight:700,
                    cursor: canProceed ? 'pointer' : 'not-allowed',
                    fontFamily:'inherit',
                    boxShadow: canProceed ? SHADOWS.card : 'none',
                  }}>
                  {needEmail && !emailValid
                    ? '사업자 이메일을 입력하세요'
                    : `이 사업자에게 ${menuLabel} 보내기`}
                </button>
              )
            })()}
          </div>
        </div>
      </PhoneShell>
    )
  }

  // ───────────── 결과 화면: 폐업 사업자 ─────────────
  if (mode === 'result' && lookupResult?.status === 'risk') {
    const b = lookupResult.business
    return (
      <PhoneShell>
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
          <DarkHeader
            smallTitle="사업자 조회 결과"
            badge="⚠ 폐업 사업자"
            badgeTone="warn"
            bigTitle="위험: 폐업한 사업자"
            sub="국세청에 따르면 이 사업자는 폐업 상태입니다"
            onBack={handleBack}
            headerGrad={theme.headerGrad}
            exitTo="/home-business"
          />

          <div style={{ padding:'18px 16px 100px' }}>

            {/* 폐업 경고 카드 (빨간) */}
            <div style={{
              background:'#FEF2F2',
              border:'1px solid #DC2626',
              borderRadius: RADIUS.lg,
              padding:'16px',
              marginBottom:'14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <div style={{
                  width:'22px', height:'22px', borderRadius:'50%',
                  background:'#DC2626',
                  color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'13px', fontWeight:800,
                  flexShrink:0,
                }}>!</div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#991B1B' }}>
                  폐업 사업자 · 거래 위험
                </span>
              </div>
              <div style={{ fontSize:'22px', fontWeight:700, color: COLORS.t1, marginBottom:'4px', letterSpacing:'-0.5px' }}>
                {b.name}
              </div>
              <div style={{ fontSize:'13px', color:'#991B1B', fontWeight:600, marginBottom:'10px' }}>
                {b.bizNumber}
              </div>
              <div style={{
                padding:'10px 12px',
                background:'rgba(220,38,38,0.08)',
                borderRadius: RADIUS.md,
                fontSize:'11px', color:'#991B1B', lineHeight:1.6,
              }}>
                폐업일: {b.closedAt} ({b.monthsClosed}개월 경과)<br />
                ⚠ 세금계산서 발행 불가, 환불·분쟁 시 보호받기 어렵습니다.
              </div>
            </div>

            {/* 회사 정보 (참고) */}
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
              marginBottom:'14px',
              opacity:0.8,
            }}>
              {[
                { label:'대표자', value: b.representative },
                { label:'업종',   value: b.industry },
                { label:'소재지', value: b.address },
                { label:'개업일', value: b.establishedAt },
                { label:'폐업일', value: b.closedAt },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  padding:'14px 16px',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <span style={{ fontSize:'12px', color: COLORS.t4 }}>{row.label}</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, textAlign:'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

          </div>

          {/* 하단 액션 */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            padding:'12px 16px 24px',
            borderTop:`1px solid ${COLORS.borderSoft}`,
            background: COLORS.bgCard,
            display:'flex', flexDirection:'column', gap:'8px',
          }}>
            <button onClick={() => { setMode('input'); setLookupResult(null); setBizInput('') }}
              style={{
                width:'100%', height:'52px',
                background: theme.brandDark,
                color:'#fff',
                border:'none', borderRadius: RADIUS.md,
                fontSize:'15px', fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                boxShadow: SHADOWS.card,
              }}>
              다른 사업자 조회하기
            </button>
            <button onClick={handleProceed}
              style={{
                width:'100%', height:'46px',
                background:'transparent',
                color:'#991B1B',
                border:'1px solid #FCA5A5',
                borderRadius: RADIUS.md,
                fontSize:'13px', fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              위험 감수하고 진행
            </button>
          </div>
        </div>
      </PhoneShell>
    )
  }

  // ───────────── 입력 화면 (디폴트) ─────────────
  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle="사업자에게 지급"
          badge={menuLabel}
          badgeTone="cashable"
          bigTitle={`어떤 사업자에게\n보내시나요?`}
          sub="국세청 사업자등록 정보로 진위 + 상태를 실시간 확인합니다"
          onBack={handleBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 사업자번호 입력 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'18px',
            marginBottom:'10px',
          }}>
            <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'8px', fontWeight:600 }}>
              사업자등록번호
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={bizInput}
              onChange={e => setBizInput(formatBizNumber(e.target.value))}
              placeholder="123 - 45 - 67890"
              style={{
                width:'100%',
                fontSize:'24px', fontWeight:700,
                color: COLORS.t1,
                background:'transparent', border:'none', outline:'none',
                fontFamily:'inherit',
                padding:0, letterSpacing:'1px',
                marginBottom:'4px',
              }}
            />
            <div style={{ fontSize:'11px', color: COLORS.t4 }}>
              10자리 입력 ({bizDigits.length}/10)
            </div>
          </div>

          {/* 쿠콘 연동 안내 */}
          <div style={{
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294', lineHeight:1.65,
            marginBottom:'18px',
          }}>
            <strong>ⓘ</strong> 국세청 사업자등록 정보를 통해 진위와 상태를 실시간 확인합니다 (쿠콘 연동)
          </div>

          {/* 최근 거래 사업자 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            최근 거래 사업자
          </div>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
          }}>
            {RECENT_BUSINESSES.map((b, i) => {
              const isSamePurpose = b.lastUsedFor === menuId
              return (
                <button key={b.id}
                  onClick={() => handleSelectRecent(b)}
                  style={{
                    width:'100%', padding:'14px',
                    background:'transparent', border:'none',
                    borderBottom: i < RECENT_BUSINESSES.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                    display:'flex', alignItems:'center', gap:'12px',
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                  }}>
                  <div style={{
                    width:'42px', height:'42px',
                    borderRadius:'12px',
                    background: b.avatarBg,
                    color: b.avatarFg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'15px', fontWeight:700,
                    flexShrink:0,
                  }}>
                    {b.initial}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px', flexWrap:'wrap' }}>
                      <span style={{
                        fontSize:'14px', fontWeight:700, color: COLORS.t1,
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                        maxWidth:'180px',
                      }}>
                        {b.name}
                      </span>
                      {isSamePurpose && (
                        <span style={{
                          padding:'1px 6px',
                          background: '#D1FAE5', color:'#047857',
                          borderRadius:'3px',
                          fontSize:'9px', fontWeight:700,
                        }}>
                          {menuLabel} 거래
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                      {b.bizNumber} · {b.industry}
                    </div>
                  </div>
                  <span style={{ fontSize:'11px', color: COLORS.t5, flexShrink:0, fontWeight:500 }}>
                    {b.lastUsedAt}
                  </span>
                </button>
              )
            })}
          </div>

        </div>

        {/* 하단 sticky 조회 버튼 */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'12px 16px 24px',
          borderTop: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.bgCard,
        }}>
          <button onClick={handleLookup}
            disabled={!bizValid}
            style={{
              width:'100%', height:'52px',
              background: bizValid ? theme.brandDark : COLORS.bgMuted,
              color: bizValid ? '#fff' : COLORS.t4,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor: bizValid ? 'pointer' : 'default',
              fontFamily:'inherit',
              boxShadow: bizValid ? SHADOWS.card : 'none',
            }}>
              사업자 조회
            </button>
        </div>
      </div>
    </PhoneShell>
  )
}
