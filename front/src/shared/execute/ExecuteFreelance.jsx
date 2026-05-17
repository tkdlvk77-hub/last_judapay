import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../transactionStore'
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

// 분할 단계별 컬러 (도메인 의미 보존)
const SPLIT_COLORS = {
  prepay:  { bg:'#D1FAE5', border:'#10B981', text:'#047857' },  // 녹색
  middle:  { bg:'#FEF3C7', border:'#F59E0B', text:'#854F0B' },  // 황갈
  final:   { bg:'#EDE9FE', border:'#7C3AED', text:'#5B21B6' },  // 보라
}

const INSPECTION_TIMINGS = [
  { id:'after_inspection', label:'검수 후 입금', sub:'작업물 컨펌 → 자동 입금', recommended:true },
  { id:'auto_deadline',    label:'마감일 자동 입금', sub:'정해진 날짜에 검수 없이 입금' },
  { id:'immediate',        label:'즉시 입금', sub:'집행과 동시에 입금' },
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

export default function ExecuteFreelance() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/personal/select?purpose=freelance', { replace:true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)
  const [workName, setWorkName] = useState('')
  const [workStart, setWorkStart] = useState('2026-05-06')
  const [workEnd, setWorkEnd] = useState('2026-07-31')
  const [workMemo, setWorkMemo] = useState('')
  const [payMode, setPayMode] = useState('split')
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [inspectionTiming, setInspectionTiming] = useState('after_inspection')
  const [inspectionDeadline, setInspectionDeadline] = useState('2026-08-15')
  const [autoApprovalDays, setAutoApprovalDays] = useState(7)
  const [splitTotal, setSplitTotal] = useState('')
  const [splitRatios, setSplitRatios] = useState([
    { id:'prepay', label:'선금', pct:30, trigger:'계약 발효 시 즉시', deadline:null },
    { id:'middle', label:'중도금', pct:40, trigger:'1차 작업물 컨펌', deadline:'2026-06-15' },
    { id:'final',  label:'잔금',  pct:30, trigger:'최종 작업물 컨펌', deadline:'2026-07-31' },
  ])
  const [pin, setPin] = useState('')

  if (!recipient) return null

  // 사업자는 무조건 출금 가능. 개인은 freelancer 인증 여부에 따라 분기
  const isCashable = recipient.isBusiness ? !recipient.riskAccepted : recipient.freelancer === true
  const fundLabel = isCashable ? '출금 가능' : '권한 자금'
  const fundBadgeTone = isCashable ? 'cashable' : 'permission'

  const amtNum = payMode === 'single' ? (parseInt(amount) || 0) : (parseInt(splitTotal) || 0)
  const amtFmt = amtNum.toLocaleString('ko-KR')
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? MY_BALANCE
  const remaining = walletBalance - amtNum
  const totalPct = splitRatios.reduce((s, r) => s + r.pct, 0)

  const workMonths = (() => {
    const start = new Date(workStart)
    const end = new Date(workEnd)
    return Math.max(1, Math.round((end - start) / (1000*60*60*24*30.44)))
  })()

  const inspectionTimingLabel = INSPECTION_TIMINGS.find(t => t.id === inspectionTiming)?.label || ''

  const changeRecipient = () => {
    if (recipient.isBusiness) {
      navigate('/execute/business/select?purpose=freelance')
    } else {
      navigate('/execute/personal/select?purpose=freelance')
    }
  }

  const pinInput = (k) => {
    if (k === 'del') { setPin(p => p.slice(0,-1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) setTimeout(() => { setPin(''); setStep('done') }, 400)
  }

  const goBack = () => {
    if (step === 1) {
      navigate(-1)
    }
    else if (step === 'pin') setStep('confirm')
    else if (step === 'confirm') setStep(4)
    else if (step === 'done') return
    else if (step === 'ai-upload') setStep(1)
    else if (step === 'ai-analyzing') setStep('ai-upload')
    else if (step === 'ai-result') setStep('ai-analyzing')
    else if (typeof step === 'number') setStep(step - 1)
  }
  useStepHistory(goBack, step === 1, !!recipient)

  const updateSplitPct = (id, newPct) => {
    setSplitRatios(rs => rs.map(r => r.id === id ? { ...r, pct: Math.max(0, Math.min(100, newPct)) } : r))
  }

  // ───────────── AI: 업로드 ─────────────
  if (step === 'ai-upload') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="계약서 업로드"
          badge="AI 분석"
          badgeTone="ai"
          bigTitle="기존 계약서가 있나요?"
          sub="PDF·이미지를 올리면 자동으로 정보를 추출해요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>
          {/* 업로드 박스 (보라 점선) */}
          <div style={{
            background: COLORS.bgCard,
            border:`2px dashed ${theme.brand}`,
            borderRadius: RADIUS.lg,
            padding:'40px 20px',
            textAlign:'center',
            marginBottom:'14px',
          }}>
            <div style={{
              width:'52px', height:'52px',
              background: theme.activeBtnGrad,
              borderRadius:'14px',
              margin:'0 auto 14px',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 12px rgba(91,79,232,0.3)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ fontSize:'14px', fontWeight:700, color: theme.brand, marginBottom:'4px' }}>
              파일 선택 또는 카메라
            </div>
            <div style={{ fontSize:'11px', color: COLORS.t4 }}>PDF · JPG · PNG (최대 10MB)</div>
          </div>

          {/* 업로드 옵션 3개 */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'18px' }}>
            {[
              { label:'앨범에서', icon:'📷' },
              { label:'카메라', icon:'📸' },
              { label:'파일', icon:'📁' },
            ].map(opt => (
              <button key={opt.label} onClick={() => setStep('ai-analyzing')}
                style={{
                  flex:1, padding:'14px 8px',
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  border:'none', borderRadius: RADIUS.md,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                <span style={{ fontSize:'22px', lineHeight:1 }}>{opt.icon}</span>
                <span style={{ fontSize:'11px', fontWeight:600, color: COLORS.t2 }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* 자동 추출 항목 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            자동 추출 항목
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'14px' }}>
            {['작업명', '계약 기간', '총 금액', '분할 지급', '검수 조건', '양 당사자'].map(label => (
              <span key={label} style={{
                display:'inline-block', padding:'4px 10px',
                background: COLORS.bgMuted, color: COLORS.t3,
                borderRadius:'5px',
                fontSize:'11px', fontWeight:600,
              }}>
                {label}
              </span>
            ))}
          </div>

          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
            marginBottom:'14px',
          }}>
            ⓘ AI 추출 결과는 보조 도구입니다. 발송 전 반드시 직접 검토해주세요.
          </div>

          <button onClick={() => setStep(1)}
            style={{
              width:'100%', padding:'12px',
              background:'transparent', border:'none',
              color: theme.brand,
              fontSize:'13px', fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            건너뛰고 직접 입력 →
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ───────────── AI: 분석 중 ─────────────
  if (step === 'ai-analyzing') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="계약서 분석 중"
          badge="AI"
          badgeTone="ai"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>
          {/* 파일 정보 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px',
            display:'flex', alignItems:'center', gap:'12px',
            marginBottom:'24px',
          }}>
            <div style={{
              width:'40px', height:'40px',
              background:'#EDE9FE', borderRadius: RADIUS.md,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                앱디자인_외주계약서_v2.pdf
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>2.4 MB · 4페이지</div>
            </div>
          </div>

          {/* 원형 진행률 (보라 그라데이션) */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'18px' }}>
            <div style={{ position:'relative', width:'130px', height:'130px' }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="ringBrand" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C3AED"/>
                    <stop offset="100%" stopColor="#5B4FE8"/>
                  </linearGradient>
                </defs>
                <circle cx="65" cy="65" r="55" fill="none" stroke={COLORS.bgMuted} strokeWidth="9"/>
                <circle cx="65" cy="65" r="55" fill="none" stroke="url(#ringBrand)" strokeWidth="9"
                  strokeDasharray={`${0.67 * 345.6} 345.6`} strokeLinecap="round"
                  transform="rotate(-90 65 65)" />
              </svg>
              <div style={{
                position:'absolute', inset:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'26px', fontWeight:700, color: COLORS.t1,
              }}>
                67%
              </div>
            </div>
          </div>

          <div style={{ textAlign:'center', fontSize:'14px', fontWeight:600, color: COLORS.t2, marginBottom:'4px' }}>
            조항 분석 중...
          </div>
          <div style={{ textAlign:'center', fontSize:'11px', color: COLORS.t4, marginBottom:'24px' }}>
            평균 8초 소요
          </div>

          {/* 진행 단계 카드 */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
            marginBottom:'14px',
          }}>
            {[
              { label:'파일 인식 완료', sub:'텍스트 추출 OK · 한글', state:'done' },
              { label:'기본 정보 추출', sub:'작업명·금액·기간·당사자', state:'done' },
              { label:'분할 지급 조건 분석 중', sub:'선금·중도금·잔금 비율', state:'loading' },
              { label:'검수 조건 분석', sub:'대기 중', state:'pending' },
            ].map((s, i, arr) => (
              <div key={s.label} style={{
                padding:'12px 14px',
                display:'flex', alignItems:'center', gap:'10px',
                borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
              }}>
                <div style={{
                  width:'22px', height:'22px',
                  borderRadius:'50%',
                  background: s.state === 'done' ? '#10B981'
                            : s.state === 'loading' ? theme.brand
                            : COLORS.bgMuted,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  {s.state === 'done' ? (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : s.state === 'loading' ? (
                    <span style={{ fontSize:'11px', color:'#fff', fontWeight:700, lineHeight:1 }}>···</span>
                  ) : null}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{
                    fontSize:'12px', fontWeight:600,
                    color: s.state === 'pending' ? COLORS.t5 : COLORS.t1,
                  }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'2px' }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setStep('ai-result')}
            style={{
              width:'100%', padding:'14px',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'13px', fontWeight:600,
              color: COLORS.t2,
              cursor:'pointer', fontFamily:'inherit',
              marginBottom:'8px',
            }}>
            분석 완료 (시뮬레이션) →
          </button>

          <button onClick={() => setStep('ai-upload')}
            style={{
              width:'100%', padding:'12px',
              background:'transparent', border:'none',
              color: COLORS.t4,
              fontSize:'12px', cursor:'pointer', fontFamily:'inherit',
            }}>
            취소하기
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ───────────── AI: 결과 ─────────────
  if (step === 'ai-result') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="추출 결과 확인"
          badge="AI"
          badgeTone="ai"
          bigTitle="이렇게 추출됐어요"
          sub="아래 내용을 검토하고 수정해주세요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>
          {/* 분석 완료 배너 (녹색) */}
          <div style={{
            background:'#ECFDF5',
            borderRadius: RADIUS.md,
            padding:'14px',
            marginBottom:'14px',
            display:'flex', alignItems:'center', gap:'10px',
          }}>
            <div style={{
              width:'24px', height:'24px', borderRadius:'50%',
              background:'#10B981',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="13" height="11" viewBox="0 0 11 9" fill="none">
                <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#047857', marginBottom:'2px' }}>
                분석 완료 · 5/6 항목 추출
              </div>
              <div style={{ fontSize:'11px', color:'#047857' }}>위약금 조항만 직접 입력 필요</div>
            </div>
          </div>

          {/* 추출 항목 카드들 */}
          {[
            { label:'작업명',     value:'앱 디자인 — 메인 화면 5종', confidence:'high' },
            { label:'계약 기간',  value:'2026.05.05 — 2026.07.31', confidence:'high' },
            { label:'총 금액',    value:'5,000,000원', confidence:'high' },
            { label:'분할 지급',  value:'선금 30% · 중도 40% · 잔금 30%', confidence:'mid', visual:'split' },
            { label:'검수 조건',  value:'수정 2회 · 미응답 7일', confidence:'mid' },
            { label:'위약금 조항', value:'계약서에서 명확히 찾을 수 없어요', confidence:'fail' },
          ].map(item => {
            const conf = {
              high: { label:'신뢰도 높음', bg:'#D1FAE5', color:'#047857' },
              mid:  { label:'신뢰도 중간', bg:'#FEF3C7', color:'#854F0B' },
              fail: { label:'추출 실패',   bg: COLORS.dangerBg, color:'#B91C1C' },
            }[item.confidence]

            return (
              <div key={item.label} style={{
                background: COLORS.bgCard,
                boxShadow: SHADOWS.card,
                border: item.confidence === 'fail' ? `1.5px solid ${COLORS.danger}` : 'none',
                borderRadius: RADIUS.md,
                padding:'12px 14px',
                marginBottom:'8px',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'12px', color: COLORS.t4, fontWeight:600 }}>{item.label}</span>
                    <span style={{
                      padding:'2px 7px',
                      background: conf.bg, color: conf.color,
                      borderRadius:'4px',
                      fontSize:'9px', fontWeight:700,
                    }}>
                      {conf.label}
                    </span>
                  </div>
                  <button style={{
                    fontSize:'11px', fontWeight:600,
                    color: item.confidence === 'fail' ? COLORS.danger : theme.brand,
                    background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                  }}>
                    {item.confidence === 'fail' ? '직접 입력' : '수정'}
                  </button>
                </div>
                <div style={{
                  fontSize:'13px', fontWeight:600,
                  color: item.confidence === 'fail' ? '#B91C1C' : COLORS.t1,
                }}>
                  {item.value}
                </div>
                {item.visual === 'split' && (
                  <div style={{
                    display:'flex', gap:'2px',
                    marginTop:'8px', height:'8px',
                    borderRadius:'4px', overflow:'hidden',
                  }}>
                    <div style={{ width:'30%', background: SPLIT_COLORS.prepay.border }} />
                    <div style={{ width:'40%', background: SPLIT_COLORS.middle.border }} />
                    <div style={{ width:'30%', background: SPLIT_COLORS.final.border }} />
                  </div>
                )}
              </div>
            )
          })}

          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
            marginTop:'14px',
          }}>
            ⓘ AI 추출은 보조 정보입니다. 잘못된 정보로 인한 분쟁은 사용자 책임입니다.
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button
          onClick={() => {
            setWorkName('앱 디자인 — 메인 화면 5종')
            setWorkStart('2026-05-05')
            setWorkEnd('2026-07-31')
            setSplitTotal('5000000')
            setPayMode('split')
            setStep(1)
          }}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          검토 완료 · 1단계로 적용
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 1단계: 작업 정보 ─────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="외주비"
          badge={fundLabel}
          badgeTone={fundBadgeTone}
          step={1} totalSteps={4}
          bigTitle={`어떤 작업을\n맡기시나요?`}
          sub={
            recipient.isBusiness
              ? (recipient.riskAccepted
                  ? `${recipient.name}는 폐업 사업자 — 위험 감수 진행, 세금계산서 발행 불가`
                  : `${recipient.name}는 정상 사업자, 검수 완료 시 세금계산서와 함께 자동 출금됩니다`)
              : (isCashable
                  ? `${recipient.name}는 프리랜서 인증되어 본인 계좌로 자동 출금됩니다`
                  : `${recipient.name}는 프리랜서 미인증 — 권한 자금으로 보관되어 카드 결제만 가능합니다`)
          }
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 받는 사람 카드 (사업자/개인 분기) */}
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
              borderRadius: recipient.isBusiness ? '12px' : '50%',
              background: recipient.isBusiness
                ? (recipient.riskAccepted ? COLORS.dangerBg : '#D1FAE5')
                : (recipient.avatarBg || theme.activeBtnGrad),
              color: recipient.isBusiness
                ? (recipient.riskAccepted ? '#B91C1C' : '#047857')
                : (recipient.avatarFg || '#fff'),
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: recipient.emoji ? '22px' : '15px',
              fontWeight:700, flexShrink:0,
            }}>
              {recipient.emoji || recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{recipient.name}</span>
                {recipient.isBusiness ? (
                  <span style={{
                    padding:'1px 6px',
                    background: recipient.riskAccepted ? COLORS.dangerBg : '#D1FAE5',
                    color: recipient.riskAccepted ? '#B91C1C' : '#047857',
                    borderRadius:'4px',
                    fontSize:'9px', fontWeight:700,
                  }}>
                    {recipient.riskAccepted ? '폐업 사업자' : '사업자'}
                  </span>
                ) : (
                  <>
                    {recipient.verified && (
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" fill="#10B981"/>
                        <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {recipient.freelancer && (
                      <span style={{
                        padding:'1px 6px',
                        background: FUND_COLORS.freelance.bg,
                        color: FUND_COLORS.freelance.main,
                        borderRadius:'4px',
                        fontSize:'9px', fontWeight:700,
                      }}>
                        프리랜서
                      </span>
                    )}
                  </>
                )}
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                {recipient.isBusiness
                  ? `${recipient.bizNumber} · ${recipient.industry || ''}`
                  : `${recipient.field ? `${recipient.field} · ` : ''}${recipient.kyc} · ${recipient.phone}`}
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

          {/* AI 업로드 진입 카드 */}
          <button onClick={() => setStep('ai-upload')}
            style={{
              width:'100%',
              background: COLORS.bgCard,
              border:`1.5px dashed ${theme.brand}`,
              borderRadius: RADIUS.lg,
              padding:'14px',
              display:'flex', alignItems:'center', gap:'12px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              marginBottom:'18px',
            }}>
            <div style={{
              width:'36px', height:'36px',
              background:'#EDE9FE', borderRadius: RADIUS.md,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
                <span style={{ fontSize:'13px', fontWeight:700, color: theme.brand }}>
                  기존 계약서 업로드
                </span>
                <span style={{
                  padding:'1px 5px',
                  background:'#EDE9FE', color:'#7C3AED',
                  borderRadius:'3px',
                  fontSize:'9px', fontWeight:700,
                }}>
                  AI 분석
                </span>
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                PDF/이미지 업로드 → 자동 추출 (선택)
              </div>
            </div>
            <span style={{ color: theme.brand, fontSize:'18px', flexShrink:0, fontWeight:700 }}>+</span>
          </button>

          {/* 작업명 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            작업명
          </div>
          <input type="text" value={workName} onChange={e => setWorkName(e.target.value)}
            placeholder="예: 앱 디자인 — 메인 화면 5종" maxLength={60}
            style={{
              width:'100%', height:'48px',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg,
              padding:'0 16px',
              fontSize:'13px', color: COLORS.t1,
              outline:'none', fontFamily:'inherit',
              marginBottom:'18px',
              boxSizing:'border-box',
            }} />

          {/* 계약 기간 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            계약 기간
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px' }}>
            <div style={{
              flex:1,
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'10px 14px',
            }}>
              <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'2px' }}>시작</div>
              <input type="date" value={workStart} onChange={e => setWorkStart(e.target.value)}
                style={{
                  width:'100%', fontSize:'13px', fontWeight:600,
                  color: COLORS.t1,
                  background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                  boxSizing:'border-box', maxWidth:'100%',
                  WebkitAppearance:'none', appearance:'none',
                }} />
            </div>
            <span style={{ color: COLORS.t4, fontSize:'14px' }}>—</span>
            <div style={{
              flex:1,
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'10px 14px',
            }}>
              <div style={{ fontSize:'10px', color: COLORS.t4, marginBottom:'2px' }}>종료</div>
              <input type="date" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
                style={{
                  width:'100%', fontSize:'13px', fontWeight:600,
                  color: COLORS.t1,
                  background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                  boxSizing:'border-box', maxWidth:'100%',
                  WebkitAppearance:'none', appearance:'none',
                }} />
            </div>
          </div>
          <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'18px', paddingLeft:'4px' }}>
            약 {workMonths}개월
          </div>

          {/* 메모 */}
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            메모 (선택)
          </div>
          <input type="text" value={workMemo} onChange={e => setWorkMemo(e.target.value)}
            placeholder="간단한 작업 메모..." maxLength={60}
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
            }} />

          {/* 안내 박스 (수신자별 분기) */}
          <div style={{
            padding:'12px 14px',
            background: recipient.isBusiness && recipient.riskAccepted ? COLORS.dangerBg
                      : isCashable ? '#ECFDF5'
                      : '#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px',
            color: recipient.isBusiness && recipient.riskAccepted ? '#B91C1C'
                 : isCashable ? '#047857'
                 : '#854F0B',
            lineHeight:1.65,
          }}>
            {recipient.isBusiness
              ? (recipient.riskAccepted
                  ? `⚠ ${recipient.name}는 폐업 사업자 — 세금계산서 발행 불가, 분쟁 시 회수 어려움. 위험 감수 진행.`
                  : `✓ ${recipient.name}는 정상 사업자 — 검수 완료 시 자동 출금 + 세금계산서 자동 발행 + 증빙 보관.`)
              : (isCashable
                  ? `✓ ${recipient.name}는 프리랜서 인증되어 있어 검수 완료 시 본인 계좌로 자동 출금됩니다.`
                  : `ⓘ ${recipient.name}는 프리랜서 미인증 — 받은 자금은 카드 결제로만 사용 가능 (출금 불가)`)}
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => workName.trim() && setStep(2)}
          disabled={!workName.trim()}
          style={{
            width:'100%', height:'52px',
            background: workName.trim() ? theme.brand : COLORS.bgMuted,
            color: workName.trim() ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: workName.trim() ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: workName.trim() ? SHADOWS.buttonBrand : 'none',
          }}>
          {workName.trim() ? '다음 (지급 방식)' : '작업명을 입력하세요'}
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 2단계: 지급 방식 ─────────────
  if (step === 2) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="지급 방식 선택"
          step={2} totalSteps={4}
          bigTitle={`어떻게\n나눠 드릴까요?`}
          sub="한 번에 지급할지, 단계별로 나눠 지급할지 선택해요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 단일 지급 카드 */}
          <button onClick={() => setPayMode('single')}
            style={{
              width:'100%',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border: payMode === 'single' ? `1.5px solid ${theme.brand}` : 'none',
              borderRadius: RADIUS.lg,
              padding:'16px',
              cursor:'pointer', fontFamily:'inherit',
              textAlign:'left', marginBottom:'10px',
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
              <div style={{
                width:'22px', height:'22px', borderRadius:'50%',
                border: payMode === 'single' ? `7px solid ${theme.brand}` : `2px solid ${COLORS.t5}`,
                flexShrink:0, transition:'all .15s',
                background: COLORS.bgCard,
              }} />
              <span style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1 }}>단일 지급</span>
              <span style={{
                padding:'2px 8px',
                background: COLORS.bgMuted, color: COLORS.t4,
                borderRadius:'4px',
                fontSize:'10px', fontWeight:700,
              }}>
                간단
              </span>
            </div>
            <div style={{ fontSize:'12px', color: COLORS.t4, marginBottom:'10px', paddingLeft:'32px' }}>
              금액 한 번 → 검수 후 100% 입금
            </div>
            <div style={{ paddingLeft:'32px' }}>
              <div style={{ height:'8px', borderRadius:'4px', background: SPLIT_COLORS.prepay.border, marginBottom:'5px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', fontWeight:700, color: SPLIT_COLORS.prepay.text }}>
                <span>검수 100%</span>
              </div>
            </div>
          </button>

          {/* 분할 지급 카드 */}
          <button onClick={() => setPayMode('split')}
            style={{
              width:'100%',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              border: payMode === 'split' ? `1.5px solid ${theme.brand}` : 'none',
              borderRadius: RADIUS.lg,
              padding:'16px',
              cursor:'pointer', fontFamily:'inherit',
              textAlign:'left', marginBottom:'14px',
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
              <div style={{
                width:'22px', height:'22px', borderRadius:'50%',
                border: payMode === 'split' ? `7px solid ${theme.brand}` : `2px solid ${COLORS.t5}`,
                flexShrink:0, transition:'all .15s',
                background: COLORS.bgCard,
              }} />
              <span style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1 }}>분할 지급</span>
              <span style={{
                padding:'2px 8px',
                background: theme.brand, color:'#fff',
                borderRadius:'4px',
                fontSize:'10px', fontWeight:700,
              }}>
                권장
              </span>
            </div>
            <div style={{ fontSize:'12px', color: COLORS.t4, marginBottom:'10px', paddingLeft:'32px' }}>
              선금 → 중도금 (작업물 컨펌) → 잔금
            </div>
            <div style={{ paddingLeft:'32px' }}>
              <div style={{ display:'flex', gap:'2px', height:'8px', borderRadius:'4px', overflow:'hidden', marginBottom:'5px' }}>
                <div style={{ width:'30%', background: SPLIT_COLORS.prepay.border }} />
                <div style={{ width:'40%', background: SPLIT_COLORS.middle.border }} />
                <div style={{ width:'30%', background: SPLIT_COLORS.final.border }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', fontWeight:700 }}>
                <span style={{ color: SPLIT_COLORS.prepay.text }}>선금 30%</span>
                <span style={{ color: SPLIT_COLORS.middle.text }}>중도 40%</span>
                <span style={{ color: SPLIT_COLORS.final.text }}>잔금 30%</span>
              </div>
            </div>
          </button>

          <div style={{
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294', lineHeight:1.65,
          }}>
            분할 모드는 작업물 컨펌 단계마다 자동 입금됩니다. {recipient.name}는 작업물을 사진/파일로 제출하고, 내가 컨펌하면 다음 금액이 입금됩니다.
          </div>
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
          다음 (금액 입력)
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 3단계: 금액 + 검수 (단일) ─────────────
  if (step === 3 && payMode === 'single') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="금액 + 검수 조건"
          badge="단일 지급"
          step={3} totalSteps={4}
          bigTitle="얼마를 보낼까요?"
          sub="검수 시점에 따라 입금 시기가 달라져요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 출금 지갑 선택 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t3, marginBottom:'6px', padding:'0 4px' }}>
              출금 지갑
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setAmount('') }}
            />
          </div>

          {/* 금액 입력 */}
          <div style={{ textAlign:'center', marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'10px' }}>금액</div>
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
            {[100000, 500000, 1000000, 5000000].map(v => (
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

          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'10px', padding:'0 4px' }}>
            지급 시점
          </div>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
            marginBottom:'14px',
          }}>
            {INSPECTION_TIMINGS.map((t, i) => {
              const active = inspectionTiming === t.id
              return (
                <button key={t.id} onClick={() => setInspectionTiming(t.id)}
                  style={{
                    width:'100%', padding:'14px 16px',
                    display:'flex', alignItems:'center', gap:'12px',
                    background: active ? '#F5F3FF' : COLORS.bgCard,
                    border:'none',
                    borderBottom: i < INSPECTION_TIMINGS.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
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
                      <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{t.label}</span>
                      {t.recommended && (
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
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>{t.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 검수 옵션 (after_inspection만) */}
          {inspectionTiming === 'after_inspection' && (
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
              marginBottom:'14px',
            }}>
              <div style={{
                padding:'14px',
                borderBottom:`1px solid ${COLORS.borderSoft}`,
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span style={{ fontSize:'12px', color: COLORS.t3, fontWeight:600 }}>검수 마감일</span>
                <input type="date" value={inspectionDeadline} onChange={e => setInspectionDeadline(e.target.value)}
                  style={{
                    fontSize:'13px', fontWeight:600,
                    color: COLORS.t1,
                    background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                    textAlign:'right', boxSizing:'border-box', maxWidth:'100%',
                    WebkitAppearance:'none', appearance:'none',
                  }} />
              </div>
              <div style={{ padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'12px', color: COLORS.t3, fontWeight:600 }}>미응답 자동 승인</span>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <input type="number" min="1" max="30" value={autoApprovalDays}
                    onChange={e => setAutoApprovalDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    style={{
                      width:'40px', fontSize:'17px', fontWeight:700,
                      color: COLORS.t1,
                      background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                      textAlign:'right',
                    }} />
                  <span style={{ fontSize:'13px', color: COLORS.t3, fontWeight:600 }}>일 후</span>
                </div>
              </div>
            </div>
          )}

          {/* 날짜 선택 (auto_deadline) */}
          {inspectionTiming === 'auto_deadline' && (
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
              marginBottom:'14px',
            }}>
              <div style={{
                padding:'14px',
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span style={{ fontSize:'12px', color: COLORS.t3, fontWeight:600 }}>자동 입금 날짜</span>
                <input type="date" value={inspectionDeadline} onChange={e => setInspectionDeadline(e.target.value)}
                  style={{
                    fontSize:'13px', fontWeight:600,
                    color: COLORS.t1,
                    background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                    textAlign:'right', boxSizing:'border-box', maxWidth:'100%',
                    WebkitAppearance:'none', appearance:'none',
                  }} />
              </div>
            </div>
          )}

          <div style={{
            padding:'12px 14px',
            background:'#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#854F0B', lineHeight:1.65,
          }}>
            {inspectionTiming === 'after_inspection'
              ? `검수 마감일까지 컨펌이 없으면 ${autoApprovalDays}일 후 자동 승인되어 입금됩니다.`
              : inspectionTiming === 'auto_deadline'
              ? '⚠ 검수 절차 없이 마감일에 자동 입금됩니다. 작업물 분쟁 위험이 있으니 신중히 선택하세요.'
              : '집행과 동시에 즉시 입금됩니다. 선금/계약금 케이스에 적합합니다.'}
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => amtNum >= 1000 && amtNum <= walletBalance && setStep(4)}
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
          {amtNum > walletBalance ? '잔액 부족' : amtNum >= 1000 ? '다음 (계약서)' : '금액을 입력하세요'}
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 3단계: 분할 비율 설정 ─────────────
  if (step === 3 && payMode === 'split') return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="분할 지급 설정"
          badge="분할"
          step={3} totalSteps={4}
          bigTitle="단계별로 나눠볼게요"
          sub="총 계약 금액과 비율을 설정해주세요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 출금 지갑 선택 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t3, marginBottom:'6px', padding:'0 4px' }}>
              출금 지갑
            </div>
            <WalletPicker
              executeType="freelance"
              selectedId={walletId}
              onChange={(w) => { setWalletId(w.id); setSplitTotal('') }}
            />
          </div>

          {/* 총 계약 금액 (보라 톤 강조 박스) */}
          <div style={{
            background:'#F5F3FF',
            border:`1px solid ${theme.brand}`,
            borderRadius: RADIUS.lg,
            padding:'16px',
            marginBottom:'14px',
            textAlign:'center',
          }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: theme.brand, marginBottom:'8px' }}>
              총 계약 금액
            </div>
            <AmountDisplay amount={splitTotal} onChange={setSplitTotal} onClear={() => setSplitTotal('')} />
            <div style={{
              fontSize:'11px',
              color: amtNum > walletBalance ? COLORS.danger : theme.brand,
              marginTop:'8px',
            }}>
              {selectedWallet?.label || 'MY 지갑'} 잔액 {walletBalance.toLocaleString()}원
              {amtNum > walletBalance && ' · 충전 필요'}
            </div>
          </div>

          {/* 빠른 금액 */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'18px' }}>
            {[1000000, 3000000, 5000000, 10000000].map(v => (
              <button key={v}
                onClick={() => setSplitTotal(String((parseInt(splitTotal) || 0) + v))}
                style={{
                  flex:1, height:'32px',
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  border:'none', borderRadius:'8px',
                  fontSize:'11px', fontWeight:600,
                  color: COLORS.t2,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                +{v/10000}만
              </button>
            ))}
          </div>

          {/* 단계별 비율 카드 */}
          {splitRatios.map((r, i) => {
            const colors = SPLIT_COLORS[r.id]
            const stageAmt = Math.round((amtNum * r.pct) / 100)
            return (
              <div key={r.id} style={{
                background: COLORS.bgCard,
                boxShadow: SHADOWS.card,
                borderRadius: RADIUS.lg,
                borderLeft:`5px solid ${colors.border}`,
                padding:'14px',
                marginBottom:'10px',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{
                      width:'24px', height:'24px',
                      borderRadius:'50%',
                      background: colors.border,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', fontWeight:700, color:'#fff',
                      flexShrink:0,
                    }}>
                      {i+1}
                    </div>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{r.label}</div>
                      <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'1px' }}>{r.trigger}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
                    <input type="number" min="0" max="100" value={r.pct}
                      onChange={e => updateSplitPct(r.id, parseInt(e.target.value) || 0)}
                      style={{
                        width:'46px', fontSize:'17px', fontWeight:700,
                        color: colors.text,
                        background:'transparent', border:'none', outline:'none', fontFamily:'inherit',
                        textAlign:'right',
                      }} />
                    <span style={{ fontSize:'14px', color: colors.text, fontWeight:700 }}>%</span>
                  </div>
                </div>
                <div style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  paddingLeft:'34px',
                  fontSize:'13px',
                }}>
                  <span style={{ color: COLORS.t2, fontWeight:600 }}>
                    {stageAmt.toLocaleString()}원
                  </span>
                  {r.deadline && (
                    <span style={{ color: COLORS.t4, fontSize:'11px' }}>
                      마감 {new Date(r.deadline).toLocaleDateString('ko-KR', { month:'long', day:'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* 합계 검증 */}
          <div style={{
            padding:'12px',
            background: totalPct === 100 ? '#ECFDF5' : '#FFFBEB',
            borderRadius: RADIUS.md,
            fontSize:'13px', fontWeight:700,
            color: totalPct === 100 ? '#047857' : '#854F0B',
            textAlign:'center',
            marginBottom:'14px',
          }}>
            {totalPct === 100
              ? '✓ 합계 100% — 비율이 맞아요'
              : `합계 ${totalPct}% · ${100-totalPct}% ${totalPct < 100 ? '부족' : '초과'}`}
          </div>

          <div style={{
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294', lineHeight:1.65,
          }}>
            ⓘ 총 100% 자동 검증 · 비율은 자유롭게 조정 가능 · 4단계 이상 분할도 추가 가능
          </div>
        </div>
      </div>

      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        <button onClick={() => totalPct === 100 && amtNum >= 1000 && amtNum <= walletBalance && setStep(4)}
          disabled={!(totalPct === 100 && amtNum >= 1000 && amtNum <= walletBalance)}
          style={{
            width:'100%', height:'52px',
            background: totalPct === 100 && amtNum >= 1000 && amtNum <= walletBalance ? theme.brand : COLORS.bgMuted,
            color: totalPct === 100 && amtNum >= 1000 && amtNum <= walletBalance ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: totalPct === 100 && amtNum >= 1000 && amtNum <= walletBalance ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: totalPct === 100 && amtNum >= 1000 && amtNum <= walletBalance ? SHADOWS.buttonBrand : 'none',
          }}>
          {totalPct !== 100 ? '비율 합계 100% 만들기' : amtNum > walletBalance ? '잔액 부족' : amtNum >= 1000 ? '다음 (계약서)' : '금액을 입력하세요'}
        </button>
      </div>
    </PhoneShell>
  )

  // ───────────── 4단계: 외주 용역 계약서 ─────────────
  if (step === 4) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="계약서 자동 생성"
          badge={payMode === 'split' ? '분할' : '단일'}
          step={4} totalSteps={4}
          bigTitle="계약서를 확인하세요"
          sub="모두싸인 휴대폰 인증으로 양측이 서명해요"
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 계약서 미리보기 카드 */}
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
                  외주 용역 계약서
                </span>
              </div>
              <span style={{ fontSize:'10px', color: COLORS.t4, fontWeight:600 }}>자동 생성</span>
            </div>

            {/* 당사자 */}
            <div style={{ padding:'14px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>당사자</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>발주자</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>
                  이호형 <span style={{ color:'#10B981', fontSize:'11px' }}>실명 ✓</span>
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>출금 지갑</span>
                <div style={{ textAlign:'right' }}>
                  <span style={{ color: COLORS.t1, fontWeight:600 }}>
                    {selectedWallet?.label || 'MY 지갑'}
                  </span>
                  <button onClick={() => setStep(1)}
                    style={{ marginLeft:'8px', fontSize:'11px', fontWeight:600, color: theme.brand, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                    수정
                  </button>
                  <div style={{ fontSize:'10px', color: COLORS.t4 }}>잔액 {walletBalance.toLocaleString()}원</div>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color: COLORS.t4 }}>수급인</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>
                  {recipient.name}{' '}
                  {recipient.isBusiness ? (
                    <span style={{
                      display:'inline-block', padding:'1px 5px',
                      background: recipient.riskAccepted ? COLORS.dangerBg : '#D1FAE5',
                      color: recipient.riskAccepted ? '#B91C1C' : '#047857',
                      borderRadius:'3px', fontSize:'9px', fontWeight:700,
                      marginLeft:'4px',
                    }}>
                      {recipient.riskAccepted ? '폐업' : '사업자'}
                    </span>
                  ) : recipient.verified && (
                    <span style={{ color:'#10B981', fontSize:'11px' }}>실명 ✓</span>
                  )}
                </span>
              </div>
              {recipient.isBusiness && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginTop:'6px' }}>
                  <span style={{ color: COLORS.t4 }}>사업자번호</span>
                  <span style={{ color: COLORS.t2, fontWeight:500 }}>{recipient.bizNumber}</span>
                </div>
              )}
            </div>

            {/* 작업 내용 */}
            <div style={{ padding:'14px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>작업 내용</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px', gap:'10px' }}>
                <span style={{ color: COLORS.t4, flexShrink:0 }}>작업명</span>
                <span style={{ color: COLORS.t1, fontWeight:600, textAlign:'right' }}>{workName}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color: COLORS.t4 }}>계약 기간</span>
                <span style={{ color: COLORS.t1, fontWeight:600 }}>
                  {workStart.replace(/-/g, '.')} — {workEnd.replace(/-/g, '.')}
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color: COLORS.t4 }}>총 금액</span>
                <span style={{ color: COLORS.t1, fontWeight:700, fontSize:'15px' }}>
                  {amtFmt}원
                </span>
              </div>
            </div>

            {/* 지급 방식 */}
            <div style={{ padding:'14px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>지급 방식</div>

              {payMode === 'split' ? (
                <>
                  {/* 분할 비율 시각화 */}
                  <div style={{ display:'flex', gap:'2px', height:'8px', borderRadius:'4px', overflow:'hidden', marginBottom:'10px' }}>
                    {splitRatios.map(r => (
                      <div key={r.id} style={{
                        width:`${r.pct}%`,
                        background: SPLIT_COLORS[r.id].border,
                      }} />
                    ))}
                  </div>
                  {splitRatios.map((r, i, arr) => {
                    const colors = SPLIT_COLORS[r.id]
                    const stageAmt = Math.round((amtNum * r.pct) / 100)
                    return (
                      <div key={r.id} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        fontSize:'12px',
                        paddingBottom: i < arr.length-1 ? '6px' : 0,
                        marginBottom: i < arr.length-1 ? '6px' : 0,
                        borderBottom: i < arr.length-1 ? `1px dashed ${COLORS.borderSoft}` : 'none',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{
                            width:'8px', height:'8px', borderRadius:'50%',
                            background: colors.border,
                            flexShrink:0,
                          }} />
                          <span style={{ color: COLORS.t2, fontWeight:600 }}>
                            {r.label} {r.pct}%
                          </span>
                        </div>
                        <span style={{ color: COLORS.t1, fontWeight:600 }}>
                          {stageAmt.toLocaleString()}원
                        </span>
                      </div>
                    )
                  })}
                </>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'5px' }}>
                    <span style={{ color: COLORS.t4 }}>지급 시점</span>
                    <span style={{ color: COLORS.t1, fontWeight:600 }}>{inspectionTimingLabel}</span>
                  </div>
                  {inspectionTiming === 'after_inspection' && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: COLORS.t4 }}>
                      <span>미응답 자동 승인</span>
                      <span>{autoApprovalDays}일 후</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 표준 조항 */}
            <div style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'8px' }}>
                표준 조항 (자동 포함)
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {['저작권 귀속', '비밀유지', '수정 횟수', '분쟁 해결', ...(recipient.isBusiness && !recipient.riskAccepted ? ['세금계산서 발행'] : [])].map(label => (
                  <span key={label} style={{
                    padding:'3px 8px',
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
              payMode === 'split'
                ? `양측 서명 완료 → 선금 ${Math.round((amtNum*splitRatios[0].pct)/100).toLocaleString()}원 즉시 입금`
                : `양측 서명 완료 → ${amtFmt}원 ${inspectionTiming === 'immediate' ? '즉시 입금' : '보관 후 검수 시 입금'}`,
              payMode === 'split'
                ? '단계별 작업물 컨펌마다 다음 금액 자동 입금'
                : (inspectionTiming === 'after_inspection'
                    ? `검수 완료 또는 ${autoApprovalDays}일 미응답 시 자동 입금`
                    : inspectionTiming === 'auto_deadline'
                    ? '검수 마감일에 자동 입금 (검수 절차 없음)'
                    : '집행과 동시에 즉시 입금'),
              isCashable
                ? '검수 완료 시 본인 계좌로 자동 출금 + 증빙 자동 보관 (5년)'
                : '받은 자금은 카드 결제로만 사용 가능 + 증빙 자동 보관 (5년)',
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
        display:'flex', flexDirection:'column', gap:'8px',
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
          계약서 확인 완료
        </button>
        <button onClick={() => setStep(1)}
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

  // ───────────── 확인 (집행 내용 확인) ─────────────
  if (step === 'confirm') {
    const modeLabel = payMode === 'single' ? '단일 지급' : '분할 지급'
    const inspLabel = INSPECTION_TIMINGS.find(t => t.id === inspectionTiming)?.label || ''

    return (
      <ConfirmStep
        smallTitle="집행 내용 확인"
        bigAmount={`${amtFmt}원`}
        sub={`${recipient.name}에게 외주비 · 권한 자금`}
        onBack={goBack}
        rows={[
          {
            label: '받는 분',
            value: recipient.name,
            sub: recipient.isBusiness ? `${recipient.bizNumber} · 사업자` : '실명 ✓',
            editAction: () => navigate(recipient.isBusiness
              ? '/execute/business/select?purpose=freelance'
              : '/execute/personal/select?purpose=freelance'),
          },
          {
            label: '출금 지갑',
            value: selectedWallet?.label || 'MY 지갑',
            sub: `잔액 ${walletBalance.toLocaleString()}원`,
            editAction: () => setStep(3),
          },
          {
            label: '지급 방식',
            value: modeLabel,
            editAction: () => setStep(2),
          },
          {
            label: '검수 방식',
            value: inspLabel,
            editAction: () => setStep(3),
          },
          ...(payMode === 'split' ? [{
            label: '분할 비율',
            value: splitRatios.map(r => `${r.label} ${r.pct}%`).join(' / '),
            editAction: () => setStep(3),
          }] : []),
          {
            label: '계약서',
            value: '외주 용역 계약서 자동 생성',
            sub: '모두싸인 양측 서명',
          },
        ]}
        autoActions={[
          `${recipient.name}에게 계약서 SMS 발송`,
          '양측 서명 완료 시 권한 자금으로 즉시 보관',
          inspectionTiming === 'after_inspection'
            ? `검수 컨펌 후 ${recipient.name} 계좌로 입금`
            : '마감일에 자동 입금',
          '계약서·거래 원장 5년 보관',
        ]}
        footerNote={
          <>
            집행 후 {selectedWallet?.label || 'MY 지갑'} 잔액 {walletBalance.toLocaleString()}원 →{' '}
            <strong>{(walletBalance - amtNum).toLocaleString()}원</strong> · 수수료 0원
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
    // 풍부 milestones 생성
    let milestones
    const isAfterInspection = inspectionTiming === 'after_inspection'
    const isAutoDeadline = inspectionTiming === 'auto_deadline'

    if (payMode === 'single') {
      milestones = [
        {
          id: 'm1',
          label: '지급',
          amount: amtNum,
          status: 'pending',
          date: workEnd || null,
          action: null,
          note: isAfterInspection
            ? '발주자 검수 승인 후 자동 입금'
            : isAutoDeadline
              ? `미응답 시 ${workEnd} 자동 입금`
              : '양측 서명 완료 시 즉시 입금',
        },
      ]
    } else {
      milestones = splitRatios.map((r, i) => {
        const isFirst = i === 0
        const isMiddle = i > 0 && i < splitRatios.length - 1
        const isLast = i === splitRatios.length - 1
        const note = isFirst
          ? '계약 서명 완료 시 본인 계좌로 자동 입금'
          : isMiddle
            ? '작업물 제출 + 발주자 검수 후 자동 입금'
            : '최종 작업물 컨펌 시 자동 입금'

        const conditions = (isMiddle || isLast)
          ? [
              { label: '작업물 제출', done: false, sub: '수급인이 산출물 업로드 대기' },
              { label: '발주자 검수 승인', done: false, sub: isAfterInspection ? '검수 완료 시 자동 입금' : '7일 미응답 시 자동 승인' },
              ...(r.deadline ? [{ label: '마감일 도래', done: false, sub: r.deadline }] : []),
            ]
          : undefined

        return {
          id: `m${i+1}`,
          label: `${r.label} ${r.pct}%`,
          amount: Math.round(amtNum * r.pct / 100),
          status: 'pending',
          date: r.deadline || null,
          action: null,
          note,
          conditions,
        }
      })
    }

    const dealStatus = !isCashable ? 'waiting' : 'signing'
    const statusLabel = !isCashable ? '외부링크 인증 대기' : '상대방 서명 대기'

    // 활동 타임라인 시드
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 계약서 발송`, type: 'event' },
      ...(workEnd ? [{ time: workEnd, label: '외주 마감일', type: 'pending' }] : []),
    ]

    // 안전 장치
    const safety = [
      '계약 서명 즉시 선금 자동 보관 시작',
      '발주자 미응답 7일 후 자동 입금',
      '주다페이 신탁 분리 보관 (라이센스)',
      '분쟁 시 메시지 + 계약서 자동 증거 보관',
    ]

    // 계약서 파일명
    const safeWorkName = (workName || '외주').replace(/[^\w가-힣]/g, '_')
    const contractFile = `외주_${safeWorkName}.pdf`

    // 거래 설명
    const dealDescription = `계약 기간 ${workStart} — ${workEnd} · ${inspectionTimingLabel}`

    addTransaction({
      type: 'freelance',
      fromUserId: 'me_juda_kim',
      fromUserName: '김주다',
      fromUserType: 'personal',
      recipient,
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: workName,
      walletId,
      walletLabel: selectedWallet?.label || 'MY 지갑',
      payDateMode: 'immediate',
      // 거래형 (풍부)
      dealTitle: workName,
      dealDescription,
      contractDocId: `EX_${Date.now()}`,
      contractExpires: workEnd,
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

  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} 외주비`}
      summaryRight={`${amtFmt}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
    />
  )

  // ───────────── 완료 ─────────────
  if (step === 'done') return (
    <DoneStep
      tone="waiting"
      title={`${recipient.name} 동의 대기 중`}
      description={
        <>
          {recipient.name}에게 계약서 SMS가 발송됐어요.<br />
          양측 서명 완료 시 <strong style={{ color:'#FCD34D' }}>{amtFmt}원</strong>이 보관됩니다.
        </>
      }
      summary={[
        { label:'외주비', value:`${amtFmt}원`, accent:true },
        { label:'지급 방식', value: payMode === 'single' ? '단일 지급' : '분할 지급' },
        { label:'검수 방식', value: INSPECTION_TIMINGS.find(t => t.id === inspectionTiming)?.label || '' },
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
