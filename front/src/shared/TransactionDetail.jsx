import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS, FUND_COLORS, progressGradient } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { getTransactionById, TX_TYPE_META, formatRelativeTime } from './transactionStore'
import { getPayout } from '../services/payout'
import { session } from '../services/api'

// UUID 형식 판별 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

// 안전한 JSON 파서 — 서버 metadata 가 string 또는 object 일 수 있음
function _safeParse(maybeJson) {
  if (!maybeJson) return {}
  if (typeof maybeJson === 'object') return maybeJson
  try { return JSON.parse(maybeJson) || {} } catch { return {} }
}

// 서버 Payout → TransactionDetail 이 기대하는 tx 형태로 변환 (전체 필드 매핑)
function adaptServerPayoutToTx(p) {
  if (!p) return null
  const meId = session.user?.userId
  const role = meId && p.fromUserId === meId ? 'sender'
             : (meId && p.toRecipientUserId === meId ? 'receiver' : 'sender')

  const counterparty = role === 'sender'
    ? {
        name:     p.toRecipientName || '',
        initial:  p.toRecipientInitial || (p.toRecipientName && p.toRecipientName.charAt(0)) || '?',
        kind:     p.toRecipientIsBusiness ? 'business' : 'person',
        verified: !!p.toRecipientVerified || !!p.toRecipientUserId,
        freelancer: p.type === 'freelance' && !p.toRecipientIsBusiness,
        avatarBg: p.toRecipientAvatarBg || null,
        avatarFg: p.toRecipientAvatarFg || null,
      }
    : {
        name:     p.fromUserName || '',
        initial:  (p.fromUserName && p.fromUserName.charAt(0)) || '?',
        kind:     p.fromUserType === 'business' ? 'business' : 'person',
        verified: true,
        avatarBg: null,
        avatarFg: null,
      }

  // 진행률 — 마일스톤 paid 비율 우선, 없으면 status 기반 근사
  const milestones = Array.isArray(p.milestones) ? p.milestones : []
  let progress
  if (milestones.length > 0) {
    const paid = milestones.filter(m => m.status === 'paid').reduce((s, m) => s + Number(m.amount || 0), 0)
    progress = p.amount > 0 ? Math.round((paid / p.amount) * 100) : 0
  } else {
    progress =
      p.status === 'completed'   ? 100 :
      p.status === 'in_progress' ? 50  :
      p.status === 'signing'     ? 20  :
      p.status === 'waiting'     ? 10  : 0
  }

  // 마일스톤 → splits (TX_DETAILS 의 splits 와 동일 모양)
  const splits = milestones.map((m, i) => ({
    id:       m.id || `m${i}`,
    label:    m.label || `${i + 1}차`,
    pct:      p.amount > 0 ? Math.round((m.amount / p.amount) * 100) : 0,
    amount:   Number(m.amount || 0),
    status:   m.status === 'paid'      ? 'done'
            : m.status === 'reviewing' ? 'review'
            : m.status === 'rejected'  ? 'rejected'
            :                            'pending',
    date:     m.paidAt || null,
    deadline: m.targetDate || null,
    note:     m.metadata ? (_safeParse(m.metadata).note || null) : null,
  }))

  // received = paid milestones 합 (없으면 status 기반 추정)
  const received = splits.length > 0
    ? splits.filter(s => s.status === 'done').reduce((a, s) => a + s.amount, 0)
    : (p.status === 'completed' ? Number(p.netAmount || p.amount || 0) : 0)

  // 타임라인 구성
  const timeline = []
  if (p.completedAt) timeline.push({ time: p.completedAt, label: '지급 완료', type: 'done' })
  // 마일스톤별 이벤트도 timeline 에 추가
  for (const m of milestones) {
    if (m.paidAt) {
      timeline.push({ time: m.paidAt, label: `${m.label} ${fmt(m.amount)}원 자동 입금`, type: 'done' })
    } else if (m.targetDate) {
      timeline.push({ time: m.targetDate, label: `${m.label} 마감 예정`, type: 'pending' })
    }
  }
  if (p.requestedAt || p.createdAt) {
    timeline.push({
      time: p.requestedAt || p.createdAt,
      label: p.category === 'contract' ? '계약서 발송' : '자금집행 발의',
      type: 'done',
    })
  }

  // 메타데이터 — investMeta / supportMeta / rentalMeta 등
  const meta = _safeParse(p.metadata)

  return {
    id:           p.id,
    type:         p.type,
    typeLabel:    p.typeLabel,
    typeIcon:     p.typeIcon,
    category:     p.category,
    mainCat:      p.mainCat,
    subCat:       p.subCat,
    role,
    counterparty,
    title:        p.dealTitle || p.typeLabel || p.reason || '',
    dealTitle:    p.dealTitle,
    dealDescription: p.dealDescription || p.reason || '',
    description:  p.dealDescription || p.reason || '',
    total:        Number(p.amount || 0),
    amount:       Number(p.amount || 0),
    whtAmount:    Number(p.whtAmount || 0),
    netAmount:    Number(p.netAmount || p.amount || 0),
    received,
    executedAmount: received,
    progress,
    statusLabel:  p.statusLabel || ({
      completed:   '입금 완료',
      waiting:     '인증 대기',
      signing:     '계약 서명 대기',
      in_progress: '진행 중',
      cancelled:   '취소됨',
    }[p.status] || (p.status || '처리 중')),
    status:       p.status,
    rejected:     p.status === 'cancelled' || p.dealStatus === 'rejected',
    counterpartyRead: true,
    splits,
    milestones:   splits,         // 호환용 별칭
    timeline,
    safety: [
      '주다페이 신탁 분리 보관 (라이센스)',
      '5년 자동 증거 보관',
      '이상거래 자동 감지',
      ...(p.category === 'contract' ? ['분쟁 시 메시지 + 계약서 자동 증거 보관'] : []),
    ],
    contractFile:    p.contractFile  || null,
    contractDocId:   p.contractDocId || null,
    contractExpires: p.contractExpires || null,
    contractSigned:  !!p.contractSigned,
    // 수령인 원본 필드도 그대로 노출 (StoreTransactionDetail 호환)
    toRecipientName:        p.toRecipientName,
    toRecipientInitial:     p.toRecipientInitial,
    toRecipientAvatarBg:    p.toRecipientAvatarBg,
    toRecipientAvatarFg:    p.toRecipientAvatarFg,
    toRecipientIsBusiness:  !!p.toRecipientIsBusiness,
    toRecipientVerified:    !!p.toRecipientVerified,
    // 메뉴별 메타데이터
    investMeta:     meta.investMeta   || meta.invest   || null,
    supportMeta:    meta.supportMeta  || meta.support  || null,
    rentalMeta:     meta.rentalMeta   || meta.rental   || null,
    categories:     meta.categories   || null,
    // 자유 메타 (raw)
    metadata:       meta,
    walletId:       p.walletId,
    walletLabel:    p.walletLabel,
    payoutNo:       p.payoutNo,
    payDateMode:    p.payDateMode,
    scheduledDate:  p.scheduledDate,
    reason:         p.reason,
    createdAt:      p.createdAt,
    requestedAt:    p.requestedAt,
    completedAt:    p.completedAt,
    // 메시지 버튼 — 채팅방으로 이동할 때 사용
    threadId:       p.threadId  || null,
    threadKey:      p.threadKey || null,
    _fromServer:    true,
  }
}

function fmt(v) { return Number(v || 0).toLocaleString() }

// ─────────────────────────────────────
// 데이터 (이전 버전 그대로 유지)
// ─────────────────────────────────────
const TX_DETAILS = {
  // 외주비 — 송신자 시점, 중도금 검수 대기
  t1: {
    id: 't1', type: 'freelance', role: 'sender',
    counterparty: { name:'박철수', initial:'박', kind:'person', verified:true, freelancer:true },
    title: '앱 디자인 메인 5종',
    total: 5000000,
    received: 1500000,
    progress: 30,
    statusLabel: '중도금 검수 대기',
    description: '계약 기간 2026.05.05 — 2026.07.31',
    counterpartyRead: true,
    splits: [
      { id:'prepay', label:'선금', pct:30, amount:1500000,
        status:'done', date:'2026.05.05 16:09', note:'본인 계좌(국민은행 ***-456)로 자동 입금 완료' },
      { id:'middle', label:'중도금', pct:40, amount:2000000,
        status:'review', deadline:'2026.06.15', note:'박철수가 1차 작업물 제출 완료. 검수 후 자동 입금' },
      { id:'final', label:'잔금', pct:30, amount:1500000,
        status:'pending', deadline:'2026.07.31', note:'최종 작업물 컨펌 시 자동 입금' },
    ],
    timeline: [
      { time:'2026.07.31', label:'잔금 자동 차감 예정', type:'pending' },
      { time:'2026.06.15', label:'중도금 마감 (D-22)', type:'pending' },
      { time:'어제 14:32', label:'박철수가 1차 작업물 제출', type:'event' },
      { time:'2026.05.05 16:09', label:'선금 1,500,000원 자동 입금', type:'done' },
      { time:'2026.05.05 16:08', label:'박철수 계약 서명 완료', type:'done' },
      { time:'2026.05.05 16:05', label:'박철수 계약 열람 (읽음)', type:'done' },
      { time:'2026.05.05 16:00', label:'계약서 발송', type:'done' },
    ],
    safety: [
      '계약 서명 완료 시 선금 자동 보관',
      '발주자 미응답 시 7일 후 자동 입금',
      '주다페이 신탁 분리 보관 (라이센스)',
      '분쟁 시 메시지 + 계약서 자동 증거 보관',
    ],
    contractFile: '외주_앱디자인_v2.pdf',
  },
  t2: {
    id: 't2', type: 'freelance', role: 'receiver',
    counterparty: { name:'이호형', initial:'이', kind:'person', verified:true },
    title: '브랜드 로고 디자인',
    total: 3000000, received: 0, progress: 0,
    statusLabel: '계약 서명 대기',
    description: '계약 기간 2026.05.10 — 2026.06.10 · 단일 지급',
    counterpartyRead: true,
    splits: [
      { id:'prepay', label:'선금', pct:30, amount:900000, status:'pending', note:'계약 발효 시 즉시' },
      { id:'middle', label:'중도금', pct:40, amount:1200000, status:'pending', note:'1차 시안 컨펌 시' },
      { id:'final', label:'잔금', pct:30, amount:900000, status:'pending', note:'최종 컨펌 시 (~6.10)' },
    ],
    timeline: [
      { time:'1시간 전', label:'계약서 발송 (이호형)', type:'event' },
    ],
    safety: [
      '계약 서명 즉시 선금 자동 보관 시작',
      '발주자 미응답 7일 후 자동 입금',
      '주다페이 신탁 분리 보관 (라이센스)',
      '분쟁 시 메시지 + 계약서 자동 증거 보관',
    ],
    contractFile: '외주_브랜드로고_v1.pdf',
  },
  t3: {
    id: 't3', type: 'lend', role: 'sender',
    counterparty: { name:'박민준', initial:'박', kind:'person', verified:true },
    title: '6개월 대여 · 연 6%',
    total: 2000000, received: 0, progress: 0,
    statusLabel: '상대방 서명 대기',
    description: '상환일 2026.11.04 · 일시 상환',
    counterpartyRead: false,
    splits: [
      { id:'principal', label:'원금', pct:100, amount:2000000,
        status:'pending', note:'양측 서명 후 박민준 받은 지갑에 입금' },
    ],
    timeline: [
      { time:'6시간 전', label:'차용증 발송 (박민준)', type:'event' },
    ],
    safety: [
      '3일 내 미서명 시 자동 취소',
      '상환일 박민준 지갑에서 자동 차감',
      '연체 시 자동 알림 + 연체이자 적용',
      '분쟁 시 차용증 + 자금 흐름 자동 증거',
    ],
    contractFile: '차용증_박민준_2,000,000원.pdf',
  },
  t4: {
    id: 't4', type: 'realestate', role: 'sender',
    counterparty: { name:'(주)벨라부동산중개', initial:'벨', kind:'business', verified:true, bizNumber:'456-78-90123', industry:'부동산 임대' },
    title: '서울 강남구 역삼동 123-45',
    total: 100000000, received: 50000000, progress: 50,
    statusLabel: '잔금 대기 · 조건 미충족',
    description: '전세 · 2년 계약 (2026.06.01 — 2028.05.31)',
    counterpartyRead: true,
    splits: [
      { id:'prepay', label:'계약금', pct:10, amount:10000000,
        status:'done', date:'2026.05.10', note:'서명 후 즉시 임대인 계좌로 입금' },
      { id:'middle', label:'중도금', pct:40, amount:40000000,
        status:'done', date:'2026.07.01', note:'중도금일 자동 입금' },
      { id:'final', label:'잔금', pct:50, amount:50000000,
        status:'review', deadline:'2026.08.01',
        conditions: [
          { label:'근저당권 말소 확인', done:true, sub:'쿠콘 자동 검증 완료' },
          { label:'국세/지방세 완납 증명', done:false, sub:'홈택스 PDF 미첨부' },
          { label:'잔금일 도래', done:false, sub:'2026.08.01' },
        ],
      },
    ],
    timeline: [
      { time:'2026.08.01', label:'잔금일 도래 예정', type:'pending' },
      { time:'어제', label:'근저당권 말소 확인 (쿠콘 자동)', type:'done' },
      { time:'2026.07.01 09:00', label:'중도금 40,000,000원 자동 입금', type:'done' },
      { time:'2026.05.10 14:00', label:'계약금 10,000,000원 자동 입금', type:'done' },
      { time:'2026.05.10 13:55', label:'양측 계약 서명 완료', type:'done' },
    ],
    safety: [
      '근저당 말소 확인 + 국세 완납 + 잔금일 모두 충족 시 자동 입금',
      '한 가지라도 미충족 시 잔금 보류',
      '계약 만료 3개월 전 갱신/반환 알림',
      '5년 보관 (라이센스)',
    ],
    contractFile: '임대차계약서_역삼동123-45.pdf',
  },
  t5: {
    id: 't5', type: 'invest', role: 'sender',
    counterparty: { name:'정창업', initial:'정', kind:'person', verified:true },
    title: '창업 자금 지원',
    total: 10000000, received: 10000000, progress: 100,
    statusLabel: '진행 중 · 분기 보고서 D-25',
    description: '사용 종료 2029.05.06 · 분기별 PDF 보고서',
    counterpartyRead: true,
    splits: [
      { id:'principal', label:'지원금', pct:100, amount:10000000,
        status:'done', date:'2026.04.01', note:'정창업 받은 지갑에 입금 완료' },
    ],
    categories: [
      { label:'인건비',     pct:40, amount:4000000, used:1200000 },
      { label:'마케팅비',   pct:25, amount:2500000, used:800000 },
      { label:'장비·인프라', pct:15, amount:1500000, used:1450000 },
      { label:'사무실 운영비', pct:10, amount:1000000, used:200000 },
      { label:'기타',       pct:10, amount:1000000, used:80000 },
    ],
    timeline: [
      { time:'2026.05.30', label:'2026 Q2 보고서 자동 생성 예정', type:'pending' },
      { time:'어제', label:'장비비 카테고리 80% 초과 알림 발송', type:'event' },
      { time:'2026.04.01 11:30', label:'10,000,000원 입금 완료', type:'done' },
      { time:'2026.04.01 11:25', label:'양측 약정서 서명 완료', type:'done' },
    ],
    safety: [
      '카테고리별 한도 + MCC 차단 활성',
      '한도 80% 초과 시 즉시 알림 발송',
      '분기별 PDF 보고서 자동 생성',
      '사용 종료 후 미사용 잔액 자동 환급',
    ],
    contractFile: '자금지원약정서_정창업.pdf',
  },
  t6: {
    id: 't6', type: 'gift', role: 'sender',
    counterparty: { name:'이유진', initial:'이', kind:'person', verified:true },
    title: '생일 축하',
    total: 50000, received: 50000, progress: 100,
    statusLabel: '입금 완료',
    description: '카테고리: 생일 · 사용 통제 없음',
    counterpartyRead: true,
    splits: [
      { id:'principal', label:'선물', pct:100, amount:50000,
        status:'done', date:'2026.04.29', note:'이유진 받은 지갑에 즉시 입금' },
    ],
    timeline: [
      { time:'2026.04.29 09:30', label:'이유진이 알림 확인 (읽음)', type:'done' },
      { time:'2026.04.29 09:20', label:'50,000원 즉시 입금', type:'done' },
    ],
    safety: [
      '받은 지갑에 보관 (카드 결제만 가능)',
      '5년 거래 기록 보관',
    ],
    contractFile: null,
  },
  t7: {
    id: 't7', type: 'lend', role: 'receiver',
    counterparty: { name:'김지인', initial:'김', kind:'person', verified:true },
    title: '단기 대여',
    total: 500000, received: 0, progress: 0,
    statusLabel: '거절됨',
    description: '연 4.6% · 3개월',
    counterpartyRead: true,
    rejected: true,
    splits: [
      { id:'principal', label:'원금', pct:100, amount:500000,
        status:'rejected', note:'본인이 거절함' },
    ],
    timeline: [
      { time:'2주 전', label:'본인이 거절', type:'rejected' },
      { time:'2주 전', label:'차용증 열람 (읽음)', type:'done' },
      { time:'2주 전', label:'김지인이 차용증 발송', type:'event' },
    ],
    safety: [],
    contractFile: '차용증_김지인_500,000원.pdf',
  },
}

const TYPE_META = {
  freelance:  { emoji:'🧾', label:'외주비' },
  lend:       { emoji:'💸', label:'빌려주기' },
  realestate: { emoji:'🏠', label:'부동산' },
  invest:     { emoji:'🌱', label:'자금 지원' },
  gift:       { emoji:'🎁', label:'용돈선물' },
}

// ─────────────────────────────────────
// 단계별 카드 상태별 스타일
// ─────────────────────────────────────
const STEP_STATUS = {
  done:     { circleBg: '#10B981', circleColor: '#fff', accent: '#047857', cardBorder: 'transparent' },
  review:   { circleBg: '#F59E0B', circleColor: '#fff', accent: '#854F0B', cardBorder: '#FCD34D' },
  pending:  { circleBg: '#fff',    circleColor: COLORS.t4, accent: COLORS.t4, cardBorder: 'transparent' },
  rejected: { circleBg: '#EF4444', circleColor: '#fff', accent: '#B91C1C', cardBorder: 'transparent' },
}

export default function TransactionDetail() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const { id } = useParams()

  // store 거래(tx_xxxx)는 별도 화면으로 분기
  if (id && id.startsWith('tx_')) {
    return <StoreTransactionDetail id={id} />
  }

  // 서버 UUID 면 GET /api/v1/app/payouts/{id} 로 fetch
  const isUuid = id && UUID_RE.test(id)
  const [serverTx, setServerTx] = useState(null)
  const [serverLoading, setServerLoading] = useState(isUuid && !!session.user)
  useEffect(() => {
    if (!isUuid || !session.user) return
    let cancelled = false
    ;(async () => {
      try {
        const p = await getPayout(id)
        if (!cancelled) setServerTx(adaptServerPayoutToTx(p))
      } catch (e) {
        console.warn('[TransactionDetail] getPayout failed', e?.message)
      } finally {
        if (!cancelled) setServerLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, isUuid])

  const tx = serverTx || TX_DETAILS[id]
  const [showActionSheet, setShowActionSheet] = useState(null)
  // 집행 취소 다이얼로그 (상대방 서명 대기 상태에서만)
  const [txCancelDialog, setTxCancelDialog] = useState(null) // null | { step:1|2 }
  const [txCancelReason, setTxCancelReason] = useState('')
  const [txCancelManager, setTxCancelManager] = useState('')
  const [txCancelConfirmText, setTxCancelConfirmText] = useState('')
  const [txCancelled, setTxCancelled] = useState(false)

  if (!tx) {
    // 서버 fetch 중이면 로딩 표시
    if (serverLoading) {
      return (
        <PhoneShell>
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 40px' }}>
            <div style={{ fontSize:'13px', color: COLORS.t3 }}>거래 정보를 불러오는 중…</div>
          </div>
        </PhoneShell>
      )
    }
    return (
      <PhoneShell>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 40px' }}>
          <div style={{ fontSize:'14px', color: COLORS.t3, marginBottom:'14px' }}>거래를 찾을 수 없어요</div>
          <button onClick={() => navigate('/alerts')}
            style={{ padding:'12px 24px', background: theme.brandDark, color:'#fff', border:'none', borderRadius:'12px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            알림으로 돌아가기
          </button>
        </div>
      </PhoneShell>
    )
  }

  const meta = TYPE_META[tx.type] || { emoji:'', label:'' }

  // 메시지 버튼 — 서버 payout 이면 채팅방 직접 이동, 데모면 검색 라우트
  const goToChat = () => {
    if (tx.threadId) {
      navigate(`/chat/${tx.threadId}`)
    } else {
      navigate(`/messages?with=${tx.counterparty?.name || ''}`)
    }
  }
  const fundColor = FUND_COLORS[tx.type]
  const isReceiver = tx.role === 'receiver'
  const isSender = tx.role === 'sender'
  const isWaitingForMySignature = isReceiver && tx.statusLabel === '계약 서명 대기'
  const isWaitingForCounterpartySignature = isSender && tx.statusLabel === '상대방 서명 대기'

  return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── 다크 그라데이션 헤더 (좌우 꽉, 라운드 없음) ─────── */}
        <div style={{
          background: theme.headerSolid,
          paddingTop:'max(20px, env(safe-area-inset-top))',
          paddingBottom:'24px',
        }}>
          {/* 상단 네비 — 뒤로 + 가운데 타이틀 */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'4px 16px 18px',
          }}>
            <button onClick={() => navigate(-1)}
              style={{
                width:'32px', height:'32px',
                background:'transparent',
                border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontSize:'14px', fontWeight:600, color:'#fff' }}>
              {meta.emoji} {meta.label} 진행 상태
            </span>
            <div style={{ width:'32px' }} />
          </div>

          {/* 헤더 콘텐츠 — 좌우 padding만 */}
          <div style={{ padding:'0 20px' }}>
            {/* 1행: 아바타 + 이름/메타 + % 배지 */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
              <div style={{
                width:'44px', height:'44px',
                borderRadius: tx.counterparty.kind === 'business' ? '12px' : '50%',
                background: `${theme.brandDark}20`,
                color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'17px', fontWeight:700,
                flexShrink:0,
                boxShadow:'0 4px 12px rgba(91,79,232,0.4)',
              }}>
                {tx.counterparty.initial}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'17px', fontWeight:700, color:'#fff' }}>
                    {tx.counterparty.name}
                  </span>
                  {tx.counterparty.verified && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="#34D399"/>
                      <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {tx.counterparty.kind === 'business' && (
                    <span style={{
                      display:'inline-block', padding:'1px 6px',
                      background:'rgba(16,185,129,0.2)', color:'#34D399',
                      borderRadius:'4px', fontSize:'9px', fontWeight:700,
                    }}>
                      사업자
                    </span>
                  )}
                </div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)' }}>
                  {meta.label} · {isSender ? '내가 보냄' : '내가 받음'}
                </div>
              </div>
              <span style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                minWidth:'52px', padding:'6px 12px',
                background: tx.progress >= 100 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.15)',
                color: tx.progress >= 100 ? '#34D399' : '#fff',
                borderRadius: RADIUS.pill,
                fontSize:'12px', fontWeight:700,
                flexShrink:0,
              }}>
                {tx.progress}%
              </span>
            </div>

            {/* 진행률 바 */}
            {tx.progress > 0 && tx.progress < 100 && (
              <div style={{
                height:'4px',
                background:'rgba(255,255,255,0.15)',
                borderRadius: RADIUS.pill,
                overflow:'hidden',
                marginBottom:'18px',
              }}>
                <div style={{
                  width:`${tx.progress}%`, height:'100%',
                  background: progressGradient(tx.progress),
                  borderRadius: RADIUS.pill,
                }} />
              </div>
            )}
            {tx.progress >= 100 && <div style={{ height:'18px' }} />}
            {tx.progress === 0 && <div style={{ height:'4px' }} />}

            {/* 큰 금액 */}
            <div style={{ display:'flex', alignItems:'baseline', gap:'5px', marginBottom:'8px' }}>
              <span style={{ fontSize:'30px', fontWeight:700, color:'#fff', letterSpacing:'-1.5px' }}>
                {tx.received.toLocaleString()}
              </span>
              <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.55)' }}>
                / {tx.total.toLocaleString()}원
              </span>
            </div>

            <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', marginBottom:'2px' }}>
              {tx.title}
            </div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)' }}>
              {tx.description}
            </div>
          </div>
        </div>

        {/* ── 라이트 영역 ─────────────────────────────────────── */}
        <div style={{ padding:'18px 16px 24px' }}>

          {/* 단계별 진행 */}
          {tx.splits && tx.splits.length > 1 && (
            <>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'10px', padding:'0 4px' }}>
                단계별 진행
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'22px' }}>
                {tx.splits.map((s, i) => {
                  const ss = STEP_STATUS[s.status]
                  return (
                    <div key={s.id} style={{
                      background: COLORS.bgCard,
                      borderRadius: RADIUS.lg,
                      boxShadow: SHADOWS.card,
                      border: ss.cardBorder !== 'transparent' ? `1px solid ${ss.cardBorder}` : 'none',
                      padding:'14px',
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                        <div style={{
                          width:'26px', height:'26px', borderRadius:'50%',
                          background: ss.circleBg, color: ss.circleColor,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'12px', fontWeight:700, flexShrink:0,
                          marginTop:'1px',
                          border: s.status === 'pending' ? `1.5px solid ${COLORS.border}` : 'none',
                        }}>
                          {s.status === 'done' ? '✓' : s.status === 'rejected' ? '✕' : i+1}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2px', gap:'8px' }}>
                            <span style={{
                              fontSize:'13px', fontWeight:700,
                              color: s.status === 'pending' ? COLORS.t4 : COLORS.t1,
                            }}>
                              {s.label} {s.pct}%
                            </span>
                            <span style={{
                              fontSize:'14px', fontWeight:700,
                              color: ss.accent,
                              flexShrink:0,
                            }}>
                              {s.amount.toLocaleString()}원
                            </span>
                          </div>
                          <div style={{ fontSize:'11px', color: COLORS.t3, lineHeight:1.5 }}>
                            {s.date && `${s.date} · `}{s.note}
                          </div>
                          {s.deadline && s.status !== 'done' && (
                            <div style={{ fontSize:'10px', color: ss.accent, marginTop:'4px', fontWeight:600 }}>
                              마감 {s.deadline}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 잔금 조건 (부동산) */}
                      {s.conditions && (
                        <div style={{
                          marginLeft:'36px', marginTop:'10px',
                          padding:'12px 14px',
                          background: '#FFFBEB',
                          borderRadius: RADIUS.md,
                          border:'1px solid #FCD34D',
                        }}>
                          <div style={{ fontSize:'11px', fontWeight:700, color:'#854F0B', marginBottom:'8px' }}>
                            잔금 집행 조건 ({s.conditions.filter(c => c.done).length}/{s.conditions.length} 충족)
                          </div>
                          {s.conditions.map(c => (
                            <div key={c.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', marginTop:'5px' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', color: c.done ? '#047857' : COLORS.t2 }}>
                                <span style={{
                                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                                  width:'15px', height:'15px', borderRadius:'50%',
                                  background: c.done ? '#10B981' : 'transparent',
                                  border: c.done ? 'none' : `1.5px solid ${COLORS.border}`,
                                  color:'#fff', fontSize:'9px', fontWeight:700,
                                  flexShrink:0,
                                }}>
                                  {c.done && '✓'}
                                </span>
                                {c.label}
                              </span>
                              <span style={{ color: c.done ? '#047857' : COLORS.t4, fontSize:'10px' }}>{c.sub}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 단계별 액션 버튼 (검수 등) */}
                      {s.status === 'review' && isSender && !s.conditions && (
                        <button style={{
                          marginTop:'12px', marginLeft:'36px', width:'calc(100% - 36px)',
                          padding:'10px',
                          background: theme.brandDark, color:'#fff',
                          border:'none', borderRadius: RADIUS.md,
                          fontSize:'12px', fontWeight:700,
                          cursor:'pointer', fontFamily:'inherit',
                        }}>
                          {s.label} 검수하기 →
                        </button>
                      )}

                      {s.conditions && s.conditions.some(c => !c.done) && isSender && (
                        <button style={{
                          marginTop:'12px', marginLeft:'36px', width:'calc(100% - 36px)',
                          padding:'10px',
                          background: '#3B82F6', color:'#fff',
                          border:'none', borderRadius: RADIUS.md,
                          fontSize:'12px', fontWeight:700,
                          cursor:'pointer', fontFamily:'inherit',
                        }}>
                          홈택스 PDF 첨부하기 →
                        </button>
                      )}

                      {s.status === 'review' && isReceiver && (
                        <button style={{
                          marginTop:'12px', marginLeft:'36px', width:'calc(100% - 36px)',
                          padding:'10px',
                          background: theme.brandDark, color:'#fff',
                          border:'none', borderRadius: RADIUS.md,
                          fontSize:'12px', fontWeight:700,
                          cursor:'pointer', fontFamily:'inherit',
                        }}>
                          {s.label.replace('금','')} 작업물 제출하기 →
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 자금 지원 — 카테고리별 사용 현황 */}
          {tx.categories && (
            <>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'10px', padding:'0 4px' }}>
                카테고리별 사용 현황
              </div>
              <div style={{
                background: COLORS.bgCard,
                borderRadius: RADIUS.lg,
                boxShadow: SHADOWS.card,
                padding:'14px',
                marginBottom:'22px',
              }}>
                {tx.categories.map((c, i, arr) => {
                  const usagePct = c.amount > 0 ? Math.round((c.used / c.amount) * 100) : 0
                  const overLimit = usagePct >= 80
                  return (
                    <div key={c.label} style={{
                      paddingBottom: i < arr.length-1 ? '12px' : 0,
                      marginBottom: i < arr.length-1 ? '12px' : 0,
                      borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1 }}>{c.label} {c.pct}%</span>
                        <span style={{
                          fontSize:'11px',
                          color: overLimit ? COLORS.danger : COLORS.t4,
                          fontWeight: overLimit ? 700 : 500,
                        }}>
                          {c.used.toLocaleString()} / {c.amount.toLocaleString()}원
                        </span>
                      </div>
                      <div style={{ height:'3px', borderRadius: RADIUS.pill, background: COLORS.bgMuted, overflow:'hidden' }}>
                        <div style={{
                          width:`${Math.min(100, usagePct)}%`, height:'100%',
                          background: overLimit ? progressGradient(85) : progressGradient(20, 'success'),
                          borderRadius: RADIUS.pill,
                          transition:'width .3s',
                        }} />
                      </div>
                      {overLimit && (
                        <div style={{ fontSize:'10px', color: COLORS.danger, marginTop:'5px', fontWeight:600 }}>
                          ⚠ 한도 {usagePct}% 사용 — 곧 결제 차단
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 활동 타임라인 */}
          <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'10px', padding:'0 4px' }}>
            활동 타임라인
          </div>
          <div style={{
            background: COLORS.bgCard,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOWS.card,
            padding:'16px',
            marginBottom:'22px',
          }}>
            {tx.timeline.map((t, i, arr) => {
              const dotColor = t.type === 'done' ? '#10B981'
                            : t.type === 'rejected' ? COLORS.danger
                            : t.type === 'event' ? theme.brandDark
                            : COLORS.t5
              return (
                <div key={i} style={{ display:'flex', gap:'12px', position:'relative' }}>
                  <div style={{
                    width:'14px', display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0,
                    paddingTop:'4px',
                  }}>
                    <div style={{
                      width:'9px', height:'9px', borderRadius:'50%',
                      background: t.type === 'pending' ? '#fff' : dotColor,
                      border: t.type === 'pending' ? `1.5px solid ${COLORS.t5}` : 'none',
                      flexShrink:0, zIndex:1,
                    }} />
                    {i < arr.length-1 && (
                      <div style={{ flex:1, width:'1.5px', background: COLORS.borderSoft, marginTop:'2px' }} />
                    )}
                  </div>
                  <div style={{ flex:1, paddingBottom: i < arr.length-1 ? '14px' : 0 }}>
                    <div style={{
                      fontSize:'12px', fontWeight:500,
                      color: t.type === 'pending' ? COLORS.t4 : COLORS.t1,
                      marginBottom:'2px',
                    }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize:'10px', color: COLORS.t4 }}>{t.time}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 안전 장치 */}
          {tx.safety && tx.safety.length > 0 && (
            <div style={{
              background:'#ECFDF5',
              borderRadius: RADIUS.lg,
              padding:'16px',
              marginBottom:'14px',
            }}>
              <div style={{
                display:'flex', alignItems:'center', gap:'6px',
                marginBottom:'10px',
              }}>
                <div style={{
                  width:'20px', height:'20px', borderRadius:'50%',
                  background:'#10B981',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>안전 장치</span>
              </div>
              {tx.safety.map(text => (
                <div key={text} style={{
                  display:'flex', alignItems:'flex-start', gap:'7px',
                  marginTop:'6px',
                  fontSize:'11px', color:'#047857', lineHeight:1.6,
                }}>
                  <svg width="9" height="8" viewBox="0 0 9 8" fill="none" style={{ flexShrink:0, marginTop:'4px' }}>
                    <path d="M1 4l2.5 2.5L8 1" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {text}
                </div>
              ))}
            </div>
          )}

          {/* 계약서 보기 */}
          {tx.contractFile && (
            <button style={{
              width:'100%',
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              boxShadow: SHADOWS.card,
              border:'none',
              padding:'14px',
              display:'flex', alignItems:'center', gap:'12px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              marginBottom:'14px',
            }}>
              <div style={{
                width:'38px', height:'38px',
                background: `${theme.brandDark}15`, borderRadius: RADIUS.md,
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
                  계약서 보기
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>{tx.contractFile}</div>
              </div>
              <span style={{ color: COLORS.t5, fontSize:'18px' }}>›</span>
            </button>
          )}

          {/* 거절 안내 */}
          {tx.rejected && (
            <div style={{
              padding:'14px 16px',
              background: COLORS.bgMuted,
              borderRadius: RADIUS.lg,
              fontSize:'12px', color: COLORS.t3,
              lineHeight:1.65, textAlign:'center',
            }}>
              이 거래는 거절되어 종료됐어요. 자금은 차감되지 않았습니다.
            </div>
          )}
        </div>

      </div> {/* 스크롤 영역 끝 */}

      {/* 하단 액션 영역 */}
      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
      }}>
        {isWaitingForMySignature && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => setShowActionSheet('reject')}
              style={{
                flex:1, height:'52px',
                background: COLORS.bgCard, color: COLORS.danger,
                border: `1px solid ${COLORS.dangerBg}`,
                borderRadius: RADIUS.md,
                fontSize:'13px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              거절
            </button>
            <button onClick={() => goToChat()}
              style={{
                flex:1, height:'52px',
                background: COLORS.bgCard, color: COLORS.t2,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.md,
                fontSize:'13px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              메시지
            </button>
            <button style={{
              flex:1.4, height:'52px',
              background: theme.brandDark, color:'#fff',
              border:'none',
              borderRadius: RADIUS.md,
              fontSize:'14px', fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
              boxShadow: SHADOWS.buttonBrand,
            }}>
              계약 서명하기
            </button>
          </div>
        )}

        {isWaitingForCounterpartySignature && !txCancelled && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button
              onClick={() => { setTxCancelReason(''); setTxCancelManager(''); setTxCancelConfirmText(''); setTxCancelDialog({ step:1 }) }}
              style={{
                flex:1, height:'52px',
                background:'transparent', color:'#DC2626',
                border:'1px solid #FECACA',
                borderRadius: RADIUS.md,
                fontSize:'13px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              집행 취소
            </button>
            <button onClick={() => goToChat()}
              style={{
                flex:1.4, height:'52px',
                background: theme.brandDark, color:'#fff',
                border:'none',
                borderRadius: RADIUS.md,
                fontSize:'14px', fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                boxShadow: SHADOWS.buttonBrand,
              }}>
              {tx.counterparty.name}과 메시지
            </button>
          </div>
        )}

        {isWaitingForCounterpartySignature && txCancelled && (
          <div style={{ padding:'16px', background:'#F3F4F6', borderRadius: RADIUS.lg, textAlign:'center', fontSize:'13px', color:'#6B7280', fontWeight:600 }}>
            🚫 집행이 취소되었습니다
          </div>
        )}

        {!isWaitingForMySignature && !isWaitingForCounterpartySignature && (
          <button onClick={() => goToChat()}
            style={{
              width:'100%', height:'52px',
              background: theme.brandDark, color:'#fff',
              border:'none',
              borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
              boxShadow: SHADOWS.buttonBrand,
            }}>
            {tx.counterparty.name}과 메시지
          </button>
        )}
      </div>

      {/* ── 집행 취소 다이얼로그 — 1단계 ── */}
      {txCancelDialog?.step === 1 && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(15,20,35,0.55)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px' }}
          onClick={() => setTxCancelDialog(null)}>
          <div style={{ background:'#fff', borderRadius:'20px', padding:'28px 22px 22px', width:'100%', maxWidth:'320px', boxShadow:'0 20px 60px rgba(0,0,0,0.22)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:'16px' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>🚫</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:'#111827', marginBottom:'6px' }}>집행을 취소하시겠습니까?</div>
              <div style={{ fontSize:'12px', color:'#6B7280', lineHeight:1.6 }}>
                상대방이 아직 서명하지 않은 계약입니다.<br/>
                취소하면 집행이 무효 처리됩니다.
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
              <button onClick={() => setTxCancelDialog(null)}
                style={{ flex:1, padding:'13px', background:'#F3F4F6', border:'none', borderRadius:'12px',
                  fontSize:'13px', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
                돌아가기
              </button>
              <button onClick={() => setTxCancelDialog({ step:2 })}
                style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#DC2626,#EF4444)', border:'none',
                  borderRadius:'12px', fontSize:'13px', fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                취소 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 집행 취소 다이얼로그 — 2단계: 사유 입력 ── */}
      {txCancelDialog?.step === 2 && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(15,20,35,0.55)',
          display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
          onClick={() => setTxCancelDialog(null)}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'0 0 32px', width:'100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
              <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'#E4E6EA' }} />
            </div>
            <div style={{ padding:'8px 22px 0' }}>
              <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', marginBottom:'4px' }}>집행 취소 확인</div>
              <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'18px' }}>아래 정보를 입력하고 '삭제'를 입력해야 취소가 완료됩니다</div>

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>취소 사유 <span style={{ color:'#DC2626' }}>*</span></label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
                {['단순 변심','계약 조건 변경','상대방 요청','내부 결재 미승인','기타'].map(r => (
                  <button key={r} onClick={() => setTxCancelReason(r)}
                    style={{ padding:'5px 12px', borderRadius:'20px', border:'1px solid', fontFamily:'inherit', fontSize:'11px', fontWeight:600, cursor:'pointer',
                      background: txCancelReason === r ? '#FEF2F2' : '#F9FAFB',
                      color: txCancelReason === r ? '#DC2626' : '#6B7280',
                      borderColor: txCancelReason === r ? '#FECACA' : '#E4E6EA',
                    }}>{r}</button>
                ))}
              </div>

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>담당자 이름 <span style={{ color:'#DC2626' }}>*</span></label>
              <input value={txCancelManager} onChange={e => setTxCancelManager(e.target.value)}
                placeholder="취소를 승인한 담당자 이름" maxLength={20}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', outline:'none', marginBottom:'14px' }} />

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>아래 칸에 <span style={{ fontWeight:800, color:'#DC2626' }}>"삭제"</span> 를 입력하세요</label>
              <input value={txCancelConfirmText} onChange={e => setTxCancelConfirmText(e.target.value)}
                placeholder="삭제"
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px',
                  background: txCancelConfirmText === '삭제' ? '#FEF2F2' : '#F9FAFB',
                  border:`1px solid ${txCancelConfirmText === '삭제' ? '#FECACA' : '#E4E6EA'}`,
                  borderRadius:'10px', fontSize:'14px', fontWeight:700, color:'#DC2626', fontFamily:'inherit', outline:'none', marginBottom:'18px', textAlign:'center', letterSpacing:'0.05em' }} />

              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setTxCancelDialog(null)}
                  style={{ flex:1, padding:'14px', background:'#F3F4F6', border:'none', borderRadius:'14px',
                    fontSize:'14px', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
                  취소
                </button>
                <button
                  disabled={txCancelConfirmText !== '삭제' || !txCancelReason || !txCancelManager.trim()}
                  onClick={() => {
                    setTxCancelled(true)
                    setTxCancelDialog(null)
                  }}
                  style={{ flex:1, padding:'14px',
                    background: txCancelConfirmText === '삭제' && txCancelReason && txCancelManager.trim()
                      ? 'linear-gradient(135deg,#DC2626,#EF4444)' : '#E5E7EB',
                    border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700,
                    color: txCancelConfirmText === '삭제' && txCancelReason && txCancelManager.trim() ? '#fff' : '#9CA3AF',
                    cursor: txCancelConfirmText === '삭제' && txCancelReason && txCancelManager.trim() ? 'pointer' : 'not-allowed',
                    fontFamily:'inherit', transition:'all 0.2s' }}>
                  집행 취소 확정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거절/협상 바텀시트 */}
      {showActionSheet && (
        <div onClick={() => setShowActionSheet(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:50 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:'390px',
              background: COLORS.bgCard,
              borderRadius:'24px 24px 0 0',
              padding:'8px 20px 28px',
              maxHeight:'70vh', overflowY:'auto',
            }}>
            <div style={{ width:'40px', height:'4px', background: COLORS.border, borderRadius:'2px', margin:'8px auto 18px' }} />

            {showActionSheet === 'reject' && (
              <>
                <div style={{ fontSize:'18px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
                  거절 사유 (선택)
                </div>
                <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'18px' }}>
                  {tx.counterparty.name}에게 거절 사유가 자동 전달됩니다
                </div>

                <textarea
                  placeholder="예: 일정이 맞지 않아요"
                  rows={3}
                  style={{
                    width:'100%', padding:'14px',
                    background: COLORS.bgMuted,
                    border:'none',
                    borderRadius: RADIUS.md,
                    fontSize:'13px', color: COLORS.t1, outline:'none',
                    fontFamily:'inherit', resize:'none', boxSizing:'border-box',
                    marginBottom:'14px',
                  }}
                />

                <div style={{
                  padding:'12px 14px', background: COLORS.warningBg,
                  borderRadius: RADIUS.md,
                  fontSize:'11px', color:'#854F0B', lineHeight:1.65,
                  marginBottom:'16px',
                }}>
                  거절하면 거래가 즉시 종료되고, 송신자에게 환불됩니다. 이 결정은 되돌릴 수 없어요.
                </div>

                <button onClick={() => setShowActionSheet(null)}
                  style={{
                    width:'100%', height:'52px',
                    background: COLORS.danger, color:'#fff',
                    border:'none', borderRadius: RADIUS.md,
                    fontSize:'15px', fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit',
                  }}>
                  거절하기
                </button>
              </>
            )}

            {showActionSheet === 'negotiate' && (
              <>
                <div style={{ fontSize:'18px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
                  협상 요청
                </div>
                <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'18px' }}>
                  변경하고 싶은 조건을 적어주세요
                </div>

                <textarea
                  placeholder="예: 작업 기간을 8월 말까지로 늘려주세요"
                  rows={4}
                  style={{
                    width:'100%', padding:'14px',
                    background: COLORS.bgMuted,
                    border:'none',
                    borderRadius: RADIUS.md,
                    fontSize:'13px', color: COLORS.t1, outline:'none',
                    fontFamily:'inherit', resize:'none', boxSizing:'border-box',
                    marginBottom:'14px',
                  }}
                />

                <div style={{
                  padding:'12px 14px', background: COLORS.infoBg,
                  borderRadius: RADIUS.md,
                  fontSize:'11px', color:'#1E5294', lineHeight:1.65,
                  marginBottom:'16px',
                }}>
                  협상 요청은 메시지로 전달되며, 송신자가 조건을 수정해서 다시 보낼 수 있어요. 자금은 그대로 보관됩니다.
                </div>

                <button onClick={() => { setShowActionSheet(null); goToChat() }}
                  style={{
                    width:'100%', height:'52px',
                    background: theme.brandDark, color:'#fff',
                    border:'none', borderRadius: RADIUS.md,
                    fontSize:'15px', fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit',
                    boxShadow: SHADOWS.buttonBrand,
                  }}>
                  협상 메시지 보내기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </PhoneShell>
  )
}

// ─────────────────────────────────────────────────────────
// StoreTransactionDetail — store 거래의 간소 상세 화면
// ─────────────────────────────────────────────────────────
function StoreTransactionDetail({ id }) {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const tx = getTransactionById(id)

  if (!tx) {
    return (
      <PhoneShell>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 40px' }}>
          <div style={{ fontSize:'14px', color: COLORS.t3, marginBottom:'14px' }}>거래를 찾을 수 없어요</div>
          <button onClick={() => navigate('/alerts')}
            style={{ padding:'12px 24px', background: theme.brandDark, color:'#fff', border:'none', borderRadius:'12px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            알림으로 돌아가기
          </button>
        </div>
      </PhoneShell>
    )
  }

  const meta = TX_TYPE_META[tx.type] || { icon: '💼', labelKo: tx.type }
  const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')

  // 진행률
  const progress = tx.amount > 0 ? Math.round((tx.executedAmount / tx.amount) * 100) : 0

  // 활성 마일스톤 — 가장 최근 paid 다음 단계 (또는 첫 pending)
  const activeMsIndex = (() => {
    if (!Array.isArray(tx.milestones)) return -1
    for (let i = 0; i < tx.milestones.length; i++) {
      if (tx.milestones[i].status !== 'paid') return i
    }
    return tx.milestones.length - 1
  })()

  // 상대방 이름 (메시지 버튼용)
  const counterpartyName = tx.toRecipientName || ''

  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* 다크 헤더 (일관된 디자인) */}
        <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'28px', paddingLeft:'16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
            <button onClick={() => navigate(-1)}
              style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>
              {meta.icon} {tx.dealTitle || meta.labelKo} 진행 상태
            </div>
          </div>

          {/* 카운터파티 + 진행률 */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
            <div style={{
              width:'44px', height:'44px',
              borderRadius: tx.toRecipientIsBusiness ? '12px' : '50%',
              background: tx.toRecipientAvatarBg,
              color: tx.toRecipientAvatarFg,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'15px', fontWeight:700, flexShrink:0,
            }}>
              {tx.toRecipientInitial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
                <span style={{ fontSize:'17px', fontWeight:700, color:'#fff' }}>{tx.toRecipientName}</span>
                {tx.toRecipientVerified && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#10B981" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {tx.toRecipientIsBusiness && (
                  <span style={{ fontSize:'10px', padding:'1px 6px', background:'rgba(255,255,255,0.15)', borderRadius:'4px', color:'#fff' }}>사업자</span>
                )}
              </div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>
                {meta.labelKo} · 내가 보냄
              </div>
            </div>
            <div style={{
              padding:'5px 12px',
              background:'rgba(255,255,255,0.15)',
              borderRadius:'14px',
              fontSize:'12px', fontWeight:700, color:'#fff',
              flexShrink:0,
            }}>
              {progress}%
            </div>
          </div>

          {/* 진행률 바 */}
          <div style={{ height:'4px', background:'rgba(255,255,255,0.15)', borderRadius:'2px', marginBottom:'12px', overflow:'hidden' }}>
            <div style={{
              width:`${progress}%`, height:'100%',
              background: progress === 100 ? '#10B981' : '#F59E0B',
              borderRadius:'2px',
            }}/>
          </div>

          {/* 큰 금액 표기 */}
          <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'4px' }}>
            <span style={{ fontSize:'28px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>
              {fmt(tx.executedAmount)}
            </span>
            <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.5)' }}>
              / {fmt(tx.amount)}원
            </span>
          </div>
          {tx.dealTitle && (
            <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)', marginTop:'4px' }}>
              {tx.dealTitle}
            </div>
          )}
          {tx.dealDescription && (
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>
              {tx.dealDescription}
            </div>
          )}
        </div>

        {/* 본문 */}
        <div style={{ padding:'18px 16px 100px' }}>

          {/* 단계별 진행 (마일스톤) */}
          {Array.isArray(tx.milestones) && tx.milestones.length > 0 && (
            <div style={{ marginBottom:'18px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'8px', padding:'0 4px' }}>
                단계별 진행
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {tx.milestones.map((ms, i) => {
                  const isPaid = ms.status === 'paid'
                  const isActive = i === activeMsIndex && !isPaid
                  const hasConditions = Array.isArray(ms.conditions) && ms.conditions.length > 0
                  return (
                    <div key={ms.id} style={{
                      background: COLORS.bgCard,
                      borderRadius: RADIUS.lg,
                      boxShadow: SHADOWS.card,
                      border: isActive ? `2px solid ${COLORS.warning}` : 'none',
                      padding:'14px 16px',
                    }}>
                      {/* 상단: 번호 + 라벨 + 금액 */}
                      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                        <div style={{
                          width:'24px', height:'24px',
                          borderRadius:'50%',
                          background: isPaid ? '#10B981' : isActive ? '#F59E0B' : '#E5E7EB',
                          color:'#fff',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'12px', fontWeight:700,
                          flexShrink:0,
                        }}>
                          {isPaid ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : (i + 1)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                            {ms.label}
                          </div>
                          {(ms.date || ms.note) && (
                            <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                              {ms.date && (isActive ? `마감 ${ms.date}` : ms.date)}
                              {ms.date && ms.note && ' · '}
                              {ms.note}
                            </div>
                          )}
                        </div>
                        {ms.amount > 0 && (
                          <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, flexShrink:0 }}>
                            {fmt(ms.amount)}원
                          </div>
                        )}
                      </div>

                      {/* 활성 마일스톤의 검수 조건 (잔금 등) */}
                      {isActive && hasConditions && (
                        <div style={{
                          marginTop:'12px',
                          padding:'12px',
                          background:'#FFFBEB',
                          borderRadius: RADIUS.md,
                        }}>
                          <div style={{ fontSize:'11px', fontWeight:700, color:'#854F0B', marginBottom:'8px' }}>
                            {ms.label.replace(/\d+%/, '').trim()} 집행 조건 ({ms.conditions.filter(c => c.done).length}/{ms.conditions.length} 충족)
                          </div>
                          {ms.conditions.map((cond, ci) => (
                            <div key={ci} style={{
                              display:'flex', alignItems:'flex-start', gap:'8px',
                              padding:'6px 0',
                              borderTop: ci > 0 ? '1px solid rgba(133,79,11,0.1)' : 'none',
                            }}>
                              <div style={{
                                width:'14px', height:'14px',
                                borderRadius:'50%',
                                background: cond.done ? '#10B981' : 'transparent',
                                border: cond.done ? 'none' : `1.5px solid ${COLORS.t5}`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                flexShrink:0,
                                marginTop:'2px',
                              }}>
                                {cond.done && (
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:'12px', fontWeight:600, color:'#854F0B' }}>{cond.label}</div>
                                {cond.sub && (
                                  <div style={{ fontSize:'10px', color:'#92400E', marginTop:'1px' }}>{cond.sub}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 투자/자금 지원 정보 (investMeta 있을 때) */}
          {tx.investMeta && (() => {
            const isSupport = tx.investMeta.type === 'support'
            const cardTitle = isSupport ? '자금 지원 정보' : '투자 정보'
            const rows = isSupport
              ? [
                  ...(tx.investMeta.purposeLabel ? [{ label: '지원 명목', value: tx.investMeta.purposeLabel }] : []),
                  ...(tx.investMeta.purposeMemo ? [{ label: '지원 사유', value: tx.investMeta.purposeMemo }] : []),
                  ...(tx.investMeta.period ? [{ label: '사용 기간', value: tx.investMeta.period }] : []),
                  ...(tx.investMeta.reportFreq && tx.investMeta.reportFreq !== '보고 없음'
                    ? [{ label: '보고 주기', value: `${tx.investMeta.reportFreq} PDF 자동` }]
                    : tx.investMeta.reportFreq === '보고 없음'
                      ? [{ label: '보고 주기', value: '없음' }]
                      : []),
                  ...(typeof tx.investMeta.autoRefund === 'boolean'
                    ? [{ label: '미사용 잔액', value: tx.investMeta.autoRefund ? '자동 환급' : '별도 정산' }]
                    : []),
                ]
              : [
                  { label: '투자 형태', value: tx.investMeta.typeLabel },
                  ...(tx.investMeta.equityPct ? [{ label: '취득 지분율', value: `${tx.investMeta.equityPct}%` }] : []),
                  ...(tx.investMeta.valuation ? [{ label: '회사 가치 (추산)', value: tx.investMeta.valuation }] : []),
                  ...(tx.investMeta.interestRate ? [{ label: '이자율', value: `연 ${tx.investMeta.interestRate}%` }] : []),
                  ...(tx.investMeta.profitShare ? [{ label: '수익 분배', value: `${tx.investMeta.profitShare}%` }] : []),
                  ...(tx.investMeta.period ? [{ label: '계약 기간', value: tx.investMeta.period }] : []),
                  ...(tx.investMeta.reportFreq ? [{ label: '보고 주기', value: tx.investMeta.reportFreq }] : []),
                  ...(tx.investMeta.memo ? [{ label: '투자 사유', value: tx.investMeta.memo }] : []),
                  ...(tx.investMeta.userContractFile ? [{ label: '사용자 첨부 계약서', value: tx.investMeta.userContractFile }] : []),
                ]

            return (
              <div style={{ marginBottom:'18px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'8px', padding:'0 4px' }}>
                  {cardTitle}
                </div>
                <div style={{
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  borderRadius: RADIUS.lg,
                  overflow:'hidden',
                }}>
                  {rows.map((row, i, arr) => (
                    <div key={row.label} style={{
                      padding:'12px 14px',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                      gap:'10px',
                    }}>
                      <span style={{ fontSize:'12px', color: COLORS.t4, flexShrink:0 }}>{row.label}</span>
                      <span style={{
                        fontSize:'12px', fontWeight:600, color: COLORS.t1,
                        textAlign:'right',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* MCC 차단 항목 */}
                {Array.isArray(tx.investMeta.blockedMcc) && tx.investMeta.blockedMcc.length > 0 && (
                  <div style={{
                    marginTop:'8px',
                    padding:'10px 12px',
                    background:'#FEF2F2',
                    border:'1px solid #FECACA',
                    borderRadius: RADIUS.md,
                  }}>
                    <div style={{ fontSize:'11px', fontWeight:700, color:'#991B1B', marginBottom:'4px' }}>
                      🚫 MCC 차단 ({tx.investMeta.blockedMcc.length}개)
                    </div>
                    <div style={{ fontSize:'10px', color:'#991B1B' }}>
                      {tx.investMeta.blockedMcc.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 자금 사용 목적 (investMeta.categories 또는 tx.categories) */}
          {(() => {
            const cats = tx.investMeta?.categories || tx.categories
            if (!Array.isArray(cats) || cats.length === 0) return null
            // 한도 정보가 있는지 (정적 t5는 amount/used, 신규는 라벨만)
            const hasLimits = cats.some(c => c.amount > 0)

            return (
              <div style={{ marginBottom:'18px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'8px', padding:'0 4px' }}>
                  자금 사용 목적
                </div>
                <div style={{
                  background: COLORS.bgCard,
                  boxShadow: SHADOWS.card,
                  borderRadius: RADIUS.lg,
                  padding:'14px',
                }}>
                  {hasLimits ? (
                    // 한도 있는 경우: 진행률 바
                    cats.map((c, i, arr) => {
                      const usagePct = c.amount > 0 ? Math.round(((c.used || 0) / c.amount) * 100) : 0
                      const overLimit = usagePct >= 80
                      return (
                        <div key={c.label} style={{
                          paddingBottom: i < arr.length-1 ? '12px' : 0,
                          marginBottom: i < arr.length-1 ? '12px' : 0,
                          borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                        }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                            <span style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1 }}>
                              {c.label} {c.pct}%
                            </span>
                            <span style={{
                              fontSize:'11px',
                              color: overLimit ? COLORS.danger : COLORS.t4,
                              fontWeight: overLimit ? 700 : 500,
                            }}>
                              {(c.used || 0).toLocaleString()} / {c.amount.toLocaleString()}원
                            </span>
                          </div>
                          <div style={{ height:'3px', borderRadius:'2px', background: COLORS.bgMuted, overflow:'hidden' }}>
                            <div style={{
                              width:`${Math.min(100, usagePct)}%`, height:'100%',
                              background: overLimit ? '#DC2626' : '#10B981',
                              borderRadius:'2px',
                            }} />
                          </div>
                          {overLimit && (
                            <div style={{ fontSize:'10px', color: COLORS.danger, marginTop:'5px', fontWeight:600 }}>
                              ⚠ 한도 {usagePct}% 사용 — 곧 결제 차단
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    // 한도 없는 경우: 칩 형태 (선택한 카테고리 라벨만)
                    <>
                      <div style={{ fontSize:'11px', color: COLORS.t4, marginBottom:'10px', lineHeight:1.5 }}>
                        계약서·정기 보고서에 기재되는 자금 용도
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                        {cats.map((c) => (
                          <div key={c.label} style={{
                            display:'inline-flex', alignItems:'center', gap:'5px',
                            padding:'7px 10px',
                            background: COLORS.bgMuted,
                            borderRadius:'8px',
                            fontSize:'12px', fontWeight:600, color: COLORS.t2,
                          }}>
                            {c.emoji && <span>{c.emoji}</span>}
                            {c.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 활동 타임라인 */}
          {Array.isArray(tx.timeline) && tx.timeline.length > 0 && (
            <div style={{ marginBottom:'18px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'8px', padding:'0 4px' }}>
                활동 타임라인
              </div>
              <div style={{
                background: COLORS.bgCard,
                borderRadius: RADIUS.lg,
                boxShadow: SHADOWS.card,
                padding:'4px 0',
              }}>
                {tx.timeline.map((ev, i) => (
                  <div key={i} style={{
                    padding:'12px 16px',
                    display:'flex', alignItems:'flex-start', gap:'10px',
                    borderBottom: i < tx.timeline.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                  }}>
                    <div style={{
                      width:'8px', height:'8px',
                      borderRadius:'50%',
                      background: ev.type === 'done' ? '#10B981' : ev.type === 'pending' ? '#F59E0B' : COLORS.t5,
                      marginTop:'5px',
                      flexShrink:0,
                    }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t1, marginBottom:'1px' }}>
                        {ev.label}
                      </div>
                      <div style={{ fontSize:'10px', color: COLORS.t4 }}>{ev.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 안전 장치 */}
          {Array.isArray(tx.safety) && tx.safety.length > 0 && (
            <div style={{
              background:'#ECFDF5',
              border:'1px solid #6EE7B7',
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              marginBottom:'14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                <div style={{
                  width:'18px', height:'18px',
                  borderRadius:'50%',
                  background:'#10B981',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <svg width="10" height="8" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>안전 장치</span>
              </div>
              {tx.safety.map((s, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'6px', padding:'3px 0' }}>
                  <span style={{ fontSize:'10px', color:'#047857', marginTop:'1px', flexShrink:0 }}>✓</span>
                  <span style={{ fontSize:'11px', color:'#065F46', lineHeight:1.55 }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* 계약서 보기 */}
          {tx.contractFile && (
            <div style={{
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              boxShadow: SHADOWS.card,
              padding:'12px 14px',
              marginBottom:'14px',
              display:'flex', alignItems:'center', gap:'12px',
              cursor:'pointer',
            }}>
              <div style={{
                width:'34px', height:'34px',
                background:'#EDE9FE',
                borderRadius: RADIUS.md,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>계약서 보기</div>
                <div style={{ fontSize:'11px', color: COLORS.t4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {tx.contractFile}
                </div>
              </div>
              <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
            </div>
          )}

        </div>

        {/* 하단 sticky 버튼 (메시지) */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'12px 16px 24px',
          borderTop:`1px solid ${COLORS.borderSoft}`,
          background: COLORS.bgCard,
        }}>
          <button
            onClick={() => navigate(`/messages?with=${counterpartyName}`)}
            style={{
              width:'100%', height:'52px',
              background: theme.brandDark,
              color:'#fff',
              border:'none',
              borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
              boxShadow: SHADOWS.buttonBrand,
            }}>
            {counterpartyName}과 메시지
          </button>
        </div>

      </div>
    </PhoneShell>
  )
}
