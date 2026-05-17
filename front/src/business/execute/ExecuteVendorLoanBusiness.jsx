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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function plusMonths(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function monthsBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.44)))
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteVendorLoanBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient || location.state?.recipients?.[0]
  const theme = getAccountTheme()
  const t = useT()

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/business/select-vendor?menu=vendorLoan', { replace: true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [rateMode, setRateMode] = useState('standard')   // 'zero' | 'standard' | 'custom'
  const [customRate, setCustomRate] = useState('')
  const [maturityDate, setMaturityDate] = useState(plusMonths(6))   // 6개월 기본
  const [memo, setMemo] = useState('')

  if (!recipient) return null

  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE_FALLBACK
  const walletLabel = selectedWallet?.label || '법인 자금'

  const rateNum = (() => {
    if (rateMode === 'zero') return 0
    if (rateMode === 'standard') return STANDARD_RATE
    return parseFloat(customRate) || 0
  })()

  const amtNum = parseInt(amount) || 0
  const months = monthsBetween(today(), maturityDate)
  const totalInterest = Math.round(amtNum * (rateNum / 100) * (months / 12))
  const totalRepayment = amtNum + totalInterest

  const canProceed = amtNum > 0 && amtNum <= walletBalance

  const showZeroWarning = rateMode === 'zero' || (rateMode === 'custom' && rateNum < STANDARD_RATE)
  const showHighRateWarning = rateMode === 'custom' && rateNum > HIGH_RATE_LIMIT

  const rateLabel = (() => {
    if (rateMode === 'zero') return t('execVendorLoan.rate.zero')
    if (rateMode === 'standard') return `연 ${STANDARD_RATE}%`
    return `연 ${rateNum}% (직접 입력)`
  })()

  const changeRecipient = () => {
    navigate('/execute/business/select-vendor?menu=vendorLoan')
  }

  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(1)
    else if (step === 'done') return
  }
  useStepHistory(goBack, step === 1, !!recipient)

  const pushToStore = () => {
    const verified = recipient?.verified !== false
    const dealStatus = !verified ? 'waiting' : 'signing'
    const statusLabel = !verified ? '외부링크 인증 대기' : '상대방 서명 대기'

    // 풍부 마일스톤 — 4단계 (서명/지급/이자 인식/만기 상환)
    const hasInterest = rateNum > 0
    const milestones = [
      {
        id: 'm1',
        label: '차용증 양측 서명',
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: verified
          ? '발주자 + 차용인 양측 전자서명 완료 시 다음 단계'
          : '미가입 차용인은 외부링크 인증 후 서명 가능',
      },
      {
        id: 'm2',
        label: '대여금 지급',
        amount: amtNum,
        status: 'pending',
        date: null,
        action: null,
        note: `서명 완료 즉시 ${recipient.name} 계좌로 자동 입금`,
      },
      ...(hasInterest ? [{
        id: 'm3',
        label: '이자 자동 인식',
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: `매월 말일 ${rateNum}% 인정이자 자동 분개 + 세무사 전송`,
      }] : []),
      {
        id: hasInterest ? 'm4' : 'm3',
        label: `만기 일시 상환 (${months}개월 후)`,
        amount: totalRepayment,
        status: 'pending',
        date: maturityDate,
        action: null,
        note: `${maturityDate} ${recipient.name} 계좌에서 자동 출금 (원금 + 이자)`,
        conditions: [
          { label: '만기일 도래', done: false, sub: maturityDate },
          { label: `${recipient.name} 계좌 잔액 충분`, done: false, sub: '잔액 부족 시 통지 + 연체이자 적용' },
          { label: '회수 완료 + 회계 처리', done: false, sub: '단기 대여금 자산 → 현금 + 이자수익' },
        ],
      },
    ]

    // 활동 타임라인 시드
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 차용증 발송`, type: 'event' },
      { time: maturityDate, label: `만기 상환일 (${months}개월 후)`, type: 'pending' },
    ]

    // 안전 장치 (자금 대여 표준)
    const safety = [
      hasInterest
        ? `법정 적정 이자율 검증 (연 ${STANDARD_RATE}% / 한도 연 ${HIGH_RATE_LIMIT}%)`
        : '무이자 시 인정이자 자동 분개 (세무사 전송)',
      '단기 대여금 자산 등록 + 만기 자동 회수',
      '미상환 시 차용증 + 메시지 자동 증거 보관',
      '연체 30일 시 자동 통지 + 연체이자 가산',
    ]

    // 계약서 파일명
    const safeName = recipient.name.replace(/[^\w가-힣]/g, '_')
    const contractFile = `차용증_${safeName}_${amtNum.toLocaleString('ko-KR')}원.pdf`

    // 거래 설명
    const dealDescription = `${months}개월 대여 · ${rateMode === 'zero' ? '무이자' : `연 ${rateNum}%`}${memo.trim() ? ` · ${memo.trim()}` : ''}`

    addTransaction({
      type: 'lend',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient: { ...recipient, verified },
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `${months}개월 대여 · ${rateMode === 'zero' ? '무이자' : `연 ${rateNum}%`}${memo.trim() ? ` · ${memo.trim()}` : ''}`,
      walletId,
      walletLabel,
      payDateMode: 'immediate',
      // 거래형 (풍부)
      dealTitle: `${recipient.name} 자금 대여`,
      dealDescription,
      contractDocId: `VL_${Date.now()}`,
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
          smallTitle={t('execVendorLoan.smallTitle')}
          step={1} totalSteps={2}
          bigTitle={t('execVendorLoan.step1.title')}
          sub={t('execVendorLoan.step1.sub')}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 받는 사업자 카드 */}
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
              borderRadius:'10px',                           // 사업자 사각
              background: recipient.avatarBg || '#F2EFE9',
              color: recipient.avatarFg || '#555550',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:700, flexShrink:0,
            }}>
              {recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>
                {t('execVendorLoan.recipient.label')}
              </div>
              <div style={{
                fontSize:'13px', fontWeight:600, color: COLORS.t1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {recipient.name}
                {recipient.brn && (
                  <span style={{ fontSize:'11px', color: COLORS.t4, fontWeight:500, marginLeft:'4px' }}>
                    · {recipient.brn}
                  </span>
                )}
              </div>
              {recipient.ceo && (
                <div style={{ fontSize:'10px', color: COLORS.t5, marginTop:'1px' }}>
                  대표 {recipient.ceo}
                </div>
              )}
            </div>
            <button onClick={changeRecipient}
              style={{
                fontSize:'12px', fontWeight:600,
                color: theme.brandDark,
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                flexShrink:0,
              }}>
              {t('execVendorLoan.recipient.change')}
            </button>
          </div>

          {/* 회계 처리 안내 */}
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
                {t('execVendorLoan.notice.title')}
              </div>
              <div style={{ fontSize:'11px', color:'#854F0B', lineHeight:1.6 }}>
                {t('execVendorLoan.notice.body')}
              </div>
            </div>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execVendorLoan.wallet.label')}
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => setWalletId(w.id)}
            />
          </div>

          {/* 대여 금액 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execVendorLoan.amount.label')}
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
                placeholder={t('execVendorLoan.amount.ph')}
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

          {/* 이자율 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execVendorLoan.rate.label')}
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
                  {t('execVendorLoan.rate.zero')}
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
                  {t('execVendorLoan.rate.standard')}
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
                  {t('execVendorLoan.rate.custom')}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={customRate}
                  onChange={(e) => { setCustomRate(e.target.value); setRateMode('custom') }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={t('execVendorLoan.rate.customPh')}
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
                    {t('execVendorLoan.warn.zero.title')}
                  </div>
                  <div style={{ fontSize:'10px', color:'#991B1B', lineHeight:1.6 }}>
                    {t('execVendorLoan.warn.zero.body')}
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
                {t('execVendorLoan.rate.high')}
              </div>
            )}
          </div>

          {/* 만기일 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>
              {t('execVendorLoan.maturity.label')}
            </div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>
              {t('execVendorLoan.maturity.help')}
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
                  boxSizing:'border-box', maxWidth:'100%',
                  WebkitAppearance:'none', appearance:'none',
                }}
              />
            </div>
          </div>

          {/* 메모 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execVendorLoan.memo.label')}
            </div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t('execVendorLoan.memo.ph')}
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

        {/* 하단 버튼 */}
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
            {t('execVendorLoan.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Confirm ─────────────────
  if (step === 'confirm') {
    const rows = [
      {
        label: t('execVendorLoan.row.recipient'),
        value: recipient.name,
        sub: recipient.brn || (recipient.ceo ? `대표 ${recipient.ceo}` : null),
        editAction: changeRecipient,
      },
      {
        label: t('execVendorLoan.wallet.label'),
        value: walletLabel,
        sub: fill(t('execVendorLoan.wallet.balance'), { amount: fmt(walletBalance) }),
        editAction: () => setStep(1),
      },
      {
        label: t('execVendorLoan.row.amount'),
        value: `${fmt(amtNum)}원`,
        editAction: () => setStep(1),
      },
      {
        label: t('execVendorLoan.row.rate'),
        value: rateLabel,
        sub: showZeroWarning ? '인정이자 추징 가능' : null,
        editAction: () => setStep(1),
      },
      {
        label: t('execVendorLoan.row.maturity'),
        value: maturityDate,
        sub: `${months}개월 후 만기`,
        editAction: () => setStep(1),
      },
      ...(rateNum > 0 ? [{
        label: t('execVendorLoan.row.repayment'),
        value: `${fmt(totalRepayment)}원`,
        sub: `이자 ${fmt(totalInterest)}원 포함`,
      }] : []),
      ...(memo.trim() ? [{
        label: t('execVendorLoan.row.memo'),
        value: memo,
        editAction: () => setStep(1),
      }] : []),
    ]

    const autoActions = [
      fill(t('execVendorLoan.auto.deposit'), { name: recipient.name }),
      t('execVendorLoan.auto.contract'),
      t('execVendorLoan.auto.accounting'),
      ...(rateNum > 0 ? [t('execVendorLoan.auto.interest')] : []),
      fill(t('execVendorLoan.auto.maturity'), { date: maturityDate }),
    ]

    return (
      <ConfirmStep
        smallTitle={t('execVendorLoan.confirm.smallTitle')}
        bigAmount={`${fmt(amtNum)}원`}
        sub={fill(t('execVendorLoan.confirm.sub'), { name: recipient.name })}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={rows}
        autoActions={autoActions}
        footerNote={
          fill(t('execVendorLoan.footer.afterExec'), {
            wallet: walletLabel,
            before: fmt(walletBalance),
            after: fmt(walletBalance - amtNum),
          })
        }
        primaryLabel={t('execVendorLoan.btn.execute')}
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      />
    )
  }

  // ───────────────── PIN ─────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} 자금 대여`}
      summaryRight={`${fmt(amtNum)}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  // ───────────────── Done ─────────────────
  if (step === 'done') return (
    <DoneStep
      tone="waiting"
      title={t('execVendorLoan.done.title')}
      description={fill(t('execVendorLoan.done.desc'), { name: recipient.name })}
      summary={[
        { label: t('execVendorLoan.row.amount'), value: `${fmt(amtNum)}원`, accent: true },
        { label: t('execVendorLoan.row.recipient'), value: recipient.name },
        { label: t('execVendorLoan.row.rate'), value: rateLabel },
        { label: t('execVendorLoan.row.maturity'), value: maturityDate },
        ...(rateNum > 0 ? [{ label: t('execVendorLoan.row.repayment'), value: `${fmt(totalRepayment)}원`, bold: true }] : []),
        { label: t('execVendorLoan.wallet.label'), value: walletLabel },
      ]}
      noteYellow={t('execVendorLoan.done.note')}
      primaryLabel={t('execVendorLoan.btn.toHome')}
      onPrimary={() => navigate('/home-business')}
      timestamp="2026.05.06 · 09:41"
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  return null
}
