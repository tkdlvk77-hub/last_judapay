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
import MccBlock, { DEFAULT_MCC } from '../../shared/execute/MccBlock'
import ConfirmStep from '../../shared/execute/ConfirmStep'
import PinStep from '../../shared/execute/PinStep'
import DoneStep from '../../shared/execute/DoneStep'
import { useStepHistory } from '../../hooks/useStepHistory'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const CORP_BALANCE_FALLBACK = 47820000

// 보고 주기 옵션 (자동 만료일 계산용 days)
const REPORT_CYCLES = [
  { id: 'monthly',   tKey: 'execSupport.report.monthly',   defaultDays: 365 },
  { id: 'quarterly', tKey: 'execSupport.report.quarterly', defaultDays: 365 },
  { id: 'annual',    tKey: 'execSupport.report.annual',    defaultDays: 365 },
  { id: 'none',      tKey: 'execSupport.report.none',      defaultDays: 180 },
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function plusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function defaultExpiryByReportCycle(cycleId) {
  const c = REPORT_CYCLES.find(r => r.id === cycleId)
  return plusDays(c?.defaultDays ?? 365)
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteSupportBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient || location.state?.recipients?.[0]
  const theme = getAccountTheme()
  const t = useT()

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/business/select-recipient?menu=support', { replace: true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [supportTitle, setSupportTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [reportCycleId, setReportCycleId] = useState('quarterly')
  const [expiryDate, setExpiryDate] = useState(defaultExpiryByReportCycle('quarterly'))
  const [mccItems, setMccItems] = useState(DEFAULT_MCC)
  const [singleLimit, setSingleLimit] = useState(null)
  const [expiryTouched, setExpiryTouched] = useState(false)

  if (!recipient) return null

  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE_FALLBACK
  const walletLabel = selectedWallet?.label || '법인 자금'

  const amtNum = parseInt(amount) || 0
  const blockedItems = mccItems.filter(m => m.block)
  const blockedCount = blockedItems.length

  const reportCycle = REPORT_CYCLES.find(r => r.id === reportCycleId) || REPORT_CYCLES[1]
  const reportCycleLabel = t(reportCycle.tKey)

  // 보고 주기 변경 시 만료일 자동 갱신 (사용자가 직접 변경 안 했을 때만)
  const handleReportCycleChange = (newId) => {
    setReportCycleId(newId)
    if (!expiryTouched) {
      setExpiryDate(defaultExpiryByReportCycle(newId))
    }
  }
  const handleExpiryChange = (e) => {
    setExpiryDate(e.target.value)
    setExpiryTouched(true)
  }

  // 다음 버튼 (Step 1)
  const canStep1Next = amtNum > 0 && amtNum <= walletBalance

  // 변경
  const changeRecipient = () => {
    navigate('/execute/business/select-recipient?menu=support')
  }

  // 뒤로가기
  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 2) setStep(1)
    else if (step === 'confirm') setStep(2)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'done') return
  }
  useStepHistory(goBack, step === 1, !!recipient)

  // 거래 제목 결정 (지원명목 우선, 없으면 자동)
  const dealTitle = supportTitle.trim() || `${recipient.name} 자금 지원`

  // store push
  const pushToStore = () => {
    const verified = recipient?.verified !== false   // 사업자/투자대상은 기본 verified
    const dealStatus = !verified ? 'waiting' : 'signing'
    const statusLabel = !verified ? '외부링크 인증 대기' : '상대방 서명 대기'

    // 보고 주기 한글 라벨
    const reportLabelMap = {
      monthly: '매월',
      quarterly: '분기',
      annual: '연간',
      none: '보고 없음',
    }
    const reportLabel = reportLabelMap[reportCycleId] || '분기'

    // MCC 차단 항목
    const blockedMccLabels = blockedItems.map(m => m.label)

    // 풍부 마일스톤 — 서명 → 지급 → 보고 → 종료
    const milestones = [
      {
        id: 'm1',
        label: '약정서 양측 서명',
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: verified
          ? `${recipient.name} 서명 완료 시 다음 단계`
          : '미가입 상대방은 외부링크 인증 후 서명 가능',
      },
      {
        id: 'm2',
        label: '권한 자금 입금',
        amount: amtNum,
        status: 'pending',
        date: null,
        action: null,
        note: `양측 서명 완료 즉시 ${recipient.name} 받은 지갑에 권한 자금 입금`,
      },
      ...(reportCycleId !== 'none' ? [{
        id: 'm3',
        label: `${reportLabel} 자금 사용 보고서`,
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: `${reportLabel} 자동 생성 + PDF 발송 (사용 내역)`,
      }] : []),
      {
        id: reportCycleId !== 'none' ? 'm4' : 'm3',
        label: `사용 종료 (${expiryDate})`,
        amount: 0,
        status: 'pending',
        date: expiryDate,
        action: null,
        note: '미사용 잔액 자동으로 법인 자금에 환급',
      },
    ]

    // 활동 타임라인 시드
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 약정서 발송`, type: 'event' },
      ...(reportCycleId !== 'none' ? [{ time: '다음 정기일', label: `첫 ${reportLabel} 보고서 자동 생성 예정`, type: 'pending' }] : []),
      { time: expiryDate, label: '사용 종료 예정 (미사용 잔액 자동 환급)', type: 'pending' },
    ]

    // 안전 장치 (자금 지원 표준 + 입력값 기반 분기)
    const safety = [
      '양측 약정서 서명 + 자동 분리 보관',
      ...(reportCycleId !== 'none' ? [`${reportLabel} 사용 보고서 PDF 자동 생성`] : []),
      ...(blockedItems.length > 0 ? [`MCC 차단 ${blockedItems.length}개: ${blockedMccLabels.slice(0, 3).join(', ')}${blockedItems.length > 3 ? ' 외' : ''}`] : []),
      `사용 종료 후 미사용 잔액 자동 환급 (${expiryDate})`,
      '증빙 자동 보관 (5년) + 세무사 자동 전송',
      '분쟁 시 약정서 + 사용 내역 자동 증거',
    ]

    // 계약서 파일명
    const safeName = recipient.name.replace(/[^\w가-힣]/g, '_')
    const contractFile = `자금지원약정서_${safeName}.pdf`

    // 거래 설명
    const dealDescription = `${supportTitle.trim() || '자금 지원'} · 사용 종료 ${expiryDate}${reportCycleId !== 'none' ? ` · ${reportLabel} 보고` : ''}${purpose.trim() ? ` · ${purpose.trim()}` : ''}`

    addTransaction({
      type: 'support',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient: { ...recipient, verified },
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `${dealTitle}${purpose.trim() ? ` · ${purpose.trim()}` : ''}`,
      walletId,
      walletLabel,
      payDateMode: 'immediate',
      // 거래형 (풍부)
      dealTitle,
      dealDescription,
      contractDocId: `SP_${Date.now()}`,
      contractExpires: expiryDate,
      contractSigned: false,
      contractFile,
      milestones,
      timeline,
      safety,
      dealStatus,
      statusLabel,
      myAction: null,
      // 자금 지원 메타 — investMeta 재사용 (TransactionDetail "자금 지원 정보" 카드 호환)
      investMeta: {
        type: 'support',
        typeLabel: '자금 지원',
        purposeLabel: supportTitle.trim() || '자금 지원',
        purposeMemo: purpose.trim() || null,
        period: `사용 종료 ${expiryDate}`,
        reportFreq: reportLabel,
        autoRefund: true,                // 기업 자금 지원은 항상 자동 환급
        blockedMcc: blockedMccLabels,
      },
      // 백엔드 연동용 원본 메타 (백업)
      supportMeta: {
        reportCycle: reportCycleId,
        expiryDate,
        blockedCategories: blockedItems.map(m => m.id),
      },
    })
  }

  // ───────────────── Step 1: 기본 정보 ─────────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execSupport.smallTitle')}
          step={1} totalSteps={2}
          bigTitle={t('execSupport.step1.title')}
          sub={t('execSupport.step1.sub')}
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
              borderRadius: recipient.isBusiness ? '10px' : '50%',
              background: recipient.avatarBg || '#F2EFE9',
              color: recipient.avatarFg || '#555550',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:700, flexShrink:0,
            }}>
              {recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>
                {t('execSupport.recipient.label')}
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
                {!recipient.employeeInfo && recipient.isBusiness && recipient.brn && (
                  <span style={{ fontSize:'11px', color: COLORS.t4, fontWeight:500, marginLeft:'4px' }}>
                    · {recipient.brn}
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
              {t('execSupport.recipient.change')}
            </button>
          </div>

          {/* 권한 자금 안내 박스 */}
          <div style={{
            background:'#ECFEFF',
            border:'1px solid #67E8F9',
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            marginBottom:'14px',
            display:'flex', gap:'10px',
          }}>
            <div style={{
              width:'22px', height:'22px',
              borderRadius:'50%',
              background:'#0891B2',
              color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:800,
              flexShrink:0,
            }}>🌱</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#155E75', marginBottom:'4px' }}>
                {t('execSupport.notice.title')}
              </div>
              <div style={{ fontSize:'11px', color:'#155E75', lineHeight:1.6 }}>
                {t('execSupport.notice.body')}
              </div>
            </div>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execSupport.wallet.label')}
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => setWalletId(w.id)}
            />
          </div>

          {/* 지원 금액 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execSupport.amount.label')}
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
                placeholder={t('execSupport.amount.ph')}
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

          {/* 지원 명목 (선택) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execSupport.title.label')}
            </div>
            <input
              type="text"
              value={supportTitle}
              onChange={(e) => setSupportTitle(e.target.value)}
              placeholder={t('execSupport.title.ph')}
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

          {/* 지원 사유 (선택) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              {t('execSupport.purpose.label')}
            </div>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t('execSupport.purpose.ph')}
              rows={3}
              style={{
                width:'100%',
                padding:'12px 14px',
                background: COLORS.bgCard,
                border:`1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                fontSize:'13px', color: COLORS.t1,
                fontFamily:'inherit', outline:'none',
                resize:'vertical',
                minHeight:'60px',
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
          <button onClick={() => canStep1Next && setStep(2)}
            disabled={!canStep1Next}
            style={{
              width:'100%', height:'52px',
              background: canStep1Next ? theme.brandDark : COLORS.bgMuted,
              color: canStep1Next ? '#fff' : COLORS.t5,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor: canStep1Next ? 'pointer' : 'not-allowed',
              fontFamily:'inherit',
              boxShadow: canStep1Next ? SHADOWS.card : 'none',
            }}>
            {t('execSupport.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Step 2: 권한 + 보고 ─────────────────
  if (step === 2) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('execSupport.smallTitle')}
          step={2} totalSteps={2}
          bigTitle={t('execSupport.step2.title')}
          sub={t('execSupport.step2.sub')}
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 보고 주기 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>
              {t('execSupport.report.label')}
            </div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>
              {t('execSupport.report.help')}
            </div>
            <div style={{
              background: COLORS.bgCard,
              border:`1px solid ${COLORS.border}`,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
            }}>
              {REPORT_CYCLES.map((c, i) => (
                <button key={c.id}
                  onClick={() => handleReportCycleChange(c.id)}
                  style={{
                    width:'100%', padding:'12px 14px',
                    background: reportCycleId === c.id ? theme.brandDark + '08' : 'transparent',
                    border:'none',
                    borderBottom: i < REPORT_CYCLES.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                    display:'flex', alignItems:'center', gap:'10px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}>
                  <div style={{
                    width:'18px', height:'18px',
                    borderRadius:'50%',
                    background: reportCycleId === c.id ? theme.brandDark : 'transparent',
                    border: reportCycleId === c.id ? 'none' : `2px solid ${COLORS.t5}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    {reportCycleId === c.id && (
                      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }}/>
                    )}
                  </div>
                  <span style={{
                    fontSize:'13px', fontWeight: reportCycleId === c.id ? 700 : 500,
                    color: reportCycleId === c.id ? theme.brandDark : COLORS.t1,
                  }}>
                    {t(c.tKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 정산 만료일 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>
              {t('execSupport.expiry.label')}
            </div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>
              {expiryTouched ? t('execSupport.expiry.help') : t('execSupport.expiry.auto')}
            </div>
            <div style={{ width:'100%', overflow:'hidden', borderRadius: RADIUS.lg }}>
              <input
                type="date"
                value={expiryDate}
                onChange={handleExpiryChange}
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

            {/* 만료일 경고 */}
            <div style={{
              marginTop:'10px',
              background:'#FFFBEB',
              border:'1px solid #FCD34D',
              borderRadius: RADIUS.lg,
              padding:'10px 12px',
              display:'flex', gap:'8px',
            }}>
              <div style={{
                width:'18px', height:'18px',
                borderRadius:'50%',
                background:'#FCD34D',
                color:'#854F0B',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'11px', fontWeight:800,
                flexShrink:0,
              }}>!</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#854F0B', marginBottom:'2px' }}>
                  {t('execSupport.warn.expiry.title')}
                </div>
                <div style={{ fontSize:'10px', color:'#854F0B', lineHeight:1.6 }}>
                  {t('execSupport.warn.expiry.body')}
                </div>
              </div>
            </div>
          </div>

          {/* MCC 권한 (사용 카테고리 통제) */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>
              {t('execSupport.mcc.label')}
            </div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>
              {t('execSupport.mcc.help')}
            </div>
            <MccBlock
              items={mccItems}
              onChange={setMccItems}
              recipientName={recipient.name}
              showInfoBox={false}
              singleLimit={singleLimit}
              onLimitChange={setSingleLimit}
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
          <button onClick={() => setStep('confirm')}
            style={{
              width:'100%', height:'52px',
              background: theme.brandDark,
              color: '#fff',
              border:'none', borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor: 'pointer',
              fontFamily:'inherit',
              boxShadow: SHADOWS.card,
            }}>
            {t('execSupport.btn.next')}
          </button>
        </div>

      </div>
    </PhoneShell>
  )

  // ───────────────── Step 'confirm' ─────────────────
  if (step === 'confirm') {
    const rows = [
      {
        label: t('execSupport.row.recipient'),
        value: recipient.name,
        sub: recipient.employeeInfo?.department || (recipient.isBusiness ? recipient.brn : null),
        editAction: changeRecipient,
      },
      {
        label: t('execSupport.wallet.label'),
        value: walletLabel,
        sub: fill(t('execSupport.wallet.balance'), { amount: fmt(walletBalance) }),
        editAction: () => setStep(1),
      },
      {
        label: t('execSupport.row.amount'),
        value: `${fmt(amtNum)}원`,
        editAction: () => setStep(1),
      },
    ]

    if (supportTitle.trim()) {
      rows.push({
        label: t('execSupport.row.title'),
        value: supportTitle.trim(),
        editAction: () => setStep(1),
      })
    }

    rows.push({
      label: t('execSupport.row.report'),
      value: reportCycleLabel,
      editAction: () => setStep(2),
    })

    rows.push({
      label: t('execSupport.row.expiry'),
      value: expiryDate,
      editAction: () => setStep(2),
    })

    rows.push({
      label: t('execSupport.row.permissions'),
      value: blockedCount > 0
        ? fill(t('execSupport.row.blocked'), { count: blockedCount })
        : t('execSupport.row.allAllowed'),
      sub: blockedCount > 0 ? blockedItems.map(b => b.label).join(', ') : null,
      editAction: () => setStep(2),
    })
    rows.push({
      label: '1회 결제 한도',
      value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음',
      editAction: () => setStep(2),
    })

    if (purpose.trim()) {
      rows.push({
        label: t('execSupport.row.purpose'),
        value: purpose.trim(),
        editAction: () => setStep(1),
      })
    }

    const autoActions = [
      fill(t('execSupport.auto.deposit'), { name: recipient.name }),
      t('execSupport.auto.contract'),
    ]
    if (blockedCount > 0) {
      autoActions.push(fill(t('execSupport.auto.mcc'), { count: blockedCount }))
    }
    if (reportCycleId !== 'none') {
      autoActions.push(fill(t('execSupport.auto.report'), { cycle: reportCycleLabel }))
    }
    autoActions.push(fill(t('execSupport.auto.expiry'), { date: expiryDate }))
    autoActions.push(t('execSupport.auto.invest'))

    return (
      <ConfirmStep
        smallTitle={t('execSupport.confirm.smallTitle')}
        bigAmount={`${fmt(amtNum)}원`}
        sub={fill(t('execSupport.confirm.sub'), { name: recipient.name })}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={rows}
        autoActions={autoActions}
        footerNote={
          fill(t('execSupport.footer.afterExec'), {
            wallet: walletLabel,
            before: fmt(walletBalance),
            after: fmt(walletBalance - amtNum),
          })
        }
        primaryLabel={t('execSupport.btn.execute')}
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(2)}
      />
    )
  }

  // ───────────────── PIN ─────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} 자금 지원`}
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
    const verified = recipient?.verified !== false
    const desc = verified
      ? fill(t('execSupport.done.descSigning'), { name: recipient.name })
      : fill(t('execSupport.done.descWaiting'), { name: recipient.name })

    return (
      <DoneStep
        tone="waiting"
        title={t('execSupport.done.titleWaiting')}
        description={desc}
        summary={[
          { label: t('execSupport.row.amount'), value: `${fmt(amtNum)}원`, accent: true },
          { label: t('execSupport.row.recipient'), value: recipient.name },
          ...(supportTitle.trim() ? [{ label: t('execSupport.row.title'), value: supportTitle.trim() }] : []),
          { label: t('execSupport.row.report'), value: reportCycleLabel },
          { label: t('execSupport.row.expiry'), value: expiryDate },
          { label: t('execSupport.row.permissions'),
            value: blockedCount > 0
              ? fill(t('execSupport.row.blocked'), { count: blockedCount })
              : t('execSupport.row.allAllowed') },
          { label: '1회 결제 한도', value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음' },
          { label: t('execSupport.wallet.label'), value: walletLabel },
        ]}
        noteYellow={t('execSupport.done.note')}
        primaryLabel={t('execSupport.btn.toHome')}
        onPrimary={() => navigate('/home-business')}
        timestamp="2026.05.06 · 09:41"
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
      />
    )
  }

  return null
}
