import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../transactionStore'
import ConfirmStep from '../../shared/execute/ConfirmStep'
import PinStep from '../../shared/execute/PinStep'
import DoneStep from '../../shared/execute/DoneStep'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS, FUND_COLORS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useUser } from '../../contexts/UserContext'
import { useStepHistory } from '../../hooks/useStepHistory'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const MY_BALANCE = 1932000

// 부동산 단계별 컬러 (도메인 의미 보존)
const SPLIT_COLORS = {
  prepay:  { bg:'#D1FAE5', border:'#10B981', text:'#047857' },  // 계약금 = 녹색
  middle:  { bg:'#FEF3C7', border:'#F59E0B', text:'#854F0B' },  // 중도금 = 황갈
  final:   { bg:'#EDE9FE', border:'#7C3AED', text:'#5B21B6' },  // 잔금 = 보라
}

const REGISTRY_RESULT = {
  status: 'risk',
  address: '서울 강남구 역삼동 123-45',
  buildingType: '집합건물 · 전용 59㎡',
  checkedAt: '2026.05.06',
  warnings: [
    { level:'high', title:'소유자 불일치', detail:'등기부 소유자: 박소유 / 임대인: 임대인 입력 정보' },
    { level:'high', title:'근저당권 과다', detail:'설정액 180,000,000원 (예상 보증금 100,000,000원 초과)' },
    { level:'mid',  title:'다가구 주택', detail:'다른 세입자 보증금 합산 시 우선순위 확인 권장' },
  ],
}

// ─── 금액 입력 ─────────────────────────────────────────
function AmountDisplay({ amount, onChange, onClear }) {
  const len = amount ? amount.length : 1
  const fontSize = len <= 6 ? 44 : len <= 8 ? 36 : len <= 10 ? 28 : 22

  return (
    <div style={{ position:'relative', height:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ display:'inline-flex', alignItems:'baseline', gap:'3px', transform:'translateX(18px)' }}>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          style={{
            fontSize:`${fontSize}px`,
            fontWeight:700, lineHeight:1,
            color: amount ? COLORS.t1 : COLORS.t5,
            background:'transparent', border:'none', outline:'none',
            textAlign:'center', fontFamily:'inherit',
            width:'200px', transition:'font-size 0.15s',
            WebkitAppearance:'none', MozAppearance:'textfield',
          }}
        />
        <span style={{
          fontSize: fontSize >= 36 ? '26px' : fontSize >= 28 ? '20px' : '16px',
          fontWeight:700, lineHeight:1,
          color: amount ? COLORS.t1 : COLORS.t5,
          transition:'font-size 0.15s',
        }}>원</span>
      </div>
      {amount > 0 && (
        <button onClick={onClear}
          style={{
            position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)',
            width:'28px', height:'28px', borderRadius:'50%',
            background: COLORS.bgMuted, border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default function ExecuteRealEstate() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient
  const theme = getAccountTheme()
  const { userType } = useUser()

  // 기업/개인 분기
  const isBizUser = userType === 'business'
  const exitTo = isBizUser ? '/home-business' : '/home'
  const selectPath = isBizUser
    ? '/execute/business/select-vendor?menu=realestate'
    : '/execute/personal/select?purpose=realestate'

  useEffect(() => {
    if (!recipient) {
      navigate(selectPath, { replace:true })
    }
  }, [recipient, navigate, selectPath])

  const [step, setStep] = useState(1)
  const [rentalType, setRentalType] = useState('jeonse')
  const [address, setAddress] = useState('서울시 강남구 역삼동 123-45')
  const [unitNumber, setUnitNumber] = useState('')
  const [registryChecked, setRegistryChecked] = useState(false)
  const [registryView, setRegistryView] = useState(false)
  const [registryAccepted, setRegistryAccepted] = useState(false)

  const [walletId, setWalletId] = useState('my')

  const [deposit, setDeposit] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [rentPayDay, setRentPayDay] = useState(25)
  const [contractStart, setContractStart] = useState('2026-06-01')
  const [contractEnd, setContractEnd] = useState('2028-05-31')
  const [autoRenewAlert, setAutoRenewAlert] = useState(true)

  const [scheduleRatios, setScheduleRatios] = useState([
    { id:'prepay', label:'계약금', pct:10, trigger:'양측 서명 후 즉시 임대인 계좌로', deadline:null },
    { id:'middle', label:'중도금', pct:40, trigger:'지정 날짜에 자동 입금', deadline:'2026-07-01' },
    { id:'final',  label:'잔금',   pct:50, trigger:'조건부 (3가지 모두 충족 시)', deadline:'2026-08-01' },
  ])

  const [pin, setPin] = useState('')

  if (!recipient) return null

  const depositNum = parseInt(deposit) || 0
  const depositFmt = depositNum.toLocaleString('ko-KR')
  const monthlyRentNum = parseInt(monthlyRent) || 0
  const monthlyRentFmt = monthlyRentNum.toLocaleString('ko-KR')
  const totalPct = scheduleRatios.reduce((s, r) => s + r.pct, 0)

  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? MY_BALANCE
  const remaining = walletBalance - depositNum

  const contractMonths = (() => {
    const start = new Date(contractStart)
    const end = new Date(contractEnd)
    return Math.max(1, Math.round((end - start) / (1000*60*60*24*30.44)))
  })()

  const changeRecipient = () => {
    if (isBizUser) {
      navigate('/execute/business/select-vendor?menu=realestate')
    } else {
      navigate(recipient.isBusiness
        ? '/execute/personal/select?purpose=realestate'
        : '/execute/personal/select?purpose=realestate')
    }
  }

  const pinInput = (k) => {
    if (k === 'del') { setPin(p => p.slice(0,-1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) setTimeout(() => { setPin(''); setStep('done') }, 400)
  }

  const goBack = () => {
    if (step === 1 && registryView) { setRegistryView(false); return }
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(3)
    else if (step === 'done') return
    else if (typeof step === 'number') setStep(step - 1)
  }
  useStepHistory(goBack, step === 1, !!recipient)

  const updateScheduleRatio = (id, newPct) => {
    setScheduleRatios(rs => rs.map(r => r.id === id ? { ...r, pct: Math.max(0, Math.min(100, newPct)) } : r))
  }

  // ───────────── 1단계: 등기부 조회 결과 ─────────────
  if (step === 1 && registryView) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="등기부 조회 결과"
          badge="위험 검출"
          badgeTone="danger"
          step={1} totalSteps={3}
          bigTitle="위험 요소가 있어요"
          sub={`${REGISTRY_RESULT.warnings.filter(w => w.level === 'high').length}건 발견 — 진행 전 반드시 확인하세요`}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo={exitTo}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 주소 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px',
            marginBottom:'14px',
          }}>
            <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
              {REGISTRY_RESULT.address}
            </div>
            <div style={{ fontSize:'11px', color: COLORS.t4 }}>
              {REGISTRY_RESULT.buildingType} · {REGISTRY_RESULT.checkedAt} 조회
            </div>
          </div>

          {/* 위험 (high) — 빨간 박스 */}
          <div style={{
            background: COLORS.dangerBg,
            border:`1px solid ${COLORS.danger}`,
            borderRadius: RADIUS.lg,
            padding:'14px',
            marginBottom:'10px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <div style={{
                width:'22px', height:'22px', borderRadius:'50%',
                background: COLORS.danger, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'13px', fontWeight:700, flexShrink:0,
              }}>!</div>
              <span style={{ fontSize:'13px', fontWeight:700, color:'#B91C1C' }}>
                위험 — 진행 전 반드시 확인
              </span>
            </div>
            {REGISTRY_RESULT.warnings.filter(w => w.level === 'high').map(w => (
              <div key={w.title} style={{
                background: COLORS.bgCard,
                borderRadius: RADIUS.md,
                padding:'12px',
                marginBottom:'6px',
              }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#B91C1C', marginBottom:'4px' }}>
                  {w.title}
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t2, lineHeight:1.55 }}>
                  {w.detail}
                </div>
              </div>
            ))}
          </div>

          {/* 주의 (mid) — 노란 박스 */}
          {REGISTRY_RESULT.warnings.filter(w => w.level === 'mid').length > 0 && (
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
                  fontSize:'13px', fontWeight:700, flexShrink:0,
                }}>!</div>
                <span style={{ fontSize:'13px', fontWeight:700, color:'#854F0B' }}>주의</span>
              </div>
              {REGISTRY_RESULT.warnings.filter(w => w.level === 'mid').map(w => (
                <div key={w.title} style={{ fontSize:'11px', color:'#854F0B', lineHeight:1.6 }}>
                  <strong>{w.title}</strong> — {w.detail}
                </div>
              ))}
            </div>
          )}

          {/* 등기부 기본 정보 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px',
            marginBottom:'14px',
          }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'12px' }}>
              등기부 기본 정보
            </div>
            {[
              { label:'소유자', value:'박소유 (불일치)', tone:'danger' },
              { label:'근저당권', value:'1억 8천만원', tone:'danger' },
              { label:'가압류', value:'없음', tone:'success' },
              { label:'전세권', value:'없음', tone:'success' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display:'flex', justifyContent:'space-between',
                fontSize:'12px',
                paddingBottom: i < arr.length-1 ? '10px' : 0,
                marginBottom: i < arr.length-1 ? '10px' : 0,
                borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
              }}>
                <span style={{ color: COLORS.t4 }}>{row.label}</span>
                <span style={{
                  fontWeight:600,
                  color: row.tone === 'danger' ? COLORS.danger
                       : row.tone === 'success' ? '#047857'
                       : COLORS.t1,
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* 전입신고 안내 */}
          <div style={{
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294', lineHeight:1.65,
          }}>
            <strong>ⓘ 전입신고 + 확정일자 안내</strong><br />
            입주 후 전입신고와 확정일자를 꼭 받으세요. 보증금 보호를 위한 법적 요건입니다.
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        display:'flex', gap:'8px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => { setRegistryView(false); setRegistryChecked(false); setRegistryAccepted(false) }}
          style={{
            flex:1, height:'52px',
            background: COLORS.bgMuted, color: COLORS.t2,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'13px', fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
          }}>
          다른 주소 재조회
        </button>
        <button onClick={() => { setRegistryAccepted(true); setRegistryView(false); setStep(2) }}
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

  // ───────────── 1단계: 임대 유형 + 주소 + 등기부 조회 ─────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="부동산"
          badge="출금 가능"
          badgeTone="cashable"
          step={1} totalSteps={3}
          bigTitle={`어떤 집을\n계약하시나요?`}
          sub="등기부를 먼저 조회해요. 소유자 + 위험 요소를 자동 검출합니다"
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo={exitTo}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 임대인 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            display:'flex', alignItems:'center', gap:'12px',
            marginBottom:'18px',
          }}>
            <div style={{
              width:'42px', height:'42px',
              borderRadius: recipient.isBusiness ? '12px' : '50%',
              background: recipient.isBusiness
                ? (recipient.riskAccepted ? COLORS.dangerBg : '#D1FAE5')
                : (recipient.avatarBg || GRADIENTS.brandSubtle),
              color: recipient.isBusiness
                ? (recipient.riskAccepted ? '#B91C1C' : '#047857')
                : (recipient.avatarFg || '#fff'),
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: recipient.emoji ? '22px' : '15px',
              fontWeight:700, flexShrink:0,
            }}>
              {recipient.emoji || recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{recipient.name}</span>
                <span style={{
                  padding:'1px 6px',
                  background: FUND_COLORS.realestate.bg,
                  color: FUND_COLORS.realestate.main,
                  borderRadius:'4px',
                  fontSize:'9px', fontWeight:700,
                }}>
                  임대인
                </span>
                {recipient.isBusiness ? (
                  <span style={{
                    padding:'1px 6px',
                    background: recipient.riskAccepted ? COLORS.dangerBg : '#D1FAE5',
                    color: recipient.riskAccepted ? '#B91C1C' : '#047857',
                    borderRadius:'4px',
                    fontSize:'9px', fontWeight:700,
                  }}>
                    {recipient.riskAccepted ? '폐업' : '사업자'}
                  </span>
                ) : recipient.verified && (
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="#10B981"/>
                    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                {recipient.isBusiness
                  ? `${recipient.bizNumber} · ${recipient.industry || ''}`
                  : `${recipient.verified ? '실명 인증' : recipient.kyc} · ${recipient.phone}`}
              </div>
            </div>
            <button onClick={changeRecipient}
              style={{
                fontSize:'12px', fontWeight:600,
                color: theme.brand,
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
              }}>
              변경
            </button>
          </div>

          {/* 임대 유형 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            임대 유형
          </div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'18px' }}>
            {[
              { id:'jeonse', label:'전세', sub:'보증금만' },
              { id:'monthly', label:'월세', sub:'보증금 + 월세' },
            ].map(t => {
              const active = rentalType === t.id
              return (
                <button key={t.id} onClick={() => setRentalType(t.id)}
                  style={{
                    flex:1, padding:'14px',
                    background: active ? COLORS.bgCard : COLORS.bgMuted,
                    boxShadow: active ? SHADOWS.card : 'none',
                    border: active ? `1.5px solid ${theme.brand}` : 'none',
                    borderRadius: RADIUS.md,
                    cursor:'pointer', fontFamily:'inherit', textAlign:'center',
                  }}>
                  <div style={{
                    fontSize:'14px', fontWeight:700,
                    color: active ? COLORS.t1 : COLORS.t3,
                    marginBottom:'3px',
                  }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4 }}>{t.sub}</div>
                </button>
              )
            })}
          </div>

          {/* 주소 입력 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            주소 입력
          </div>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="예: 서울시 강남구 역삼동 123-45"
            style={{
              width:'100%', height:'48px',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg,
              padding:'0 16px',
              fontSize:'13px', color: COLORS.t1,
              outline:'none', fontFamily:'inherit',
              marginBottom:'8px',
              boxSizing:'border-box',
            }} />
          <input type="text" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}
            placeholder="동·호수 (선택)"
            style={{
              width:'100%', height:'48px',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg,
              padding:'0 16px',
              fontSize:'13px', color: COLORS.t1,
              outline:'none', fontFamily:'inherit',
              marginBottom:'18px',
              boxSizing:'border-box',
            }} />

          {/* 등기부 조회로 확인하는 것 */}
          <div style={{
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            padding:'12px 14px',
            marginBottom:'14px',
          }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#1E5294', marginBottom:'8px' }}>
              등기부 조회로 확인하는 것
            </div>
            {[
              '소유자 (임대인과 동일한지)',
              '근저당권 (보증금보다 빚이 많은지)',
              '가압류 / 압류 여부',
              '다른 세입자 전세권 여부',
            ].map(text => (
              <div key={text} style={{
                display:'flex', alignItems:'center', gap:'6px',
                marginTop:'5px',
                fontSize:'11px', color:'#2D6BB0',
              }}>
                <span style={{
                  display:'inline-block', width:'4px', height:'4px',
                  background:'#2D6BB0', borderRadius:'50%',
                  flexShrink:0,
                }} />
                {text}
              </div>
            ))}
          </div>

          {!registryChecked && (
            <div style={{
              padding:'12px 14px',
              background:'#FFFBEB',
              borderRadius: RADIUS.md,
              fontSize:'11px', color:'#854F0B', lineHeight:1.65,
            }}>
              ⓘ 등기부 조회 비용은 주다페이가 부담합니다. 쿠콘 API 연동 · 약 5초 소요
            </div>
          )}

          {registryChecked && !registryAccepted && (
            <div style={{
              background: COLORS.dangerBg,
              borderRadius: RADIUS.md,
              padding:'12px 14px',
            }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#B91C1C', marginBottom:'4px' }}>
                ⚠ 위험 요소 검출 — {REGISTRY_RESULT.warnings.filter(w => w.level === 'high').length}건
              </div>
              <div style={{ fontSize:'11px', color:'#B91C1C' }}>
                {REGISTRY_RESULT.warnings.filter(w => w.level === 'high').map(w => w.title).join(' · ')}
              </div>
            </div>
          )}

          {registryChecked && registryAccepted && (
            <div style={{
              background:'#ECFDF5',
              borderRadius: RADIUS.md,
              padding:'12px 14px',
              display:'flex', alignItems:'center', gap:'10px',
            }}>
              <div style={{
                width:'20px', height:'20px', borderRadius:'50%',
                background:'#10B981',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>
                  등기부 조회 완료 (위험 감수)
                </div>
                <div style={{ fontSize:'11px', color:'#047857' }}>
                  {REGISTRY_RESULT.address}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
        display:'flex', flexDirection:'column', gap:'8px',
      }}>
        {!registryChecked ? (
          <button onClick={() => { setRegistryChecked(true); setRegistryView(true) }}
            disabled={!address.trim()}
            style={{
              width:'100%', height:'52px',
              background: address.trim() ? theme.brand : COLORS.bgMuted,
              color: address.trim() ? '#fff' : COLORS.t4,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor: address.trim() ? 'pointer' : 'default',
              fontFamily:'inherit',
              boxShadow: address.trim() ? SHADOWS.buttonBrand : 'none',
            }}>
            등기부 조회하기 (쿠콘)
          </button>
        ) : (
          <>
            <button onClick={() => setRegistryView(true)}
              style={{
                width:'100%', height:'42px',
                background:'transparent', color: theme.brand,
                border:`1px solid ${COLORS.borderSoft}`,
                borderRadius: RADIUS.md,
                fontSize:'13px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              등기부 조회 결과 다시 보기
            </button>
            <button onClick={() => setStep(2)} disabled={!registryAccepted}
              style={{
                width:'100%', height:'52px',
                background: registryAccepted ? theme.brand : COLORS.bgMuted,
                color: registryAccepted ? '#fff' : COLORS.t4,
                border:'none', borderRadius: RADIUS.md,
                fontSize:'15px', fontWeight:700,
                cursor: registryAccepted ? 'pointer' : 'default',
                fontFamily:'inherit',
                boxShadow: registryAccepted ? SHADOWS.buttonBrand : 'none',
              }}>
              {registryAccepted ? '다음 (임대차 조건)' : '위험 항목을 확인해주세요'}
            </button>
          </>
        )}
      </div>
    </PhoneShell>
  )

  // ───────────── 2단계: 임대차 조건 ─────────────
  if (step === 2) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="임대차 조건 입력"
          step={2} totalSteps={3}
          bigTitle={rentalType === 'jeonse' ? '보증금을 입력하세요' : '보증금과 월세를\n입력하세요'}
          sub={`${REGISTRY_RESULT.address} · 위험 감수 후 진행`}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo={exitTo}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 출금 지갑 선택 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t3, marginBottom:'6px', padding:'0 4px' }}>
              출금 지갑
            </div>
            <WalletPicker
              executeType="realestate"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setDeposit('') }}
            />
          </div>

          {/* 보증금 */}
          <div style={{ textAlign:'center', marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'10px' }}>보증금</div>
            <AmountDisplay amount={deposit} onChange={setDeposit} onClear={() => setDeposit('')} />
            <div style={{
              fontSize:'11px',
              color: depositNum > walletBalance ? COLORS.danger : COLORS.t4,
              marginTop:'8px',
            }}>
              {depositNum > walletBalance ? `${selectedWallet?.label || 'MY 지갑'} 잔액 부족 · 충전 필요` : `${selectedWallet?.label || 'MY 지갑'} 잔액 ${walletBalance.toLocaleString()}원`}
            </div>
          </div>

          {/* 빠른 보증금 */}
          <div style={{ display:'flex', gap:'6px', marginBottom: rentalType === 'monthly' ? '24px' : '22px' }}>
            {[10000000, 50000000, 100000000, 200000000].map(v => (
              <button key={v}
                onClick={() => setDeposit(String((parseInt(deposit) || 0) + v))}
                style={{
                  flex:1, height:'34px',
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  border:'none', borderRadius:'10px',
                  fontSize:'11px', fontWeight:600,
                  color: COLORS.t2,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                +{v >= 100000000 ? `${v/100000000}억` : `${v/10000}만`}
              </button>
            ))}
          </div>

          {/* 월세 (monthly만) */}
          {rentalType === 'monthly' && (
            <>
              <div style={{
                paddingTop:'18px',
                marginBottom:'18px',
                borderTop: `1px solid ${COLORS.borderSoft}`,
              }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'10px' }}>월세 (매월)</div>
                  <AmountDisplay amount={monthlyRent} onChange={setMonthlyRent} onClear={() => setMonthlyRent('')} />
                  <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'8px' }}>
                    {monthlyRentNum > 0 ? `연간 ${(monthlyRentNum * 12).toLocaleString()}원` : '월 임대료를 입력하세요'}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:'6px', marginBottom:'18px' }}>
                {[300000, 500000, 1000000, 1500000].map(v => (
                  <button key={v}
                    onClick={() => setMonthlyRent(String((parseInt(monthlyRent) || 0) + v))}
                    style={{
                      flex:1, height:'34px',
                      background: COLORS.bgCard,
                      boxShadow: SHADOWS.card,
                      border:'none', borderRadius:'10px',
                      fontSize:'11px', fontWeight:600,
                      color: COLORS.t2,
                      cursor:'pointer', fontFamily:'inherit',
                    }}>
                    +{v/10000}만
                  </button>
                ))}
              </div>

              {/* 월세 자동 차감일 */}
              <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
                월세 자동 차감일
              </div>
              <div style={{
                background: COLORS.bgCard,
                boxShadow: SHADOWS.card,
                borderRadius: RADIUS.lg,
                padding:'14px 16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom:'8px',
              }}>
                <span style={{ fontSize:'13px', color: COLORS.t3 }}>매월</span>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input type="number" min="1" max="28" value={rentPayDay}
                    onChange={e => setRentPayDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                    style={{
                      width:'52px', fontSize:'20px', fontWeight:700,
                      color: COLORS.t1,
                      background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                      textAlign:'right',
                    }} />
                  <span style={{ fontSize:'15px', color: COLORS.t3, fontWeight:600 }}>일</span>
                </div>
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'18px', paddingLeft:'4px' }}>
                매월 {rentPayDay}일에 내 지갑에서 {recipient.name}{recipient.isBusiness ? '' : '에게'}로 자동 차감 (1~28일)
              </div>

              {/* 월세 자동 결제 안내 */}
              {monthlyRentNum > 0 && (
                <div style={{
                  background:'#EDF3FA',
                  borderRadius: RADIUS.lg,
                  padding:'14px 16px',
                  marginBottom:'18px',
                }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#1E5294', marginBottom:'10px' }}>
                    월세 자동 결제 안내
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#2D6BB0', marginBottom:'5px' }}>
                    <span>매월 차감액</span><span>{monthlyRentFmt}원</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#2D6BB0', marginBottom:'5px' }}>
                    <span>차감일</span><span>매월 {rentPayDay}일</span>
                  </div>
                  <div style={{
                    display:'flex', justifyContent:'space-between',
                    fontSize:'13px', fontWeight:700, color:'#1E5294',
                    borderTop:'1px solid #B5CFE8',
                    paddingTop:'8px', marginTop:'8px',
                  }}>
                    <span>잔액 부족 시</span><span>3일 전 알림 + 충전 유도</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 계약 기간 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            계약 기간
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px' }}>
            <div style={{
              flex:1,
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'10px 14px',
            }}>
              <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'2px' }}>시작</div>
              <input type="date" value={contractStart} onChange={e => setContractStart(e.target.value)}
                style={{
                  width:'100%', fontSize:'13px', fontWeight:600,
                  color: COLORS.t1,
                  background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                  boxSizing:'border-box', maxWidth:'100%',
                  WebkitAppearance:'none', appearance:'none',
                }} />
            </div>
            <span style={{ color: COLORS.t4, fontSize:'14px' }}>—</span>
            <div style={{
              flex:1,
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'10px 14px',
            }}>
              <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'2px' }}>종료</div>
              <input type="date" value={contractEnd} onChange={e => setContractEnd(e.target.value)}
                style={{
                  width:'100%', fontSize:'13px', fontWeight:600,
                  color: COLORS.t1,
                  background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                  boxSizing:'border-box', maxWidth:'100%',
                  WebkitAppearance:'none', appearance:'none',
                }} />
            </div>
          </div>
          <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'18px', paddingLeft:'4px' }}>
            {contractMonths}개월 ({(contractMonths/12).toFixed(1)}년)
          </div>

          {/* 자동 이행 토글 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:'18px',
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                자동 이행
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                계약 만료 3개월 전 알림 + 갱신/반환 안내
              </div>
            </div>
            <button onClick={() => setAutoRenewAlert(!autoRenewAlert)}
              style={{
                width:'44px', height:'26px',
                borderRadius:'13px',
                background: autoRenewAlert ? theme.brand : COLORS.border,
                border:'none', cursor:'pointer', padding:0,
                position:'relative',
                transition:'background .15s',
                flexShrink:0,
              }}>
              <div style={{
                position:'absolute', top:'3px',
                left: autoRenewAlert ? '21px' : '3px',
                width:'20px', height:'20px',
                borderRadius:'50%', background:'#fff',
                transition:'left .15s',
                boxShadow:'0 1px 3px rgba(0,0,0,.2)',
              }} />
            </button>
          </div>

          {/* 임대차 계약서 (선택) */}
          <button style={{
              width:'100%',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg,
              padding:'14px',
              display:'flex', alignItems:'center', gap:'12px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              marginBottom:'14px',
            }}>
            <div style={{
              width:'36px', height:'36px',
              background:'#EDE9FE', borderRadius: RADIUS.md,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                임대차 계약서 (선택)
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                PDF 첨부 + AI 위험 진단 · 분쟁 증거 보관
              </div>
            </div>
            <span style={{ color: theme.brand, fontSize:'12px', fontWeight:600, flexShrink:0 }}>
              PDF 첨부 ›
            </span>
          </button>

          {/* 자동 처리 안내 */}
          <div style={{
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            padding:'12px 14px',
          }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#1E5294', marginBottom:'8px' }}>
              자동 처리
            </div>
            {[
              '자금 집행 스케줄에 따라 임대인에게 입금',
              '계약 만료 3개월 전 갱신/반환 알림',
              '분쟁 시 등기부 + 자금 흐름 자동 증거',
              '5년 보관 (라이센스 의무)',
            ].map(text => (
              <div key={text} style={{
                display:'flex', alignItems:'center', gap:'6px',
                marginTop:'5px',
                fontSize:'11px', color:'#2D6BB0',
              }}>
                <span style={{
                  display:'inline-block', width:'4px', height:'4px',
                  background:'#2D6BB0', borderRadius:'50%',
                  flexShrink:0,
                }} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        {(() => {
          const step2Valid = depositNum >= 1000 && (rentalType === 'jeonse' || monthlyRentNum >= 1000)
          const buttonText = depositNum < 1000
            ? '보증금을 입력하세요'
            : rentalType === 'monthly' && monthlyRentNum < 1000
            ? '월세를 입력하세요'
            : '다음 (자금 집행 스케줄)'
          return (
            <button onClick={() => step2Valid && setStep(3)}
              disabled={!step2Valid}
              style={{
                width:'100%', height:'52px',
                background: step2Valid ? theme.brand : COLORS.bgMuted,
                color: step2Valid ? '#fff' : COLORS.t4,
                border:'none', borderRadius: RADIUS.md,
                fontSize:'15px', fontWeight:700,
                cursor: step2Valid ? 'pointer' : 'default',
                fontFamily:'inherit',
                boxShadow: step2Valid ? SHADOWS.buttonBrand : 'none',
              }}>
              {buttonText}
            </button>
          )
        })()}
      </div>
    </PhoneShell>
  )

  // ───────────── 3단계: 자금 집행 스케줄 ─────────────
  if (step === 3) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="자금 집행 스케줄"
          step={3} totalSteps={3}
          bigTitle={`${depositFmt}원을\n어떻게 보낼까요?`}
          sub={`${REGISTRY_RESULT.address}`}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo={exitTo}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 단계별 카드 (계약금 / 중도금 / 잔금) */}
          {scheduleRatios.map((r, i) => {
            const colors = SPLIT_COLORS[r.id]
            const amt = Math.round((depositNum * r.pct) / 100)
            return (
              <div key={r.id} style={{
                background: COLORS.bgCard,
                boxShadow: SHADOWS.card,
                borderRadius: RADIUS.lg,
                borderLeft:`5px solid ${colors.border}`,
                padding:'14px',
                marginBottom:'10px',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1, minWidth:0 }}>
                    <div style={{
                      width:'24px', height:'24px',
                      borderRadius:'50%',
                      background: colors.border,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', fontWeight:700, color:'#fff',
                      flexShrink:0,
                    }}>
                      {i+1}
                    </div>
                    <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{r.label}</span>
                    {r.id === 'final' && (
                      <span style={{
                        padding:'2px 7px',
                        background:'#FFFBEB', color:'#854F0B',
                        borderRadius:'4px',
                        fontSize:'9px', fontWeight:700,
                        flexShrink:0,
                      }}>
                        조건부
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
                    <input type="number" min="0" max="100" value={r.pct}
                      onChange={e => updateScheduleRatio(r.id, parseInt(e.target.value) || 0)}
                      style={{
                        width:'48px', fontSize:'17px', fontWeight:700,
                        color: colors.text,
                        background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                        textAlign:'right',
                      }} />
                    <span style={{ fontSize:'14px', color: colors.text, fontWeight:700 }}>%</span>
                  </div>
                </div>

                <div style={{ paddingLeft:'34px' }}>
                  <div style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    marginBottom:'5px',
                  }}>
                    <span style={{ fontSize:'16px', fontWeight:700, color: colors.text }}>
                      {amt.toLocaleString()}원
                    </span>
                    {r.deadline && (
                      <span style={{ color: COLORS.t4, fontSize:'11px' }}>
                        {new Date(r.deadline).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'11px', color: COLORS.t4, lineHeight:1.55 }}>
                    {r.trigger}
                  </div>

                  {/* 잔금 조건부 — 노란 박스 */}
                  {r.id === 'final' && (
                    <div style={{
                      marginTop:'12px',
                      padding:'12px 14px',
                      background:'#FFFBEB',
                      border:'1px solid #FCD34D',
                      borderRadius: RADIUS.md,
                    }}>
                      <div style={{
                        fontSize:'11px', fontWeight:700, color:'#854F0B',
                        marginBottom:'8px',
                      }}>
                        잔금 집행 조건 (모두 충족 시 자동)
                      </div>
                      {[
                        { label:'근저당권 말소 확인', sub:'쿠콘 자동 검증' },
                        { label:'국세/지방세 완납 증명', sub:'홈택스 PDF 첨부' },
                        { label:'잔금일 도래', sub: new Date(r.deadline).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' }) },
                      ].map(c => (
                        <div key={c.label} style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          fontSize:'11px', marginTop:'5px',
                        }}>
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:'6px',
                            color: COLORS.t2,
                          }}>
                            <span style={{
                              display:'inline-block',
                              width:'12px', height:'12px',
                              borderRadius:'50%',
                              border:`1.5px solid ${COLORS.t5}`,
                              flexShrink:0,
                            }} />
                            {c.label}
                          </span>
                          <span style={{ color:'#1E5294', fontSize:'10px', fontWeight:600 }}>
                            {c.sub}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* 합계 검증 */}
          <div style={{
            padding:'12px',
            background: totalPct === 100 ? '#ECFDF5' : '#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'13px', fontWeight:700,
            color: totalPct === 100 ? '#047857' : '#854F0B',
            textAlign:'center',
            marginBottom:'14px',
          }}>
            {totalPct === 100
              ? '✓ 합계 100% — 비율이 맞아요'
              : `합계 ${totalPct}% · ${100-totalPct}% ${totalPct < 100 ? '부족' : '초과'}`}
          </div>

          {/* 임대차 계약서 PDF 첨부 카드 */}
          <button style={{
            width:'100%',
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            border:'none', borderRadius: RADIUS.lg,
            padding:'14px',
            display:'flex', alignItems:'center', gap:'12px',
            cursor:'pointer', fontFamily:'inherit', textAlign:'left',
            marginBottom:'14px',
          }}>
            <div style={{
              width:'36px', height:'36px',
              background:'#EDE9FE', borderRadius: RADIUS.md,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                임대차 계약서
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                위험 조항 자동 검출 + 분쟁 증거 보관
              </div>
            </div>
            <span style={{ color: theme.brand, fontSize:'12px', fontWeight:700, flexShrink:0 }}>
              PDF 첨부 + AI 진단 ›
            </span>
          </button>

          {/* 전입신고 + 확정일자 안내 */}
          <div style={{
            background:'#EDF3FA',
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
          }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#1E5294', marginBottom:'6px' }}>
              전입신고 + 확정일자 (필수)
            </div>
            <div style={{ fontSize:'11px', color:'#2D6BB0', lineHeight:1.6, marginBottom:'10px' }}>
              보증금 보호를 위해 입주 즉시 받으세요. 하지 않으면 세금 체납 시 우선 변제 못 받습니다.
            </div>
            <button style={{
              width:'100%', padding:'12px 14px',
              background: COLORS.bgCard,
              border:'1px solid #B5CFE8',
              borderRadius: RADIUS.md,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', fontFamily:'inherit',
            }}>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#1E5294' }}>
                  정부24 바로 가기
                </div>
                <div style={{ fontSize:'10px', color:'#2D6BB0' }}>
                  전입신고·확정일자 신청
                </div>
              </div>
              <span style={{ color:'#2D6BB0', fontSize:'15px', fontWeight:700 }}>›</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => totalPct === 100 && setStep('confirm')}
          disabled={totalPct !== 100}
          style={{
            width:'100%', height:'52px',
            background: totalPct === 100 ? theme.brand : COLORS.bgMuted,
            color: totalPct === 100 ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: totalPct === 100 ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: totalPct === 100 ? SHADOWS.buttonBrand : 'none',
          }}>
          {totalPct !== 100 ? '비율 합계 100% 만들기' : '다음 (계약서 생성)'}
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 확인 (집행 내용 확인) ─────────────
  if (step === 'confirm') {
    const scheduleRows = scheduleRatios.map(r => ({
      label: r.label,
      value: `${Math.round((depositNum * r.pct) / 100).toLocaleString()}원 (${r.pct}%)`,
      sub: r.trigger,
    }))

    return (
      <ConfirmStep
        smallTitle="집행 내용 확인"
        bigAmount={`${depositFmt}원`}
        sub={`${recipient.name}에게 ${rentalType === 'jeonse' ? '전세' : '월세'} 보증금 · 권한 자금`}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo={exitTo}
        rows={[
          {
            label: '임대인',
            value: recipient.name,
            sub: recipient.isBusiness ? `${recipient.bizNumber} · 사업자` : '실명 ✓',
            editAction: changeRecipient,
          },
          {
            label: '출금 지갑',
            value: selectedWallet?.label || 'MY 지갑',
            sub: `잔액 ${walletBalance.toLocaleString()}원`,
            editAction: () => setStep(1),
          },
          {
            label: '계약 유형',
            value: rentalType === 'jeonse' ? '전세' : '월세',
            editAction: () => setStep(2),
          },
          {
            label: '계약 기간',
            value: `${contractStart.replace(/-/g,'.')} ~ ${contractEnd.replace(/-/g,'.')} (${contractMonths}개월)`,
            editAction: () => setStep(2),
          },
          ...(rentalType === 'monthly' ? [{
            label: '월세',
            value: `${monthlyRentFmt}원 / 월`,
            sub: `매월 ${rentPayDay}일 자동 차감`,
            editAction: () => setStep(2),
          }] : []),
          ...scheduleRows.map(r => ({
            label: r.label,
            value: r.value,
            sub: r.sub,
          })),
        ]}
        autoActions={[
          '등기부 등본 자동 조회 + 보관 (5년)',
          '양측 서명 완료 시 계약금 즉시 임대인 계좌로 입금',
          '중도금·잔금 조건 충족 시 자동 집행',
          rentalType === 'monthly' ? `매월 ${rentPayDay}일 월세 자동 차감 등록` : '만기 1개월 전 자동 알림',
        ]}
        footerNote={
          <>
            집행 후 {selectedWallet?.label || 'MY 지갑'} 잔액 {walletBalance.toLocaleString()}원 →{' '}
            <strong>{remaining.toLocaleString()}원</strong> · 수수료 0원
          </>
        }
        primaryLabel="집행하기"
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      />
    )
  }

  // ───────────── PIN ─────────────
  const pushToStore = () => {
    // 보증금 기준으로 계약금/중도금/잔금 마일스톤 생성
    // 풍부 마일스톤 — 마지막(잔금) 단계에 검수 조건 + note
    const milestones = scheduleRatios.map((r, i) => {
      const isLast = i === scheduleRatios.length - 1
      const isFirst = i === 0
      return {
        id: `m${i+1}`,
        label: `${r.label} ${r.pct}%`,
        amount: Math.round(depositNum * r.pct / 100),
        status: 'pending',
        date: r.deadline || null,
        action: null,
        note: isFirst
          ? '서명 후 즉시 임대인 계좌로 입금'
          : isLast
            ? '집행 조건 모두 충족 시 자동 입금'
            : `${r.label}일 자동 입금`,
        // 잔금(마지막) 단계는 집행 조건 추가
        conditions: isLast ? [
          { label:'근저당권 말소 확인', done:false, sub:'쿠콘 자동 검증 진행' },
          { label:'국세/지방세 완납 증명', done:false, sub:'홈택스 PDF 미첨부' },
          { label:'잔금일 도래', done:false, sub: r.deadline || '잔금 예정일' },
        ] : undefined,
      }
    })

    const dealStatus = !recipient.verified ? 'waiting' : 'signing'
    const statusLabel = !recipient.verified ? '외부링크 인증 대기' : '상대방 서명 대기'

    // 활동 타임라인 시드 (방금 만든 거래라 1개)
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: '계약서 양측 서명 요청 발송', type: 'event' },
    ]

    // 안전 장치 (부동산 표준)
    const safety = [
      '근저당 말소 확인 + 국세 완납 + 잔금일 모두 충족 시 자동 입금',
      '한 가지라도 미충족 시 잔금 보류',
      '계약 만료 3개월 전 갱신/반환 알림',
      '5년 보관 (라이센스)',
    ]

    // 월세 모드일 때만 임대료 메타 동봉 — 임대료 메뉴가 이 거래를 발견 가능
    const rentalMeta = rentalType === 'monthly' && monthlyRentNum > 0 ? {
      rentalType: 'monthly',
      monthlyRent: monthlyRentNum,
      rentPayDay,
      address,
      unitNumber,
      contractStart,
      contractEnd,
      autoRenewAlert,
      depositAmount: depositNum,
      // 임대료 자동지급 풀에 추가될 때 기본값 (사용자가 등록 시 수정 가능)
      defaultVatMode: recipient.isBusiness ? 'exclude' : 'exempt',
      defaultMaint: 0,
    } : null

    addTransaction({
      type: 'realestate',
      fromUserId: isBizUser ? 'biz_juda' : 'me_juda_kim',
      fromUserName: isBizUser ? '㈜주다컴퍼니' : '김주다',
      fromUserType: isBizUser ? 'business' : 'personal',
      recipient,
      amount: depositNum,
      whtAmount: 0,
      netAmount: depositNum,
      reason: `${rentalType === 'jeonse' ? '전세' : '월세'} 보증금 · ${address}`,
      walletId,
      walletLabel: selectedWallet?.label || 'MY 지갑',
      payDateMode: 'immediate',
      // 거래형
      dealTitle: `${address} ${rentalType === 'jeonse' ? '전세' : '월세'}`,
      dealDescription: `${rentalType === 'jeonse' ? '전세' : '월세'} · ${contractMonths}개월 계약 (${workStartDisplay()} — ${contractEnd})`,
      contractDocId: `RE_${Date.now()}`,
      contractExpires: contractEnd,
      contractSigned: false,
      contractFile: `임대차계약서_${address.replace(/\s/g,'')}.pdf`,
      milestones,
      timeline,
      safety,
      dealStatus,
      statusLabel,
      myAction: null,
      rentalMeta,
    })
  }

  // 계약 시작일 표시용
  function workStartDisplay() {
    return contractStart || ''
  }

  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} ${rentalType === 'jeonse' ? '전세' : '월세'} 보증금`}
      summaryRight={`${depositFmt}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
      headerGrad={theme.headerGrad}
      exitTo={exitTo}
    />
  )

  // ───────────── 완료 ─────────────
  if (step === 'done') return (
    <DoneStep
      tone="waiting"
      title={`${recipient.name} 동의 대기 중`}
      description={
        <>
          {recipient.name}에게 계약서 SMS가 발송됐어요.<br />
          양측 서명 완료 시 계약이 체결됩니다.
        </>
      }
      summary={[
        { label:'보증금', value:`${depositFmt}원`, accent:true },
        { label:'유형', value: rentalType === 'jeonse' ? '전세' : '월세' },
        { label:'계약 기간', value:`${contractMonths}개월` },
        { label:'출금 지갑', value: selectedWallet?.label || 'MY 지갑' },
      ]}
      noteYellow={`3일 내 ${recipient.name} 미서명 시 자동 취소 · 알림센터 + 메시지에서 진행 상태 확인 가능`}
      primaryLabel="홈으로"
      onPrimary={() => navigate(exitTo)}
      secondaryLabel={`${recipient.name}과 대화하기`}
      onSecondary={() => navigate('/messages')}
      timestamp="2026.05.06 · 09:41"
      headerGrad={theme.headerGrad}
      exitTo={exitTo}
    />
  )

  return null
}
