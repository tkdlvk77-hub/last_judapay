import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../../shared/transactionStore'
import { executePayout } from '../../services/payout'
import { session } from '../../services/api'
import { dialog } from '../../components/Dialog'
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

const CATEGORIES = [
  { id: 'birthday',  tKey: 'execGift.category.birthday' },
  { id: 'allowance', tKey: 'execGift.category.allowance' },
  { id: 'gift',      tKey: 'execGift.category.gift' },
  { id: 'etc',       tKey: 'execGift.category.etc' },
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
  // amount 는 숫자만 담는 string (예: "130000"). 표시는 콤마 포함 ("130,000").
  const rawDigits = String(amount || '').replace(/[^0-9]/g, '')
  const displayValue = rawDigits ? Number(rawDigits).toLocaleString('ko-KR') : ''
  const len = displayValue ? displayValue.length : 1
  const fontSize = len <= 7 ? 44 : len <= 10 ? 36 : len <= 13 ? 28 : 22

  return (
    <div style={{ position: 'relative', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px', transform: 'translateX(18px)' }}>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            lineHeight: 1,
            color: amount ? COLORS.t1 : COLORS.t5,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            textAlign: 'center',
            fontFamily: 'inherit',
            width: '200px',
            transition: 'font-size 0.15s',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
        />
        <span style={{
          fontSize: fontSize >= 36 ? '26px' : fontSize >= 28 ? '20px' : '16px',
          fontWeight: 700,
          color: amount ? COLORS.t1 : COLORS.t5,
          lineHeight: 1,
          transition: 'font-size 0.15s',
        }}>원</span>
      </div>
      {amount > 0 && (
        <button onClick={onClear}
          style={{
            position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
            width: '28px', height: '28px', borderRadius: '50%',
            background: COLORS.bgMuted, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteGift() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/personal/select?purpose=gift', { replace: true })
    }
  }, [recipient, navigate])

  const [step, setStep]       = useState('input')
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount]   = useState('')
  const [category, setCategory] = useState('birthday')
  const [memo, setMemo]       = useState('')

  if (!recipient) return null

  // ── 파생 값 ──────────────────────────────────
  const amtNum        = parseInt(amount) || 0
  const amtFmt        = fmt(amtNum)
  const selectedWallet = getWalletById(walletId)
  const walletBalance  = selectedWallet?.amount ?? MY_BALANCE
  const walletLabel    = selectedWallet?.label || 'MY 지갑'
  const remaining      = walletBalance - amtNum
  const categoryLabel  = t(CATEGORIES.find(c => c.id === category)?.tKey || CATEGORIES[0].tKey)
  const canSend        = amtNum >= 1000 && amtNum <= walletBalance

  // ── 액션 ──────────────────────────────────────
  const changeRecipient = () => navigate('/execute/personal/select?purpose=gift')

  const goBack = () => {
    if (step === 'input')    navigate(-1)
    else if (step === 'confirm') setStep('input')
    else if (step === 'pin')    setStep('confirm')
    else if (step === 'done')   return
  }
  useStepHistory(goBack, step === 'input', !!recipient)

  // ─────────────────────────────────────────────────────
  // 자금집행: 서버 호출 + 클라 store 갱신
  //   1) executePayout({...}, { pin })
  //      → 서버: 잔액 차감 + payout INSERT + 메시지 자동 생성
  //   2) addTransaction({...}) — 기존 UI 호환 위해 store 도 갱신
  // ─────────────────────────────────────────────────────
  const pushToStore = async (pin) => {
    const now = nowStr()
    const memoText = memo.trim()
    const me = session.user

    const dealDescription = `${categoryLabel}${memoText ? ` · ${memoText}` : ''} · 즉시 입금`
    const timeline = [
      { time: now, label: `${recipient.name}에게 ${categoryLabel} 지급`, type: 'event' },
      { time: now, label: '받은 지갑으로 입금 완료', type: 'done' },
    ]
    const safety = [
      `${recipient.name}의 받은 지갑으로 즉시 입금 (출금 불가, 카드 결제만)`,
      '지급 증빙 자동 보관 (5년)',
      '이상거래 자동 감지',
    ]

    // ─── 서버 호출 ────────────────────────────────────
    let serverPayout = null
    try {
      serverPayout = await executePayout({
        type:        'gift',
        typeLabel:   '용돈/선물',
        typeIcon:    '🎁',
        category:    'notification',
        mainCat:     '운영비',
        subCat:      '개인사용',
        amount:      amtNum,
        whtAmount:   0,
        netAmount:   amtNum,
        recipient: {
          userId:     recipient.userId || null,
          phone:      recipient.phone || null,
          name:       recipient.name,
          verified:   !!recipient.verified,
          isBusiness: !!recipient.isBusiness,
        },
        payDateMode: 'immediate',
        status:      'completed',
        statusLabel: '지급 완료',
        reason:      `${categoryLabel}${memoText ? ` · ${memoText}` : ''}`,
        walletId,
        walletLabel,
        dealTitle:   `${recipient.name} ${categoryLabel}`,
      }, { pin })
      console.log('[ExecuteGift] payout success', serverPayout)
    } catch (e) {
      console.error('[ExecuteGift] payout failed', e)
      const msg = e?.message || '서버 오류가 발생했습니다.'
      await dialog.alert({ title: '자금집행 실패', message: msg, okText: '확인' })
      return false   // step='done' 으로 진행하지 않음 → 호출자가 setStep('done') 건너뜀
    }

    // ─── 클라 store 갱신 (기존 UI 호환) ───────────────
    //   ★ _skipServerSync: 위에서 이미 executePayout() 직접 호출 완료.
    //     store 가 다시 _syncToServer → executePayout 부르면 서버에 중복 INSERT 발생.
    addTransaction({
      _skipServerSync: true,
      type: 'gift',
      fromUserId: me?.userId || 'me_juda_kim',
      fromUserName: me?.name || '김주다',
      fromUserType: 'personal',
      recipient,
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `${categoryLabel}${memoText ? ` · ${memoText}` : ''}`,
      walletId,
      walletLabel,
      payDateMode: 'immediate',
      dealTitle: `${recipient.name} ${categoryLabel}`,
      dealDescription,
      timeline,
      safety,
      dealStatus: 'completed',
      statusLabel: '지급 완료',
      myAction: null,
      // 서버 연계 정보
      serverPayoutId: serverPayout?.id,
      serverThreadId: serverPayout?.threadId,
    })
    return true
  }

  // ─────────────────────────────────────────────
  // Step 1: 금액 입력
  // ─────────────────────────────────────────────
  if (step === 'input') return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execGift.smallTitle')}
          badge={t('execGift.badge')}
          badgeTone="permission"
          bigTitle={fill(t('execGift.step1.title'), { name: recipient.name })}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home"
        />

        <div style={{ padding: '18px 16px 100px' }}>

          {/* 받는 사람 카드 */}
          <div style={{
            background: COLORS.bgCard, boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '18px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: recipient.avatarBg || `${theme.brand}20`,
              color: recipient.avatarFg || theme.brand,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: recipient.emoji ? '22px' : '15px', fontWeight: 700, flexShrink: 0,
            }}>
              {recipient.emoji || recipient.initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: COLORS.t4, marginBottom: '2px' }}>
                {t('execGift.recipient.label')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.t1 }}>{recipient.name}</span>
                {recipient.verified && (
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="#10B981"/>
                    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.t4 }}>
                {recipient.verified ? t('execGift.kyc.verified') : recipient.kyc}
                {recipient.phone ? ` · ${recipient.phone}` : ''}
              </div>
            </div>
            <button onClick={changeRecipient}
              style={{
                fontSize: '12px', fontWeight: 600, color: theme.brandDark,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}>
              {t('execGift.recipient.change')}
            </button>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.t2, marginBottom: '8px', padding: '0 4px' }}>
              {t('execGift.wallet.label')}
            </div>
            <WalletPicker
              executeType="gift"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setAmount('') }}
            />
          </div>

          {/* 금액 입력 */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', color: COLORS.t4, marginBottom: '10px' }}>
              {t('execGift.amount.label')}
            </div>
            <AmountDisplay amount={amount} onChange={setAmount} onClear={() => setAmount('')} />
            <div style={{ fontSize: '11px', color: COLORS.t4, marginTop: '8px' }}>
              {walletLabel} 잔액 {fmt(walletBalance)}원
            </div>
          </div>

          {/* 빠른 금액 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}>
            {[10000, 30000, 50000, 100000].map(v => (
              <button key={v}
                onClick={() => setAmount(String(amtNum + v))}
                style={{
                  flex: 1, height: '36px',
                  background: COLORS.bgCard, boxShadow: SHADOWS.card,
                  border: 'none', borderRadius: '10px',
                  fontSize: '12px', fontWeight: 600, color: COLORS.t2,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                +{v >= 10000 ? `${v / 10000}만` : v}
              </button>
            ))}
          </div>

          {/* 카테고리 */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.t2, marginBottom: '8px', padding: '0 4px' }}>
            {t('execGift.category.label')}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
            {CATEGORIES.map(c => {
              const active = category === c.id
              return (
                <button key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    flex: 1, height: '40px', borderRadius: RADIUS.md,
                    background: active ? theme.brand : COLORS.bgCard,
                    boxShadow: active ? `0 4px 12px ${theme.brand}40` : SHADOWS.card,
                    border: 'none',
                    color: active ? '#fff' : COLORS.t2,
                    fontSize: '13px', fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all .15s',
                  }}>
                  {t(c.tKey)}
                </button>
              )
            })}
          </div>

          {/* 메모 */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.t2, marginBottom: '8px', padding: '0 4px' }}>
            {t('execGift.memo.label')}
          </div>
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder={t('execGift.memo.ph')}
            maxLength={30}
            style={{
              width: '100%', height: '48px',
              background: COLORS.bgCard, boxShadow: SHADOWS.card, border: 'none',
              borderRadius: RADIUS.lg, padding: '0 16px',
              fontSize: '13px', color: COLORS.t1,
              outline: 'none', fontFamily: 'inherit',
              marginBottom: '18px', boxSizing: 'border-box',
            }}
          />

          {/* 권한자금 안내 */}
          <div style={{
            padding: '12px 14px',
            background: '#EDF3FA', borderRadius: RADIUS.md,
            fontSize: '11px', color: '#1E5294', lineHeight: 1.65,
          }}>
            {fill(t('execGift.wallet.info'), { name: recipient.name })}
          </div>

        </div>
      </div>

      {/* 하단 CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button
          onClick={() => canSend && setStep('confirm')}
          disabled={!canSend}
          style={{
            width: '100%', height: '52px',
            background: canSend ? theme.brandDark : COLORS.bgMuted,
            color: canSend ? '#fff' : COLORS.t4,
            border: 'none', borderRadius: RADIUS.md,
            fontSize: '15px', fontWeight: 700,
            cursor: canSend ? 'pointer' : 'default',
            fontFamily: 'inherit',
            boxShadow: canSend ? SHADOWS.card : 'none',
          }}>
          {amtNum > walletBalance
            ? t('execGift.btn.insufficient')
            : amtNum >= 1000
              ? fill(t('execGift.btn.send'), { amount: amtFmt })
              : t('execGift.btn.noAmount')}
        </button>
      </div>
    </PhoneShell>
  )

  // ─────────────────────────────────────────────
  // Step 2: 확인 (ConfirmStep 공용)
  // ─────────────────────────────────────────────
  if (step === 'confirm') return (
    <ConfirmStep
      smallTitle={t('execGift.confirm.smallTitle')}
      bigAmount={`${amtFmt}원`}
      sub={fill(t('execGift.confirm.bigSub'), { name: recipient.name })}
      onBack={goBack}
      headerGrad={theme.headerGrad}
      exitTo="/home"
      rows={[
        {
          label: t('execGift.row.recipient'),
          value: recipient.name,
          sub: recipient.verified ? t('execGift.kyc.verified') : (recipient.kyc || ''),
          editAction: changeRecipient,
        },
        {
          label: t('execGift.wallet.label'),
          value: walletLabel,
          sub: fill(t('execGift.row.walletBalance'), { amount: fmt(walletBalance) }),
          editAction: () => setStep('input'),
        },
        {
          label: t('execGift.row.category'),
          value: categoryLabel,
          editAction: () => setStep('input'),
        },
        ...(memo.trim() ? [{
          label: t('execGift.row.memo'),
          value: memo,
          editAction: () => setStep('input'),
        }] : []),
      ]}
      autoActions={[
        fill(t('execGift.auto.deposit'), { name: recipient.name }),
        fill(t('execGift.auto.notify'),  { name: recipient.name }),
        t('execGift.auto.archive'),
      ]}
      footerNote={fill(t('execGift.footer.afterExec'), {
        wallet: walletLabel,
        before: fmt(walletBalance),
        after:  fmt(remaining),
      })}
      primaryLabel={t('execGift.btn.execute')}
      onPrimary={() => setStep('pin')}
      onCancel={() => setStep('input')}
    />
  )

  // ─────────────────────────────────────────────
  // Step 3: PIN (PinStep 공용)
  // ─────────────────────────────────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={fill(t('execGift.pin.summary'), { name: recipient.name })}
      summaryRight={`${amtFmt}원`}
      onBack={goBack}
      onComplete={async (pin) => {
        const ok = await pushToStore(pin)
        if (ok) setStep('done')
      }}
      onFaceID={async () => {
        // Face ID 흐름은 다음 단계 — 우선 PIN 만 지원
        await dialog.alert({
          title: 'Face ID 준비 중',
          message: 'Face ID 자금집행은 곧 지원됩니다.\nPIN으로 진행해주세요.',
          okText: '확인',
        })
      }}
      headerGrad={theme.headerGrad}
      exitTo="/home"
    />
  )

  // ─────────────────────────────────────────────
  // Step 4: 완료 (DoneStep 공용)
  // ─────────────────────────────────────────────
  if (step === 'done') return (
    <DoneStep
      tone="success"
      title={t('execGift.done.title')}
      description={
        <>{fill(t('execGift.done.desc'), { name: recipient.name, amount: amtFmt })}</>
      }
      summary={[
        { label: t('execGift.done.label.amount'), value: `${amtFmt}원`, accent: true },
        { label: t('execGift.row.category'),      value: categoryLabel },
        { label: t('execGift.done.label.remaining'), value: `${fmt(remaining)}원`, bold: true },
      ]}
      noteYellow={fill(t('execGift.done.note'), { name: recipient.name })}
      primaryLabel={t('execGift.btn.toHome')}
      onPrimary={() => navigate('/home')}
      secondaryLabel={fill(t('execGift.btn.chat'), { name: recipient.name })}
      onSecondary={() => navigate('/messages')}
      timestamp={todayStr()}
      headerGrad={theme.headerGrad}
      exitTo="/home"
    />
  )

  return null
}
