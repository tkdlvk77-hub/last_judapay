import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import MccBlock, { DEFAULT_MCC as MCC_DEFAULT } from '../../shared/execute/MccBlock'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../../shared/transactionStore'
import { addAutoPayLiving, calcNextPayDate, calcAlertDate } from './autoPayLivingStore'
import DarkHeader from '../../components/DarkHeader'
import ConfirmStep from '../../shared/execute/ConfirmStep'
import PinStep from '../../shared/execute/PinStep'
import DoneStep from '../../shared/execute/DoneStep'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { useStepHistory } from '../../hooks/useStepHistory'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const MY_BALANCE = 1932000
const DAY_PRESETS = [1, 5, 10, 15, 20, 25]

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}
function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR')
}
function nowStr() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

// ─────────────────────────────────────────────────────────
// 금액 입력 디스플레이
// ─────────────────────────────────────────────────────────
function AmountDisplay({ amount, onChange, onClear }) {
  const len = amount ? String(amount).length : 1
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
            fontSize:`${fontSize}px`, fontWeight:700, lineHeight:1,
            color: amount ? COLORS.t1 : COLORS.t5,
            background:'transparent', border:'none', outline:'none',
            textAlign:'center', fontFamily:'inherit', width:'200px',
            transition:'font-size 0.15s',
            WebkitAppearance:'none', MozAppearance:'textfield',
          }}
        />
        <span style={{
          fontSize: fontSize >= 36 ? '26px' : fontSize >= 28 ? '20px' : '16px',
          fontWeight:700, color: amount ? COLORS.t1 : COLORS.t5,
          lineHeight:1, transition:'font-size 0.15s',
        }}>원</span>
      </div>
      {amount > 0 && (
        <button onClick={onClear} style={{
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

// ─────────────────────────────────────────────────────────
// 매월 자동지급 설정 컴포넌트
// ─────────────────────────────────────────────────────────
function RecurringSection({ enabled, onToggle, payDay, onDayChange }) {
  const [customDay, setCustomDay] = useState('')
  const nextPay = enabled ? calcNextPayDate(payDay) : null
  const alertDate = nextPay ? calcAlertDate(nextPay) : null

  const handleCustomDay = (val) => {
    const n = parseInt(val.replace(/\D/g, '')) || ''
    const clamped = n === '' ? '' : Math.min(28, Math.max(1, n))
    setCustomDay(String(clamped))
    if (clamped) onDayChange(clamped)
  }

  return (
    <div style={{ marginBottom:'18px' }}>
      <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
        매월 자동 지급
      </div>

      {/* 토글 카드 */}
      <div style={{
        background: COLORS.bgCard, boxShadow: SHADOWS.card,
        borderRadius: RADIUS.lg, overflow:'hidden',
      }}>
        <button onClick={onToggle} style={{
          width:'100%', padding:'14px 16px',
          display:'flex', alignItems:'center', gap:'12px',
          background:'none', border:'none', cursor:'pointer',
          fontFamily:'inherit', textAlign:'left',
          borderBottom: enabled ? `1px solid ${COLORS.borderSoft}` : 'none',
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
              매월 반복 지급 설정
            </div>
            <div style={{ fontSize:'11px', color: COLORS.t4 }}>
              {enabled
                ? `매월 ${payDay}일 자동 집행 · 3일 전 알림 발송`
                : '매달 정해진 날짜에 자동으로 지급'}
            </div>
          </div>
          {/* 토글 스위치 */}
          <div style={{
            width:'44px', height:'26px', borderRadius:'13px',
            background: enabled ? '#10B981' : COLORS.t5,
            position:'relative', flexShrink:0, transition:'background 0.2s',
          }}>
            <div style={{
              position:'absolute', top:'3px',
              left: enabled ? '21px' : '3px',
              width:'20px', height:'20px', borderRadius:'50%',
              background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)',
              transition:'left 0.2s',
            }} />
          </div>
        </button>

        {/* 날짜 설정 (활성 시) */}
        {enabled && (
          <div style={{ padding:'14px 16px' }}>
            {/* 프리셋 날짜 */}
            <div style={{ fontSize:'11px', fontWeight:600, color: COLORS.t4, marginBottom:'8px' }}>
              지급일 선택
            </div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
              {DAY_PRESETS.map(d => {
                const active = payDay === d
                return (
                  <button key={d} onClick={() => { onDayChange(d); setCustomDay('') }}
                    style={{
                      width:'44px', height:'36px', borderRadius:'9px',
                      background: active ? '#10B981' : COLORS.bgMuted,
                      color: active ? '#fff' : COLORS.t2,
                      border:'none', fontSize:'12px', fontWeight:700,
                      cursor:'pointer', fontFamily:'inherit',
                      transition:'all .15s',
                    }}>
                    {d}일
                  </button>
                )
              })}
              {/* 직접 입력 */}
              <div style={{ position:'relative', flex:1, minWidth:'80px' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customDay}
                  onChange={e => handleCustomDay(e.target.value)}
                  placeholder="직접 입력"
                  style={{
                    width:'100%', height:'36px',
                    background: customDay ? '#10B981' : COLORS.bgMuted,
                    color: customDay ? '#fff' : COLORS.t4,
                    border:'none', borderRadius:'9px',
                    padding:'0 28px 0 10px',
                    fontSize:'12px', fontWeight:600,
                    outline:'none', fontFamily:'inherit',
                    boxSizing:'border-box',
                    WebkitAppearance:'none', MozAppearance:'textfield',
                  }}
                />
                <span style={{
                  position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
                  fontSize:'11px', fontWeight:600,
                  color: customDay ? '#fff' : COLORS.t4,
                  pointerEvents:'none',
                }}>일</span>
              </div>
            </div>

            {/* 다음 지급 예정일 안내 */}
            <div style={{
              background:'#ECFDF5', borderRadius:'10px',
              padding:'10px 12px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                <span style={{ fontSize:'12px' }}>📅</span>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>
                  다음 지급 예정일 {nextPay}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'12px' }}>🔔</span>
                <span style={{ fontSize:'11px', color:'#047857' }}>
                  3일 전({alertDate}) 알림 발송 · 탭하면 설정 변경 가능
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                <span style={{ fontSize:'12px' }}>⚠️</span>
                <span style={{ fontSize:'11px', color:'#047857' }}>
                  잔액 부족 시 처리 필요 항목에 자동 등록
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteLiving() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient

  const [step, setStep]               = useState('input')
  const [walletId, setWalletId]       = useState('my')
  const [amount, setAmount]           = useState('')
  const [memo, setMemo]               = useState('')
  const [mccItems, setMccItems]       = useState(MCC_DEFAULT)
  const [singleLimit, setSingleLimit] = useState(null)

  // 자동지급 설정
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [payDay, setPayDay]                     = useState(1)

  if (!recipient) {
    navigate('/execute/personal/select?purpose=living', { replace: true })
    return null
  }

  // ── 파생 값 ──────────────────────────────────
  const amtNum         = parseInt(amount) || 0
  const amtFmt         = fmt(amtNum)
  const selectedWallet = getWalletById(walletId)
  const walletBalance  = selectedWallet?.amount ?? MY_BALANCE
  const walletLabel    = selectedWallet?.label || 'MY 지갑'
  const remaining      = walletBalance - amtNum
  const blockedItems   = mccItems.filter(m => m.block)
  const blockedCount   = blockedItems.length
  const blockedLabels  = blockedItems.map(m => m.label)
  const canSend        = amtNum >= 1000 && amtNum <= walletBalance
  const nextPayDate    = recurringEnabled ? calcNextPayDate(payDay) : null
  const alertDate      = nextPayDate ? calcAlertDate(nextPayDate) : null

  // ── 액션 ──────────────────────────────────────
  const changeRecipient = () => navigate('/execute/personal/select?purpose=living')

  const goBack = () => {
    if (step === 'input')    navigate(-1)
    else if (step === 'mcc')     setStep('input')
    else if (step === 'confirm') setStep('input')
    else if (step === 'pin')     setStep('confirm')
    else if (step === 'done')    return
  }
  useStepHistory(goBack, step === 'input', !!recipient)

  const pushToStore = () => {
    const now = nowStr()
    const memoText = memo.trim()

    const dealDescription = recurringEnabled
      ? `생활비 · 매월 ${payDay}일 자동집행${memoText ? ` · ${memoText}` : ''}`
      : `생활비${memoText ? ` · ${memoText}` : ''} · 즉시 입금`

    const timeline = [
      { time: now, label: `${recipient.name}에게 생활비 지급`, type: 'event' },
      { time: now, label: recurringEnabled ? `매월 ${payDay}일 자동집행 등록 완료` : '권한 자금 지갑 생성 완료', type: 'done' },
    ]

    const safety = [
      `${recipient.name}의 생활비 지갑으로 즉시 입금 (출금 불가, 카드 결제만)`,
      ...(blockedLabels.length > 0
        ? [`MCC 차단 ${blockedLabels.length}개: ${blockedLabels.slice(0, 3).join(', ')}`]
        : ['MCC 차단 없음']
      ),
      ...(singleLimit ? [`1회 결제 한도: ${fmt(singleLimit)}원`] : []),
      ...(recurringEnabled ? [`매월 ${payDay}일 자동 집행 · 3일 전 알림`] : []),
      '지급 증빙 자동 보관 (5년)',
    ]

    addTransaction({
      type: 'living',
      fromUserId: 'me_juda_kim',
      fromUserName: '김주다',
      fromUserType: 'personal',
      recipient,
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `생활비${memoText ? ` · ${memoText}` : ''}`,
      walletId,
      walletLabel,
      payDateMode: recurringEnabled ? 'recurring' : 'immediate',
      dealTitle: `${recipient.name} 생활비`,
      dealDescription,
      timeline,
      safety,
      dealStatus: 'completed',
      statusLabel: recurringEnabled ? '자동집행 등록' : '지급 완료',
      myAction: null,
    })

    // 자동지급 등록
    if (recurringEnabled) {
      addAutoPayLiving({
        recipientName: recipient.name,
        recipientInitial: recipient.emoji || recipient.initial,
        avatarBg: recipient.avatarBg,
        avatarFg: recipient.avatarFg,
        amount: amtNum,
        dayOfMonth: payDay,
        walletId,
        walletLabel,
      })
    }
  }

  // ─────────────────────────────────────────────
  // Step 1: 금액 입력
  // ─────────────────────────────────────────────
  if (step === 'input') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle={t('execLiving.smallTitle')}
          badge={t('execLiving.badge')}
          badgeTone="permission"
          bigTitle={fill(t('execLiving.step1.title'), { name: recipient.name })}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 받는 사람 카드 */}
          <div style={{
            background: COLORS.bgCard, boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg, padding:'12px 14px',
            display:'flex', alignItems:'center', gap:'12px',
            marginBottom:'18px',
          }}>
            <div style={{
              width:'40px', height:'40px', borderRadius:'50%',
              background: recipient.avatarBg || `${theme.brand}20`,
              color: recipient.avatarFg || theme.brand,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: recipient.emoji ? '22px' : '15px', fontWeight:700, flexShrink:0,
            }}>
              {recipient.emoji || recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>
                {t('execLiving.recipient.label')}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{recipient.name}</span>
                {recipient.verified && (
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="#10B981"/>
                    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                {recipient.verified ? t('execLiving.kyc.verified') : recipient.kyc}
                {recipient.phone ? ` · ${recipient.phone}` : ''}
              </div>
            </div>
            <button onClick={changeRecipient} style={{
              fontSize:'12px', fontWeight:600, color: theme.brandDark,
              background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', flexShrink:0,
            }}>
              {t('execLiving.recipient.change')}
            </button>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execLiving.wallet.label')}
            </div>
            <WalletPicker
              executeType="living"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setAmount('') }}
            />
          </div>

          {/* 금액 입력 */}
          <div style={{ textAlign:'center', marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'10px' }}>
              {t('execLiving.amount.label')}
            </div>
            <AmountDisplay amount={amount} onChange={setAmount} onClear={() => setAmount('')} />
            <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'8px' }}>
              {walletLabel} 잔액 {fmt(walletBalance)}원
            </div>
          </div>

          {/* 빠른 금액 */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'22px' }}>
            {[100000, 200000, 300000, 500000].map(v => (
              <button key={v}
                onClick={() => setAmount(String(amtNum + v))}
                style={{
                  flex:1, height:'36px',
                  background: COLORS.bgCard, boxShadow: SHADOWS.card,
                  border:'none', borderRadius:'10px',
                  fontSize:'12px', fontWeight:600, color: COLORS.t2,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                +{v >= 10000 ? `${v / 10000}만` : v}
              </button>
            ))}
          </div>

          {/* ▶ 매월 자동 지급 설정 (카테고리 대체) */}
          <RecurringSection
            enabled={recurringEnabled}
            onToggle={() => setRecurringEnabled(v => !v)}
            payDay={payDay}
            onDayChange={setPayDay}
          />

          {/* 사용 통제 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
            {t('execLiving.mcc.label')}
          </div>
          <button
            onClick={() => setStep('mcc')}
            style={{
              width:'100%', background: COLORS.bgCard, boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg, border:'none', padding:'14px 16px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              marginBottom:'18px',
            }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                {blockedCount === 0
                  ? t('execLiving.mcc.none')
                  : fill(t('execLiving.mcc.blocked'), { count: blockedCount })}
                {singleLimit ? ` · 1회 한도 ${fmt(singleLimit)}원` : ''}
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4, lineHeight:1.45 }}>
                {blockedCount === 0 ? t('execLiving.mcc.noneDesc') : blockedLabels.join(', ')}
              </div>
            </div>
            <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0, marginLeft:'8px' }}>›</span>
          </button>

          {/* 메모 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
            {t('execLiving.memo.label')}
          </div>
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder={t('execLiving.memo.ph')}
            maxLength={30}
            style={{
              width:'100%', height:'48px',
              background: COLORS.bgCard, boxShadow: SHADOWS.card, border:'none',
              borderRadius: RADIUS.lg, padding:'0 16px',
              fontSize:'13px', color: COLORS.t1,
              outline:'none', fontFamily:'inherit',
              marginBottom:'18px', boxSizing:'border-box',
            }}
          />

          {/* 안내 */}
          <div style={{
            padding:'12px 14px', background:'#E0F7FA',
            borderRadius: RADIUS.md, fontSize:'11px', color:'#0E7490', lineHeight:1.65,
          }}>
            {fill(t('execLiving.wallet.info'), { name: recipient.name })}
          </div>
        </div>
      </div>

      {/* 하단 CTA */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        padding:'12px 16px 24px',
        borderTop:`1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button
          onClick={() => canSend && setStep('confirm')}
          disabled={!canSend}
          style={{
            width:'100%', height:'52px',
            background: canSend ? theme.brandDark : COLORS.bgMuted,
            color: canSend ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: canSend ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: canSend ? SHADOWS.card : 'none',
          }}>
          {amtNum > walletBalance
            ? t('execLiving.btn.insufficient')
            : amtNum >= 1000
              ? fill(t('execLiving.btn.send'), { amount: amtFmt })
              : t('execLiving.btn.noAmount')}
        </button>
      </div>
    </PhoneShell>
  )

  // ─────────────────────────────────────────────
  // Step 2: MCC 사용 통제
  // ─────────────────────────────────────────────
  if (step === 'mcc') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle={t('execLiving.mcc.step.smallTitle')}
          bigTitle={t('execLiving.mcc.step.title')}
          sub={fill(t('execLiving.mcc.step.sub'), { name: recipient.name })}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home"
        />
        <div style={{ padding:'18px 16px 100px' }}>
          <MccBlock
            items={mccItems}
            onChange={setMccItems}
            recipientName={recipient.name}
            singleLimit={singleLimit}
            onLimitChange={setSingleLimit}
          />
        </div>
      </div>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        padding:'12px 16px 24px',
        borderTop:`1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => setStep('confirm')}
          style={{
            width:'100%', height:'52px',
            background: theme.brandDark, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.card,
          }}>
          {t('execLiving.btn.next')}
        </button>
      </div>
    </PhoneShell>
  )

  // ─────────────────────────────────────────────
  // Step 3: 확인
  // ─────────────────────────────────────────────
  if (step === 'confirm') return (
    <ConfirmStep
      smallTitle={t('execLiving.confirm.smallTitle')}
      bigAmount={`${amtFmt}원`}
      sub={fill(t('execLiving.confirm.bigSub'), { name: recipient.name })}
      onBack={goBack}
      headerGrad={theme.headerGrad}
      exitTo="/home"
      rows={[
        {
          label: t('execLiving.row.recipient'),
          value: recipient.name,
          sub: recipient.verified ? t('execLiving.kyc.verified') : (recipient.kyc || ''),
          editAction: changeRecipient,
        },
        {
          label: t('execLiving.wallet.label'),
          value: walletLabel,
          sub: fill(t('execLiving.row.walletBalance'), { amount: fmt(walletBalance) }),
          editAction: () => setStep('input'),
        },
        {
          label: '자동 지급',
          value: recurringEnabled ? `매월 ${payDay}일 자동 집행` : '일회 지급',
          sub: recurringEnabled ? `다음 집행일 ${nextPayDate} · ${alertDate} 알림` : null,
          editAction: () => setStep('input'),
        },
        {
          label: t('execLiving.row.mcc'),
          value: blockedCount > 0
            ? fill(t('execLiving.row.mccBlocked'), { count: blockedCount })
            : t('execLiving.row.mccNone'),
          sub: blockedCount > 0 ? blockedLabels.join(', ') : null,
          editAction: () => setStep('mcc'),
        },
        {
          label: '1회 결제 한도',
          value: singleLimit ? `${fmt(singleLimit)}원` : '제한 없음',
          editAction: () => setStep('mcc'),
        },
        ...(memo.trim() ? [{
          label: t('execLiving.row.memo'),
          value: memo,
          editAction: () => setStep('input'),
        }] : []),
      ]}
      autoActions={[
        fill(t('execLiving.auto.deposit'), { name: recipient.name }),
        fill(t('execLiving.auto.notify'),  { name: recipient.name }),
        ...(recurringEnabled ? [`매월 ${payDay}일 자동 집행 등록 · ${alertDate} 3일 전 알림`] : []),
        t('execLiving.auto.archive'),
      ]}
      footerNote={fill(t('execLiving.footer.afterExec'), {
        wallet: walletLabel,
        before: fmt(walletBalance),
        after:  fmt(remaining),
      })}
      primaryLabel={t('execLiving.btn.execute')}
      onPrimary={() => setStep('pin')}
      onCancel={() => setStep('input')}
    />
  )

  // ─────────────────────────────────────────────
  // Step 4: PIN
  // ─────────────────────────────────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={fill(t('execLiving.pin.summary'), { name: recipient.name })}
      summaryRight={`${amtFmt}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
      headerGrad={theme.headerGrad}
      exitTo="/home"
    />
  )

  // ─────────────────────────────────────────────
  // Step 5: 완료
  // ─────────────────────────────────────────────
  if (step === 'done') return (
    <DoneStep
      tone={recurringEnabled ? 'waiting' : 'success'}
      title={recurringEnabled ? '자동 지급 등록 완료!' : t('execLiving.done.title')}
      description={
        recurringEnabled
          ? <>{recipient.name}에게 매월 {payDay}일 <strong>{amtFmt}원</strong>이 자동 집행됩니다.<br/>집행 3일 전 알림을 보내드려요.</>
          : <>{fill(t('execLiving.done.desc'), { name: recipient.name, amount: amtFmt })}</>
      }
      summary={[
        { label: t('execLiving.done.label.amount'), value: `${amtFmt}원`, accent: true },
        ...(recurringEnabled ? [
          { label: '자동 지급일', value: `매월 ${payDay}일` },
          { label: '다음 집행일', value: nextPayDate },
          { label: '3일 전 알림', value: alertDate },
        ] : []),
        {
          label: t('execLiving.row.mcc'),
          value: blockedCount > 0
            ? fill(t('execLiving.done.mccBlocked'), { count: blockedCount })
            : t('execLiving.done.mccNone'),
        },
        { label: '1회 결제 한도', value: singleLimit ? `${fmt(singleLimit)}원` : '제한 없음' },
        { label: t('execLiving.done.label.remaining'), value: `${fmt(remaining)}원`, bold: true },
      ]}
      noteYellow={
        recurringEnabled
          ? `잔액 부족 시 홈 화면 처리 필요 항목에 자동 등록됩니다. 알림을 탭하면 설정을 변경할 수 있어요.`
          : fill(t('execLiving.done.note'), { name: recipient.name })
      }
      primaryLabel={t('execLiving.btn.toHome')}
      onPrimary={() => navigate('/home')}
      secondaryLabel={fill(t('execLiving.btn.chat'), { name: recipient.name })}
      onSecondary={() => navigate('/messages')}
      timestamp={todayStr()}
      headerGrad={theme.headerGrad}
      exitTo="/home"
    />
  )

  return null
}
