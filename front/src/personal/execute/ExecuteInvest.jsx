import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MccBlock, { DEFAULT_MCC as MCC_DEFAULT } from '../../shared/execute/MccBlock'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../../shared/transactionStore'
import ConfirmStep from '../../shared/execute/ConfirmStep'
import PinStep from '../../shared/execute/PinStep'
import DoneStep from '../../shared/execute/DoneStep'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS, FUND_COLORS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useStepHistory } from '../../hooks/useStepHistory'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const MY_BALANCE = 1932000

const REPORT_FREQUENCIES = [
  { id:'monthly',   label:'매월',     sub:'사용처 알림 + 월간 요약' },
  { id:'quarterly', label:'분기별',   sub:'PDF 보고서 자동 생성', recommended:true },
  { id:'biannual',  label:'반기별',   sub:'PDF 보고서 자동 생성' },
  { id:'annual',    label:'연 1회',   sub:'연간 결산 보고서' },
]

const PURPOSE_TAGS = [
  { id:'startup',  label:'창업 자금' },
  { id:'business', label:'사업 운영' },
  { id:'family',   label:'가족 사업' },
  { id:'etc',      label:'기타' },
]

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

export default function ExecuteInvest() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/personal/select?purpose=invest', { replace:true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)

  // 1단계
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [purposeTag, setPurposeTag] = useState('startup')
  const [memo, setMemo] = useState('')

  // 2단계
  const [mccItems, setMccItems] = useState(MCC_DEFAULT)
  const [singleLimit, setSingleLimit] = useState(null)

  // 3단계
  const [reportFreq, setReportFreq] = useState('quarterly')
  const [endDate, setEndDate] = useState('2029-05-06')
  const [autoRefund, setAutoRefund] = useState(true)

  const [pin, setPin] = useState('')

  if (!recipient) return null

  const amtNum = parseInt(amount) || 0
  const amtFmt = amtNum.toLocaleString('ko-KR')
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? MY_BALANCE
  const remaining = walletBalance - amtNum

  const blockedItems = mccItems.filter(m => m.block)
  const blockedCount = blockedItems.length
  const blockedLabels = blockedItems.map(m => m.label)

  const endMonths = (() => {
    const today = new Date('2026-05-06')
    const end = new Date(endDate)
    return Math.max(1, Math.round((end - today) / (1000*60*60*24*30.44)))
  })()
  const endDateFmt = new Date(endDate).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })

  const changeRecipient = () => navigate('/execute/personal/select?purpose=invest')

  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(3)
    else if (step === 'done') return
    else if (typeof step === 'number') setStep(step - 1)
  }
  useStepHistory(goBack, step === 1, !!recipient)

  const pinInput = (k) => {
    if (k === 'del') { setPin(p => p.slice(0,-1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) setTimeout(() => { setPin(''); setStep('done') }, 400)
  }

  const step1Valid = amtNum >= 1000 && amtNum <= walletBalance

  // ───────────── 1단계: 금액 + 목적 ─────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="자금 지원"
          badge="권한 자금"
          badgeTone="permission"
          step={1} totalSteps={4}
          bigTitle={`${recipient.name}에게\n얼마를 지원할까요?`}
          sub="개인에게 사업·창업 자금을 지원해요. 회수 의무 없음."
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 받는 사람 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'12px 14px',
            display:'flex', alignItems:'center', gap:'12px',
            marginBottom:'14px',
          }}>
            <div style={{
              width:'42px', height:'42px',
              borderRadius:'50%',
              background: recipient.avatarBg || theme.activeBtnGrad,
              color: recipient.avatarFg || '#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: recipient.emoji ? '22px' : '15px',
              fontWeight:700, flexShrink:0,
            }}>
              {recipient.emoji || recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{recipient.name}</span>
                {recipient.verified && (
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="#10B981"/>
                    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <span style={{
                  padding:'1px 6px',
                  background: FUND_COLORS.invest.bg,
                  color: FUND_COLORS.invest.main,
                  borderRadius:'4px',
                  fontSize:'9px', fontWeight:700,
                }}>
                  지원 대상
                </span>
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
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t3, marginBottom:'6px', padding:'0 4px' }}>
              출금 지갑
            </div>
            <WalletPicker
              executeType="invest"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setAmount('') }}
            />
          </div>

          {/* 금액 입력 */}
          <div style={{ textAlign:'center', marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'10px' }}>지원 금액</div>
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
            {[1000000, 5000000, 10000000, 50000000].map(v => (
              <button key={v}
                onClick={() => setAmount(String(amtNum + v))}
                style={{
                  flex:1, height:'36px',
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  border:'none', borderRadius:'10px',
                  fontSize:'11px', fontWeight:600,
                  color: COLORS.t2,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                +{v >= 10000000 ? `${v/10000000}천만` : `${v/10000}만`}
              </button>
            ))}
          </div>

          {/* 지원 목적 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            지원 목적
          </div>
          <div style={{ display:'flex', gap:'6px', marginBottom:'18px' }}>
            {PURPOSE_TAGS.map(t => {
              const active = purposeTag === t.id
              return (
                <button key={t.id}
                  onClick={() => setPurposeTag(t.id)}
                  style={{
                    flex:1, height:'38px', borderRadius:'10px',
                    background: active ? theme.brand : COLORS.bgCard,
                    boxShadow: active ? SHADOWS.buttonBrand : SHADOWS.card,
                    color: active ? '#fff' : COLORS.t2,
                    border:'none',
                    fontSize:'12px', fontWeight: active ? 700 : 600,
                    cursor:'pointer', fontFamily:'inherit',
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* 메모 (선택) */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            메모 (선택)
          </div>
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="예: OOO 사업 초기 자금"
            maxLength={40}
            style={{
              width:'100%', height:'48px',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg,
              padding:'0 16px',
              fontSize:'13px', color: COLORS.t1,
              outline:'none', fontFamily:'inherit',
              marginBottom:'14px',
              boxSizing:'border-box',
            }}
          />

          {/* 자금 지원 안내 (노란) */}
          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
            marginBottom:'8px',
          }}>
            <strong>개인에게 보내는 자금 지원</strong><br />
            지분이나 회수 의무 없는 단순 지원입니다. 사용처 통제 + 분기별 보고서로 자금 오용을 방지해요.
            <span style={{ display:'block', fontSize:'10px', color:'#A66C0A', marginTop:'4px' }}>
              ※ 법인에 대한 지분 투자·SAFE는 추후 별도 메뉴에서 제공 예정
            </span>
          </div>

          {/* 다음 단계 안내 (파란) */}
          <div style={{
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294', lineHeight:1.65,
          }}>
            <strong>다음 단계에서 사용처를 통제해요</strong><br />
            MCC 차단(유흥·도박/암호화폐/명품 등) 설정. 차단 카테고리 결제 시도 시 즉시 알림 발송 + 결제 차단.
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => step1Valid && setStep(2)}
          disabled={!step1Valid}
          style={{
            width:'100%', height:'52px',
            background: step1Valid ? theme.brand : COLORS.bgMuted,
            color: step1Valid ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: step1Valid ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: step1Valid ? SHADOWS.buttonBrand : 'none',
          }}>
          {amtNum > walletBalance ? '잔액 부족 · 충전하기' : amtNum < 1000 ? '금액을 입력하세요' : '다음 (사용처 통제)'}
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 2단계: 사용 통제 (MCC 차단) ─────────────
  if (step === 2) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
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
        <button onClick={() => setStep(3)}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          다음 (보고 + 종료 기한)
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 3단계: 보고 + 종료 기한 ─────────────
  if (step === 3) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="보고 + 종료 기한"
          step={3} totalSteps={4}
          bigTitle={`사용 보고는\n어떻게 받을까요?`}
          sub="정기 보고 주기와 자금 사용 종료일을 설정해요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 정기 보고 주기 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'10px', padding:'0 4px' }}>
            정기 보고 주기
          </div>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
            marginBottom:'12px',
          }}>
            {REPORT_FREQUENCIES.map((f, i) => {
              const active = reportFreq === f.id
              return (
                <button key={f.id} onClick={() => setReportFreq(f.id)}
                  style={{
                    width:'100%', padding:'14px 16px',
                    display:'flex', alignItems:'center', gap:'12px',
                    background: active ? '#F5F3FF' : COLORS.bgCard,
                    border:'none',
                    borderBottom: i < REPORT_FREQUENCIES.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                  }}>
                  <div style={{
                    width:'22px', height:'22px', borderRadius:'50%',
                    border: active ? `7px solid ${theme.brand}` : `2px solid ${COLORS.t5}`,
                    background: COLORS.bgCard,
                    flexShrink:0, transition:'all .15s',
                  }} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
                      <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{f.label}</span>
                      {f.recommended && (
                        <span style={{
                          padding:'1px 6px',
                          background: theme.brand, color:'#fff',
                          borderRadius:'3px',
                          fontSize:'9px', fontWeight:700,
                        }}>
                          권장
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>{f.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* PDF 보고서 자동 생성 안내 (파란 박스) */}
          <div style={{
            background:'#EDF3FA',
            borderRadius: RADIUS.lg,
            padding:'14px',
            marginBottom:'18px',
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
              <div style={{
                width:'34px', height:'42px',
                background: COLORS.bgCard,
                border:'1px solid #B5CFE8',
                borderRadius:'4px',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <span style={{ fontSize:'9px', fontWeight:700, color:'#1E5294' }}>PDF</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#1E5294', marginBottom:'6px' }}>
                  보고서에 자동 포함되는 내용
                </div>
                {[
                  '카테고리별 사용 내역 + 한도 대비 비율',
                  '거래 일시·가맹점·금액 (원장)',
                  '한도/MCC 위반 시도 기록',
                  `${recipient.name}이 작성한 사업 진행 메모`,
                ].map(text => (
                  <div key={text} style={{
                    display:'flex', alignItems:'center', gap:'6px',
                    marginTop:'4px',
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

          {/* 사용 종료 기한 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'10px', padding:'0 4px' }}>
            사용 종료 기한
          </div>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:'8px',
          }}>
            <input type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{
                flex:1, fontSize:'14px', fontWeight:600,
                color: COLORS.t1,
                background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                boxSizing:'border-box', maxWidth:'100%',
                WebkitAppearance:'none', appearance:'none',
              }} />
            <span style={{ fontSize:'11px', color: COLORS.t4, flexShrink:0 }}>
              {endMonths}개월 후
            </span>
          </div>

          {/* 빠른 선택 */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
            {[
              { months:12, label:'1년' },
              { months:24, label:'2년' },
              { months:36, label:'3년 (권장)' },
              { months:60, label:'5년' },
            ].map(opt => {
              const target = new Date('2026-05-06')
              target.setMonth(target.getMonth() + opt.months)
              const targetStr = target.toISOString().slice(0, 10)
              const active = endDate === targetStr
              return (
                <button key={opt.months}
                  onClick={() => setEndDate(targetStr)}
                  style={{
                    flex:1, height:'34px', borderRadius:'10px',
                    background: active ? theme.brand : COLORS.bgCard,
                    boxShadow: active ? SHADOWS.buttonBrand : SHADOWS.card,
                    color: active ? '#fff' : COLORS.t2,
                    border:'none',
                    fontSize:'11px', fontWeight: active ? 700 : 600,
                    cursor:'pointer', fontFamily:'inherit',
                  }}>
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* 자동 환급 토글 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:'14px',
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                종료일 후 미사용 자동 환급
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4, lineHeight:1.5 }}>
                {endDateFmt} 이후 미사용 잔액이 내 지갑으로 자동 환급
              </div>
            </div>
            <button onClick={() => setAutoRefund(!autoRefund)}
              style={{
                width:'44px', height:'26px',
                borderRadius:'13px',
                background: autoRefund ? theme.brand : COLORS.border,
                border:'none', cursor:'pointer', padding:0,
                position:'relative',
                transition:'background .15s',
                flexShrink:0, marginLeft:'12px',
              }}>
              <div style={{
                position:'absolute', top:'3px',
                left: autoRefund ? '21px' : '3px',
                width:'20px', height:'20px',
                borderRadius:'50%', background:'#fff',
                transition:'left .15s',
                boxShadow:'0 1px 3px rgba(0,0,0,.2)',
              }} />
            </button>
          </div>

          {/* 법적 주의 (노란) */}
          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
          }}>
            <strong>⚠ 법적 주의 — 증여 간주 위험</strong><br />
            자금 지원은 분쟁 시 증여로 간주될 수 있습니다. 사용처 통제 + 보고서가 후일 증거가 되며, 약정서에 "사업 자금 한정 사용" 명시로 보호받습니다.
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => setStep('confirm')}
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

  // ───────────── 확인 (집행 내용 확인) ─────────────
  if (step === 'confirm') {
    const purposeLabel = PURPOSE_TAGS.find(t => t.id === purposeTag)?.label || purposeTag
    const reportLabel = REPORT_FREQUENCIES.find(f => f.id === reportFreq)?.label || ''

    return (
      <ConfirmStep
        smallTitle="집행 내용 확인"
        bigAmount={`${amtFmt}원`}
        sub={`${recipient.name}에게 자금 지원 · 권한 자금`}
        onBack={goBack}
        rows={[
          {
            label: '받는 분',
            value: recipient.name,
            sub: recipient.verified ? '실명 ✓' : recipient.kyc,
            editAction: changeRecipient,
          },
          {
            label: '출금 지갑',
            value: selectedWallet?.label || 'MY 지갑',
            sub: `잔액 ${walletBalance.toLocaleString()}원`,
            editAction: () => setStep(1),
          },
          {
            label: '지원 목적',
            value: purposeLabel,
            editAction: () => setStep(1),
          },
          {
            label: '사용 통제',
            value: blockedCount > 0 ? `${blockedCount}개 카테고리 차단` : '제한 없음',
            sub: blockedCount > 0 ? blockedLabels.join(', ') : null,
            editAction: () => setStep(2),
          },
          {
            label: '1회 결제 한도',
            value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음',
            editAction: () => setStep(2),
          },
          {
            label: '보고 주기',
            value: `${reportLabel} PDF 자동 발송`,
            editAction: () => setStep(3),
          },
          {
            label: '종료 기한',
            value: endDateFmt,
            sub: autoRefund ? '미사용 잔액 자동 환급' : '환급 없음',
            editAction: () => setStep(3),
          },
          {
            label: '약정서',
            value: '자금 지원 약정서 자동 생성',
            sub: '모두싸인 양측 서명',
          },
        ]}
        autoActions={[
          `${recipient.name}에게 약정서 SMS 발송 + 휴대폰 인증`,
          '양측 서명 완료 시 권한 자금으로 즉시 입금',
          'MCC 차단 활성화 + 분기별 보고서 자동 발송',
          '약정서·거래 원장 5년 보관 (분쟁 증거)',
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
    const dealStatus = !recipient.verified ? 'waiting' : 'signing'
    const statusLabel = !recipient.verified ? '외부링크 인증 대기' : '상대방 서명 대기'

    // 입력값 라벨 매핑
    const purposeLabel = PURPOSE_TAGS.find(t => t.id === purposeTag)?.label || purposeTag
    const reportLabel = (() => {
      const map = { monthly:'매월', quarterly:'분기', yearly:'연간', none:'보고 없음' }
      return map[reportFreq] || '분기'
    })()

    // MCC 차단 항목
    const blockedMcc = mccItems.filter(m => m.block)
    const blockedMccLabels = blockedMcc.map(m => m.label)

    // 풍부 마일스톤 — 서명 → 지급 → 보고 → 종료
    const milestones = [
      {
        id: 'm1',
        label: '약정서 양측 서명',
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
        label: '자금 지급',
        amount: amtNum,
        status: 'pending',
        date: null,
        action: null,
        note: `양측 서명 완료 즉시 ${recipient.name} 받은 지갑에 입금`,
      },
      ...(reportFreq !== 'none' ? [{
        id: 'm3',
        label: `${reportLabel} 자금 사용 보고서`,
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: `${reportLabel} 자동 생성 + PDF 발송 (사용 내역)`,
      }] : []),
      {
        id: reportFreq !== 'none' ? 'm4' : 'm3',
        label: `사용 종료 (${endDate})`,
        amount: 0,
        status: 'pending',
        date: endDate,
        action: null,
        note: autoRefund
          ? '미사용 잔액 자동으로 내 지갑에 환급'
          : '사용 종료 — 별도 정산',
      },
    ]

    // 활동 타임라인 시드
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 약정서 발송`, type: 'event' },
      ...(reportFreq !== 'none' ? [{ time: '다음 정기일', label: `첫 ${reportLabel} 보고서 자동 생성 예정`, type: 'pending' }] : []),
      { time: endDate, label: `사용 종료 예정${autoRefund ? ' (미사용 잔액 자동 환급)' : ''}`, type: 'pending' },
    ]

    // 안전 장치 (자금 지원 표준)
    const safety = [
      '양측 약정서 서명 + 자동 분리 보관',
      ...(reportFreq !== 'none' ? [`${reportLabel} 사용 보고서 PDF 자동 생성`] : []),
      ...(blockedMcc.length > 0 ? [`MCC 차단 ${blockedMcc.length}개: ${blockedMccLabels.slice(0, 3).join(', ')}${blockedMcc.length > 3 ? ' 외' : ''}`] : []),
      ...(autoRefund ? [`사용 종료 후 미사용 잔액 자동 환급 (${endDate})`] : ['사용 종료 시 별도 정산 (자동 환급 OFF)']),
      '분쟁 시 약정서 + 사용 내역 자동 증거',
    ]

    // 계약서 파일명
    const safeName = recipient.name.replace(/[^\w가-힣]/g, '_')
    const contractFile = `자금지원약정서_${safeName}.pdf`

    // 거래 설명
    const dealDescription = `${purposeLabel} · 사용 종료 ${endDate}${reportFreq !== 'none' ? ` · ${reportLabel} 보고` : ''}${memo.trim() ? ` · ${memo.trim()}` : ''}`

    addTransaction({
      type: 'support',                                 // ⭐ 'invest' → 'support'로 변경
      fromUserId: 'me_juda_kim',
      fromUserName: '김주다',
      fromUserType: 'personal',
      recipient,
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `${purposeLabel}${memo.trim() ? ` · ${memo.trim()}` : ''}`,
      walletId,
      walletLabel: selectedWallet?.label || 'MY 지갑',
      payDateMode: 'immediate',
      // 거래형 (풍부)
      dealTitle: `${recipient.name} 자금 지원`,
      dealDescription,
      contractDocId: `SP_${Date.now()}`,
      contractExpires: endDate,
      contractSigned: false,
      contractFile,
      milestones,
      timeline,
      safety,
      dealStatus,
      statusLabel,
      myAction: null,
      // 자금 지원 메타 (풍부) — investMeta 재사용 (TransactionDetail 호환)
      investMeta: {
        type: 'support',
        typeLabel: '자금 지원',
        purposeLabel,                   // 창업 자금 / 사업 운영 등
        period: `사용 종료 ${endDate}`,
        reportFreq: reportLabel,
        autoRefund,
        blockedMcc: blockedMccLabels,
      },
    })
  }

  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name}에게 자금 지원`}
      summaryRight={`${amtFmt}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
    />
  )

  // ───────────── 완료 (서명 대기) ─────────────
  if (step === 'done') return (
    <DoneStep
      tone="waiting"
      title={`${recipient.name} 동의 대기 중`}
      description={
        <>
          {recipient.name}에게 약정서 SMS가 발송됐어요.<br />
          양측 서명 완료 시 <strong style={{ color:'#FCD34D' }}>{amtFmt}원</strong>이 입금돼요.
        </>
      }
      summary={[
        { label:'지원 금액', value:`${amtFmt}원`, accent:true },
        { label:'지원 목적', value: PURPOSE_TAGS.find(t => t.id === purposeTag)?.label || purposeTag },
        { label:'보고 주기', value: REPORT_FREQUENCIES.find(f => f.id === reportFreq)?.label || '' },
        { label:'사용 통제', value: blockedCount > 0 ? `${blockedCount}개 차단` : '제한 없음' },
        { label:'1회 결제 한도', value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음' },
        { label:'출금 지갑', value: selectedWallet?.label || 'MY 지갑' },
      ]}
      noteYellow={`3일 내 ${recipient.name} 미서명 시 자동 취소 · 알림센터 + 메시지에서 진행 상태 확인 가능`}
      primaryLabel="홈으로"
      onPrimary={() => navigate('/home')}
      secondaryLabel={`${recipient.name}과 대화하기`}
      onSecondary={() => navigate('/messages')}
      timestamp="2026.05.06 · 09:41"
    />
  )

  return null
}
