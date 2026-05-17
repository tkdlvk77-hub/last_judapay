import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MccBlock, { DEFAULT_MCC as MCC_DEFAULT } from '../../shared/execute/MccBlock'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../../shared/transactionStore'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useStepHistory } from '../../hooks/useStepHistory'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const MY_BALANCE = 1932000


const EXTRA_MCC_POOL = [
  { id:'tobacco',   label:'담배·주류',     sub:'담배·주류 판매점' },
  { id:'pawn',      label:'전당포·대부업', sub:'전당포·대부업소' },
  { id:'lottery',   label:'복권·경마',     sub:'복권판매소·경마장' },
  { id:'beauty',    label:'미용·성형',     sub:'성형외과·피부과' },
  { id:'travel',    label:'항공·여행',     sub:'항공권·여행사' },
  { id:'dining',    label:'고급 음식점',   sub:'1인 5만원 이상' },
]

const REPAYMENT_TYPES = [
  { id:'lump',    label:'일시 상환', sub:'상환일에 원금+이자 한 번에' },
  { id:'monthly', label:'매월 이자', sub:'매월 이자 + 만기일 원금' },
]

// ─── 금액 입력 ─────────────────────────────────────────
function AmountDisplay({ amount, onChange, onClear }) {
  const len = amount ? amount.length : 1
  const fontSize = len <= 6 ? 44 : len <= 8 ? 36 : len <= 10 ? 28 : 22

  return (
    <div style={{ position:'relative', height:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ display:'inline-flex', alignItems:'baseline', gap:'3px' }}>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          style={{
            fontSize:`${fontSize}px`,
            fontWeight:700,
            lineHeight:1,
            color: amount ? COLORS.t1 : COLORS.t5,
            background:'transparent',
            border:'none',
            outline:'none',
            textAlign:'center',
            fontFamily:'inherit',
            width:'200px',
            transition:'font-size 0.15s',
            WebkitAppearance:'none',
            MozAppearance:'textfield',
          }}
        />
        <span style={{
          fontSize: fontSize >= 36 ? '26px' : fontSize >= 28 ? '20px' : '16px',
          fontWeight:700,
          color: amount ? COLORS.t1 : COLORS.t5,
          lineHeight:1,
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

export default function ExecuteLend() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient
  const enterDirRef = useRef('forward')

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/personal/select?purpose=lend', { replace:true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [interestRate, setInterestRate] = useState('6.0')
  const [repaymentType, setRepaymentType] = useState('lump')
  const [repaymentDate, setRepaymentDate] = useState('2026-11-04')
  const [interestPayDay, setInterestPayDay] = useState(25)
  const [mccItems, setMccItems] = useState(MCC_DEFAULT)
  const [singleLimit, setSingleLimit] = useState(null)
  const [pin, setPin] = useState('')

  if (!recipient) return null

  const amtNum = parseInt(amount) || 0
  const amtFmt = amtNum.toLocaleString('ko-KR')
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? MY_BALANCE
  const remaining = walletBalance - amtNum
  const rateNum = parseFloat(interestRate) || 0

  const repaymentMonths = (() => {
    const today = new Date('2026-05-06')
    const due = new Date(repaymentDate)
    return Math.max(1, Math.round((due - today) / (1000*60*60*24*30.44)))
  })()

  const totalInterest = !amtNum || !rateNum ? 0 : Math.round(amtNum * (rateNum / 100) * (repaymentMonths / 12))
  const monthlyInterest = !amtNum || !rateNum ? 0 : Math.round(amtNum * (rateNum / 100) / 12)

  const blockedItems = mccItems.filter(m => m.block)
  const blockedCount = blockedItems.length
  const blockedLabels = blockedItems.map(m => m.label)

  const repaymentDateFmt = new Date(repaymentDate).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })
  const rateWarning = rateNum > 20 ? 'high' : rateNum > 12 ? 'mid' : null


  const changeRecipient = () => navigate('/execute/personal/select?purpose=lend')

  const pushToStore = () => {
    const dealStatus = !recipient.verified ? 'waiting' : 'signing'
    const statusLabel = !recipient.verified ? '외부링크 인증 대기' : '상대방 서명 대기'
    const totalRepay = amtNum + totalInterest
    const hasInterest = rateNum > 0
    const isLump = repaymentType === 'lump'

    // 풍부 마일스톤 — 서명 → 지급 → (이자 매월 — 분할 시) → 상환
    const milestones = [
      {
        id: 'm1',
        label: '차용증 양측 서명',
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: recipient.verified
          ? `${recipient.name} 서명 완료 시 다음 단계`
          : '미가입 상대방은 외부링크 인증 후 서명 가능',
      },
      {
        id: 'm2',
        label: '대여금 지급',
        amount: amtNum,
        status: 'pending',
        date: null,
        action: null,
        note: `양측 서명 완료 즉시 ${recipient.name} 받은 지갑에 입금`,
      },
      ...(hasInterest && !isLump ? [{
        id: 'm3',
        label: `매월 이자 자동 차감 (${interestPayDay}일)`,
        amount: monthlyInterest,
        status: 'pending',
        date: null,
        action: null,
        note: `매월 ${interestPayDay}일 ${recipient.name} 지갑에서 이자 ${monthlyInterest.toLocaleString('ko-KR')}원 자동 차감`,
      }] : []),
      {
        id: hasInterest && !isLump ? 'm4' : 'm3',
        label: isLump
          ? `만기 일시 상환 (${repaymentMonths}개월 후)`
          : '만기 원금 상환',
        amount: isLump ? totalRepay : amtNum,
        status: 'pending',
        date: repaymentDate,
        action: null,
        note: isLump
          ? `${repaymentDate} ${recipient.name} 지갑에서 자동 차감 (원금 + 이자)`
          : `${repaymentDate} ${recipient.name} 지갑에서 원금 자동 차감`,
        conditions: [
          { label: '상환일 도래', done: false, sub: repaymentDate },
          { label: `${recipient.name} 지갑 잔액 충분`, done: false, sub: '잔액 부족 시 통지 + 연체이자' },
          { label: '회수 완료', done: false, sub: isLump ? '원금 + 이자 일괄 회수' : '원금 회수' },
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
      { time: repaymentDate, label: `상환일 (${repaymentMonths}개월 후)`, type: 'pending' },
    ]

    // 안전 장치 (개인 빌려주기 표준)
    const safety = [
      '3일 내 미서명 시 자동 취소',
      `상환일 ${recipient.name} 지갑에서 자동 차감`,
      '연체 시 자동 알림 + 연체이자 적용',
      '분쟁 시 차용증 + 자금 흐름 자동 증거',
      ...(blockedCount > 0 ? [`MCC 차단 ${blockedCount}개: ${blockedLabels.slice(0, 3).join(', ')}${blockedCount > 3 ? ' 외' : ''}`] : []),
    ]

    // 계약서 파일명
    const safeName = recipient.name.replace(/[^\w가-힣]/g, '_')
    const contractFile = `차용증_${safeName}_${amtNum.toLocaleString('ko-KR')}원.pdf`

    // 거래 설명
    const dealDescription = `상환일 ${repaymentDate} · ${isLump ? '일시 상환' : '매월 이자 + 만기 원금'}${hasInterest ? ` · 연 ${rateNum}%` : ' · 무이자'}`

    addTransaction({
      type: 'personalLend',
      fromUserId: 'me_juda_kim',
      fromUserName: '김주다',
      fromUserType: 'personal',
      recipient,
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `${repaymentMonths}개월 대여 · 연 ${rateNum}%`,
      walletId,
      walletLabel: selectedWallet?.label || 'MY 지갑',
      payDateMode: 'immediate',
      // 거래형 (풍부)
      dealTitle: `${recipient.name}에게 빌려주기`,
      dealDescription,
      contractDocId: `LD_${Date.now()}`,
      contractExpires: repaymentDate,
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

  const pinInput = (k) => {
    if (k === 'del') { setPin(p => p.slice(0,-1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) setTimeout(() => { setPin(''); pushToStore(); advanceStep('done') }, 400)
  }

  const goBack = () => {
    enterDirRef.current = 'back'
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep(4)
    else if (typeof step === 'number') setStep(step - 1)
  }
  const advanceStep = (s) => { enterDirRef.current = 'forward'; setStep(s) }
  useStepHistory(goBack, step === 1, !!recipient)

  // ───────────── 1단계: 금액 + 이자 + 상환 ─────────────
  if (step === 1) return (
    <PhoneShell className={enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        <DarkHeader
          smallTitle="빌려주기"
          badge="권한 자금"
          step={1} totalSteps={4}
          bigTitle={`${recipient.name}에게\n얼마나 빌려줄까요?`}
          sub="대여 금액과 상환 조건을 입력하세요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 받는 사람 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            display:'flex', alignItems:'center', gap:'12px',
            marginBottom:'18px',
          }}>
            <div style={{
              width:'40px', height:'40px',
              borderRadius:'50%',
              background: recipient.avatarBg || theme.activeBtnGrad,
              color: recipient.avatarFg || '#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: recipient.emoji ? '22px' : '15px',
              fontWeight:700, flexShrink:0,
            }}>
              {recipient.emoji || recipient.initial}
            </div>
            <div style={{ flex:1 }}>
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
                {recipient.verified ? '실명 인증' : recipient.kyc} · {recipient.phone}
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

          {/* 출금 지갑 선택 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t3, marginBottom:'6px', padding:'0 4px' }}>
              출금 지갑
            </div>
            <WalletPicker
              executeType="lend"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setAmount('') }}
            />
          </div>

          {/* 금액 입력 */}
          <div style={{ textAlign:'center', marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'10px' }}>대여 금액</div>
            <AmountDisplay amount={amount} onChange={setAmount} onClear={() => setAmount('')} />
            <div style={{
              fontSize:'11px',
              color: amtNum > walletBalance ? COLORS.danger : COLORS.t4,
              marginTop:'8px',
            }}>
              {amtNum > walletBalance ? `${selectedWallet?.label || 'MY 지갑'} 잔액 부족 · 충전 필요` : `${selectedWallet?.label || 'MY 지갑'} 잔액 ${walletBalance.toLocaleString()}원`}
            </div>
          </div>

          {/* 빠른 금액 */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'22px' }}>
            {[100000, 500000, 1000000, 2500000].map(v => (
              <button key={v}
                onClick={() => setAmount(String(amtNum + v))}
                style={{
                  flex:1, height:'36px',
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  border:'none', borderRadius:'10px',
                  fontSize:'12px', fontWeight:600,
                  color: COLORS.t2,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                +{v >= 10000 ? `${v/10000}만` : v}
              </button>
            ))}
          </div>

          {/* 이자율 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            이자율 (연)
          </div>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            display:'flex', alignItems:'center', gap:'10px',
            marginBottom:'8px',
          }}>
            <input
              type="text" inputMode="decimal" value={interestRate}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9.]/g, '')
                setInterestRate(v)
              }}
              placeholder="0.0"
              style={{
                flex:1, minWidth:0,
                fontSize:'20px', fontWeight:700,
                color: rateWarning === 'high' ? COLORS.danger : COLORS.t1,
                background:'transparent', border:'none', outline:'none',
                fontFamily:'inherit', textAlign:'right',
                WebkitAppearance:'none', MozAppearance:'textfield',
              }}
            />
            <span style={{ fontSize:'15px', color: COLORS.t3, fontWeight:600 }}>%</span>
          </div>

          <div style={{ display:'flex', gap:'6px', marginBottom: rateWarning ? '8px' : '20px' }}>
            {['0', '4.6', '6.0', '12.0'].map(r => {
              const active = interestRate === r
              const label = r === '0'
                ? <span style={{ fontSize:'13px' }}>무이자</span>
                : r === '4.6'
                ? <><span style={{ fontSize:'13px' }}>4.6%</span><span style={{ display:'block', fontSize:'10px', opacity:0.75, marginTop:'2px' }}>법정</span></>
                : <span style={{ fontSize:'13px' }}>{r}%</span>
              return (
                <button key={r}
                  onClick={() => setInterestRate(r)}
                  style={{
                    flex:1, minWidth:0,
                    height:'44px', borderRadius:'10px',
                    background: active ? theme.brand : COLORS.bgCard,
                    boxShadow: active ? SHADOWS.buttonBrand : SHADOWS.card,
                    color: active ? '#fff' : COLORS.t2,
                    border:'none',
                    fontWeight: active ? 700 : 600,
                    cursor:'pointer', fontFamily:'inherit',
                    whiteSpace:'nowrap', overflow:'hidden',
                    lineHeight:1.2,
                    display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>

          {rateWarning === 'high' && (
            <div style={{
              padding:'12px 14px',
              background: COLORS.dangerBg,
              borderRadius: RADIUS.md,
              fontSize:'11px', color:'#B91C1C', lineHeight:1.6,
              marginBottom:'20px',
            }}>
              ⚠ 이자제한법 연 20% 초과 — 무효 처리되거나 형사처벌 대상이 될 수 있어요
            </div>
          )}
          {rateWarning === 'mid' && (
            <div style={{
              padding:'12px 14px',
              background:'#FFFBEB',
              borderRadius: RADIUS.md,
              fontSize:'11px', color:'#854F0B', lineHeight:1.6,
              marginBottom:'20px',
            }}>
              연 12% 초과 — 분쟁 시 일부 무효될 수 있으니 주의하세요
            </div>
          )}

          {/* 상환 방식 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            상환 방식
          </div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'18px' }}>
            {REPAYMENT_TYPES.map(t => {
              const active = repaymentType === t.id
              return (
                <button key={t.id}
                  onClick={() => setRepaymentType(t.id)}
                  style={{
                    flex:1, padding:'12px',
                    background: active ? COLORS.bgCard : COLORS.bgMuted,
                    boxShadow: active ? SHADOWS.card : 'none',
                    border: active ? `1.5px solid ${theme.brand}` : 'none',
                    borderRadius: RADIUS.md,
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}>
                  <div style={{
                    fontSize:'13px', fontWeight:700,
                    color: active ? COLORS.t1 : COLORS.t3,
                    marginBottom:'3px',
                  }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4, lineHeight:1.4 }}>
                    {t.sub}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 매월 이자일 (monthly만) */}
          {repaymentType === 'monthly' && (
            <>
              <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
                이자 지급일
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
                  <input type="number" min="1" max="28" value={interestPayDay}
                    onChange={e => setInterestPayDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                    style={{
                      width:'52px', fontSize:'20px', fontWeight:700,
                      color: COLORS.t1,
                      background:'transparent', border:'none', outline:'none',
                      fontFamily:'inherit', textAlign:'right',
                    }} />
                  <span style={{ fontSize:'15px', color: COLORS.t3, fontWeight:600 }}>일</span>
                </div>
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'18px', paddingLeft:'4px' }}>
                매월 {interestPayDay}일에 {recipient.name} 지갑에서 자동 차감 (1~28일)
              </div>
            </>
          )}

          {/* 상환일/만기일 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            {repaymentType === 'monthly' ? '원금 만기일' : '상환일'}
          </div>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:'18px',
          }}>
            <input type="date" value={repaymentDate} onChange={e => setRepaymentDate(e.target.value)}
              style={{
                flex:1, fontSize:'14px', fontWeight:600,
                color: COLORS.t1,
                background:'transparent', border:'none', outline:'none',
                fontFamily:'inherit',
                boxSizing:'border-box', maxWidth:'100%',
                WebkitAppearance:'none', appearance:'none',
              }} />
            <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0 }}>
              {repaymentMonths}개월 후
            </span>
          </div>

          {/* 예상 이자 박스 (파란) */}
          {amtNum > 0 && rateNum > 0 && (
            <div style={{
              background:'#EDF3FA',
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              marginBottom:'12px',
            }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#1E5294', marginBottom:'10px' }}>
                예상 이자 (단리 기준)
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#2D6BB0', marginBottom:'5px' }}>
                <span>원금</span><span>{amtFmt}원</span>
              </div>
              {repaymentType === 'lump' ? (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#2D6BB0', marginBottom:'5px' }}>
                    <span>총 이자 ({rateNum}% × {repaymentMonths}개월)</span>
                    <span>+{totalInterest.toLocaleString()}원</span>
                  </div>
                  <div style={{
                    display:'flex', justifyContent:'space-between',
                    fontSize:'14px', fontWeight:700, color:'#1E5294',
                    borderTop:'1px solid #B5CFE8',
                    paddingTop:'8px', marginTop:'8px',
                  }}>
                    <span>총 회수 예정</span>
                    <span>{(amtNum + totalInterest).toLocaleString()}원</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#2D6BB0', marginBottom:'5px' }}>
                    <span>월 이자 ({rateNum}% ÷ 12)</span>
                    <span>{monthlyInterest.toLocaleString()}원</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#2D6BB0', marginBottom:'5px' }}>
                    <span>{repaymentMonths}개월간 누적 이자</span>
                    <span>{totalInterest.toLocaleString()}원</span>
                  </div>
                  <div style={{
                    display:'flex', justifyContent:'space-between',
                    fontSize:'14px', fontWeight:700, color:'#1E5294',
                    borderTop:'1px solid #B5CFE8',
                    paddingTop:'8px', marginTop:'8px',
                  }}>
                    <span>매월 {interestPayDay}일 지급</span>
                    <span>{monthlyInterest.toLocaleString()}원</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
          }}>
            {repaymentType === 'lump'
              ? `상환일에 ${recipient.name} 지갑에서 자동 차감되어 내 지갑으로 입금됩니다. 잔액 부족 시 알림 발송.`
              : `매월 ${interestPayDay}일 이자 자동 차감 + 만기일 원금 차감. 잔액 부족 시 알림 발송.`}
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button
          onClick={() => amtNum >= 1000 && amtNum <= walletBalance && advanceStep(2)}
          disabled={!(amtNum >= 1000 && amtNum <= walletBalance)}
          style={{
            width:'100%', height:'52px',
            background: amtNum >= 1000 && amtNum <= walletBalance ? theme.brand : COLORS.bgMuted,
            color: amtNum >= 1000 && amtNum <= walletBalance ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: amtNum >= 1000 && amtNum <= walletBalance ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: amtNum >= 1000 && amtNum <= walletBalance ? SHADOWS.buttonBrand : 'none',
          }}>
          {amtNum > walletBalance ? '잔액 부족 · 충전하기' : amtNum >= 1000 ? '다음 (사용 통제)' : '금액을 입력하세요'}
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 2단계: 사용 통제 (MCC 차단) ─────────────
  if (step === 2) return (
    <PhoneShell className={enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        <DarkHeader
          smallTitle="사용 통제"
          step={2} totalSteps={4}
          bigTitle="어디서 못 쓰게 할까요?"
          sub={`${recipient.name}이 카드 결제할 때 차단할 카테고리를 선택하세요`}
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />
        <div style={{ padding:'18px 16px 24px' }}>
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
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => advanceStep(3)}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          다음 (차용증 생성)
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 3단계: 차용증 생성 ─────────────
  if (step === 3) return (
    <PhoneShell className={enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        <DarkHeader
          smallTitle="차용증 자동 생성"
          step={3} totalSteps={4}
          bigTitle="차용증을 확인하세요"
          sub="모두싸인 휴대폰 인증으로 양측이 서명해요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 차용증 미리보기 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
            marginBottom:'14px',
          }}>
            {/* 카드 헤더 */}
            <div style={{
              padding:'14px 16px',
              borderBottom: `1px solid ${COLORS.borderSoft}`,
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{
                  width:'32px', height:'32px',
                  background:'#EDE9FE', borderRadius:'8px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>
                  금전소비대차계약서 (차용증)
                </span>
              </div>
              <span style={{ fontSize:'10px', color: COLORS.t4, fontWeight:600 }}>자동 생성</span>
            </div>

            {/* 당사자 */}
            <div style={{ padding:'14px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>
                당사자
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>대여인 (채권자)</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>
                  이호형 <span style={{ color:'#10B981', fontSize:'11px' }}>실명 ✓</span>
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color: COLORS.t4 }}>차용인 (채무자)</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>
                  {recipient.name}{' '}
                  {recipient.verified && <span style={{ color:'#10B981', fontSize:'11px' }}>실명 ✓</span>}
                </span>
              </div>
            </div>

            {/* 대여 조건 */}
            <div style={{ padding:'14px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>
                대여 조건
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>원금</span>
                <span style={{ color: COLORS.t1, fontWeight:700, fontSize:'15px' }}>{amtFmt}원</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>이자율</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>연 {rateNum}%</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>상환 방식</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>
                  {REPAYMENT_TYPES.find(t => t.id === repaymentType)?.label}
                </span>
              </div>
              {repaymentType === 'monthly' && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                  <span style={{ color: COLORS.t4 }}>이자 지급일</span>
                  <span style={{ color: COLORS.t1, fontWeight:600 }}>
                    매월 {interestPayDay}일 · {monthlyInterest.toLocaleString()}원
                  </span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color: COLORS.t4 }}>{repaymentType === 'monthly' ? '원금 만기일' : '상환일'}</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>{repaymentDateFmt}</span>
              </div>
            </div>

            {/* 사용 통제 */}
            <div style={{ padding:'14px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>
                사용 통제 (MCC)
              </div>
              {blockedCount > 0 ? (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {blockedLabels.map(label => (
                    <span key={label} style={{
                      display:'inline-block', padding:'3px 8px',
                      background: COLORS.dangerBg, color:'#B91C1C',
                      borderRadius:'5px',
                      fontSize:'11px', fontWeight:600,
                    }}>
                      {label} 차단
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize:'12px', color: COLORS.t4 }}>제한 없음</span>
              )}
            </div>

            {/* 표준 조항 */}
            <div style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>
                표준 조항 (자동 포함)
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {['연체이자', '기한이익상실', '분쟁 해결'].map(label => (
                  <span key={label} style={{
                    display:'inline-block', padding:'3px 8px',
                    background:'#D1FAE5', color:'#047857',
                    borderRadius:'5px',
                    fontSize:'11px', fontWeight:600,
                  }}>
                    ✓ {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 서명 후 진행 절차 (파란 박스) */}
          <div style={{
            background:'#EDF3FA',
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            marginBottom:'14px',
          }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#1E5294', marginBottom:'10px' }}>
              서명 후 진행 절차
            </div>
            {[
              `${recipient.name}에게 모두싸인 SMS 발송 + 휴대폰 인증 안내`,
              `양측 서명 완료 → ${amtFmt}원 즉시 ${recipient.name} 받은 지갑에 입금`,
              repaymentType === 'monthly'
                ? `MCC 통제 활성 + 매월 ${interestPayDay}일 이자 자동 차감 등록`
                : 'MCC 통제 활성 + 상환일 자동 차감 등록',
              '차용증은 양측 알림센터에 5년 보관 (분쟁 증거)',
            ].map((text, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'flex-start', gap:'8px',
                marginTop: i === 0 ? 0 : '7px',
                fontSize:'11px', color:'#2D6BB0', lineHeight:1.55,
              }}>
                <span style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width:'17px', height:'17px',
                  borderRadius:'50%',
                  background:'#2D6BB0', color:'#fff',
                  fontSize:'9px', fontWeight:700,
                  flexShrink:0, marginTop:'1px',
                }}>
                  {i+1}
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* 미서명 경고 (노란) */}
          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
          }}>
            <strong>{recipient.name}</strong>이 3일 내 미서명/거부 시 거래 자동 취소 · 자금 차감되지 않아요
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => advanceStep(4)}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          다음 (집행 확인)
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 4단계: 확인 ─────────────
  if (step === 4) return (
    <PhoneShell className={enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        <DarkHeader
          smallTitle="집행 내용 확인"
          step={4} totalSteps={4}
          bigTitle={`${amtFmt}원`}
          sub={`${recipient.name}에게 빌려주기 · 권한 자금`}
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 상세 행 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
            marginBottom:'12px',
          }}>
            {[
              { label:'받는 사람', value: recipient.name, sub: recipient.verified ? '실명 ✓' : recipient.kyc, editAction: changeRecipient },
              { label:'출금 지갑', value: selectedWallet?.label || 'MY 지갑', sub:`잔액 ${walletBalance.toLocaleString()}원`, editAction: () => { enterDirRef.current = 'back'; setStep(1) } },
              {
                label:'계약 조건',
                value:`연 ${rateNum}% · ${repaymentMonths}개월`,
                sub: repaymentType === 'monthly'
                  ? `매월 ${interestPayDay}일 이자 ${monthlyInterest.toLocaleString()}원 · ${repaymentDateFmt} 원금 만기`
                  : `${repaymentDateFmt} 일시 상환`,
                editStep:1,
              },
              { label:'사용 통제', value: blockedCount > 0 ? `${blockedCount}개 카테고리 차단` : '제한 없음', sub: blockedCount > 0 ? blockedLabels.join(', ') : null, editStep:2 },
              { label:'1회 결제 한도', value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음', editStep:2 },
              { label:'계약서', value:'모두싸인 자동 생성', sub:'양측 서명 후 효력', editStep:3 },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                padding:'14px 16px',
                borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px',
              }}>
                <span style={{ fontSize:'12px', color: COLORS.t4, flexShrink:0, paddingTop:'1px' }}>
                  {row.label}
                </span>
                <div style={{ flex:1, display:'flex', justifyContent:'flex-end', alignItems:'flex-start', gap:'8px' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{row.value}</div>
                    {row.sub && (
                      <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px', lineHeight:1.45 }}>
                        {row.sub}
                      </div>
                    )}
                  </div>
                  {(row.editStep || row.editAction) && (
                    <button onClick={() => row.editAction ? row.editAction() : (enterDirRef.current = 'back', setStep(row.editStep))}
                      style={{
                        fontSize:'11px', fontWeight:600,
                        color: theme.brand,
                        background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                        flexShrink:0, paddingTop:'1px',
                      }}>
                      {row.editAction ? '변경' : '수정'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 자동 처리 (녹색) */}
          <div style={{
            background:'#ECFDF5',
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            marginBottom:'12px',
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
              <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>자동으로 처리됩니다</span>
            </div>
            {[
              '차용증을 양측 알림센터에 보관 (5년)',
              repaymentType === 'monthly'
                ? `매월 ${interestPayDay}일 이자 자동 계산 + 차감 등록`
                : '상환일 이자 자동 계산 + 차감 등록',
              `메시지로 ${recipient.name}에게 등본 전달`,
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
            집행 후 {selectedWallet?.label || 'MY 지갑'} 잔액 {walletBalance.toLocaleString()}원 → <strong>{remaining.toLocaleString()}원</strong> · 수수료 0원
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
        display:'flex', flexDirection:'column', gap:'8px',
      }}>
        <button onClick={() => advanceStep('pin')}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          집행하기
        </button>
        <button onClick={() => { enterDirRef.current = 'back'; setStep(1) }}
          style={{
            width:'100%', height:'42px',
            background:'transparent', color: COLORS.t4,
            border:'none',
            fontSize:'13px', cursor:'pointer', fontFamily:'inherit',
          }}>
          취소
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── PIN ─────────────
  if (step === 'pin') return (
    <PhoneShell className={enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden' }}>
        <DarkHeader smallTitle="비밀번호 입력" onBack={goBack} exitTo="/home"
          headerGrad={theme.headerGrad} />

        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 24px 0' }}>
          <div style={{
            width:'100%', maxWidth:'320px',
            padding:'12px 14px',
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.md,
            display:'flex', justifyContent:'space-between', alignItems:'center',
            marginBottom:'34px',
          }}>
            <span style={{ fontSize:'12px', color: COLORS.t3 }}>{recipient.name}에게 빌려주기</span>
            <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{amtFmt}원</span>
          </div>

          <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'20px' }}>6자리 비밀번호</div>

          <div style={{ display:'flex', gap:'16px', marginBottom:'24px' }}>
            {Array.from({ length:6 }).map((_, i) => (
              <div key={i} style={{
                width:'14px', height:'14px',
                borderRadius:'50%',
                background: i < pin.length ? theme.brand : 'transparent',
                border: i < pin.length ? `2px solid ${theme.brand}` : `2px solid ${COLORS.border}`,
                transition:'all .15s',
              }} />
            ))}
          </div>

          <button style={{
            background:'none', border:'none',
            display:'flex', alignItems:'center', gap:'5px',
            color: theme.brand,
            fontSize:'12px', fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            <svg width="14" height="14" viewBox="0 0 42 42" fill="none">
              <rect x="9" y="4" width="24" height="34" rx="5" stroke={theme.brand} strokeWidth="2"/>
              <circle cx="21" cy="21" r="6" stroke={theme.brand} strokeWidth="2"/>
              <circle cx="21" cy="21" r="2" fill={theme.brand}/>
            </svg>
            Face ID로 인증
          </button>
        </div>

        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px',
          padding:'0 28px', marginBottom:'18px',
        }}>
          {KEYS.map((k, i) => (
            <button key={i} onClick={() => pinInput(k)}
              style={{
                height:'58px', borderRadius:'16px',
                background: k === null || k === 'del' ? 'transparent' : COLORS.bgCard,
                boxShadow: k === null || k === 'del' ? 'none' : SHADOWS.card,
                border:'none',
                fontSize:'22px', fontWeight:500,
                color: k === 'del' ? COLORS.t4 : COLORS.t1,
                cursor: k === null ? 'default' : 'pointer',
                fontFamily:'inherit',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
              }}>
              {k === 'del' ? '⌫' : k !== null ? (
                <>
                  <span style={{ lineHeight:1 }}>{k}</span>
                  {[2,3,4,5,6,7,8,9].includes(k) && (
                    <span style={{ fontSize:'9px', color: COLORS.t5, letterSpacing:'1.5px' }}>
                      {{2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}[k]}
                    </span>
                  )}
                </>
              ) : null}
            </button>
          ))}
        </div>

        <div style={{ paddingBottom:'24px', textAlign:'center', fontSize:'10px', color: COLORS.t5 }}>
          비밀번호 5회 오류 시 30분 잠금
        </div>
      </div>
    </PhoneShell>
  )

  // ───────────── 완료 (서명 대기 중) ─────────────
  return (
    <PhoneShell className='page-enter-right'>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden' }}>

        {/* 다크 그라데이션 (시계 아이콘 — 대기 톤) */}
        <div style={{
          background: GRADIENTS.header,
          paddingTop:'40px',
          paddingBottom:'40px',
          textAlign:'center',
        }}>
          <div style={{
            width:'80px', height:'80px',
            borderRadius:'50%',
            background:'rgba(252,211,77,0.20)',
            border:'2px solid #FCD34D',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 18px',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div style={{ fontSize:'24px', fontWeight:700, color:'#fff', marginBottom:'10px', letterSpacing:'-0.5px' }}>
            {recipient.name} 동의 대기 중
          </div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', lineHeight:1.7, padding:'0 24px' }}>
            {recipient.name}에게 차용증 SMS가 발송됐어요.<br />
            양측 서명 완료 시 <strong style={{ color:'#FCD34D' }}>{amtFmt}원</strong>이 입금돼요.
          </div>
        </div>

        {/* 라이트 영역 — 거래 요약 */}
        <div style={{ padding:'18px 16px 24px' }}>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            marginBottom:'12px',
          }}>
            {[
              { label:'대여 금액', value:`${amtFmt}원`, accent:true },
              { label:'이자율',    value:`연 ${rateNum}%` },
              ...(repaymentType === 'monthly'
                ? [{ label:'이자 지급', value:`매월 ${interestPayDay}일 ${monthlyInterest.toLocaleString()}원` }]
                : []),
              { label: repaymentType === 'monthly' ? '원금 만기' : '상환일', value: repaymentDateFmt },
              { label:'예상 회수액', value:`${(amtNum + totalInterest).toLocaleString()}원`, bold:true },
              { label:'사용 통제', value: blockedCount > 0 ? `${blockedCount}개 카테고리 차단` : '제한 없음' },
              { label:'1회 결제 한도', value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display:'flex', justifyContent:'space-between',
                fontSize:'13px',
                paddingBottom: i < arr.length-1 ? '10px' : 0,
                marginBottom: i < arr.length-1 ? '10px' : 0,
                borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
              }}>
                <span style={{ color: COLORS.t4 }}>{row.label}</span>
                <span style={{
                  fontWeight: row.bold ? 700 : 600,
                  color: row.accent ? theme.brand : COLORS.t1,
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            padding:'12px 14px',
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
            marginBottom:'14px',
          }}>
            3일 내 {recipient.name}이 미서명 시 자동 취소 · 알림센터 + 메시지에서 진행 상태 확인 가능
          </div>

          <div style={{ textAlign:'center', fontSize:'11px', color: COLORS.t5 }}>
            2026.05.06 · 09:41
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
        display:'flex', flexDirection:'column', gap:'8px',
      }}>
        <button onClick={() => navigate('/messages')}
          style={{
            width:'100%', height:'46px',
            background: COLORS.bgMuted, color: COLORS.t2,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'13px', fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
          }}>
          {recipient.name}과 대화하기
        </button>
        <button onClick={() => navigate('/home')}
          style={{
            width:'100%', height:'52px',
            background: theme.brand,
            color:'#fff', border:'none',
            borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          홈으로 돌아가기
        </button>
      </div>
    </PhoneShell>
  )
}
