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
const CORP_BALANCE = 47820000  // 법인 자금 잔액 (데모)
const WHT_RATE = 0.066          // 근로소득세 + 지방소득세 간이 6.6%

const REASONS = [
  { id: 'holiday',     tKey: 'execBonus.reason.holiday' },
  { id: 'performance', tKey: 'execBonus.reason.performance' },
  { id: 'quarterly',   tKey: 'execBonus.reason.quarterly' },
  { id: 'etc',         tKey: 'execBonus.reason.etc' },
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

// 개별 입력 모드의 합계 계산
function sumIndividual(amounts) {
  return Object.values(amounts).reduce((sum, v) => sum + (parseInt(v) || 0), 0)
}

// 오늘 날짜 (지정일 디폴트용)
function today() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteBonusBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipients = location.state?.recipients || []
  const theme = getAccountTheme()
  const t = useT()

  // recipients 없으면 선택 화면으로 fallback
  useEffect(() => {
    if (!recipients || recipients.length === 0) {
      navigate('/execute/business/select-recipient?menu=bonus', { replace: true })
    }
  }, [recipients, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  const [payMode, setPayMode] = useState('uniform')   // 'uniform' | 'individual'
  const [uniformAmount, setUniformAmount] = useState('')
  const [individualAmounts, setIndividualAmounts] = useState(
    Object.fromEntries(recipients.map(r => [r.id, '']))
  )
  const [reasonId, setReasonId] = useState('holiday')
  const [payDateMode, setPayDateMode] = useState('immediate')  // 'immediate' | 'scheduled'
  const [scheduledDate, setScheduledDate] = useState(today())
  const [memo, setMemo] = useState('')

  if (!recipients || recipients.length === 0) return null

  // 선택된 출금 지갑
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE
  const walletLabel = selectedWallet?.label || '법인 자금'

  // 총액 계산
  const totalAmount = payMode === 'uniform'
    ? (parseInt(uniformAmount) || 0) * recipients.length
    : sumIndividual(individualAmounts)

  const whtAmount = Math.floor(totalAmount * WHT_RATE)
  const netTotal = totalAmount - whtAmount

  // 다음 버튼 활성 조건 (선택된 지갑 잔액 기준)
  const canProceed = totalAmount > 0 && totalAmount <= walletBalance

  // 받는 사람 요약 라벨
  const recipientsSummary = recipients.length <= 2
    ? recipients.map(r => r.name).join(' · ')
    : fill(t('execBonus.recipients.summary'), {
        names: recipients.slice(0, 2).map(r => r.name).join(' · '),
        etc: fill(t('execBonus.recipients.etc'), { count: recipients.length - 2 }),
      })

  // 사유 라벨
  const reasonLabel = t(REASONS.find(r => r.id === reasonId)?.tKey || REASONS[0].tKey)

  // 지급일 라벨
  const payDateLabel = payDateMode === 'immediate'
    ? t('execBonus.payDate.immediate')
    : scheduledDate

  // 지급 방식 라벨
  const payModeLabel = payMode === 'uniform'
    ? t('execBonus.mode.uniform')
    : t('execBonus.mode.individual')

  // 받는 사람 변경 (선택 화면으로)
  const changeRecipients = () => {
    navigate('/execute/business/select-recipient?menu=bonus')
  }

  // 뒤로가기
  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(1)
    else if (step === 'done') return
  }
  useStepHistory(goBack, step === 1, recipients.length > 0)

  // ───────────────── Step 1: 금액 + 사유 입력 ─────────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execBonus.smallTitle')}
          step={1} totalSteps={2}
          bigTitle={t('execBonus.step1.title')}
          sub={fill(t('execBonus.step1.sub'), { count: recipients.length })}
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
            marginBottom:'18px',
          }}>
            <div style={{
              width:'36px', height:'36px',
              borderRadius:'50%',
              background: theme.brandDark + '15',
              color: theme.brandDark,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:700,
              flexShrink:0,
            }}>
              {recipients.length}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>
                {t('execBonus.recipients.label')}
              </div>
              <div style={{
                fontSize:'13px', fontWeight:600, color: COLORS.t1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {recipientsSummary}
              </div>
            </div>
            <button onClick={changeRecipients}
              style={{
                fontSize:'12px', fontWeight:600,
                color: theme.brandDark,
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                flexShrink:0,
              }}>
              {t('execBonus.recipients.change')}
            </button>
          </div>

          {/* 출금 지갑 — 공용 WalletPicker (탭 시 시트 열림) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execBonus.wallet.label')}
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => setWalletId(w.id)}
            />
          </div>

          {/* 지급 방식 토글 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execBonus.mode.label')}
            </div>
            <div style={{
              display:'flex',
              background: COLORS.bgMuted,
              borderRadius: RADIUS.md,
              padding:'4px',
            }}>
              {[
                { id:'uniform',     label: t('execBonus.mode.uniform') },
                { id:'individual',  label: t('execBonus.mode.individual') },
              ].map(opt => (
                <button key={opt.id}
                  onClick={() => setPayMode(opt.id)}
                  style={{
                    flex:1, height:'40px',
                    background: payMode === opt.id ? COLORS.bgCard : 'transparent',
                    color: payMode === opt.id ? COLORS.t1 : COLORS.t4,
                    border:'none', borderRadius: RADIUS.sm || '8px',
                    fontSize:'13px', fontWeight: payMode === opt.id ? 700 : 500,
                    cursor:'pointer', fontFamily:'inherit',
                    boxShadow: payMode === opt.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition:'all .15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 금액 입력 */}
          {payMode === 'uniform' ? (
            <div style={{ marginBottom:'18px' }}>
              <div style={{
                background: COLORS.bgCard,
                border:`1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                padding:'14px 16px',
              }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={uniformAmount}
                  onChange={(e) => setUniformAmount(e.target.value)}
                  placeholder={t('execBonus.amount.uniformPh')}
                  style={{
                    width:'100%', height:'40px',
                    fontSize:'24px', fontWeight:700, color: COLORS.t1,
                    border:'none', outline:'none', background:'transparent',
                    fontFamily:'inherit',
                    WebkitAppearance:'none',
                    MozAppearance:'textfield',
                  }}
                />
                {(parseInt(uniformAmount) || 0) > 0 && (
                  <div style={{
                    fontSize:'12px', color: COLORS.t3,
                    marginTop:'4px',
                    paddingTop:'8px',
                    borderTop:`1px solid ${COLORS.borderSoft}`,
                    display:'flex', justifyContent:'space-between',
                  }}>
                    <span>
                      {fill(t('execBonus.amount.perPerson'), { amount: fmt(uniformAmount) })}
                    </span>
                    <span style={{ fontWeight:700, color: theme.brandDark }}>
                      {fill(t('execBonus.amount.totalSimple'), { amount: fmt(totalAmount) })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              background: COLORS.bgCard,
              border:`1px solid ${COLORS.border}`,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
              marginBottom:'18px',
            }}>
              {recipients.map((r, i) => (
                <div key={r.id} style={{
                  padding:'12px 14px',
                  borderBottom: i < recipients.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                  display:'flex', alignItems:'center', gap:'10px',
                }}>
                  <div style={{
                    width:'30px', height:'30px',
                    borderRadius:'50%',
                    background: r.avatarBg || '#F2EFE9',
                    color: r.avatarFg || '#555550',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'12px', fontWeight:700,
                    flexShrink:0,
                  }}>
                    {r.initial}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>
                      {r.name}
                    </div>
                    {r.employeeInfo && (
                      <div style={{ fontSize:'10px', color: COLORS.t4 }}>
                        {r.employeeInfo.department}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'4px', flexShrink:0 }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={individualAmounts[r.id] || ''}
                      onChange={(e) => setIndividualAmounts(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="0"
                      style={{
                        width:'110px', height:'34px',
                        background: COLORS.bgMuted,
                        border:'none', borderRadius: RADIUS.sm || '8px',
                        padding:'0 10px',
                        fontSize:'13px', fontWeight:600, color: COLORS.t1,
                        textAlign:'right', fontFamily:'inherit',
                        outline:'none',
                        WebkitAppearance:'none',
                        MozAppearance:'textfield',
                      }}
                    />
                    <span style={{ fontSize:'12px', color: COLORS.t4 }}>원</span>
                  </div>
                </div>
              ))}
              {/* 합계 */}
              <div style={{
                padding:'10px 14px',
                background: COLORS.bgMuted,
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t2 }}>
                  {t('execBonus.amount.totalLabel')}
                </span>
                <span style={{ fontSize:'14px', fontWeight:700, color: theme.brandDark }}>
                  {fmt(totalAmount)}원
                </span>
              </div>
            </div>
          )}

          {/* 지급 사유 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execBonus.reason.label')}
            </div>
            <div style={{
              display:'flex', flexWrap:'wrap', gap:'8px',
            }}>
              {REASONS.map(r => (
                <button key={r.id}
                  onClick={() => setReasonId(r.id)}
                  style={{
                    padding:'10px 16px',
                    background: reasonId === r.id ? theme.brandDark + '15' : COLORS.bgCard,
                    border: reasonId === r.id ? `1.5px solid ${theme.brandDark}` : `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.pill,
                    fontSize:'13px', fontWeight: reasonId === r.id ? 700 : 500,
                    color: reasonId === r.id ? theme.brandDark : COLORS.t2,
                    cursor:'pointer', fontFamily:'inherit',
                    transition:'all .15s',
                  }}>
                  {t(r.tKey)}
                </button>
              ))}
            </div>
          </div>

          {/* 지급일 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execBonus.payDate.label')}
            </div>
            <div style={{
              background: COLORS.bgCard,
              border:`1px solid ${COLORS.border}`,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
            }}>
              <button
                onClick={() => setPayDateMode('immediate')}
                style={{
                  width:'100%', padding:'12px 14px',
                  background: payDateMode === 'immediate' ? theme.brandDark + '08' : 'transparent',
                  border:'none',
                  borderBottom: `1px solid ${COLORS.borderSoft}`,
                  display:'flex', alignItems:'center', gap:'10px',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                <div style={{
                  width:'18px', height:'18px',
                  borderRadius:'50%',
                  background: payDateMode === 'immediate' ? theme.brandDark : 'transparent',
                  border: payDateMode === 'immediate' ? 'none' : `2px solid ${COLORS.t5}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  {payDateMode === 'immediate' && (
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }}/>
                  )}
                </div>
                <span style={{
                  fontSize:'13px', fontWeight: payDateMode === 'immediate' ? 700 : 500,
                  color: payDateMode === 'immediate' ? theme.brandDark : COLORS.t1,
                }}>
                  {t('execBonus.payDate.immediate')}
                </span>
              </button>

              <div
                onClick={() => setPayDateMode('scheduled')}
                style={{
                  width:'100%', padding:'12px 14px',
                  background: payDateMode === 'scheduled' ? theme.brandDark + '08' : 'transparent',
                  display:'flex', alignItems:'center', gap:'10px',
                  cursor:'pointer',
                }}>
                <div style={{
                  width:'18px', height:'18px',
                  borderRadius:'50%',
                  background: payDateMode === 'scheduled' ? theme.brandDark : 'transparent',
                  border: payDateMode === 'scheduled' ? 'none' : `2px solid ${COLORS.t5}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  {payDateMode === 'scheduled' && (
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }}/>
                  )}
                </div>
                <span style={{
                  fontSize:'13px', fontWeight: payDateMode === 'scheduled' ? 700 : 500,
                  color: payDateMode === 'scheduled' ? theme.brandDark : COLORS.t1,
                  flexShrink:0,
                }}>
                  {t('execBonus.payDate.scheduled')}
                </span>
                <div style={{ flex:1, overflow:'hidden', borderRadius: RADIUS.sm || '8px' }}>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => { setScheduledDate(e.target.value); setPayDateMode('scheduled') }}
                    onClick={(e) => e.stopPropagation()}
                    min={today()}
                    style={{
                      width:'100%', height:'30px',
                      background:'transparent',
                      border:`1px solid ${COLORS.border}`,
                      borderRadius: RADIUS.sm || '8px',
                      padding:'0 10px',
                      fontSize:'12px', color: COLORS.t1,
                      fontFamily:'inherit', outline:'none',
                      textAlign:'right',
                      boxSizing:'border-box', maxWidth:'100%',
                      WebkitAppearance:'none', appearance:'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execBonus.memo.label')}
            </div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t('execBonus.memo.ph')}
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
            {t('execBonus.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Step 'confirm' ─────────────────
  if (step === 'confirm') {
    const recipientsValue = recipients.length <= 3
      ? recipients.map(r => r.name).join(' · ')
      : recipientsSummary

    return (
      <ConfirmStep
        smallTitle={t('execBonus.confirm.smallTitle')}
        bigAmount={`${fmt(totalAmount)}원`}
        sub={fill(t('execBonus.confirm.sub'), { count: recipients.length })}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={[
          {
            label: t('execBonus.row.recipients'),
            value: fill(t('execBonus.row.recipientsCount'), { count: recipients.length }),
            sub: recipientsValue,
            editAction: changeRecipients,
          },
          {
            label: t('execBonus.wallet.label'),
            value: walletLabel,
            sub: fill(t('execBonus.wallet.balance'), { amount: fmt(walletBalance) }),
            editAction: () => setStep(1),
          },
          {
            label: t('execBonus.row.payMode'),
            value: payModeLabel,
            editAction: () => setStep(1),
          },
          {
            label: t('execBonus.row.reason'),
            value: reasonLabel,
            editAction: () => setStep(1),
          },
          {
            label: t('execBonus.row.payDate'),
            value: payDateLabel,
            editAction: () => setStep(1),
          },
          ...(memo.trim() ? [{
            label: t('execBonus.row.memo'),
            value: memo,
            editAction: () => setStep(1),
          }] : []),
          {
            label: t('execBonus.row.totalAmount'),
            value: `${fmt(totalAmount)}원`,
          },
          {
            label: t('execBonus.row.wht'),
            value: `-${fmt(whtAmount)}원`,
            sub: t('execBonus.row.whtSub'),
          },
          {
            label: t('execBonus.row.netTotal'),
            value: `${fmt(netTotal)}원`,
          },
        ]}
        autoActions={[
          fill(t('execBonus.auto.deposit'), {
            count: recipients.length,
            when: payDateMode === 'immediate'
              ? t('execBonus.auto.depositNow')
              : fill(t('execBonus.auto.depositOn'), { date: scheduledDate }),
          }),
          t('execBonus.auto.tax'),
          t('execBonus.auto.insurance'),
          t('execBonus.auto.taxAccountant'),
        ]}
        footerNote={
          fill(t('execBonus.footer.afterExec'), {
            before: fmt(walletBalance),
            after: fmt(walletBalance - totalAmount),
          })
        }
        primaryLabel={t('execBonus.btn.execute')}
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      />
    )
  }

  // 거래 store에 push (수신자 N명 각각 1건씩)
  const pushToStore = () => {
    const reasonText = REASONS.find(r => r.id === reasonId)?.tKey || ''
    const reasonLabel = t(reasonText)
    const memoSuffix = memo.trim() ? ` · ${memo.trim()}` : ''

    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    recipients.forEach(r => {
      const indivAmount = payMode === 'uniform'
        ? (parseInt(uniformAmount) || 0)
        : (parseInt(individualAmounts[r.id]) || 0)
      if (indivAmount <= 0) return

      const indivWht = Math.floor(indivAmount * WHT_RATE)
      const indivNet = indivAmount - indivWht

      const isScheduled = payDateMode === 'scheduled'
      const dealDescription = isScheduled
        ? `${reasonLabel} · ${scheduledDate} 지급 예정 · 원천세 6.6% 자동 차감`
        : `${reasonLabel} · 즉시 입금 · 원천세 6.6% 자동 차감`

      const timeline = [
        { time: nowStr, label: `${r.name}에게 ${reasonLabel} 지급 처리`, type: 'event' },
        ...(isScheduled ? [{ time: scheduledDate, label: '예약 지급일 자동 입금', type: 'pending' }] : []),
        { time: isScheduled ? scheduledDate : nowStr, label: '원천세 신고서 자동 생성 (세무사 전송)', type: isScheduled ? 'pending' : 'done' },
      ]

      const safety = [
        `원천세 6.6% (${fmt(indivWht)}원) 자동 차감 → 실지급 ${fmt(indivNet)}원`,
        '원천세 신고서 자동 생성 + 세무사 이메일 자동 전송',
        '지급 증빙 자동 보관 (5년)',
        isScheduled ? `${scheduledDate} 지급일 자동 처리 (수작업 없음)` : '즉시 입금 완료',
      ]

      addTransaction({
        type: 'bonus',
        fromUserId: 'biz_juda',
        fromUserName: '㈜주다컴퍼니',
        fromUserType: 'business',
        recipient: r,
        amount: indivAmount,
        whtAmount: indivWht,
        netAmount: indivNet,
        reason: `${reasonLabel}${memoSuffix}`,
        walletId,
        walletLabel: selectedWallet?.label || '법인 자금',
        payDateMode,
        scheduledDate: isScheduled ? scheduledDate : null,
        // 풍부 필드
        dealTitle: `${r.name} ${reasonLabel}`,
        dealDescription,
        timeline,
        safety,
        dealStatus: 'completed',
        statusLabel: isScheduled ? `${scheduledDate} 지급 예정` : '지급 완료',
        myAction: null,
      })
    })
  }

  // ───────────────── PIN ─────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipients.length}명 상여금`}
      summaryRight={`${fmt(totalAmount)}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  // ───────────────── 완료 ─────────────────
  if (step === 'done') return (
    <DoneStep
      tone="success"
      title={t('execBonus.done.title')}
      description={
        <>{fill(t('execBonus.done.desc'), { count: recipients.length })}</>
      }
      summary={[
        { label: t('execBonus.row.totalAmount'), value: `${fmt(totalAmount)}원`, accent:true },
        { label: t('execBonus.row.recipients'),
          value: fill(t('execBonus.row.recipientsCount'), { count: recipients.length }) },
        { label: t('execBonus.wallet.label'), value: walletLabel },
        { label: t('execBonus.row.reason'), value: reasonLabel },
        { label: t('execBonus.row.payDate'), value: payDateLabel },
        { label: t('execBonus.row.wht'), value: `-${fmt(whtAmount)}원` },
        { label: t('execBonus.row.netTotal'), value: `${fmt(netTotal)}원`, bold:true },
      ]}
      noteYellow={t('execBonus.done.note')}
      primaryLabel={t('execBonus.btn.toHome')}
      onPrimary={() => navigate('/home-business')}
      timestamp="2026.05.06 · 09:41"
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  return null
}
