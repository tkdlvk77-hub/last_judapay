import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import DarkHeader from '../../components/DarkHeader'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../../shared/transactionStore'
import ConfirmStep from '../../shared/execute/ConfirmStep'
import PinStep from '../../shared/execute/PinStep'
import DoneStep from '../../shared/execute/DoneStep'
import { useStepHistory } from '../../hooks/useStepHistory'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const CORP_BALANCE_FALLBACK = 47820000
const STANDARD_RATE = 4.6
const HIGH_RATE_LIMIT = 20

// 사유 4가지 — 각 사유별 동작 패턴
const PURPOSES = [
  { id: 'salary', tKey: 'execLendBiz.purpose.salary', noticeKey: 'salary',
    showRate: false, defaultDays: 'nextSalary', hasContract: false },
  { id: 'loan',   tKey: 'execLendBiz.purpose.loan',   noticeKey: 'loan',
    showRate: true,  defaultDays: 180,           hasContract: true  },
  { id: 'travel', tKey: 'execLendBiz.purpose.travel', noticeKey: 'travel',
    showRate: false, defaultDays: 14,            hasContract: false },
  { id: 'etc',    tKey: 'execLendBiz.purpose.etc',    noticeKey: 'etc',
    showRate: true,  defaultDays: 180,           hasContract: true  },
]

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}
function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR')
}
function today() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
function plusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
function nextSalaryDate() {
  // 다음 달 25일 (한국 일반적 급여일)
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(25)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}-25`
}
function monthsBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.44)))
}

function defaultMaturity(purposeId) {
  const p = PURPOSES.find(x => x.id === purposeId)
  if (!p) return plusDays(180)
  if (p.defaultDays === 'nextSalary') return nextSalaryDate()
  return plusDays(p.defaultDays)
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteLendBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient || location.state?.recipients?.[0]
  const theme = getAccountTheme()
  const t = useT()

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/business/select-recipient?menu=lend', { replace: true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  const [purposeId, setPurposeId] = useState('salary')
  const [amount, setAmount] = useState('')
  const [rateMode, setRateMode] = useState('standard')
  const [customRate, setCustomRate] = useState('')
  const [maturityDate, setMaturityDate] = useState(defaultMaturity('salary'))
  const [memo, setMemo] = useState('')

  if (!recipient) return null

  const purpose = PURPOSES.find(p => p.id === purposeId) || PURPOSES[0]

  const handlePurposeChange = (newId) => {
    setPurposeId(newId)
    setMaturityDate(defaultMaturity(newId))
  }

  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE_FALLBACK
  const walletLabel = selectedWallet?.label || '법인 자금'

  const rateNum = !purpose.showRate ? 0 : (() => {
    if (rateMode === 'zero') return 0
    if (rateMode === 'standard') return STANDARD_RATE
    return parseFloat(customRate) || 0
  })()

  const amtNum = parseInt(amount) || 0
  const months = monthsBetween(today(), maturityDate)
  const totalInterest = Math.round(amtNum * (rateNum / 100) * (months / 12))
  const totalRepayment = amtNum + totalInterest

  const canProceed = amtNum > 0 && amtNum <= walletBalance

  const showZeroWarning = purpose.showRate && (rateMode === 'zero' || (rateMode === 'custom' && rateNum < STANDARD_RATE))
  const showHighRateWarning = purpose.showRate && rateMode === 'custom' && rateNum > HIGH_RATE_LIMIT

  const rateLabel = !purpose.showRate ? '해당 없음' : (() => {
    if (rateMode === 'zero') return t('execLendBiz.rate.zero')
    if (rateMode === 'standard') return `연 ${STANDARD_RATE}%`
    return `연 ${rateNum}% (직접 입력)`
  })()

  const maturityLabel = t(`execLendBiz.maturity.label.${purpose.id}`)
  const maturityHelp = t(`execLendBiz.maturity.help.${purpose.id}`)
  const noticeTitle = t(`execLendBiz.notice.${purpose.noticeKey}.title`)
  const noticeBody = t(`execLendBiz.notice.${purpose.noticeKey}.body`)
  const purposeLabel = t(purpose.tKey)

  const changeRecipient = () => {
    navigate('/execute/business/select-recipient?menu=lend')
  }

  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(1)
    else if (step === 'done') return
  }
  useStepHistory(goBack, step === 1, !!recipient)

  const pushToStore = () => {
    let dealStatus, statusLabel
    if (!recipient.verified) {
      dealStatus = 'waiting'
      statusLabel = '외부링크 인증 대기'
    } else if (purpose.hasContract) {
      dealStatus = 'signing'
      statusLabel = '상대방 서명 대기'
    } else {
      dealStatus = 'in_progress'
      statusLabel = purpose.id === 'salary' ? '급여일 자동 차감 예정' : '영수증 정산 대기'
    }

    const hasInterest = purpose.showRate && rateNum > 0
    const reasonText = `${purposeLabel}${memo.trim() ? ` · ${memo.trim()}` : ''}`

    // 사유별 풍부 마일스톤
    let milestones
    if (purpose.id === 'salary') {
      milestones = [
        {
          id: 'm1', label: '급여 선지급', amount: amtNum,
          status: 'pending', date: null, action: null,
          note: `${recipient.name} 받은 지갑으로 즉시 입금`,
        },
        {
          id: 'm2', label: `급여일 자동 차감 (${maturityDate})`, amount: amtNum,
          status: 'pending', date: maturityDate, action: null,
          note: `${maturityDate} 급여 지급 시 선지급금 자동 차감`,
          conditions: [
            { label: '급여일 도래', done: false, sub: maturityDate },
            { label: '급여에서 자동 차감', done: false, sub: '차액만 실지급' },
          ],
        },
      ]
    } else if (purpose.id === 'travel') {
      milestones = [
        {
          id: 'm1', label: '출장비 선지급', amount: amtNum,
          status: 'pending', date: null, action: null,
          note: `${recipient.name} 받은 지갑으로 즉시 입금`,
        },
        {
          id: 'm2', label: '영수증 제출 + 정산', amount: 0,
          status: 'pending', date: maturityDate, action: null,
          note: `${maturityDate}까지 영수증 제출 후 정산`,
          conditions: [
            { label: '영수증 업로드', done: false, sub: '출장 관련 증빙 필수' },
            { label: '초과분 반환 또는 부족분 추가 지급', done: false, sub: '자동 정산' },
          ],
        },
      ]
    } else {
      // loan / etc — 차용증 + 이자 분기
      milestones = [
        {
          id: 'm1', label: '차용증 서명',
          amount: 0, status: 'pending', date: null, action: null,
          note: purpose.hasContract
            ? `${recipient.name} 전자서명 완료 시 다음 단계`
            : '확인 후 즉시 지급',
        },
        {
          id: 'm2', label: '대여금 지급', amount: amtNum,
          status: 'pending', date: null, action: null,
          note: purpose.hasContract
            ? `서명 완료 즉시 ${recipient.name} 받은 지갑으로 입금`
            : `${recipient.name} 받은 지갑으로 즉시 입금`,
        },
        ...(hasInterest ? [{
          id: 'm3', label: `이자 자동 인식 (연 ${rateNum}%)`,
          amount: 0, status: 'pending', date: null, action: null,
          note: '매월 말일 인정이자 자동 분개 + 세무사 전송',
        }] : []),
        {
          id: hasInterest ? 'm4' : 'm3',
          label: `만기 상환 (${maturityDate})`,
          amount: totalRepayment,
          status: 'pending', date: maturityDate, action: null,
          note: hasInterest
            ? `${maturityDate} 급여에서 자동 차감 (원금 + 이자 ${fmt(totalInterest)}원)`
            : `${maturityDate} 급여에서 자동 차감 (무이자)`,
          conditions: [
            { label: '상환일 도래', done: false, sub: maturityDate },
            { label: '급여에서 자동 차감', done: false, sub: '잔액 부족 시 통지' },
            { label: '대여금 자산 회수 완료', done: false, sub: '세무사 자동 전송' },
          ],
        },
      ]
    }

    // 활동 타임라인
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 ${purposeLabel} 지급 처리`, type: 'event' },
      { time: maturityDate, label:
          purpose.id === 'salary' ? '급여일 자동 차감 예정'
          : purpose.id === 'travel' ? '영수증 정산 마감'
          : hasInterest ? `만기 상환 (원금 + 이자)`
          : '만기 상환 예정',
        type: 'pending' },
    ]

    // 안전 장치 (사유별 분기)
    const safety = [
      purpose.id === 'salary' ? '급여일 자동 차감 (수작업 없음)'
        : purpose.id === 'travel' ? '출장비 영수증 의무 제출 + 자동 정산'
        : purpose.hasContract ? '차용증 전자서명 + 자동 분리 보관'
        : '확인 후 즉시 지급 + 증빙 자동 보관',
      ...(hasInterest ? [
        `법정 적정 이자율 검증 (연 ${STANDARD_RATE}% 기준 / 한도 ${HIGH_RATE_LIMIT}%)`,
        '인정이자 자동 분개 + 세무사 자동 전송',
      ] : [
        ...(purpose.showRate ? ['무이자 — 인정이자 자동 분개 (세무사 전송)'] : []),
      ]),
      '직원 대여금 자산 등록 + 만기 자동 회수',
      '증빙 자동 보관 (5년)',
      '분쟁 시 차용증 + 자금 흐름 자동 증거',
    ]

    // 계약서 파일명
    const safeName = recipient.name.replace(/[^\w가-힣]/g, '_')
    const contractFile = purpose.hasContract
      ? `직원대여금_${safeName}_${fmt(amtNum)}원.pdf`
      : null

    // 거래 설명
    const dealDescription = purpose.id === 'salary'
      ? `급여 선지급 · ${maturityDate} 급여일 자동 차감`
      : purpose.id === 'travel'
        ? `출장비 선지급 · ${maturityDate}까지 영수증 정산`
        : hasInterest
          ? `${purposeLabel} · 연 ${rateNum}% · 만기 ${maturityDate}`
          : `${purposeLabel} · 무이자 · 만기 ${maturityDate}`

    addTransaction({
      type: 'lend',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient,
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: reasonText,
      walletId,
      walletLabel,
      payDateMode: 'immediate',
      // 거래형 (풍부)
      dealTitle: `${recipient.name} ${purposeLabel}`,
      dealDescription,
      contractDocId: purpose.hasContract ? `LD_${Date.now()}` : null,
      contractExpires: maturityDate,
      contractSigned: false,
      contractFile,
      milestones,
      timeline,
      safety,
      dealStatus,
      statusLabel,
      myAction: null,
    })
  }

  // ───────────────── Step 1 ─────────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execLendBiz.smallTitle')}
          step={1} totalSteps={2}
          bigTitle={t('execLendBiz.step1.title')}
          sub={t('execLendBiz.step1.sub')}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 받는 직원 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            display:'flex', alignItems:'center', gap:'10px',
            marginBottom:'12px',
          }}>
            <div style={{
              width:'36px', height:'36px',
              borderRadius:'50%',
              background: recipient.avatarBg || '#F2EFE9',
              color: recipient.avatarFg || '#555550',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:700, flexShrink:0,
            }}>
              {recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>
                {t('execLendBiz.recipient.label')}
              </div>
              <div style={{
                fontSize:'13px', fontWeight:600, color: COLORS.t1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {recipient.name}
                {recipient.employeeInfo && (
                  <span style={{ fontSize:'11px', color: COLORS.t4, fontWeight:500, marginLeft:'4px' }}>
                    · {recipient.employeeInfo.department}
                  </span>
                )}
              </div>
            </div>
            <button onClick={changeRecipient}
              style={{
                fontSize:'12px', fontWeight:600,
                color: theme.brandDark,
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                flexShrink:0,
              }}>
              {t('execLendBiz.recipient.change')}
            </button>
          </div>

          {/* 지급 사유 칩 4개 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execLendBiz.purpose.label')}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {PURPOSES.map(p => (
                <button key={p.id}
                  onClick={() => handlePurposeChange(p.id)}
                  style={{
                    padding:'10px 16px',
                    background: purposeId === p.id ? theme.brandDark + '15' : COLORS.bgCard,
                    border: purposeId === p.id ? `1.5px solid ${theme.brandDark}` : `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.pill,
                    fontSize:'13px', fontWeight: purposeId === p.id ? 700 : 500,
                    color: purposeId === p.id ? theme.brandDark : COLORS.t2,
                    cursor:'pointer', fontFamily:'inherit',
                    transition:'all .15s',
                  }}>
                  {t(p.tKey)}
                </button>
              ))}
            </div>
          </div>

          {/* 사유별 안내 박스 */}
          <div style={{
            background:'#FFFBEB',
            border:'1px solid #FCD34D',
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            marginBottom:'14px',
            display:'flex', gap:'10px',
          }}>
            <div style={{
              width:'22px', height:'22px',
              borderRadius:'50%',
              background:'#FCD34D',
              color:'#854F0B',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:800,
              flexShrink:0,
            }}>i</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#854F0B', marginBottom:'4px' }}>
                {noticeTitle}
              </div>
              <div style={{ fontSize:'11px', color:'#854F0B', lineHeight:1.6 }}>
                {noticeBody}
              </div>
            </div>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execLendBiz.wallet.label')}
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => setWalletId(w.id)}
            />
          </div>

          {/* 지급 금액 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execLendBiz.amount.label')}
            </div>
            <div style={{
              background: COLORS.bgCard,
              border:`1px solid ${COLORS.border}`,
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
            }}>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('execLendBiz.amount.ph')}
                style={{
                  width:'100%', height:'40px',
                  fontSize:'24px', fontWeight:700, color: COLORS.t1,
                  border:'none', outline:'none', background:'transparent',
                  fontFamily:'inherit',
                  WebkitAppearance:'none',
                  MozAppearance:'textfield',
                }}
              />
            </div>
          </div>

          {/* 이자율 — 직원 대여금/기타에서만 노출 */}
          {purpose.showRate && (
            <div style={{ marginBottom:'18px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
                {t('execLendBiz.rate.label')}
              </div>
              <div style={{
                background: COLORS.bgCard,
                border:`1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                overflow:'hidden',
              }}>
                <button
                  onClick={() => setRateMode('zero')}
                  style={{
                    width:'100%', padding:'12px 14px',
                    background: rateMode === 'zero' ? theme.brandDark + '08' : 'transparent',
                    border:'none',
                    borderBottom: `1px solid ${COLORS.borderSoft}`,
                    display:'flex', alignItems:'center', gap:'10px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}>
                  <div style={{
                    width:'18px', height:'18px',
                    borderRadius:'50%',
                    background: rateMode === 'zero' ? theme.brandDark : 'transparent',
                    border: rateMode === 'zero' ? 'none' : `2px solid ${COLORS.t5}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    {rateMode === 'zero' && (
                      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }}/>
                    )}
                  </div>
                  <span style={{
                    fontSize:'13px', fontWeight: rateMode === 'zero' ? 700 : 500,
                    color: rateMode === 'zero' ? theme.brandDark : COLORS.t1,
                  }}>
                    {t('execLendBiz.rate.zero')}
                  </span>
                </button>

                <button
                  onClick={() => setRateMode('standard')}
                  style={{
                    width:'100%', padding:'12px 14px',
                    background: rateMode === 'standard' ? theme.brandDark + '08' : 'transparent',
                    border:'none',
                    borderBottom: `1px solid ${COLORS.borderSoft}`,
                    display:'flex', alignItems:'center', gap:'10px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}>
                  <div style={{
                    width:'18px', height:'18px',
                    borderRadius:'50%',
                    background: rateMode === 'standard' ? theme.brandDark : 'transparent',
                    border: rateMode === 'standard' ? 'none' : `2px solid ${COLORS.t5}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    {rateMode === 'standard' && (
                      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }}/>
                    )}
                  </div>
                  <span style={{
                    fontSize:'13px', fontWeight: rateMode === 'standard' ? 700 : 500,
                    color: rateMode === 'standard' ? theme.brandDark : COLORS.t1,
                  }}>
                    {t('execLendBiz.rate.standard')}
                  </span>
                </button>

                <div
                  onClick={() => setRateMode('custom')}
                  style={{
                    width:'100%', padding:'12px 14px',
                    background: rateMode === 'custom' ? theme.brandDark + '08' : 'transparent',
                    display:'flex', alignItems:'center', gap:'10px',
                    cursor:'pointer',
                  }}>
                  <div style={{
                    width:'18px', height:'18px',
                    borderRadius:'50%',
                    background: rateMode === 'custom' ? theme.brandDark : 'transparent',
                    border: rateMode === 'custom' ? 'none' : `2px solid ${COLORS.t5}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    {rateMode === 'custom' && (
                      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }}/>
                    )}
                  </div>
                  <span style={{
                    fontSize:'13px', fontWeight: rateMode === 'custom' ? 700 : 500,
                    color: rateMode === 'custom' ? theme.brandDark : COLORS.t1,
                    flexShrink:0,
                  }}>
                    {t('execLendBiz.rate.custom')}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={customRate}
                    onChange={(e) => { setCustomRate(e.target.value); setRateMode('custom') }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t('execLendBiz.rate.customPh')}
                    style={{
                      flex:1, height:'30px',
                      background:'transparent',
                      border:`1px solid ${COLORS.border}`,
                      borderRadius:'8px',
                      padding:'0 10px',
                      fontSize:'12px', color: COLORS.t1,
                      fontFamily:'inherit', outline:'none',
                      textAlign:'right',
                    }}
                  />
                  <span style={{ fontSize:'11px', color: COLORS.t4 }}>%</span>
                </div>
              </div>

              {/* 무이자/저금리 경고 */}
              {showZeroWarning && (
                <div style={{
                  marginTop:'10px',
                  background:'#FEF2F2',
                  border:'1px solid #FECACA',
                  borderRadius: RADIUS.lg,
                  padding:'10px 12px',
                  display:'flex', gap:'8px',
                }}>
                  <div style={{
                    width:'18px', height:'18px',
                    borderRadius:'50%',
                    background:'#DC2626',
                    color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'11px', fontWeight:800,
                    flexShrink:0,
                  }}>!</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'11px', fontWeight:700, color:'#991B1B', marginBottom:'2px' }}>
                      {t('execLendBiz.warn.zero.title')}
                    </div>
                    <div style={{ fontSize:'10px', color:'#991B1B', lineHeight:1.6 }}>
                      {t('execLendBiz.warn.zero.body')}
                    </div>
                  </div>
                </div>
              )}

              {showHighRateWarning && (
                <div style={{
                  marginTop:'10px',
                  fontSize:'11px', color:'#DC2626',
                  padding:'0 4px',
                }}>
                  {t('execLendBiz.rate.high')}
                </div>
              )}
            </div>
          )}

          {/* 만기일/정산일 (사유별 라벨) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>
              {maturityLabel}
            </div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>
              {maturityHelp}
            </div>
            <div style={{ width:'100%', overflow:'hidden', borderRadius: RADIUS.lg }}>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                min={today()}
                style={{
                  width:'100%', height:'46px',
                  padding:'0 14px',
                  background: COLORS.bgCard,
                  border:`1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.lg,
                  fontSize:'13px', color: COLORS.t1,
                  fontFamily:'inherit', outline:'none',
                  boxSizing:'border-box',
                  WebkitAppearance:'none',
                  appearance:'none',
                }}
              />
            </div>
          </div>

          {/* 메모 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execLendBiz.memo.label')}
            </div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t('execLendBiz.memo.ph')}
              style={{
                width:'100%', height:'46px',
                padding:'0 14px',
                background: COLORS.bgCard,
                border:`1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                fontSize:'13px', color: COLORS.t1,
                fontFamily:'inherit', outline:'none',
              }}
            />
          </div>

        </div>

        {/* 하단 sticky 버튼 */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'12px 16px 24px',
          borderTop:`1px solid ${COLORS.borderSoft}`,
          background: COLORS.bgCard,
        }}>
          <button onClick={() => canProceed && setStep('confirm')}
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
            {t('execLendBiz.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Step 'confirm' ─────────────────
  if (step === 'confirm') {
    const autoActions = [
      fill(t('execLendBiz.auto.deposit'), { name: recipient.name }),
    ]
    if (purpose.hasContract) {
      autoActions.push(t('execLendBiz.auto.contract'))
    }
    if (purpose.id === 'salary') {
      autoActions.push(fill(t('execLendBiz.auto.salaryDeduct'), { date: maturityDate }))
    } else if (purpose.id === 'travel') {
      autoActions.push(t('execLendBiz.auto.travelSettle'))
    }
    autoActions.push(t('execLendBiz.auto.advance'))
    if (purpose.hasContract) {
      autoActions.push(fill(t('execLendBiz.auto.maturity'), { date: maturityDate }))
    }

    const rows = [
      {
        label: t('execLendBiz.row.recipient'),
        value: recipient.name,
        sub: recipient.employeeInfo?.department,
        editAction: changeRecipient,
      },
      {
        label: t('execLendBiz.row.purpose'),
        value: purposeLabel,
        editAction: () => setStep(1),
      },
      {
        label: t('execLendBiz.wallet.label'),
        value: walletLabel,
        sub: fill(t('execLendBiz.wallet.balance'), { amount: fmt(walletBalance) }),
        editAction: () => setStep(1),
      },
      {
        label: t('execLendBiz.row.amount'),
        value: `${fmt(amtNum)}원`,
        editAction: () => setStep(1),
      },
    ]

    if (purpose.showRate) {
      rows.push({
        label: t('execLendBiz.row.rate'),
        value: rateLabel,
        sub: showZeroWarning ? '인정이자 추징 가능' : null,
        editAction: () => setStep(1),
      })
    }

    rows.push({
      label: maturityLabel,
      value: maturityDate,
      sub: purpose.id === 'salary' ? '다음 달 급여일'
         : purpose.id === 'travel' ? '영수증 정산 마감'
         : `${months}개월 후`,
      editAction: () => setStep(1),
    })

    if (purpose.showRate && rateNum > 0) {
      rows.push({
        label: t('execLendBiz.row.repayment'),
        value: `${fmt(totalRepayment)}원`,
        sub: `이자 ${fmt(totalInterest)}원 포함`,
      })
    }

    if (memo.trim()) {
      rows.push({
        label: t('execLendBiz.row.memo'),
        value: memo,
        editAction: () => setStep(1),
      })
    }

    return (
      <ConfirmStep
        smallTitle={t('execLendBiz.confirm.smallTitle')}
        bigAmount={`${fmt(amtNum)}원`}
        sub={fill(t('execLendBiz.confirm.sub'), { name: recipient.name, purpose: purposeLabel })}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={rows}
        autoActions={autoActions}
        footerNote={
          fill(t('execLendBiz.footer.afterExec'), {
            wallet: walletLabel,
            before: fmt(walletBalance),
            after: fmt(walletBalance - amtNum),
          })
        }
        primaryLabel={t('execLendBiz.btn.execute')}
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      />
    )
  }

  // ───────────────── PIN ─────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} ${purposeLabel}`}
      summaryRight={`${fmt(amtNum)}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  // ───────────────── 완료 ─────────────────
  if (step === 'done') {
    const tone = purpose.hasContract ? 'waiting' : 'success'
    const title = purpose.hasContract
      ? t('execLendBiz.done.titleWaiting')
      : t('execLendBiz.done.title')
    const desc = purpose.hasContract
      ? fill(t('execLendBiz.done.descContract'), { name: recipient.name })
      : fill(t('execLendBiz.done.descSimple'), { name: recipient.name })

    const summary = [
      { label: t('execLendBiz.row.amount'), value: `${fmt(amtNum)}원`, accent: true },
      { label: t('execLendBiz.row.recipient'), value: recipient.name },
      { label: t('execLendBiz.row.purpose'), value: purposeLabel },
      { label: maturityLabel, value: maturityDate },
      { label: t('execLendBiz.wallet.label'), value: walletLabel },
    ]
    if (purpose.showRate) {
      summary.splice(3, 0, { label: t('execLendBiz.row.rate'), value: rateLabel })
      if (rateNum > 0) {
        summary.push({ label: t('execLendBiz.row.repayment'), value: `${fmt(totalRepayment)}원`, bold: true })
      }
    }

    return (
      <DoneStep
        tone={tone}
        title={title}
        description={desc}
        summary={summary}
        noteYellow={t('execLendBiz.done.note')}
        primaryLabel={t('execLendBiz.btn.toHome')}
        onPrimary={() => navigate('/home-business')}
        timestamp="2026.05.06 · 09:41"
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
      />
    )
  }

  return null
}
