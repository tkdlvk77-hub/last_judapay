import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS, FUND_COLORS } from '../../design/tokens'
import MccBlock, { DEFAULT_MCC } from '../../shared/execute/MccBlock'
import ConfirmStep from '../../shared/execute/ConfirmStep'
import PinStep from '../../shared/execute/PinStep'
import DoneStep from '../../shared/execute/DoneStep'
import WalletPicker from '../../shared/WalletPicker'
import { getWalletById } from '../../shared/walletsData'
import { addTransaction } from '../../shared/transactionStore'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useStepHistory } from '../../hooks/useStepHistory'

const theme = getAccountTheme()

const MY_BALANCE = 1932000

// ─── 데이터 정의 ──────────────────────────────────────

// 투자 형태
const INVESTMENT_TYPES = [
  { id:'equity', label:'지분 투자', sub:'스타트업 보통주·우선주' },
  { id:'cb',     label:'CB / SAFE', sub:'전환사채·SAFE 계약' },
  { id:'lend',   label:'단순 대여', sub:'원금 회수 + 이자' },
  { id:'profit', label:'수익 분배', sub:'프로젝트 수익 % 분배' },
]

// 자금 사용 목적 (다중 선택, 계약서/보고서 기재용 — 실제 차단은 MCC 단계에서)
const FUND_USE_CATEGORIES = [
  { id:'salary',  label:'인건비',         sub:'급여·4대보험·퇴직금',     emoji:'👥', color:'#10B981' },
  { id:'mktg',    label:'마케팅비',       sub:'광고·홍보·콘텐츠 제작',   emoji:'📣', color:'#F59E0B' },
  { id:'equip',   label:'장비·인프라',    sub:'서버·노트북·소프트웨어',  emoji:'💻', color:'#7C3AED' },
  { id:'office',  label:'사무실 운영비',  sub:'임대료·관리비·공과금',     emoji:'🏢', color:'#3B82F6' },
  { id:'rnd',     label:'연구개발(R&D)',  sub:'프로토타입·실험·외주개발', emoji:'🔬', color:'#0EA5E9' },
  { id:'legal',   label:'법무·회계',      sub:'법무자문·회계·세무',       emoji:'⚖️', color:'#6B7280' },
]

// 계약 기간
const CONTRACT_PERIODS = [
  { id:'1y',  label:'1년' },
  { id:'2y',  label:'2년' },
  { id:'3y',  label:'3년', recommended:true },
  { id:'5y',  label:'5년' },
  { id:'open', label:'직접 입력' },
]

// 정기 보고 주기
const REPORT_FREQUENCIES = [
  { id:'monthly',   label:'매월',   sub:'사용처 알림 + 월간 요약', recommended:true },
  { id:'quarterly', label:'분기별', sub:'PDF 보고서 자동 생성' },
  { id:'biannual',  label:'반기별', sub:'PDF 보고서 자동 생성' },
]


// ─── 금액 입력 (큰 폰트) ──────────────────────────────
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

// ─── 받는 사람 카드 (사업자) ──────────────────────────
function RecipientCard({ recipient, onChange }) {
  // recipient: { name, brn, ceo }
  return (
    <div style={{
      background: COLORS.bgCard,
      borderRadius: RADIUS.lg,
      boxShadow: SHADOWS.card,
      padding:'14px 16px',
      display:'flex', alignItems:'center', gap:'12px',
    }}>
      <div style={{
        width:'42px', height:'42px',
        background: FUND_COLORS.invest.bg,
        borderRadius: RADIUS.md,
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0, fontSize:'20px',
      }}>
        🏢
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
          <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
            {recipient?.name || '㈜오로라'}
          </span>
          <span style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'13px', height:'13px',
            background: COLORS.success, borderRadius:'50%',
            flexShrink:0,
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </div>
        <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'1px' }}>
          {recipient?.brn || '124-86-12345'} · 대표 {recipient?.ceo || '김대표'}
        </div>
        <div style={{ fontSize:'10px', color: COLORS.t4 }}>
          쿠콘 사업자 진위 ✓ · 폐업/휴업 자동 모니터링
        </div>
      </div>
      <button onClick={onChange}
        style={{
          padding:'6px 10px',
          background: COLORS.bgMuted,
          color: COLORS.t3,
          border:'none',
          borderRadius: RADIUS.pill,
          fontSize:'10px', fontWeight:600,
          cursor:'pointer', fontFamily:'inherit',
          flexShrink:0,
        }}>
        변경
      </button>
    </div>
  )
}

// ─── 섹션 헤더 ────────────────────────────────────────
function SectionHeader({ step, title, sub }) {
  return (
    <div style={{ marginBottom:'12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom: sub ? '4px' : 0 }}>
        <span style={{
          width:'20px', height:'20px',
          background: theme.brand, color:'#fff',
          borderRadius: RADIUS.sm,
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          fontSize:'11px', fontWeight:800,
          flexShrink:0,
        }}>
          {step}
        </span>
        <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
          {title}
        </span>
      </div>
      {sub && (
        <div style={{ fontSize:'11px', color: COLORS.t4, paddingLeft:'28px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── 칩 (단일/다중 선택) ──────────────────────────────
function Chip({ label, sub, selected, onClick, recommended, color }) {
  return (
    <button onClick={onClick}
      style={{
        flex:'1 1 calc(50% - 4px)',
        minWidth:0,
        padding:'12px 12px',
        background: selected ? (color ? `${color}15` : 'rgba(91,79,232,0.08)') : COLORS.bgCard,
        border: selected
          ? `1.5px solid ${color || theme.brand}`
          : `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        position:'relative',
        transition:'all 0.15s',
      }}>
      {recommended && (
        <span style={{
          position:'absolute', top:'-7px', right:'10px',
          background: theme.brand, color:'#fff',
          fontSize:'9px', fontWeight:700,
          padding:'2px 7px',
          borderRadius: RADIUS.pill,
          letterSpacing:'-0.1px',
        }}>
          추천
        </span>
      )}
      <div style={{
        fontSize:'13px', fontWeight:700,
        color: selected ? (color || theme.brand) : COLORS.t1,
        marginBottom: sub ? '2px' : 0,
      }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize:'10px', color: COLORS.t4 }}>
          {sub}
        </div>
      )}
    </button>
  )
}

// ─── 보고 주기 라디오 카드 ────────────────────────────
function ReportRadio({ freq, selected, onSelect }) {
  return (
    <button onClick={onSelect}
      style={{
        width:'100%',
        padding:'12px 14px',
        background: selected ? 'rgba(91,79,232,0.06)' : COLORS.bgCard,
        border: selected ? `1.5px solid ${theme.brand}` : `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        display:'flex', alignItems:'center', gap:'12px',
        transition:'all 0.15s',
        position:'relative',
      }}>
      {freq.recommended && (
        <span style={{
          position:'absolute', top:'-7px', right:'10px',
          background: theme.brand, color:'#fff',
          fontSize:'9px', fontWeight:700,
          padding:'2px 7px',
          borderRadius: RADIUS.pill,
        }}>
          추천
        </span>
      )}

      {/* 라디오 */}
      <div style={{
        width:'20px', height:'20px',
        borderRadius:'50%',
        border: selected ? `6px solid ${theme.brand}` : `2px solid ${COLORS.border}`,
        background:'#fff',
        flexShrink:0,
        transition:'all 0.15s',
      }} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:'13px', fontWeight:700,
          color: selected ? theme.brand : COLORS.t1,
          marginBottom:'2px',
        }}>
          {freq.label}
        </div>
        <div style={{ fontSize:'10px', color: COLORS.t4 }}>
          {freq.sub}
        </div>
      </div>
    </button>
  )
}

// ─── 자금 사용 목적 카드 (다중 선택, 계약서/보고서용) ──
function CategoryCard({ cat, selected, onToggle }) {
  return (
    <button onClick={onToggle}
      style={{
        width:'100%',
        padding:'12px 14px',
        background: selected ? `${cat.color}10` : COLORS.bgCard,
        border: selected ? `1.5px solid ${cat.color}` : `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        display:'flex', alignItems:'center', gap:'12px',
        transition:'all 0.15s',
      }}>
      <div style={{
        width:'36px', height:'36px',
        background: selected ? `${cat.color}20` : COLORS.bgMuted,
        borderRadius: RADIUS.sm,
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0,
        fontSize:'18px',
      }}>
        {cat.emoji}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:'13px', fontWeight:700,
          color: selected ? cat.color : COLORS.t1,
          marginBottom:'2px',
        }}>
          {cat.label}
        </div>
        <div style={{ fontSize:'10px', color: COLORS.t4 }}>
          {cat.sub}
        </div>
      </div>

      {/* 체크박스 */}
      <div style={{
        width:'22px', height:'22px',
        background: selected ? cat.color : 'transparent',
        border: selected ? 'none' : `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.sm,
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0,
        transition:'all 0.15s',
      }}>
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
    </button>
  )
}


export default function ExecuteInvestBusiness() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient

  useEffect(() => {
    document.title = '투자 (개인 → 기업) | 주다페이'
  }, [])

  const [step, setStep] = useState(1)

  // ── 상태 ──────────────────────────
  const [walletId, setWalletId] = useState('my')          // 출금 지갑
  const [amount, setAmount] = useState('')
  const [investType, setInvestType] = useState(null)
  const [equityPct, setEquityPct] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [profitShare, setProfitShare] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [mccItems, setMccItems] = useState(DEFAULT_MCC)
  const [singleLimit, setSingleLimit] = useState(null)
  const [period, setPeriod] = useState('3y')
  const [customPeriod, setCustomPeriod] = useState('')
  const [reportFreq, setReportFreq] = useState('monthly')
  const [contractFile, setContractFile] = useState(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  // 선택된 지갑 정보
  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? MY_BALANCE

  const numAmount = Number(amount) || 0
  const isOver = numAmount > walletBalance
  const blockedCount = mccItems.filter(m => m.block).length

  // step 1 — 입력 완료 검증
  const step1Ready =
    walletId &&
    numAmount > 0 &&
    !isOver &&
    investType &&
    selectedCategories.length > 0 &&
    period &&
    reportFreq

  // 카테고리 토글
  const toggleCat = (id) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // 계약서 업로드 시뮬레이션
  const handleUpload = () => {
    setAiAnalyzing(true)
    // 실제로는 파일 선택 + AI 분석 흐름
    setTimeout(() => {
      setContractFile({ name: '오로라_투자계약서.pdf', size: '1.4MB', pages: 8 })
      setAiAnalyzing(false)
      // 추후: 위험 진단 결과 화면으로 라우팅
    }, 1800)
  }

  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 'pin') setStep(3)
    else if (step === 'done') return // 완료 단계는 뒤로 못 감
    else if (typeof step === 'number') setStep(step - 1)
  }
  useStepHistory(goBack, step === 1)

  // ───────────── 1단계: 투자 정보 입력 ─────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 다크 헤더 */}
        <DarkHeader
          smallTitle="투자 · 개인 → 기업"
          step={1} totalSteps={3}
          bigTitle={'스타트업에\n투자해요'}
          sub="투자 조건과 자금 사용 목적을 입력하세요"
          onBack={goBack}
          badges={[
            { text:'권한 자금', bg:'rgba(252,211,77,0.22)', color:'#FCD34D' },
            { text:'자동 보고 적용', bg:'rgba(165,180,252,0.22)', color:'#C7D2FE' },
          ]}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 120px' }}>

          {/* ── 받는 사람 카드 ───────────────────── */}
          <div style={{ marginBottom:'12px' }}>
            <RecipientCard
              recipient={recipient}
              onChange={() => navigate(-1)}
            />
          </div>

          {/* ── 출금 지갑 선택 ───────────────────── */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{
              fontSize:'11px', fontWeight:700,
              color: COLORS.t3,
              marginBottom:'6px',
              padding:'0 4px',
            }}>
              출금 지갑
            </div>
            <WalletPicker
              executeType="invest-biz"
              selectedId={walletId}
              onChange={(w) => {
                setWalletId(w.id)
                setAmount('') // 지갑 바꾸면 금액 초기화
              }}
            />
          </div>

          {/* ── AI 계약서 업로드 옵션 (점선 박스) ─── */}
          <div style={{ marginBottom:'24px' }}>
            {!contractFile && !aiAnalyzing && (
              <button onClick={handleUpload}
                style={{
                  width:'100%',
                  background:'transparent',
                  border:`1.5px dashed ${COLORS.border}`,
                  borderRadius: RADIUS.lg,
                  padding:'14px 14px',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  display:'flex', alignItems:'center', gap:'12px',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = theme.brand
                  e.currentTarget.style.background = 'rgba(91,79,232,0.03)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = COLORS.border
                  e.currentTarget.style.background = 'transparent'
                }}>
                <div style={{
                  width:'36px', height:'36px',
                  background:'rgba(91,79,232,0.10)',
                  borderRadius: RADIUS.sm,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="M9 13l2 2 4-4"/>
                  </svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color: theme.brand, marginBottom:'2px' }}>
                    투자 계약서 업로드 + AI 위험 진단
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4 }}>
                    "원금 보장" / "확정 수익률" 자동 차단 · 정기 보고 누락 검출
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}

            {aiAnalyzing && (
              <div style={{
                background: COLORS.bgCard,
                border:`1.5px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                padding:'16px',
                display:'flex', alignItems:'center', gap:'12px',
              }}>
                <div style={{
                  width:'36px', height:'36px',
                  borderRadius:'50%',
                  border:`3px solid ${COLORS.bgMuted}`,
                  borderTopColor: theme.brand,
                  animation:'spin 0.8s linear infinite',
                  flexShrink:0,
                }} />
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                    계약서 분석 중...
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4 }}>
                    위험 키워드·정기 보고·MCC 룰 자동 검출
                  </div>
                </div>
              </div>
            )}

            {contractFile && (
              <div style={{
                background:'#F0FDF4',
                border:`1.5px solid ${COLORS.success}`,
                borderRadius: RADIUS.lg,
                padding:'14px 16px',
                display:'flex', alignItems:'center', gap:'12px',
              }}>
                <div style={{
                  width:'36px', height:'36px',
                  background: COLORS.success,
                  borderRadius: RADIUS.sm,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#047857', marginBottom:'2px' }}>
                    분석 완료 · 위험 신호 1건 검출
                  </div>
                  <div style={{ fontSize:'10px', color:'#047857' }}>
                    {contractFile.name} · {contractFile.pages}p · 진단 결과 보기 ›
                  </div>
                </div>
                <button onClick={() => setContractFile(null)}
                  style={{
                    width:'24px', height:'24px',
                    background:'transparent', border:'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', padding:0, flexShrink:0,
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────── */}
          {/* 1. 투자 금액 */}
          {/* ─────────────────────────────────────── */}
          <div style={{ marginBottom:'28px' }}>
            <SectionHeader step="1" title="투자 금액" sub="MY 지갑에서 차감되어 투자처 권한 자금으로 입금됩니다" />

            <div style={{
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              boxShadow: SHADOWS.card,
              padding:'18px 16px',
            }}>
              <AmountDisplay
                amount={amount}
                onChange={setAmount}
                onClear={() => setAmount('')}
              />

              {/* 빠른 금액 칩 */}
              <div style={{
                display:'flex', gap:'6px',
                marginTop:'14px', justifyContent:'center', flexWrap:'wrap',
              }}>
                {[1000000, 5000000, 10000000, 50000000].map(v => (
                  <button key={v}
                    onClick={() => setAmount(String(v))}
                    style={{
                      padding:'6px 12px',
                      background: COLORS.bgMuted,
                      color: COLORS.t2,
                      border:'none',
                      borderRadius: RADIUS.pill,
                      fontSize:'11px', fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit',
                    }}>
                    +{(v / 10000).toLocaleString()}만
                  </button>
                ))}
              </div>

              {/* 잔액 안내 */}
              <div style={{
                marginTop:'14px',
                paddingTop:'14px',
                borderTop:`1px solid ${COLORS.borderSoft}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <span style={{ fontSize:'11px', color: COLORS.t4 }}>
                  {selectedWallet?.label || 'MY 지갑'} 잔액
                </span>
                <span style={{
                  fontSize:'12px', fontWeight:700,
                  color: isOver ? COLORS.danger : COLORS.t2,
                }}>
                  {walletBalance.toLocaleString()}원
                </span>
              </div>

              {isOver && (
                <div style={{
                  marginTop:'8px',
                  padding:'8px 10px',
                  background: COLORS.dangerBg,
                  color: COLORS.danger,
                  borderRadius: RADIUS.sm,
                  fontSize:'11px', fontWeight:600,
                  display:'flex', alignItems:'center', gap:'6px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.danger} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  잔액이 부족해요. 충전 후 진행해주세요.
                </div>
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────── */}
          {/* 2. 투자 형태 */}
          {/* ─────────────────────────────────────── */}
          <div style={{ marginBottom:'28px' }}>
            <SectionHeader step="2" title="투자 형태" sub="계약서에 박혀 양측 서명 시 자동 시행됩니다" />

            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {INVESTMENT_TYPES.map(type => (
                <Chip key={type.id}
                  label={type.label}
                  sub={type.sub}
                  selected={investType === type.id}
                  onClick={() => setInvestType(type.id)}
                />
              ))}
            </div>

            {/* 형태별 보조 입력 */}
            {investType === 'equity' && (
              <div style={{
                marginTop:'12px',
                background: COLORS.bgCard,
                borderRadius: RADIUS.md,
                boxShadow: SHADOWS.card,
                padding:'14px',
              }}>
                <div style={{ fontSize:'11px', color: COLORS.t3, marginBottom:'8px', fontWeight:600 }}>
                  지분율 (%)
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={equityPct}
                    onChange={e => setEquityPct(e.target.value)}
                    placeholder="예: 5.0"
                    style={{
                      flex:1,
                      padding:'10px 12px',
                      background: COLORS.bgMuted,
                      border:'none', borderRadius: RADIUS.sm,
                      fontSize:'14px', fontWeight:600,
                      fontFamily:'inherit', outline:'none',
                    }}
                  />
                  <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>%</span>
                </div>
                <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'6px', lineHeight:1.5 }}>
                  ※ 지분 발행(주주명부 등재)은 받는 회사가 별도 처리합니다. 주다페이는 자금 흐름과 사용처만 통제해요.
                </div>
              </div>
            )}

            {investType === 'lend' && (
              <div style={{
                marginTop:'12px',
                background: COLORS.bgCard,
                borderRadius: RADIUS.md,
                boxShadow: SHADOWS.card,
                padding:'14px',
              }}>
                <div style={{ fontSize:'11px', color: COLORS.t3, marginBottom:'8px', fontWeight:600 }}>
                  연 이자율 (%) · 법정 4.6% 권장
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    placeholder="예: 4.6"
                    style={{
                      flex:1,
                      padding:'10px 12px',
                      background: COLORS.bgMuted,
                      border:'none', borderRadius: RADIUS.sm,
                      fontSize:'14px', fontWeight:600,
                      fontFamily:'inherit', outline:'none',
                    }}
                  />
                  <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>% / 년</span>
                </div>
              </div>
            )}

            {investType === 'profit' && (
              <div style={{
                marginTop:'12px',
                background: COLORS.bgCard,
                borderRadius: RADIUS.md,
                boxShadow: SHADOWS.card,
                padding:'14px',
              }}>
                <div style={{ fontSize:'11px', color: COLORS.t3, marginBottom:'8px', fontWeight:600 }}>
                  수익 분배율 (%)
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={profitShare}
                    onChange={e => setProfitShare(e.target.value)}
                    placeholder="예: 20"
                    style={{
                      flex:1,
                      padding:'10px 12px',
                      background: COLORS.bgMuted,
                      border:'none', borderRadius: RADIUS.sm,
                      fontSize:'14px', fontWeight:600,
                      fontFamily:'inherit', outline:'none',
                    }}
                  />
                  <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>% / 분기</span>
                </div>
              </div>
            )}

            {investType === 'cb' && (
              <div style={{
                marginTop:'12px',
                background:'#FFFBEB',
                borderRadius: RADIUS.md,
                padding:'12px 14px',
                fontSize:'11px', color:'#854F0B', lineHeight:1.6,
              }}>
                <strong>CB / SAFE 계약 안내</strong><br />
                전환 조건·할인율·발행한도는 정식 PDF 계약서에 첨부해주세요. 우리 시스템은 자금 흐름과 사용처 통제만 담당하며 전환 시점은 사용자 별도 처리예요.
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────── */}
          {/* 3. 자금 사용 목적 (다중 선택, 계약서/보고서용) */}
          {/* ─────────────────────────────────────── */}
          <div style={{ marginBottom:'28px' }}>
            <SectionHeader
              step="3"
              title="자금 사용 목적"
              sub="투자 계약서·정기 보고서에 기재됩니다 · 실제 결제 차단은 다음 단계에서 설정"
            />

            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {FUND_USE_CATEGORIES.map(cat => (
                <CategoryCard key={cat.id}
                  cat={cat}
                  selected={selectedCategories.includes(cat.id)}
                  onToggle={() => toggleCat(cat.id)}
                />
              ))}
            </div>

            {/* 안내 박스 (보라 톤) */}
            <div style={{
              marginTop:'12px',
              background:'rgba(91,79,232,0.06)',
              border:`1px solid rgba(91,79,232,0.18)`,
              borderRadius: RADIUS.md,
              padding:'12px 14px',
              fontSize:'11px', color: theme.brand, lineHeight:1.55,
            }}>
              선택한 항목은 계약서에 명시되며, 정기 보고서에 카테고리별 사용 분석으로 시각화됩니다.
            </div>
          </div>


          {/* ─────────────────────────────────────── */}
          {/* 4. 계약 기간 */}
          {/* ─────────────────────────────────────── */}
          <div style={{ marginBottom:'28px' }}>
            <SectionHeader step="4" title="계약 기간" sub="자금 사용처 추적·정기 보고가 적용되는 기간" />

            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {CONTRACT_PERIODS.map(p => (
                <button key={p.id}
                  onClick={() => setPeriod(p.id)}
                  style={{
                    flex: p.id === 'open' ? '1 1 100%' : '1 1 calc(25% - 6px)',
                    minWidth:0,
                    padding:'12px 8px',
                    background: period === p.id ? 'rgba(91,79,232,0.08)' : COLORS.bgCard,
                    border: period === p.id ? `1.5px solid ${theme.brand}` : `1.5px solid ${COLORS.border}`,
                    borderRadius: RADIUS.md,
                    cursor:'pointer', fontFamily:'inherit',
                    position:'relative',
                    fontSize:'13px', fontWeight:700,
                    color: period === p.id ? theme.brand : COLORS.t1,
                    transition:'all 0.15s',
                  }}>
                  {p.recommended && (
                    <span style={{
                      position:'absolute', top:'-7px', right:'8px',
                      background: theme.brand, color:'#fff',
                      fontSize:'9px', fontWeight:700,
                      padding:'2px 6px',
                      borderRadius: RADIUS.pill,
                    }}>
                      추천
                    </span>
                  )}
                  {p.label}
                </button>
              ))}
            </div>

            {period === 'open' && (
              <div style={{
                marginTop:'10px',
                background: COLORS.bgCard,
                borderRadius: RADIUS.md,
                boxShadow: SHADOWS.card,
                padding:'12px 14px',
                display:'flex', alignItems:'center', gap:'8px',
              }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customPeriod}
                  onChange={e => setCustomPeriod(e.target.value)}
                  placeholder="예: 7"
                  style={{
                    flex:1,
                    padding:'8px 12px',
                    background: COLORS.bgMuted,
                    border:'none', borderRadius: RADIUS.sm,
                    fontSize:'14px', fontWeight:600,
                    fontFamily:'inherit', outline:'none',
                  }}
                />
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>년</span>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────── */}
          {/* 5. 정기 보고 주기 */}
          {/* ─────────────────────────────────────── */}
          <div style={{ marginBottom:'28px' }}>
            <SectionHeader step="5" title="정기 보고 주기" sub="자금 사용 내역이 자동으로 보고서로 발송됩니다" />

            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {REPORT_FREQUENCIES.map(freq => (
                <ReportRadio key={freq.id}
                  freq={freq}
                  selected={reportFreq === freq.id}
                  onSelect={() => setReportFreq(freq.id)}
                />
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────── */}
          {/* 6. 정식 계약서 PDF (선택) */}
          {/* ─────────────────────────────────────── */}
          <div style={{ marginBottom:'24px' }}>
            <SectionHeader step="6" title="정식 투자 계약서 PDF" sub="선택 항목 · 분쟁 시 증거로 보관됩니다" />

            {!contractFile ? (
              <button onClick={handleUpload}
                style={{
                  width:'100%',
                  background: COLORS.bgCard,
                  border:`1.5px dashed ${COLORS.border}`,
                  borderRadius: RADIUS.md,
                  padding:'14px',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  display:'flex', alignItems:'center', gap:'10px',
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.t3} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                    계약서 PDF 첨부
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4 }}>
                    변호사 작성 정식 계약서 권장 · 5년 영구 보관
                  </div>
                </div>
              </button>
            ) : (
              <div style={{
                background: COLORS.bgCard,
                borderRadius: RADIUS.md,
                boxShadow: SHADOWS.card,
                padding:'12px 14px',
                display:'flex', alignItems:'center', gap:'10px',
              }}>
                <div style={{
                  width:'32px', height:'32px',
                  background: FUND_COLORS.invest.bg,
                  color: FUND_COLORS.invest.main,
                  borderRadius: RADIUS.sm,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                  fontSize:'10px', fontWeight:800,
                }}>
                  PDF
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:'12px', fontWeight:700, color: COLORS.t1,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>
                    {contractFile.name}
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4 }}>
                    {contractFile.size} · {contractFile.pages} 페이지
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ─── 하단 고정 다음 버튼 ────────────────── */}
        <div style={{
          position:'sticky', bottom:0, left:0, right:0,
          background: COLORS.bg,
          padding:'12px 16px 16px',
          borderTop:`1px solid ${COLORS.borderSoft}`,
        }}>
          <button onClick={() => step1Ready && setStep(2)}
            disabled={!step1Ready}
            style={{
              width:'100%',
              padding:'16px 0',
              background: step1Ready ? GRADIENTS.brand : COLORS.bgMuted,
              color: step1Ready ? '#fff' : COLORS.t4,
              border:'none',
              borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor: step1Ready ? 'pointer' : 'not-allowed',
              fontFamily:'inherit',
              boxShadow: step1Ready ? SHADOWS.buttonBrand : 'none',
              transition:'all 0.15s',
            }}>
            {!step1Ready ? '필수 항목을 입력해주세요' : '다음 (사용 통제)'}
          </button>
        </div>
      </div>

      {/* CSS keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PhoneShell>
  )


  // ───────────── 2단계: 사용 통제 (MCC 차단) ─────────────
  if (step === 2) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle="사용 통제"
          step={2} totalSteps={3}
          bigTitle="어디서 못 쓰게 할까요?"
          sub={`${recipient?.name || '받는 분'}이 카드 결제할 때 차단할 카테고리를 선택하세요`}
          onBack={goBack}
          exitTo="/home"
          headerGrad={theme.headerGrad}
        />

        <div style={{ padding:'18px 16px 24px' }}>
          <MccBlock
            items={mccItems}
            onChange={setMccItems}
            recipientName={recipient?.name}
            singleLimit={singleLimit}
            onLimitChange={setSingleLimit}
          />

          {/* 자금 사용처 자동 추적 안내 (파란 박스) */}
          <div style={{
            background:'#EDF3FA',
            borderRadius: RADIUS.lg,
            padding:'16px',
            marginTop:'18px',
            marginBottom:'14px',
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:'8px',
              fontSize:'13px', fontWeight:700, color:'#1E5294',
              marginBottom:'12px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E5294" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              자금 사용처 자동 추적
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[
                { icon:'⚡', text:'결제 발생 시 즉시 알림 (단계형 공개 적용)' },
                { icon:'🚫', text: blockedCount > 0
                  ? `${blockedCount}개 MCC 카테고리 결제 자동 차단`
                  : 'MCC 차단 없음 — 어디든 카드 결제 가능'
                },
                { icon:'📊', text:`${REPORT_FREQUENCIES.find(f => f.id === reportFreq)?.label} 자동 보고서 (PDF 자동 생성)` },
                { icon:'📁', text:'분쟁 시 자금 흐름 + 메시지 + 계약서 통합 증거' },
              ].map((item, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'flex-start', gap:'8px',
                  fontSize:'11px', color:'#2D6BB0', lineHeight:1.55,
                }}>
                  <span style={{ fontSize:'13px', flexShrink:0, lineHeight:1.4 }}>
                    {item.icon}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 노란 경고 — 사기/유사수신 */}
          <div style={{
            background:'#FFFBEB',
            border:`1px solid #FDE68A`,
            borderRadius: RADIUS.md,
            padding:'12px 14px',
          }}>
            <div style={{
              display:'flex', alignItems:'flex-start', gap:'8px',
              fontSize:'11px', color:'#854F0B', lineHeight:1.6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:'1px' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <strong style={{ color:'#92400E' }}>"원금 보장" / "확정 수익률" 표현 자동 차단</strong><br />
                투자는 원금 손실 가능성이 있으며, 자본시장법상 본인 책임이에요. 주다페이는 자금 흐름과 사용처 통제만 담당합니다.
              </div>
            </div>
          </div>
        </div>

        {/* 하단 고정 — 최종 다음 버튼 */}
        <div style={{
          position:'sticky', bottom:0, left:0, right:0,
          background: COLORS.bg,
          padding:'12px 16px 16px',
          borderTop:`1px solid ${COLORS.borderSoft}`,
        }}>
          <button onClick={() => setStep(3)}
            style={{
              width:'100%',
              padding:'16px 0',
              background: GRADIENTS.brand,
              color:'#fff',
              border:'none',
              borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor:'pointer',
              fontFamily:'inherit',
              boxShadow: SHADOWS.buttonBrand,
              transition:'all 0.15s',
            }}>
            다음 (확인)
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ───────────── 3단계: 확인 ─────────────
  if (step === 3) {
    const investTypeLabel = INVESTMENT_TYPES.find(t => t.id === investType)?.label
    const periodLabel = period === 'open'
      ? `${customPeriod || '?'}년`
      : CONTRACT_PERIODS.find(p => p.id === period)?.label
    const reportLabel = REPORT_FREQUENCIES.find(f => f.id === reportFreq)?.label
    const selectedCats = FUND_USE_CATEGORIES.filter(c => selectedCategories.includes(c.id))

    // 형태별 보조 정보
    const typeSubInfo = (() => {
      if (investType === 'equity' && equityPct) return `지분 ${equityPct}%`
      if (investType === 'lend' && interestRate) return `연 ${interestRate}%`
      if (investType === 'profit' && profitShare) return `${profitShare}% / 분기`
      return null
    })()

    return (
      <ConfirmStep
        smallTitle="집행 내용 확인"
        step={3} totalSteps={3}
        bigAmount={`${numAmount.toLocaleString()}원`}
        sub={`${recipient?.name || '받는 분'}에 투자 · 권한 자금`}
        onBack={goBack}
        rows={[
          {
            label:'받는 사람',
            value: recipient?.name || '㈜오로라',
            sub:'사업자 ✓',
            editAction: () => navigate(-1),
          },
          {
            label:'출금 지갑',
            value: selectedWallet?.label || 'MY 지갑',
            sub:`잔액 ${walletBalance.toLocaleString()}원`,
            editAction: () => setStep(1),
          },
          {
            label:'투자 형태',
            value: investTypeLabel,
            sub: typeSubInfo,
            editStep: 1,
            editAction: () => setStep(1),
          },
          {
            label:'계약 기간',
            value: periodLabel,
            editStep: 1,
            editAction: () => setStep(1),
          },
          {
            label:'보고 주기',
            value: reportLabel,
            sub:'PDF 자동 발송',
            editStep: 1,
            editAction: () => setStep(1),
          },
          {
            label:'사용 통제',
            value: blockedCount > 0 ? `${blockedCount}개 카테고리 차단` : '제한 없음',
            sub: blockedCount > 0 ? mccItems.filter(m => m.block).map(m => m.label).join(', ') : null,
            editStep: 2,
            editAction: () => setStep(2),
          },
          {
            label:'1회 결제 한도',
            value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음',
            editStep: 2,
            editAction: () => setStep(2),
          },
          ...(contractFile ? [{
            label:'정식 계약서',
            value: contractFile.name,
            sub:`${contractFile.size} · ${contractFile.pages}p · 5년 보관`,
          }] : []),
        ]}
        autoActions={[
          '투자 계약서 양측 서명 후 권한 자금 즉시 입금',
          'MCC 차단 + 자금 사용처 자동 추적 활성',
          `${reportLabel} 자동 PDF 보고서 발송`,
          '분쟁 시 자금 흐름 + 메시지 + 계약서 통합 증거 보관 (5년)',
        ]}
        footerNote={
          <>
            집행 후 {selectedWallet?.label || 'MY 지갑'} 잔액 {walletBalance.toLocaleString()}원 →{' '}
            <strong>{(walletBalance - numAmount).toLocaleString()}원</strong> · 수수료 0원
          </>
        }
        primaryLabel="집행하기"
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(1)}
      >
        {/* 메뉴별 특수 시각화 — 자금 사용 목적 카테고리 칩 */}
        {selectedCats.length > 0 && (
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
          }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:'10px',
            }}>
              <span style={{ fontSize:'12px', color: COLORS.t4 }}>
                자금 사용 목적
              </span>
              <button onClick={() => setStep(1)}
                style={{
                  fontSize:'11px', fontWeight:600,
                  color: theme.brand,
                  background:'none', border:'none',
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                수정
              </button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
              {selectedCats.map(c => (
                <span key={c.id} style={{
                  display:'inline-flex', alignItems:'center', gap:'5px',
                  padding:'4px 9px',
                  background: `${c.color}15`,
                  border: `1px solid ${c.color}40`,
                  color: c.color,
                  borderRadius: RADIUS.pill,
                  fontSize:'11px', fontWeight:700,
                }}>
                  <span style={{ fontSize:'12px' }}>{c.emoji}</span>
                  {c.label}
                </span>
              ))}
            </div>
            <div style={{
              marginTop:'8px',
              paddingTop:'8px',
              borderTop:`1px solid ${COLORS.borderSoft}`,
              fontSize:'10px', color: COLORS.t4, lineHeight:1.5,
            }}>
              계약서·정기 보고서에 기재됩니다
            </div>
          </div>
        )}
      </ConfirmStep>
    )
  }

  // ───────────── PIN (6단계) ─────────────
  const pushToStore = () => {
    const verified = recipient?.verified !== false   // 사업자는 기본 verified
    const dealStatus = !verified ? 'waiting' : 'signing'
    const statusLabel = !verified ? '외부링크 인증 대기' : '상대방 서명 대기'

    // 투자 유형별 reason + 라벨
    const typeMeta = INVESTMENT_TYPES.find(t => t.id === investType) || { label: '투자' }
    let reasonExtra = ''
    if (investType === 'equity') reasonExtra = ` · 지분 ${equityPct}%`
    else if (investType === 'lend') reasonExtra = ` · 연 ${interestRate}%`
    else if (investType === 'cb') reasonExtra = ` · CB ${interestRate}%`
    else if (investType === 'profit') reasonExtra = ` · 수익 ${profitShare}%`

    // 사용 목적 라벨
    const categoriesLabels = selectedCategories
      .map(id => FUND_USE_CATEGORIES.find(c => c.id === id))
      .filter(Boolean)
      .map(c => c.label)

    // MCC 차단 항목
    const blockedMcc = mccItems.filter(m => m.block)
    const blockedMccLabels = blockedMcc.map(m => m.label)

    // 계약 기간 라벨
    const periodLabel = (() => {
      if (period === 'custom' && customPeriod) return `${customPeriod}년`
      const map = { '1y':'1년', '2y':'2년', '3y':'3년', '5y':'5년' }
      return map[period] || '3년'
    })()

    // 보고 주기 라벨
    const reportLabel = (() => {
      const map = { monthly:'매월', quarterly:'분기', yearly:'연간', none:'보고 없음' }
      return map[reportFreq] || '매월'
    })()

    // 풍부 마일스톤 — 서명 → 지급 → 보고 → 만기 (유형별 분기)
    const milestones = [
      {
        id: 'm1',
        label: '투자 계약서 양측 서명',
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: verified
          ? '발주자 + 피투자자 양측 전자서명 완료 시 다음 단계'
          : '미가입 사업자는 외부링크 인증 후 서명 가능',
      },
      {
        id: 'm2',
        label: '투자금 지급',
        amount: numAmount,
        status: 'pending',
        date: null,
        action: null,
        note: `서명 완료 즉시 ${recipient?.name} 계좌로 자동 입금`,
      },
      // 보고형 (모든 유형 공통, reportFreq !== 'none' 일 때)
      ...(reportFreq !== 'none' ? [{
        id: 'm3',
        label: `${reportLabel} 자금 사용 보고서`,
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: `${reportLabel} 자동 생성 + PDF 발송 (사용 내역 + 카테고리별 집행)`,
      }] : []),
      // 사채 — 이자 자동 인식
      ...(investType === 'lend' ? [{
        id: 'm4',
        label: `매분기 이자 자동 인식 (연 ${interestRate}%)`,
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: '매 분기말 이자수익 자동 분개',
      }] : []),
      // 수익 분배
      ...(investType === 'profit' ? [{
        id: 'm4',
        label: `분기별 수익 ${profitShare}% 분배`,
        amount: 0,
        status: 'pending',
        date: null,
        action: null,
        note: '피투자자 분기 결산 시 수익 자동 송금',
      }] : []),
      // 만기/회수 단계 (유형별)
      {
        id: 'm5',
        label: investType === 'equity'
          ? '지분 매각 시 처분 손익'
          : investType === 'lend'
            ? `만기 원금 + 이자 회수 (${periodLabel} 후)`
            : investType === 'cb'
              ? `만기 원금 회수 또는 주식 전환 (${periodLabel} 후)`
              : `계약 종료 (${periodLabel} 후)`,
        amount: (investType === 'equity' || investType === 'profit') ? 0 : numAmount,
        status: 'pending',
        date: null,
        action: null,
        note: investType === 'equity'
          ? '엑싯(매각·IPO) 시 자동 처분 손익 분개'
          : investType === 'lend'
            ? `만기일 ${recipient?.name} 계좌에서 자동 출금 (원금 + 이자)`
            : investType === 'cb'
              ? '만기 시 원금 회수 또는 주식으로 전환 (옵션 행사)'
              : '계약 기간 종료 + 정산',
        conditions: investType === 'lend' || investType === 'cb' ? [
          { label: '만기일 도래', done: false, sub: `${periodLabel} 후` },
          { label: `${recipient?.name} 계좌 잔액 충분`, done: false, sub: '잔액 부족 시 통지 + 연체이자' },
          { label: '회수 완료 + 회계 처리', done: false, sub: '투자 자산 → 현금 + 손익' },
        ] : undefined,
      },
    ]

    // 활동 타임라인
    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient?.name}에게 ${typeMeta.label} 계약서 발송`, type: 'event' },
      ...(reportFreq !== 'none' ? [{ time: '다음 정기일', label: `첫 ${reportLabel} 보고서 자동 생성 예정`, type: 'pending' }] : []),
    ]

    // 안전 장치 (유형별 + 공통)
    const safety = [
      '투자 자산 등록 + 자기자본법 회계 처리',
      ...(investType === 'equity' ? [
        '분기별 평가 손익 자동 인식',
        '매각 시 처분 손익 자동 반영',
      ] : []),
      ...(investType === 'lend' ? [
        '분기별 이자수익 자동 분개',
        '만기 자동 회수 + 회계 처리',
      ] : []),
      ...(investType === 'cb' ? [
        '전환 시 주식 등록 자동 처리',
        '만기 시 원금 자동 회수',
      ] : []),
      ...(investType === 'profit' ? [
        '분기별 수익 분배 자동 송금',
        '미분배 시 자동 알림 + 증거 보관',
      ] : []),
      ...(reportFreq !== 'none' ? [`${reportLabel} 사용 보고서 PDF 자동 생성`] : []),
      ...(blockedMcc.length > 0 ? [`MCC 차단 ${blockedMcc.length}개: ${blockedMccLabels.slice(0, 3).join(', ')}${blockedMcc.length > 3 ? ' 외' : ''}`] : []),
      '분쟁 시 계약서 + 자금 흐름 + 사용 내역 자동 증거',
    ]

    // 카테고리 데이터 (자금 사용 목적별 한도 시뮬)
    const categories = selectedCategories.length > 0
      ? selectedCategories.map(id => {
          const cat = FUND_USE_CATEGORIES.find(c => c.id === id)
          if (!cat) return null
          // 균등 분할 (실제는 사용자 입력)
          const pct = Math.round(100 / selectedCategories.length)
          return {
            label: cat.label,
            pct,
            amount: Math.round(numAmount * pct / 100),
            used: 0,
          }
        }).filter(Boolean)
      : null

    // 계약서 파일명 (사용자가 첨부한 게 있으면 그 이름, 없으면 자동)
    const safeName = (recipient?.name || '').replace(/[^\w가-힣]/g, '_')
    const generatedContractFile = contractFile?.name
      || `${typeMeta.label}계약서_${safeName}.pdf`

    // 거래 설명
    let dealDescription = `${typeMeta.label} · ${periodLabel} · ${reportLabel} 보고`
    if (investType === 'equity') dealDescription = `지분 ${equityPct}% 취득 · ${periodLabel} · ${reportLabel} 보고`
    else if (investType === 'lend') dealDescription = `대여 · 연 ${interestRate}% · ${periodLabel} 만기`
    else if (investType === 'cb') dealDescription = `CB · 연 ${interestRate}% · ${periodLabel} 만기/전환`
    else if (investType === 'profit') dealDescription = `수익 ${profitShare}% 분배 · ${periodLabel}`

    addTransaction({
      type: 'invest',
      fromUserId: 'me_juda_kim',
      fromUserName: '김주다',
      fromUserType: 'personal',
      recipient: { ...recipient, isBusiness: true, verified },
      amount: numAmount,
      whtAmount: 0,
      netAmount: numAmount,
      reason: `기업 ${typeMeta.label}${reasonExtra}`,
      walletId,
      walletLabel: selectedWallet?.label || 'MY 지갑',
      payDateMode: 'immediate',
      // 거래형 (풀 풍부)
      dealTitle: `${recipient?.name || '기업'} ${typeMeta.label}`,
      dealDescription,
      contractDocId: `IB_${Date.now()}`,
      contractExpires: null,
      contractSigned: false,
      contractFile: generatedContractFile,
      milestones,
      timeline,
      safety,
      dealStatus,
      statusLabel,
      myAction: null,
      // 투자 메타 (풍부)
      investMeta: {
        type: investType,
        typeLabel: typeMeta.label,
        equityPct: investType === 'equity' ? equityPct : null,
        interestRate: (investType === 'lend' || investType === 'cb') ? interestRate : null,
        profitShare: investType === 'profit' ? profitShare : null,
        period: periodLabel,
        reportFreq: reportLabel,
        categories,                          // 자금 사용 목적 (라벨 + 한도)
        blockedMcc: blockedMccLabels,        // MCC 차단 항목
        userContractFile: contractFile?.name || null,   // 사용자가 첨부한 정식 계약서
      },
    })
  }

  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient?.name || '받는 분'}에 투자`}
      summaryRight={`${numAmount.toLocaleString()}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
    />
  )

  // ───────────── 완료 (7단계) — 서명 대기 ─────────────
  if (step === 'done') {
    const investTypeLabel = INVESTMENT_TYPES.find(t => t.id === investType)?.label
    const reportLabel = REPORT_FREQUENCIES.find(f => f.id === reportFreq)?.label
    const periodLabel = period === 'open'
      ? `${customPeriod || '?'}년`
      : CONTRACT_PERIODS.find(p => p.id === period)?.label
    const recipientName = recipient?.name || '㈜오로라'

    return (
      <DoneStep
        tone="waiting"
        title={`${recipientName} 동의 대기 중`}
        description={
          <>
            {recipientName}에게 투자 계약서 SMS가 발송됐어요.<br />
            양측 서명 완료 시{' '}
            <strong style={{ color:'#FCD34D' }}>{numAmount.toLocaleString()}원</strong>이 입금돼요.
          </>
        }
        summary={[
          { label:'투자 금액', value:`${numAmount.toLocaleString()}원`, accent:true },
          { label:'투자 형태', value: investTypeLabel },
          { label:'계약 기간', value: periodLabel },
          { label:'보고 주기', value: reportLabel },
          { label:'MCC 차단', value: blockedCount > 0 ? `${blockedCount}개 카테고리` : '제한 없음' },
        ]}
        noteYellow={`3일 내 ${recipientName} 미서명 시 자동 취소 · 알림센터 + 메시지에서 진행 상태 확인 가능`}
        primaryLabel="홈으로"
        onPrimary={() => navigate('/home')}
        secondaryLabel={`${recipientName}과 대화하기`}
        onSecondary={() => navigate('/messages')}
        timestamp="2026.05.06 · 09:41"
      />
    )
  }

  return null
}
