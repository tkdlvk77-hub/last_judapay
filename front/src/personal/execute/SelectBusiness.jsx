import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, FUND_COLORS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useScrollRestore } from '../../hooks/useScrollRestore'

// 최근 거래 사업자
const RECENT_BUSINESSES = [
  {
    id:'b1', name:'(주)오로라', initial:'오',
    bizNumber:'123-45-67890', representative:'김대표',
    industry:'정보통신업', address:'서울 강남구',
    establishedAt:'2018.03.15', taxType:'일반과세자',
    status:'normal', lastUsedFor:'freelance', lastUsedAt:'3일 전',
  },
  {
    id:'b2', name:'(주)벨라부동산중개', initial:'벨',
    bizNumber:'456-78-90123', representative:'박벨라',
    industry:'부동산 임대', address:'서울 강남구',
    establishedAt:'2020.06.01', taxType:'일반과세자',
    status:'normal', lastUsedFor:'realestate', lastUsedAt:'2주 전',
  },
  {
    id:'b3', name:'파스타하우스 강남점', initial:'파',
    bizNumber:'789-01-23456', representative:'정파스',
    industry:'음식점업', address:'서울 강남구',
    establishedAt:'2022.11.20', taxType:'간이과세자',
    status:'normal', lastUsedFor:'freelance', lastUsedAt:'1개월 전',
  },
]

const PURPOSE_META = {
  freelance:  { title:'외주비',         route:'/execute/personal/freelance',     badgeText:'외주비' },
  realestate: { title:'부동산',         route:'/execute/personal/realestate',    badgeText:'부동산' },
  invest:     { title:'투자',           route:'/execute/business/invest',        badgeText:'투자' },
}

// 사업자번호 정규화 (123-45-67890)
const formatBizNumber = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0,3)}-${digits.slice(3)}`
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`
}

export default function SelectBusiness() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const [searchParams] = useSearchParams()
  const purpose = searchParams.get('purpose') || 'freelance'
  const meta = PURPOSE_META[purpose] || PURPOSE_META.freelance

  const [mode, setMode] = useState('input') // 'input' | 'result'
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
          industry:'서비스업',
          status:'closed',
          closedAt:'2025.08.31',
          monthsClosed: 8,
          isBusiness: true,
          riskAccepted: false,
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
          status:'normal',
          isBusiness: true,
          phone:'02-1234-5678',
          isJudaUser: false,    // 신규 조회 사업자는 미가입 (이메일 입력 필요)
        },
      })
    }
    setMode('result')
    setVendorEmail('')
  }

  const handleSelectRecent = (biz) => {
    // 최근 거래 사업자 = 가입자 가정 (이메일 불필요)
    const recipient = {
      ...biz,
      isBusiness: true,
      verified: true,
      isJudaUser: true,
      kyc:'국세청 검증 ✓',
      phone: biz.phone || '02-0000-0000',
      // 호환 별칭
      brn: biz.bizNumber,
      ceo: biz.representative,
    }
    navigate(meta.route, { state: { recipient } })
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
    navigate(meta.route, { state: { recipient } })
  }

  // ───────────── 결과 화면 (정상 사업자) ─────────────
  if (mode === 'result' && lookupResult?.status === 'normal') {
    const b = lookupResult.business
    return (
      <PhoneShell>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
          <DarkHeader
            smallTitle="사업자 조회 결과"
            badge="국세청 검증 ✓"
            badgeTone="cashable"
            bigTitle="정상 사업자예요"
            sub="국세청 사업자등록 정보와 일치"
            onBack={handleBack}
                      exitTo="/home"
          headerGrad={theme.headerGrad}
/>

          <div style={{ padding:'18px 16px 24px' }}>

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
                  display:'flex', justifyContent:'space-between',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <span style={{ fontSize:'12px', color: COLORS.t4 }}>{row.label}</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* 미가입 안내 + 이메일 입력 (조회로 찾은 사업자는 미가입자) — 우선 표시 */}
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

            {/* 자동 처리 안내 (녹색 박스) */}
            <div style={{
              background:'#ECFDF5',
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              marginBottom:'14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                <div style={{
                  width:'18px', height:'18px', borderRadius:'50%',
                  background:'#10B981',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="10" height="8" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>
                  검수 완료 시 자동 처리됩니다
                </span>
              </div>
              {[
                '세금계산서 자동 발행 (부가세 별도)',
                '본인 사업자 계좌로 자동 출금',
                '증빙 자동 보관 (5년)',
                '분쟁 시 거래 원장 자동 증거',
              ].map(text => (
                <div key={text} style={{
                  display:'flex', alignItems:'center', gap:'7px',
                  marginTop:'5px',
                  fontSize:'11px', color:'#047857',
                }}>
                  <svg width="9" height="8" viewBox="0 0 9 8" fill="none" style={{ flexShrink:0 }}>
                    <path d="M1 4l2.5 2.5L8 1" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {text}
                </div>
              ))}
            </div>

            <div style={{
              padding:'12px 14px',
              background:'#EDF3FA',
              borderRadius: RADIUS.md,
              fontSize:'11px', color:'#1E5294', lineHeight:1.65,
            }}>
              ⓘ 국세청 사업자등록 정보(쿠콘 연동)와 일치 · 부가세 별도 처리 + 자동 증빙 보관
            </div>
          </div>
        </div>

        <div style={{
          padding:'12px 16px 24px',
          borderTop: `1px solid ${COLORS.borderSoft}`,
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
                  background: canProceed ? theme.brand : COLORS.bgMuted,
                  color: canProceed ? '#fff' : COLORS.t5,
                  border:'none', borderRadius: RADIUS.md,
                  fontSize:'15px', fontWeight:700,
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                  fontFamily:'inherit',
                  boxShadow: canProceed ? SHADOWS.buttonBrand : 'none',
                }}>
                {needEmail && !emailValid
                  ? '사업자 이메일을 입력하세요'
                  : '이 사업자에게 보내기'}
              </button>
            )
          })()}
        </div>
      </PhoneShell>
    )
  }

  // ───────────── 결과 화면 (위험 — 폐업) ─────────────
  if (mode === 'result' && lookupResult?.status === 'risk') {
    const b = lookupResult.business
    return (
      <PhoneShell>
        <div style={{ flex:1, overflowY:'auto' }}>
          <DarkHeader
            smallTitle="사업자 조회 결과"
            badge="폐업 사업자"
            badgeTone="danger"
            bigTitle="폐업한 사업자예요"
            sub="진행 시 사기·자금세탁 의심 거래로 분류됩니다"
            onBack={handleBack}
                      exitTo="/home"
          headerGrad={theme.headerGrad}
/>

          <div style={{ padding:'18px 16px 24px' }}>

            {/* 폐업 경고 카드 (빨간) */}
            <div style={{
              background: COLORS.dangerBg,
              border:`1px solid ${COLORS.danger}`,
              borderRadius: RADIUS.lg,
              padding:'16px',
              marginBottom:'14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <div style={{
                  width:'22px', height:'22px', borderRadius:'50%',
                  background: COLORS.danger,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, color:'#fff', fontSize:'13px', fontWeight:700,
                }}>
                  !
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#B91C1C' }}>
                  폐업 사업자 · 거래 시 위험
                </span>
              </div>
              <div style={{ fontSize:'22px', fontWeight:700, color: COLORS.t1, marginBottom:'4px', letterSpacing:'-0.5px' }}>
                {b.name}
              </div>
              <div style={{ fontSize:'12px', color:'#B91C1C', fontWeight:600 }}>
                {b.bizNumber} · {b.closedAt} 폐업
              </div>
            </div>

            {/* 사업자 정보 */}
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
                { label:'상태',   value:`폐업 · ${b.monthsClosed}개월 경과`, danger:true },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  padding:'14px 16px',
                  display:'flex', justifyContent:'space-between',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <span style={{ fontSize:'12px', color: COLORS.t4 }}>{row.label}</span>
                  <span style={{
                    fontSize:'13px', fontWeight:600,
                    color: row.danger ? COLORS.danger : COLORS.t1,
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* 위험 안내 (노란 박스) */}
            <div style={{
              background:'#FFFBEB',
              border:'1px solid #FCD34D',
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              marginBottom:'14px',
            }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#854F0B', marginBottom:'8px' }}>
                위험 안내
              </div>
              {[
                '세금계산서 발행 불가',
                '증빙 처리 어려움',
                '사기·자금세탁 의심 거래로 분류될 수 있음',
                '분쟁 발생 시 회수 어려움',
              ].map(text => (
                <div key={text} style={{
                  display:'flex', alignItems:'center', gap:'7px',
                  marginTop:'5px',
                  fontSize:'11px', color:'#854F0B',
                }}>
                  <span style={{
                    display:'inline-block', width:'4px', height:'4px',
                    background:'#854F0B', borderRadius:'50%',
                    flexShrink:0,
                  }} />
                  {text}
                </div>
              ))}
            </div>

            <div style={{
              padding:'12px 14px',
              background:'#EDF3FA',
              borderRadius: RADIUS.md,
              fontSize:'11px', color:'#1E5294', lineHeight:1.65,
            }}>
              <strong>ⓘ</strong> 진행 시 본 거래는 자동으로 모니터링 대상에 등록됩니다. 사업자번호를 다시 확인해주세요.
            </div>
          </div>
        </div>

        <div style={{
          padding:'12px 16px 24px',
          display:'flex', gap:'8px',
          borderTop: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.bgCard,
        }}>
          <button onClick={handleBack}
            style={{
              flex:1, height:'52px',
              background: COLORS.bgMuted, color: COLORS.t2,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'13px', fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            다시 입력
          </button>
          <button onClick={handleProceed}
            style={{
              flex:1, height:'52px',
              background: COLORS.danger, color:'#fff',
              border:'none', borderRadius: RADIUS.md,
              fontSize:'13px', fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            위험 감수하고 진행
          </button>
        </div>
      </PhoneShell>
    )
  }

  // ───────────── 입력 화면 (디폴트) ─────────────
  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="사업자에게"
          badge={meta.badgeText}
          badgeTone="cashable"
          bigTitle={`어떤 사업자에게\n보내시나요?`}
          sub="국세청 사업자등록 정보로 진위 + 상태를 실시간 확인합니다"
          onBack={handleBack}
                  exitTo="/home"
          headerGrad={theme.headerGrad}
/>

        <div style={{ padding:'18px 16px 24px' }}>

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

          {/* 쿠콘 연동 안내 (파란) */}
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
              const isSamePurpose = b.lastUsedFor === purpose
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
                    background:'#D1FAE5', color:'#047857',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'15px', fontWeight:700,
                    flexShrink:0,
                  }}>
                    {b.initial}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{b.name}</span>
                      {isSamePurpose && (
                        <span style={{
                          padding:'1px 6px',
                          background: '#D1FAE5', color:'#047857',
                          borderRadius:'3px',
                          fontSize:'9px', fontWeight:700,
                        }}>
                          {meta.title} 거래
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
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={handleLookup}
          disabled={!bizValid}
          style={{
            width:'100%', height:'52px',
            background: bizValid ? theme.brand : COLORS.bgMuted,
            color: bizValid ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: bizValid ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: bizValid ? SHADOWS.buttonBrand : 'none',
          }}>
            사업자 조회
          </button>
        </div>
    </PhoneShell>
  )
}
