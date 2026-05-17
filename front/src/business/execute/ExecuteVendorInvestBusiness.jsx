import { useState, useEffect, useRef } from 'react'
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

const INVESTMENT_TYPES = [
  { id:'equity', label:'지분 투자',  sub:'보통주·우선주 취득',   icon:'📈' },
  { id:'cb',     label:'CB / SAFE',  sub:'전환사채·SAFE 계약',   icon:'🔄' },
  { id:'lend',   label:'단순 대여',  sub:'원금 회수 + 이자',     icon:'💳' },
  { id:'profit', label:'수익 분배',  sub:'프로젝트 수익 % 분배', icon:'💰' },
]

const FUND_USE_CATEGORIES = [
  { id:'salary',  label:'인건비',       sub:'급여·4대보험·퇴직금',    emoji:'👥', color:'#10B981' },
  { id:'mktg',    label:'마케팅비',     sub:'광고·홍보·콘텐츠 제작',  emoji:'📣', color:'#F59E0B' },
  { id:'equip',   label:'장비·인프라',  sub:'서버·노트북·소프트웨어', emoji:'💻', color:'#7C3AED' },
  { id:'office',  label:'사무실 운영비',sub:'임대료·관리비·공과금',    emoji:'🏢', color:'#3B82F6' },
  { id:'rnd',     label:'연구개발(R&D)',sub:'프로토타입·실험·외주개발',emoji:'🔬', color:'#0EA5E9' },
  { id:'legal',   label:'법무·회계',   sub:'법무자문·회계·세무',      emoji:'⚖️', color:'#6B7280' },
]

const CONTRACT_PERIODS = [
  { id:'1y',    label:'1년' },
  { id:'2y',    label:'2년' },
  { id:'3y',    label:'3년', recommended:true },
  { id:'5y',    label:'5년' },
  { id:'open',  label:'제한 없음' },
  { id:'custom',label:'직접 입력' },
]

const REPORT_FREQUENCIES = [
  { id:'monthly',   label:'매월',   sub:'월간 사용 내역 + 알림' },
  { id:'quarterly', label:'분기',   sub:'PDF 보고서 자동 생성', recommended:true },
  { id:'annual',    label:'연간',   sub:'연간 결산 보고서' },
  { id:'none',      label:'보고 없음', sub:'계약서만 보관' },
]

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString('ko-KR') }
function fmtValuation(n) {
  if (!n || n < 100000000) return `${fmt(n)}원`
  const eok = n / 100000000
  return eok >= 10 ? `${eok.toFixed(0)}억원` : `${eok.toFixed(2)}억원`
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
export default function ExecuteVendorInvestBusiness() {
  const navigate = useNavigate()
  const location = useLocation()
  const recipient = location.state?.recipient || location.state?.recipients?.[0]
  const theme = getAccountTheme()
  const t = useT()
  const fileRef = useRef()

  useEffect(() => {
    if (!recipient) {
      navigate('/execute/business/select-vendor?menu=vendorInvest', { replace: true })
    }
  }, [recipient, navigate])

  const [step, setStep] = useState(1)

  // Step 1 state
  const [walletId, setWalletId] = useState('my')
  const [amount, setAmount] = useState('')
  const [investType, setInvestType] = useState(null)
  const [equity, setEquity] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [profitShare, setProfitShare] = useState('')
  const [investTitle, setInvestTitle] = useState('')
  const [memo, setMemo] = useState('')

  // Step 2 state
  const [period, setPeriod] = useState('3y')
  const [customPeriod, setCustomPeriod] = useState('')
  const [reportFreq, setReportFreq] = useState('quarterly')

  // Step 3 state
  const [selectedCategories, setSelectedCategories] = useState([])
  const [mccItems, setMccItems] = useState(DEFAULT_MCC)
  const [singleLimit, setSingleLimit] = useState(null)
  const [contractFile, setContractFile] = useState(null)

  if (!recipient) return null

  const selectedWallet = getWalletById(walletId)
  const walletBalance = selectedWallet?.amount ?? CORP_BALANCE_FALLBACK
  const walletLabel = selectedWallet?.label || '법인 자금'

  const amtNum = parseInt(amount) || 0
  const equityNum = parseFloat(equity) || 0
  const interestNum = parseFloat(interestRate) || 0
  const profitNum = parseFloat(profitShare) || 0
  const valuation = (amtNum > 0 && equityNum > 0)
    ? Math.round(amtNum / (equityNum / 100)) : 0

  const typeMeta = INVESTMENT_TYPES.find(tp => tp.id === investType)

  const canStep1 = amtNum > 0 && amtNum <= walletBalance && investType !== null
    && (investType !== 'equity' || equityNum > 0)
    && (investType !== 'profit' || profitNum > 0)

  const periodLabel = (() => {
    if (period === 'custom' && customPeriod) return `${customPeriod}년`
    if (period === 'open') return '보유 제한 없음'
    const map = { '1y':'1년', '2y':'2년', '3y':'3년', '5y':'5년' }
    return map[period] || '3년'
  })()

  const reportLabel = REPORT_FREQUENCIES.find(r => r.id === reportFreq)?.label || '분기'
  const blockedMcc = mccItems.filter(m => m.block)

  const dealTitle = investTitle.trim()
    ? `${recipient.name} ${investTitle.trim()}`
    : `${recipient.name} ${typeMeta?.label || '투자'}`

  const changeRecipient = () => navigate('/execute/business/select-vendor?menu=vendorInvest')

  const goBack = () => {
    if (step === 1) navigate(-1)
    else if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 'confirm') setStep(3)
    else if (step === 'pin') setStep('confirm')
  }
  useStepHistory(goBack, step === 1, !!recipient)

  // ─── 풍부 push ─────────────────────────────────────────
  const pushToStore = () => {
    const verified = recipient?.verified !== false
    const dealStatus = !verified ? 'waiting' : 'signing'
    const statusLabel = !verified ? '외부링크 인증 대기' : '상대방 서명 대기'

    const categoriesData = selectedCategories.length > 0
      ? selectedCategories.map(id => {
          const cat = FUND_USE_CATEGORIES.find(c => c.id === id)
          return cat ? { label: cat.label, emoji: cat.emoji, sub: cat.sub } : null
        }).filter(Boolean)
      : null

    const blockedMccLabels = blockedMcc.map(m => m.label)

    const milestones = [
      {
        id: 'm1', label: '투자 계약서 양측 서명', amount: 0,
        status: 'pending', date: null, action: null,
        note: verified
          ? `㈜주다컴퍼니 + ${recipient.name} 양측 전자서명 완료 시 다음 단계`
          : '미가입 사업자는 외부링크 인증 후 서명 가능',
      },
      {
        id: 'm2', label: '투자금 입금', amount: amtNum,
        status: 'pending', date: null, action: null,
        note: `서명 완료 즉시 ${recipient.name} 계좌로 자동 입금`,
      },
      ...(reportFreq !== 'none' ? [{
        id: 'm3', label: `${reportLabel} 자금 사용 보고서`, amount: 0,
        status: 'pending', date: null, action: null,
        note: `${reportLabel} 자동 생성 + PDF 발송`,
      }] : []),
      ...(investType === 'lend' ? [{
        id: 'm4', label: `매분기 이자 자동 인식 (연 ${interestRate}%)`, amount: 0,
        status: 'pending', date: null, action: null,
        note: '매 분기말 이자수익 자동 분개 + 세무사 전송',
      }] : []),
      ...(investType === 'profit' ? [{
        id: 'm4', label: `분기별 수익 ${profitShare}% 분배`, amount: 0,
        status: 'pending', date: null, action: null,
        note: '피투자자 분기 결산 시 수익 자동 송금',
      }] : []),
      {
        id: 'm5',
        label: investType === 'equity' ? '지분 매각 시 처분 손익'
          : investType === 'lend' ? `만기 원금 + 이자 회수 (${periodLabel} 후)`
          : investType === 'cb' ? `만기 원금 회수 또는 주식 전환 (${periodLabel} 후)`
          : `계약 종료 (${periodLabel})`,
        amount: (investType === 'equity' || investType === 'profit') ? 0 : amtNum,
        status: 'pending', date: null, action: null,
        note: investType === 'equity' ? '엑싯(매각·IPO) 시 처분 손익 자동 반영'
          : investType === 'lend' ? `만기일 ${recipient.name} 계좌에서 자동 출금`
          : investType === 'cb' ? '만기 시 원금 회수 또는 주식 전환'
          : '계약 기간 종료 + 정산',
        conditions: (investType === 'lend' || investType === 'cb') ? [
          { label: '만기일 도래', done: false, sub: `${periodLabel} 후` },
          { label: `${recipient.name} 계좌 잔액 충분`, done: false, sub: '잔액 부족 시 통지 + 연체이자' },
          { label: '회수 완료 + 회계 처리', done: false, sub: '투자 자산 → 현금 + 손익' },
        ] : undefined,
      },
    ]

    const nowStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    })()

    const timeline = [
      { time: nowStr, label: `${recipient.name}에게 ${typeMeta?.label} 계약서 발송`, type: 'event' },
      ...(reportFreq !== 'none' ? [{ time: '다음 정기일', label: `첫 ${reportLabel} 보고서 자동 생성 예정`, type: 'pending' }] : []),
    ]

    const safety = [
      '투자 자산 등록 + 자기자본법 회계 처리',
      ...(investType === 'equity' ? ['분기별 평가 손익 자동 인식 + 세무사 전송', '매각 시 처분 손익 자동 반영'] : []),
      ...(investType === 'lend' ? ['분기별 이자수익 자동 분개', '만기 자동 회수 + 회계 처리'] : []),
      ...(investType === 'cb' ? ['전환 시 주식 등록 자동 처리', '만기 시 원금 자동 회수'] : []),
      ...(investType === 'profit' ? ['분기별 수익 분배 자동 송금', '미분배 시 자동 알림 + 증거 보관'] : []),
      ...(reportFreq !== 'none' ? [`${reportLabel} 사용 보고서 PDF 자동 생성`] : []),
      ...(blockedMcc.length > 0 ? [`MCC 차단 ${blockedMcc.length}개: ${blockedMccLabels.slice(0,3).join(', ')}${blockedMcc.length > 3 ? ' 외' : ''}`] : []),
      '증빙 자동 보관 (5년) + 세무사 자동 전송',
      '분쟁 시 계약서 + 자금 흐름 자동 증거',
    ]

    const safeName = recipient.name.replace(/[^\w가-힣]/g, '_')
    const generatedContractFile = contractFile?.name
      || `${typeMeta?.label}계약서_${safeName}${investTitle.trim() ? `_${investTitle.trim().replace(/\s/g,'_')}` : ''}.pdf`

    let dealDescription = typeMeta?.label || '투자'
    if (investType === 'equity') dealDescription = `지분 ${equityNum}% 취득 · 회사 가치 ${fmtValuation(valuation)} · ${periodLabel} · ${reportLabel} 보고`
    else if (investType === 'lend') dealDescription = `대여 · 연 ${interestRate}% · ${periodLabel} 만기`
    else if (investType === 'cb') dealDescription = `CB · 연 ${interestRate}% · ${periodLabel} 만기/전환`
    else if (investType === 'profit') dealDescription = `수익 ${profitShare}% 분배 · ${periodLabel}`

    addTransaction({
      type: 'invest',
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient: { ...recipient, verified },
      amount: amtNum,
      whtAmount: 0,
      netAmount: amtNum,
      reason: `${typeMeta?.label} · ${recipient.name}${investTitle.trim() ? ` · ${investTitle.trim()}` : ''}`,
      walletId,
      walletLabel,
      payDateMode: 'immediate',
      dealTitle,
      dealDescription,
      contractDocId: `IV_${Date.now()}`,
      contractExpires: null,
      contractSigned: false,
      contractFile: generatedContractFile,
      milestones,
      timeline,
      safety,
      dealStatus,
      statusLabel,
      myAction: null,
      investMeta: {
        type: investType,
        typeLabel: typeMeta?.label,
        equityPct: investType === 'equity' ? equityNum : null,
        valuation: investType === 'equity' && valuation > 0 ? fmtValuation(valuation) : null,
        interestRate: (investType === 'lend' || investType === 'cb') ? interestNum : null,
        profitShare: investType === 'profit' ? profitNum : null,
        period: periodLabel,
        reportFreq: reportLabel,
        categories: categoriesData,
        blockedMcc: blockedMccLabels,
        userContractFile: contractFile?.name || null,
        ...(memo.trim() ? { memo: memo.trim() } : {}),
        ...(investTitle.trim() ? { investTitle: investTitle.trim() } : {}),
      },
    })
  }

  // ─── Step 1: 기본 정보 ─────────────────────────────────
  if (step === 1) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle="B2B 투자"
          step={1} totalSteps={3}
          bigTitle="투자 기본 정보"
          sub="투자 유형 + 금액 설정"
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 투자 대상 카드 */}
          <div style={{
            background: COLORS.bgCard, boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg, padding:'12px 14px',
            display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px',
          }}>
            <div style={{
              width:'36px', height:'36px', borderRadius:'10px',
              background: recipient.avatarBg || '#F2EFE9',
              color: recipient.avatarFg || '#555550',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:700, flexShrink:0,
            }}>
              {recipient.initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'2px' }}>투자 대상 사업자</div>
              <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {recipient.name}
                {recipient.brn && <span style={{ fontSize:'11px', color: COLORS.t4, fontWeight:500, marginLeft:'4px' }}>· {recipient.brn}</span>}
              </div>
              {recipient.ceo && <div style={{ fontSize:'10px', color: COLORS.t5, marginTop:'1px' }}>대표 {recipient.ceo}</div>}
            </div>
            <button onClick={changeRecipient} style={{ fontSize:'12px', fontWeight:600, color: theme.brandDark, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>변경</button>
          </div>

          {/* 투자 유형 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
              투자 유형 <span style={{ color:'#DC2626' }}>*</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {INVESTMENT_TYPES.map(type => {
                const active = investType === type.id
                return (
                  <button key={type.id} onClick={() => setInvestType(type.id)}
                    style={{
                      padding:'12px 14px', textAlign:'left',
                      background: active ? `${theme.brandDark}10` : COLORS.bgCard,
                      border:`1.5px solid ${active ? theme.brandDark : COLORS.border}`,
                      borderRadius: RADIUS.lg, cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.card,
                    }}>
                    <div style={{ fontSize:'16px', marginBottom:'4px' }}>{type.icon}</div>
                    <div style={{ fontSize:'12px', fontWeight:700, color: active ? theme.brandDark : COLORS.t1, marginBottom:'2px' }}>{type.label}</div>
                    <div style={{ fontSize:'10px', color: COLORS.t4, lineHeight:1.4 }}>{type.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 출금 지갑 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>출금 지갑</div>
            <WalletPicker executeType="freelance" selectedId={walletId} onChange={(w) => setWalletId(w.id)} />
          </div>

          {/* 투자 금액 */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>투자 금액</div>
            <div style={{ background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding:'14px 16px' }}>
              <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="금액 입력"
                style={{ width:'100%', height:'40px', fontSize:'24px', fontWeight:700, color: COLORS.t1, border:'none', outline:'none', background:'transparent', fontFamily:'inherit', WebkitAppearance:'none', MozAppearance:'textfield' }} />
            </div>
          </div>

          {/* 유형별 추가 입력 */}
          {investType === 'equity' && (
            <>
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>지분율</div>
                <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'8px', padding:'0 4px' }}>취득 지분율 (%)</div>
                <div style={{ background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding:'12px 16px', display:'flex', alignItems:'center', gap:'8px', overflow:'hidden' }}>
                  <input type="number" inputMode="decimal" value={equity} onChange={e => setEquity(e.target.value)}
                    placeholder="예: 10" step="0.1" max="100"
                    style={{ flex:1, minWidth:0, fontSize:'18px', fontWeight:700, color: COLORS.t1, border:'none', outline:'none', background:'transparent', fontFamily:'inherit', WebkitAppearance:'none', MozAppearance:'textfield' }} />
                  <span style={{ fontSize:'14px', color: COLORS.t3, fontWeight:600, flexShrink:0 }}>%</span>
                </div>
              </div>
              {valuation > 0 && (
                <div style={{ marginBottom:'14px' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>회사 가치 (자동 계산)</div>
                  <div style={{ background:'#ECFDF5', border:'1px dashed #6EE7B7', borderRadius: RADIUS.lg, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'12px', color:'#065F46', fontWeight:600 }}>평가 가치</span>
                    <span style={{ fontSize:'18px', color:'#065F46', fontWeight:700 }}>{fmtValuation(valuation)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {(investType === 'lend' || investType === 'cb') && (
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>
                {investType === 'cb' ? 'CB 이자율 (연 %)' : '이자율 (연 %)'}
              </div>
              <div style={{ background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding:'12px 16px', display:'flex', alignItems:'center', gap:'8px', overflow:'hidden' }}>
                <input type="number" inputMode="decimal" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                  placeholder="예: 6.0" step="0.1"
                  style={{ flex:1, minWidth:0, fontSize:'18px', fontWeight:700, color: COLORS.t1, border:'none', outline:'none', background:'transparent', fontFamily:'inherit', WebkitAppearance:'none', MozAppearance:'textfield' }} />
                <span style={{ fontSize:'14px', color: COLORS.t3, fontWeight:600, flexShrink:0 }}>% /년</span>
              </div>
            </div>
          )}

          {investType === 'profit' && (
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>수익 분배율 (%)</div>
              <div style={{ background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding:'12px 16px', display:'flex', alignItems:'center', gap:'8px', overflow:'hidden' }}>
                <input type="number" inputMode="decimal" value={profitShare} onChange={e => setProfitShare(e.target.value)}
                  placeholder="예: 30" step="1" max="100"
                  style={{ flex:1, minWidth:0, fontSize:'18px', fontWeight:700, color: COLORS.t1, border:'none', outline:'none', background:'transparent', fontFamily:'inherit', WebkitAppearance:'none', MozAppearance:'textfield' }} />
                <span style={{ fontSize:'14px', color: COLORS.t3, fontWeight:600, flexShrink:0 }}>%</span>
              </div>
            </div>
          )}

          {/* 투자 명목 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>투자 명목 (선택)</div>
            <input type="text" value={investTitle} onChange={e => setInvestTitle(e.target.value)}
              placeholder="예: 시리즈 A, 전략적 투자, 운전자금 대여"
              style={{ width:'100%', height:'46px', padding:'0 14px', background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, fontSize:'13px', color: COLORS.t1, fontFamily:'inherit', outline:'none' }} />
          </div>

          {/* 투자 사유 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>투자 사유 (선택)</div>
            <textarea value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="투자 목적과 기대 효과"
              rows={3}
              style={{ width:'100%', padding:'12px 14px', background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, fontSize:'13px', color: COLORS.t1, fontFamily:'inherit', outline:'none', resize:'vertical', minHeight:'60px' }} />
          </div>

          {/* 회계 안내 */}
          <div style={{ background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius: RADIUS.lg, padding:'12px 14px', display:'flex', gap:'10px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'#10B981', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>📈</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#065F46', marginBottom:'4px' }}>투자 자산 회계 처리 안내</div>
              <div style={{ fontSize:'11px', color:'#047857', lineHeight:1.6 }}>
                투자 자산(자기자본법)으로 회계 처리됩니다. 분기별 평가 손익이 인식되며, 매각·만기 시 처분 손익이 반영됩니다.
              </div>
            </div>
          </div>

        </div>

        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard }}>
          <button onClick={() => canStep1 && setStep(2)} disabled={!canStep1}
            style={{ width:'100%', height:'52px', background: canStep1 ? theme.brandDark : COLORS.bgMuted, color: canStep1 ? '#fff' : COLORS.t5, border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor: canStep1 ? 'pointer' : 'not-allowed', fontFamily:'inherit', boxShadow: canStep1 ? SHADOWS.card : 'none' }}>
            다음 — 계약 기간 설정
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ─── Step 2: 계약 기간 + 보고 주기 ─────────────────────
  if (step === 2) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle="B2B 투자"
          step={2} totalSteps={3}
          bigTitle="계약 기간 · 보고"
          sub="투자 기간과 정기 보고 주기 설정"
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 계약 기간 */}
          <div style={{ marginBottom:'22px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px', padding:'0 4px' }}>계약 기간</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'8px' }}>
              {CONTRACT_PERIODS.map(p => {
                const active = period === p.id
                return (
                  <button key={p.id} onClick={() => setPeriod(p.id)}
                    style={{ padding:'10px 6px', textAlign:'center', background: active ? `${theme.brandDark}12` : COLORS.bgCard, border:`1.5px solid ${active ? theme.brandDark : COLORS.border}`, borderRadius: RADIUS.md, cursor:'pointer', fontFamily:'inherit' }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color: active ? theme.brandDark : COLORS.t1 }}>{p.label}</div>
                    {p.recommended && <div style={{ fontSize:'9px', color:'#10B981', fontWeight:600, marginTop:'2px' }}>추천</div>}
                  </button>
                )
              })}
            </div>
            {period === 'custom' && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', background: COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding:'12px 14px' }}>
                <input type="number" inputMode="numeric" value={customPeriod} onChange={e => setCustomPeriod(e.target.value)}
                  placeholder="기간"
                  style={{ flex:1, fontSize:'18px', fontWeight:700, color: COLORS.t1, border:'none', outline:'none', background:'transparent', fontFamily:'inherit', WebkitAppearance:'none' }} />
                <span style={{ fontSize:'13px', color: COLORS.t3, fontWeight:600 }}>년</span>
              </div>
            )}
          </div>

          {/* 보고 주기 */}
          <div style={{ marginBottom:'22px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>정기 보고 주기</div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'10px', padding:'0 4px' }}>계약서·보고서에 기재 · PDF 자동 발송</div>
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, overflow:'hidden' }}>
              {REPORT_FREQUENCIES.map((r, i) => {
                const active = reportFreq === r.id
                return (
                  <button key={r.id} onClick={() => setReportFreq(r.id)}
                    style={{ width:'100%', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', background: active ? `${theme.brandDark}08` : 'transparent', border:'none', borderBottom: i < REPORT_FREQUENCIES.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`1.5px solid ${active ? theme.brandDark : COLORS.t5}`, background: active ? theme.brandDark : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {active && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#fff' }} />}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color: active ? theme.brandDark : COLORS.t1 }}>{r.label}</span>
                        {r.recommended && <span style={{ fontSize:'10px', color:'#10B981', fontWeight:700, padding:'1px 6px', background:'#ECFDF5', borderRadius:'4px' }}>추천</span>}
                      </div>
                      <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px' }}>{r.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard }}>
          <button onClick={() => setStep(3)}
            style={{ width:'100%', height:'52px', background: theme.brandDark, color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.card }}>
            다음 — 자금 통제 설정
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ─── Step 3: 자금 사용 목적 + MCC + 계약서 ─────────────
  if (step === 3) return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <DarkHeader
          smallTitle="B2B 투자"
          step={3} totalSteps={3}
          bigTitle="자금 통제 · 계약서"
          sub="자금 사용 목적 + MCC 차단 + 계약서 첨부"
          onBack={goBack}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        <div style={{ padding:'18px 16px 100px' }}>

          {/* 자금 사용 목적 */}
          <div style={{ marginBottom:'22px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>자금 사용 목적 (선택)</div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'10px', padding:'0 4px' }}>계약서·보고서에 기재 (다중 선택)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {FUND_USE_CATEGORIES.map(cat => {
                const selected = selectedCategories.includes(cat.id)
                return (
                  <button key={cat.id}
                    onClick={() => setSelectedCategories(prev =>
                      prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                    )}
                    style={{ padding:'12px', textAlign:'left', background: selected ? `${cat.color}12` : COLORS.bgCard, border:`1.5px solid ${selected ? cat.color : COLORS.border}`, borderRadius: RADIUS.lg, cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.card }}>
                    <div style={{ fontSize:'18px', marginBottom:'4px' }}>{cat.emoji}</div>
                    <div style={{ fontSize:'12px', fontWeight:700, color: selected ? cat.color : COLORS.t1, marginBottom:'2px' }}>{cat.label}</div>
                    <div style={{ fontSize:'10px', color: COLORS.t4, lineHeight:1.3 }}>{cat.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* MCC 차단 */}
          <div style={{ marginBottom:'22px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>MCC 사용 통제</div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'10px', padding:'0 4px' }}>차단 항목은 투자 자금으로 결제 불가</div>
            <MccBlock
              items={mccItems}
              onChange={setMccItems}
              singleLimit={singleLimit}
              onLimitChange={setSingleLimit}
            />
          </div>

          {/* 정식 계약서 첨부 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'4px', padding:'0 4px' }}>정식 계약서 첨부 (선택)</div>
            <div style={{ fontSize:'10px', color: COLORS.t5, marginBottom:'10px', padding:'0 4px' }}>없으면 주다페이가 자동 생성 · 5년 보관</div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ background: contractFile ? '#ECFDF5' : COLORS.bgCard, border:`1.5px dashed ${contractFile ? '#10B981' : COLORS.border}`, borderRadius: RADIUS.lg, padding:'16px', textAlign:'center', cursor:'pointer' }}>
              {contractFile ? (
                <>
                  <div style={{ fontSize:'20px', marginBottom:'4px' }}>📄</div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#065F46' }}>{contractFile.name}</div>
                  <div style={{ fontSize:'10px', color:'#047857', marginTop:'2px' }}>{(contractFile.size / 1024 / 1024).toFixed(1)}MB · 탭하여 변경</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'20px', marginBottom:'4px' }}>📎</div>
                  <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t3 }}>계약서 PDF 첨부</div>
                  <div style={{ fontSize:'10px', color: COLORS.t5, marginTop:'2px' }}>없으면 자동 생성</div>
                </>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display:'none' }}
                onChange={e => setContractFile(e.target.files?.[0] || null)} />
            </div>
          </div>

        </div>

        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard }}>
          <button onClick={() => setStep('confirm')}
            style={{ width:'100%', height:'52px', background: theme.brandDark, color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.card }}>
            최종 확인
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ─── Confirm ────────────────────────────────────────────
  if (step === 'confirm') {
    const rows = [
      { label: '투자 대상', value: recipient.name, sub: recipient.brn || (recipient.ceo ? `대표 ${recipient.ceo}` : null), editAction: changeRecipient },
      { label: '투자 유형', value: `${typeMeta?.icon} ${typeMeta?.label}`, editAction: () => setStep(1) },
      { label: '출금 지갑', value: walletLabel, sub: `잔액 ${fmt(walletBalance)}원`, editAction: () => setStep(1) },
      { label: '투자 금액', value: `${fmt(amtNum)}원`, editAction: () => setStep(1) },
      ...(investType === 'equity' ? [{ label: '취득 지분율', value: `${equityNum}%`, editAction: () => setStep(1) }] : []),
      ...(investType === 'equity' && valuation > 0 ? [{ label: '회사 가치', value: fmtValuation(valuation) }] : []),
      ...((investType === 'lend' || investType === 'cb') ? [{ label: '이자율', value: `연 ${interestRate}%`, editAction: () => setStep(1) }] : []),
      ...(investType === 'profit' ? [{ label: '수익 분배율', value: `${profitShare}%`, editAction: () => setStep(1) }] : []),
      ...(investTitle.trim() ? [{ label: '투자 명목', value: investTitle.trim(), editAction: () => setStep(1) }] : []),
      { label: '계약 기간', value: periodLabel, editAction: () => setStep(2) },
      { label: '보고 주기', value: reportLabel, editAction: () => setStep(2) },
      ...(selectedCategories.length > 0 ? [{ label: '자금 사용 목적', value: selectedCategories.map(id => FUND_USE_CATEGORIES.find(c => c.id === id)?.label).filter(Boolean).join(', '), editAction: () => setStep(3) }] : []),
      ...(blockedMcc.length > 0 ? [{ label: 'MCC 차단', value: `${blockedMcc.length}개 항목`, editAction: () => setStep(3) }] : []),
      { label: '1회 결제 한도', value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음', editAction: () => setStep(3) },
      ...(contractFile ? [{ label: '정식 계약서', value: contractFile.name }] : []),
    ]

    const autoActions = [
      `${typeMeta?.label} 계약서 자동 생성 + 양측 전자서명 발송`,
      `서명 완료 시 ${recipient.name} 계좌로 즉시 입금`,
      '투자 자산 등록 + 자기자본법 회계 처리 + 세무사 전송',
      ...(reportFreq !== 'none' ? [`${reportLabel} 사용 보고서 PDF 자동 생성`] : []),
      '분기별 평가 손익 자동 인식',
    ]

    return (
      <ConfirmStep
        smallTitle="투자 내용 확인"
        bigAmount={`${fmt(amtNum)}원`}
        sub={`${recipient.name} ${typeMeta?.label} · 법인 자금`}
        onBack={goBack}
        headerGrad={theme.headerGrad}
        exitTo="/home-business"
        rows={rows}
        autoActions={autoActions}
        footerNote={`집행 후 ${walletLabel} 잔액 ${fmt(walletBalance)}원 → ${fmt(walletBalance - amtNum)}원`}
        primaryLabel="투자 집행"
        onPrimary={() => setStep('pin')}
        onCancel={() => setStep(3)}
      />
    )
  }

  // ─── PIN ────────────────────────────────────────────────
  if (step === 'pin') return (
    <PinStep
      summaryLeft={`${recipient.name} ${typeMeta?.label}`}
      summaryRight={`${fmt(amtNum)}원`}
      onBack={goBack}
      onComplete={() => { pushToStore(); setStep('done') }}
      onFaceID={() => { pushToStore(); setStep('done') }}
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  // ─── Done ────────────────────────────────────────────────
  if (step === 'done') return (
    <DoneStep
      tone="waiting"
      title="서명 대기 중"
      description={`${recipient.name}에 투자 계약서가 발송됐어요. 양측 서명 완료 시 즉시 입금됩니다.`}
      summary={[
        { label: '투자 유형', value: `${typeMeta?.icon} ${typeMeta?.label}` },
        { label: '투자 금액', value: `${fmt(amtNum)}원`, accent: true },
        { label: '투자 대상', value: recipient.name },
        ...(investType === 'equity' ? [{ label: '취득 지분율', value: `${equityNum}%` }] : []),
        ...(investType === 'equity' && valuation > 0 ? [{ label: '회사 가치', value: fmtValuation(valuation) }] : []),
        { label: '계약 기간', value: periodLabel },
        { label: '보고 주기', value: reportLabel },
        ...(blockedMcc.length > 0 ? [{ label: 'MCC 차단', value: `${blockedMcc.length}개 항목` }] : []),
        { label: '1회 결제 한도', value: singleLimit ? `${Number(singleLimit).toLocaleString('ko-KR')}원` : '제한 없음' },
        { label: '출금 지갑', value: walletLabel },
      ]}
      noteYellow="투자 자산 등록 완료 · 세무사에게 자동 전송됐어요"
      primaryLabel="홈으로"
      onPrimary={() => navigate('/home-business')}
      timestamp={(() => {
        const d = new Date()
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      })()}
      headerGrad={theme.headerGrad}
      exitTo="/home-business"
    />
  )

  return null
}
