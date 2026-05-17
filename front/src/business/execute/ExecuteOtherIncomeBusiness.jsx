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
const WHT_RATE = 0.088   // 기타소득 원천세 8.8% (소득세 8% + 지방소득세 0.8%)

const REASONS = [
  { id: 'lecture',    tKey: 'execOtherIncome.reason.lecture' },
  { id: 'manuscript', tKey: 'execOtherIncome.reason.manuscript' },
  { id: 'advisory',   tKey: 'execOtherIncome.reason.advisory' },
  { id: 'prize',      tKey: 'execOtherIncome.reason.prize' },
  { id: 'interview',  tKey: 'execOtherIncome.reason.interview' },
  { id: 'etc',        tKey: 'execOtherIncome.reason.etc' },
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

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteOtherIncomeBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  // 단일 선택이지만 SelectRecipientBusiness가 메뉴 따라 단일/다중 자동 분기됨.
  // otherIncome은 single 메뉴라 location.state.recipient로 옴
  const recipient = location.state?.recipient || location.state?.recipients?.[0]
  const theme = getAccountTheme()
  const t = useT()

  // recipient 없으면 선택 화면으로 fallback
  useEffect(() => {
    if (!recipient) {
      navigate('/execute/business/select-recipient?menu=otherIncome', { replace: true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [reasonId, setReasonId] = useState('lecture')
  const [payDateMode, setPayDateMode] = useState('immediate')
  const [scheduledDate, setScheduledDate] = useState(today())
  const [memo, setMemo] = useState('')

  if (!recipient) return null

  // 인증/미인증
  const isCashable = !!recipient.verified

  // 출금 지갑
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE_FALLBACK
  const walletLabel = selectedWallet?.label || '법인 자금'

  // 금액 / 원천세
  const amtNum = parseInt(amount) || 0
  const whtAmount = isCashable ? Math.floor(amtNum * WHT_RATE) : 0
  const netAmount = amtNum - whtAmount

  // 다음 버튼 활성
  const canProceed = amtNum > 0 && amtNum <= walletBalance

  // 사유 라벨
  const reasonLabel = t(REASONS.find(r => r.id === reasonId)?.tKey || REASONS[0].tKey)

  // 지급일 라벨
  const payDateLabel = payDateMode === 'immediate'
    ? t('execOtherIncome.payDate.immediate')
    : scheduledDate

  // 받는 분 변경
  const changeRecipient = () => {
    navigate('/execute/business/select-recipient?menu=otherIncome')
  }

  // 뒤로가기
  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(1)
    else if (step === 'done') return
  }
  useStepHistory(goBack, step === 1, !!recipient)

  // ───────────────── Step 1 ─────────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execOtherIncome.smallTitle')}
          step={1} totalSteps={2}
          bigTitle={t('execOtherIncome.step1.title')}
          sub={t('execOtherIncome.step1.sub')}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 받는 분 카드 */}
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
                {t('execOtherIncome.recipient.label')}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{
                  fontSize:'13px', fontWeight:600, color: COLORS.t1,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>
                  {recipient.name}
                </span>
                {!isCashable && (
                  <span style={{
                    padding:'1px 5px',
                    background:'#FFFBEB', color:'#854F0B',
                    border:'1px solid #F7D98A',
                    borderRadius:'4px', fontSize:'9px', fontWeight:700, flexShrink:0,
                  }}>
                    {t('execOtherIncome.row.recipientUnverified')}
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
              {t('execOtherIncome.recipient.change')}
            </button>
          </div>

          {/* 미인증자 안내 박스 (조건부) */}
          {!isCashable && (
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
              }}>!</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#854F0B', marginBottom:'4px' }}>
                  {t('execOtherIncome.unverified.title')}
                </div>
                <div style={{ fontSize:'11px', color:'#854F0B', lineHeight:1.6 }}>
                  {fill(t('execOtherIncome.unverified.body'), { name: recipient.name })}
                </div>
              </div>
            </div>
          )}

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execOtherIncome.wallet.label')}
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => setWalletId(w.id)}
            />
          </div>

          {/* 금액 입력 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execOtherIncome.amount.label')}
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
                placeholder={t('execOtherIncome.amount.ph')}
                style={{
                  width:'100%', height:'40px',
                  fontSize:'24px', fontWeight:700, color: COLORS.t1,
                  border:'none', outline:'none', background:'transparent',
                  fontFamily:'inherit',
                  WebkitAppearance:'none',
                  MozAppearance:'textfield',
                }}
              />
              {amtNum > 0 && isCashable && (
                <div style={{
                  fontSize:'12px',
                  marginTop:'4px',
                  paddingTop:'8px',
                  borderTop:`1px solid ${COLORS.borderSoft}`,
                  display:'flex', justifyContent:'space-between',
                }}>
                  <span style={{ color: COLORS.t3 }}>
                    {t('execOtherIncome.wht.label')} -{fmt(whtAmount)}원
                  </span>
                  <span style={{ fontWeight:700, color: theme.brandDark }}>
                    {t('execOtherIncome.wht.netLabel')} {fmt(netAmount)}원
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 사유 칩 6가지 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execOtherIncome.reason.label')}
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

          {/* 지급일 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execOtherIncome.payDate.label')}
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
                  {t('execOtherIncome.payDate.immediate')}
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
                  {t('execOtherIncome.payDate.scheduled')}
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

          {/* 메모 (선택) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execOtherIncome.memo.label')}
            </div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t('execOtherIncome.memo.ph')}
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

          {/* 원천세 안내 박스 (인증자만 표시) */}
          {isCashable && (
            <div style={{
              background:'#FFFBEB',
              border:'1px solid #FCD34D',
              borderRadius: RADIUS.lg,
              padding:'12px 14px',
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
                  {t('execOtherIncome.wht.title')}
                </div>
                <div style={{ fontSize:'11px', color:'#854F0B', lineHeight:1.6 }}>
                  {t('execOtherIncome.wht.body')}
                </div>
              </div>
            </div>
          )}

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
            {t('execOtherIncome.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Step 'confirm' ─────────────────
  if (step === 'confirm') {
    const subText = isCashable
      ? fill(t('execOtherIncome.confirm.subCashable'), { name: recipient.name })
      : fill(t('execOtherIncome.confirm.subPermission'), { name: recipient.name })

    // 원천세/실수령액 행 (인증자만)
    const whtRows = isCashable && amtNum > 0 ? [
      {
        label: t('execOtherIncome.wht.label'),
        value: `-${fmt(whtAmount)}원`,
        sub: t('execOtherIncome.wht.autoDeduct'),
      },
      {
        label: t('execOtherIncome.wht.netLabel'),
        value: `${fmt(netAmount)}원`,
        sub: `${recipient.name} 계좌 입금액`,
      },
    ] : (!isCashable && amtNum > 0 ? [
      {
        label: t('execOtherIncome.wht.label'),
        value: '—',
        sub: t('execOtherIncome.wht.notApplicable'),
      },
    ] : [])

    return (
      <ConfirmStep
        smallTitle={t('execOtherIncome.confirm.smallTitle')}
        bigAmount={`${fmt(amtNum)}원`}
        sub={subText}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={[
          {
            label: t('execOtherIncome.row.recipient'),
            value: recipient.name,
            sub: isCashable
              ? t('execOtherIncome.row.recipientKyc')
              : t('execOtherIncome.row.recipientUnverified'),
            editAction: changeRecipient,
          },
          {
            label: t('execOtherIncome.wallet.label'),
            value: walletLabel,
            sub: fill(t('execOtherIncome.wallet.balance'), { amount: fmt(walletBalance) }),
            editAction: () => setStep(1),
          },
          {
            label: t('execOtherIncome.row.reason'),
            value: reasonLabel,
            editAction: () => setStep(1),
          },
          {
            label: t('execOtherIncome.row.payDate'),
            value: payDateLabel,
            editAction: () => setStep(1),
          },
          ...(memo.trim() ? [{
            label: t('execOtherIncome.row.memo'),
            value: memo,
            editAction: () => setStep(1),
          }] : []),
          {
            label: t('execOtherIncome.row.amount'),
            value: `${fmt(amtNum)}원`,
          },
          ...whtRows,
        ]}
        autoActions={[
          isCashable
            ? fill(t('execOtherIncome.auto.depositCashable'), {
                name: recipient.name,
                when: payDateMode === 'immediate'
                  ? t('execOtherIncome.auto.depositNow')
                  : fill(t('execOtherIncome.auto.depositOn'), { date: scheduledDate }),
              })
            : t('execOtherIncome.auto.depositPermission'),
          ...(isCashable ? [t('execOtherIncome.auto.taxStatement')] : []),
          t('execOtherIncome.auto.taxAccountant'),
        ]}
        footerNote={
          fill(t('execOtherIncome.footer.afterExec'), {
            wallet: walletLabel,
            before: fmt(walletBalance),
            after: fmt(walletBalance - amtNum),
          })
        }
        primaryLabel={t('execOtherIncome.btn.execute')}
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      />
    )
  }

  // 거래 store에 push (단일 수신자, 인증/미인증 분기는 store가 자동 처리)
  const pushToStore = () => {
    const memoSuffix = memo.trim() ? ` · ${memo.trim()}` : ''

    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const dealDescription = isCashable
      ? `${reasonLabel} · 원천세 8.8% (${fmt(whtAmount)}원) 차감 · 실지급 ${fmt(netAmount)}원`
      : `${reasonLabel} · 미가입자 — 외부링크 인증 후 지급`

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 ${reasonLabel} 기타소득 지급 처리`, type: 'event' },
      ...(isCashable
        ? [{ time: nowStr, label: `원천세 8.8% (${fmt(whtAmount)}원) 자동 차감 + 세무사 전송`, type: 'done' }]
        : [{ time: '인증 완료 후', label: '외부링크 인증 완료 시 즉시 입금', type: 'pending' }]
      ),
    ]

    const safety = [
      `기타소득세 8.8% 원천징수 — ${isCashable ? `${fmt(whtAmount)}원 자동 차감` : '인증 완료 후 자동 처리'}`,
      '원천세 신고서 자동 생성 + 세무사 이메일 자동 전송',
      '지급 증빙 자동 보관 (5년)',
      isCashable ? '즉시 입금 완료' : '미가입자 외부링크 발송 — 30일 내 미인증 시 자동 환수',
    ]

    addTransaction({
      type: 'otherIncome',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient,
      amount: amtNum,
      whtAmount,
      netAmount,
      reason: `${reasonLabel}${memoSuffix}`,
      walletId,
      walletLabel: selectedWallet?.label || '법인 자금',
      payDateMode,
      scheduledDate: payDateMode === 'scheduled' ? scheduledDate : null,
      // 풍부 필드
      dealTitle: `${recipient.name} ${reasonLabel}`,
      dealDescription,
      timeline,
      safety,
      dealStatus: isCashable ? 'completed' : 'waiting',
      statusLabel: isCashable ? `지급 완료 · 원천세 8.8% 차감` : '외부링크 인증 대기',
      myAction: null,
    })
  }

  // ───────────────── PIN ─────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} 기타소득`}
      summaryRight={`${fmt(amtNum)}원`}
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
      tone={isCashable ? 'success' : 'waiting'}
      title={isCashable
        ? t('execOtherIncome.done.titleCashable')
        : fill(t('execOtherIncome.done.titleWaiting'), { name: recipient.name })}
      description={
        <>
          {isCashable
            ? fill(t('execOtherIncome.done.descCashable'), { name: recipient.name })
            : fill(t('execOtherIncome.done.descWaiting'), { name: recipient.name })}
        </>
      }
      summary={[
        { label: t('execOtherIncome.row.amount'), value: `${fmt(amtNum)}원`, accent:true },
        ...(isCashable && amtNum > 0 ? [
          { label: t('execOtherIncome.wht.label'), value: `-${fmt(whtAmount)}원` },
          { label: t('execOtherIncome.wht.netLabel'), value: `${fmt(netAmount)}원`, bold:true },
        ] : []),
        { label: t('execOtherIncome.row.recipient'), value: recipient.name },
        { label: t('execOtherIncome.wallet.label'), value: walletLabel },
        { label: t('execOtherIncome.row.reason'), value: reasonLabel },
        { label: t('execOtherIncome.row.payDate'), value: payDateLabel },
      ]}
      noteYellow={t('execOtherIncome.done.note')}
      primaryLabel={t('execOtherIncome.btn.toHome')}
      onPrimary={() => navigate('/home-business')}
      secondaryLabel={fill(t('execOtherIncome.btn.chat'), { name: recipient.name })}
      onSecondary={() => navigate('/messages')}
      timestamp="2026.05.06 · 09:41"
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  return null
}
