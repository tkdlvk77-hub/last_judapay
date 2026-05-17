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
const CORP_BALANCE_FALLBACK = 47820000   // fallback (selectedWallet 없을 때만)

const REASONS = [
  { id: 'wedding',    tKey: 'execCondolence.reason.wedding' },
  { id: 'childbirth', tKey: 'execCondolence.reason.childbirth' },
  { id: 'funeral',    tKey: 'execCondolence.reason.funeral' },
  { id: 'illness',    tKey: 'execCondolence.reason.illness' },
  { id: 'etc',        tKey: 'execCondolence.reason.etc' },
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
function sumAmounts(amounts) {
  return Object.values(amounts).reduce((sum, v) => sum + (parseInt(v) || 0), 0)
}
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
export default function ExecuteCondolenceBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipients = location.state?.recipients || (location.state?.recipient ? [location.state.recipient] : [])
  const theme = getAccountTheme()
  const t = useT()

  // recipients 없으면 선택 화면으로 fallback
  useEffect(() => {
    if (!recipients || recipients.length === 0) {
      navigate('/execute/business/select-recipient?menu=condolence', { replace: true })
    }
  }, [recipients, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  // 항상 개별 입력 (단일이든 다중이든)
  const [amounts, setAmounts] = useState(
    Object.fromEntries(recipients.map(r => [r.id, '']))
  )
  const [reasonId, setReasonId] = useState('wedding')
  const [payDateMode, setPayDateMode] = useState('immediate')   // 'immediate' | 'scheduled'
  const [scheduledDate, setScheduledDate] = useState(today())
  const [memo, setMemo] = useState('')

  if (!recipients || recipients.length === 0) return null

  // 선택된 출금 지갑
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE_FALLBACK
  const walletLabel = selectedWallet?.label || '법인 자금'

  // 총액 (비과세이므로 입금액 = 총액)
  const totalAmount = sumAmounts(amounts)

  // 다음 버튼 활성 조건
  const canProceed = totalAmount > 0 && totalAmount <= walletBalance

  // 사유 라벨
  const reasonLabel = t(REASONS.find(r => r.id === reasonId)?.tKey || REASONS[0].tKey)

  // 지급일 라벨
  const payDateLabel = payDateMode === 'immediate'
    ? t('execCondolence.payDate.immediate')
    : scheduledDate

  // 단일/다중 분기
  const isMulti = recipients.length > 1
  const firstName = recipients[0]?.name || ''

  // 받는 사람 변경
  const changeRecipients = () => {
    navigate('/execute/business/select-recipient?menu=condolence')
  }

  // 뒤로가기
  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(1)
    else if (step === 'done') return
  }
  useStepHistory(goBack, step === 1, recipients.length > 0)

  // ───────────────── Step 1 ─────────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execCondolence.smallTitle')}
          step={1} totalSteps={2}
          bigTitle={t('execCondolence.step1.title')}
          sub={t('execCondolence.step1.sub')}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 비과세 안내 박스 (Step 1) */}
          <div style={{
            background:'#E6F5EF',
            border:'1px solid #34D399',
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            marginBottom:'14px',
            display:'flex', gap:'10px',
          }}>
            <div style={{
              width:'22px', height:'22px',
              borderRadius:'50%',
              background:'#34D399',
              color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:800,
              flexShrink:0,
            }}>i</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#085041', marginBottom:'4px' }}>
                {t('execCondolence.taxFree.title')}
              </div>
              <div style={{ fontSize:'11px', color:'#085041', lineHeight:1.6 }}>
                {t('execCondolence.taxFree.body')}
              </div>
            </div>
          </div>

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
              background: isMulti ? theme.brandDark + '15' : (recipients[0].avatarBg || '#F2EFE9'),
              color: isMulti ? theme.brandDark : (recipients[0].avatarFg || '#555550'),
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:700, flexShrink:0,
            }}>
              {isMulti ? recipients.length : recipients[0].initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>
                {t('execCondolence.recipients.label')}
              </div>
              <div style={{
                fontSize:'13px', fontWeight:600, color: COLORS.t1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {isMulti
                  ? recipients.map(r => r.name).join(' · ')
                  : recipients[0].name}
              </div>
            </div>
            <button onClick={changeRecipients}
              style={{
                fontSize:'12px', fontWeight:600,
                color: theme.brandDark,
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                flexShrink:0,
              }}>
              {t('execCondolence.recipients.change')}
            </button>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execCondolence.wallet.label')}
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => setWalletId(w.id)}
            />
          </div>

          {/* 금액 입력 — 항상 개별 입력 (단일이면 입력 1개) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execCondolence.amount.label')}
            </div>

            {!isMulti ? (
              // 단일: 큰 입력 박스
              <div style={{
                background: COLORS.bgCard,
                border:`1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                padding:'14px 16px',
              }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amounts[recipients[0].id] || ''}
                  onChange={(e) => setAmounts(prev => ({ ...prev, [recipients[0].id]: e.target.value }))}
                  placeholder={t('execCondolence.amount.singlePh')}
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
            ) : (
              // 다중: 직원별 입력 + 합계
              <div style={{
                background: COLORS.bgCard,
                border:`1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                overflow:'hidden',
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
                        value={amounts[r.id] || ''}
                        onChange={(e) => setAmounts(prev => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="0"
                        style={{
                          width:'110px', height:'34px',
                          background: COLORS.bgMuted,
                          border:'none', borderRadius:'8px',
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
                    {t('execCondolence.amount.totalLabel')}
                  </span>
                  <span style={{ fontSize:'14px', fontWeight:700, color: theme.brandDark }}>
                    {fmt(totalAmount)}원
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 경조 사유 칩 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execCondolence.reason.label')}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
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

          {/* 경조사 일자 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execCondolence.payDate.label')}
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
                  {t('execCondolence.payDate.immediate')}
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
                  {t('execCondolence.payDate.scheduled')}
                </span>
                <div style={{ flex:1, overflow:'hidden', borderRadius:'8px' }}>
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
                      borderRadius:'8px',
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

          {/* 메모 (권장) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>
              {t('execCondolence.memo.label')}
            </div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>
              {t('execCondolence.memo.help')}
            </div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t('execCondolence.memo.ph')}
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
            {t('execCondolence.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Step 'confirm' ─────────────────
  if (step === 'confirm') {
    const recipientsValue = isMulti
      ? recipients.map(r => r.name).join(' · ')
      : firstName

    const subText = isMulti
      ? fill(t('execCondolence.confirm.subMulti'), { count: recipients.length })
      : fill(t('execCondolence.confirm.subSingle'), { name: firstName })

    return (
      <ConfirmStep
        smallTitle={t('execCondolence.confirm.smallTitle')}
        bigAmount={`${fmt(totalAmount)}원`}
        sub={subText}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={[
          {
            label: t('execCondolence.row.recipients'),
            value: isMulti
              ? fill(t('execCondolence.row.recipientsCount'), { count: recipients.length })
              : firstName,
            sub: isMulti ? recipientsValue : null,
            editAction: changeRecipients,
          },
          {
            label: t('execCondolence.wallet.label'),
            value: walletLabel,
            sub: fill(t('execCondolence.wallet.balance'), { amount: fmt(walletBalance) }),
            editAction: () => setStep(1),
          },
          {
            label: t('execCondolence.row.reason'),
            value: reasonLabel,
            sub: t('execCondolence.taxFree.short'),
            editAction: () => setStep(1),
          },
          {
            label: t('execCondolence.row.payDate'),
            value: payDateLabel,
            editAction: () => setStep(1),
          },
          ...(memo.trim() ? [{
            label: t('execCondolence.row.memo'),
            value: memo,
            editAction: () => setStep(1),
          }] : []),
          {
            label: t('execCondolence.row.totalAmount'),
            value: `${fmt(totalAmount)}원`,
          },
        ]}
        autoActions={[
          fill(t('execCondolence.auto.deposit'), {
            count: recipients.length,
            when: payDateMode === 'immediate'
              ? t('execCondolence.auto.depositNow')
              : fill(t('execCondolence.auto.depositOn'), { date: scheduledDate }),
          }),
          t('execCondolence.auto.taxFree'),
          t('execCondolence.auto.taxAccountant'),
        ]}
        footerNote={
          fill(t('execCondolence.footer.afterExec'), {
            wallet: walletLabel,
            before: fmt(walletBalance),
            after: fmt(walletBalance - totalAmount),
          })
        }
        primaryLabel={t('execCondolence.btn.execute')}
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      />
    )
  }

  // 거래 store에 push (수신자 N명 각각 1건씩, 비과세)
  const pushToStore = () => {
    const memoSuffix = memo.trim() ? ` · ${memo.trim()}` : ''

    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    recipients.forEach(r => {
      const indivAmount = parseInt(amounts[r.id]) || 0
      if (indivAmount <= 0) return

      const isScheduled = payDateMode === 'scheduled'
      const taxNote = indivAmount <= 200000 ? '비과세 (20만원 이하)' : `20만원 초과분 ${fmt(indivAmount - 200000)}원 과세 처리 필요`

      const dealDescription = `${reasonLabel} · 비과세 · 즉시 입금`

      const timeline = [
        { time: nowStr, label: `${r.name}에게 ${reasonLabel} 경조사비 지급`, type: 'event' },
        { time: nowStr, label: '비과세 처리 + 증빙 자동 보관', type: 'done' },
      ]

      const safety = [
        `비과세 경조사비 (${fmt(indivAmount)}원) — 원천세 차감 없음`,
        taxNote,
        '지급 증빙 자동 보관 (5년)',
        '세무사 이메일 자동 전송',
      ]

      addTransaction({
        type: 'condolence',
        fromUserId: 'biz_juda',
        fromUserName: '㈜주다컴퍼니',
        fromUserType: 'business',
        recipient: r,
        amount: indivAmount,
        whtAmount: 0,
        netAmount: indivAmount,
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
        statusLabel: '지급 완료 · 비과세',
        myAction: null,
      })
    })
  }

  // ───────────────── PIN ─────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={isMulti ? `${recipients.length}명 경조사비` : `${firstName} 경조사비`}
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
      title={t('execCondolence.done.title')}
      description={
        <>
          {isMulti
            ? fill(t('execCondolence.done.descMulti'), { count: recipients.length })
            : fill(t('execCondolence.done.descSingle'), { name: firstName })}
        </>
      }
      summary={[
        { label: t('execCondolence.row.totalAmount'), value: `${fmt(totalAmount)}원`, accent:true },
        { label: t('execCondolence.row.recipients'),
          value: isMulti
            ? fill(t('execCondolence.row.recipientsCount'), { count: recipients.length })
            : firstName },
        { label: t('execCondolence.wallet.label'), value: walletLabel },
        { label: t('execCondolence.row.reason'), value: reasonLabel },
        { label: t('execCondolence.row.payDate'), value: payDateLabel },
      ]}
      noteYellow={t('execCondolence.done.note')}
      primaryLabel={t('execCondolence.btn.toHome')}
      onPrimary={() => navigate('/home-business')}
      timestamp="2026.05.06 · 09:41"
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  return null
}
