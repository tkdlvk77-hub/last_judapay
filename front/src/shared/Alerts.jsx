import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScrollRestore } from '../hooks/useScrollRestore'
import BottomTab from '../components/BottomTab'
import {
  PhoneShell, GradientHeader, Card, FilterChips,
} from '../design/components'
import { COLORS, RADIUS, SHADOWS, FUND_COLORS, progressGradient } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'
import {
  getMyAlerts,
  markAlertRead,
  formatRelativeTime,
  getMyContractDeals,
} from './transactionStore'
import { useStoreData } from '../hooks/useStoreData'
import { useNoSwipeBack } from '../hooks/useNoSwipeBack'

// userType → 데모 사용자 ID 매핑 (TODO: useUser 확장 시 동적)
function getCurrentUserId(userType) {
  if (userType === 'business') return 'biz_juda'
  if (userType === 'personal') return 'me_juda_kim'
  return null
}

// ─────────────────────────────────────────────────────────
// 데모 데이터
// ─────────────────────────────────────────────────────────
const TRANSACTIONS = [
  // ───── 액션 필요 (최우선) ─────
  {
    id: 't1', type: 'freelance', role: 'sender',
    counterparty: { name:'박철수', initial:'박', kind:'person' },
    amount: 5000000, title: '앱 디자인 메인 5종',
    statusLabel: '중도금 검수 대기',
    statusColor: '#A02929', statusBg: '#FDECEC',
    progress: 30,
    myAction: { label:'검수하기', urgent:true, color:'brand' },
    counterpartyRead: true,
    updatedAt: '3시간 전',
  },
  {
    id: 't2', type: 'freelance', role: 'receiver',
    counterparty: { name:'이호형', initial:'이', kind:'person' },
    amount: 3000000, title: '브랜드 로고 디자인',
    statusLabel: '계약 서명 대기',
    statusColor: '#854F0B', statusBg: '#FFF4E0',
    progress: 0,
    myAction: { label:'계약 검토', urgent:true, color:'brand' },
    counterpartyRead: true,
    updatedAt: '1시간 전',
  },
  {
    id: 't4', type: 'realestate', role: 'sender',
    counterparty: { name:'(주)벨라부동산중개', initial:'벨', kind:'business' },
    amount: 100000000, title: '서울 강남구 역삼동 123-45',
    statusLabel: '잔금 대기',
    statusColor: '#2D6BB0', statusBg: '#EDF3FA',
    progress: 50,
    myAction: { label:'홈택스 PDF 첨부', urgent:false, color:'info' },
    counterpartyRead: true,
    updatedAt: '어제',
  },
  // ───── 진행 중 (액션 없이 대기) ─────
  {
    id: 't3', type: 'lend', role: 'sender',
    counterparty: { name:'박민준', initial:'박', kind:'person' },
    amount: 2000000, title: '6개월 대여 · 연 6%',
    statusLabel: '상대방 서명 대기',
    statusColor: '#854F0B', statusBg: '#FFF4E0',
    progress: 0,
    myAction: null,
    counterpartyRead: false,
    updatedAt: '6시간 전',
    note: '상대방이 아직 차용증 SMS를 확인하지 않았어요',
  },
  {
    id: 't5', type: 'invest', role: 'sender',
    counterparty: { name:'정창업', initial:'정', kind:'person' },
    amount: 10000000, title: '창업 자금 지원',
    statusLabel: '진행 중',
    statusColor: '#085041', statusBg: '#E6F5EF',
    progress: 100,
    myAction: null,
    counterpartyRead: true,
    updatedAt: '3일 전',
  },
  // ───── 완료 ─────
  {
    id: 't6', type: 'gift', role: 'sender',
    counterparty: { name:'이유진', initial:'이', kind:'person' },
    amount: 50000, title: '생일 축하',
    statusLabel: '입금 완료',
    statusColor: '#085041', statusBg: '#E6F5EF',
    progress: 100,
    myAction: null,
    counterpartyRead: true,
    updatedAt: '1주 전',
  },
  // ───── 거절/취소 ─────
  {
    id: 't7', type: 'lend', role: 'receiver',
    counterparty: { name:'김지인', initial:'김', kind:'person' },
    amount: 500000, title: '단기 대여',
    statusLabel: '거절됨',
    statusColor: '#9B9990', statusBg: '#F2EFE9',
    progress: 0,
    myAction: null,
    counterpartyRead: true,
    updatedAt: '2주 전',
    rejected: true,
  },
]

const SYSTEM_ALERTS = [
  {
    id:'invite1', isRead:false, type:'invite',
    title:'㈜주다컴퍼니 기업 초대',
    desc:'이대표님이 재무담당자로 초대했습니다. 수락하면 기업 계정으로 전환할 수 있어요.',
    time:'방금', tag:'초대', tagColor:'#1D4ED8', tagBg:'#EFF6FF',
    route: null,
    inviteMeta: { company:'㈜주다컴퍼니', role:'재무담당자', inviter:'이대표' },
  },
  {
    id:'a1', isRead:false, type:'block',
    title:'MCC 차단 — GS강남게임센터',
    desc:'박철수 지갑 · MCC 7993 (오락/게임) 결제 시도 차단됨',
    time:'방금', tag:'차단', tagColor:'#A02929', tagBg:'#FDECEC',
    route:'/payments/p2', // 차단된 결제 상세
  },
  {
    id:'a2', isRead:false, type:'warning',
    title:'서울시 교육비 지원 · 만료 D-3',
    desc:'이유진 지갑 MCC 교육(8299) 허용 잔액 200,000원 · 2026.05.09 만료',
    time:'1시간 전', tag:'주의', tagColor:'#854F0B', tagBg:'#FFF4E0',
    route:'/wallet/edu', // 해당 지갑 상세
  },
  {
    id:'a3', isRead:false, type:'limit',
    title:'카테고리 한도 80% 초과 알림',
    desc:'정창업 자금 지원 · 마케팅비 카테고리 800,000원 / 1,000,000원 사용',
    time:'5시간 전', tag:'한도', tagColor:'#854F0B', tagBg:'#FFF4E0',
    route:'/wallet/edu', // 데모용 — 실제는 자금 지원 지갑
  },
  {
    id:'a4', isRead:true, type:'success',
    title:'충전 완료 — 500,000원',
    desc:'국민 ****-8901 → MY 지갑 · 잔액 1,932,000원',
    time:'어제', tag:'충전', tagColor:'#047857', tagBg:'#D1FAE5',
    route:'/payments/txn_my_5', // 충전 거래 상세
  },
  {
    id:'a5', isRead:true, type:'report',
    title:'분기 보고서 PDF 생성 완료',
    desc:'정창업 자금 지원 · 2026 Q2 보고서 다운로드 가능',
    time:'2일 전', tag:'보고', tagColor:'#1E5294', tagBg:'#EDF3FA',
    route:null, // 보고서 다운로드 (현재 미구현 — 토스트 등으로 대체)
  },
  {
    id:'a6', isRead:true, type:'system',
    title:'주다페이 약관 변경 안내',
    desc:'2026.05.20부터 적용 · 자세히 보기',
    time:'1주 전', tag:'공지', tagColor:'#4B5563', tagBg:'#F3F4F6',
    route:null, // 공지사항 상세 (미구현)
  },
]

const FUND_META = {
  freelance:    { emoji:'🧾', label:'외주비' },
  marketing:    { emoji:'📢', label:'마케팅비' },
  lend:         { emoji:'💸', label:'대여금' },
  personalLend: { emoji:'💸', label:'빌려주기' },
  realestate:   { emoji:'🏠', label:'부동산' },
  invest:       { emoji:'📈', label:'투자' },
  support:      { emoji:'🌱', label:'자금 지원' },
  gift:         { emoji:'🎁', label:'용돈선물' },
  bonus:        { emoji:'🎉', label:'상여금' },
  condolence:   { emoji:'💐', label:'경조사비' },
  otherIncome:  { emoji:'📋', label:'기타소득' },
}

// ─────────────────────────────────────────────────────────
// 읽음 표시 (✓ 또는 ✓✓)
// ─────────────────────────────────────────────────────────
function ReadIndicator({ read, role, counterpartyRead }) {
  const theme = getAccountTheme()
  // sender 입장: 상대방이 읽었는지
  // receiver 입장: 본인이 봤는지 (counterpartyRead는 송신 측 확인)
  const label = role === 'sender'
    ? (counterpartyRead ? '읽음' : '미읽음')
    : (counterpartyRead ? '상대 확인' : '미읽음')
  const isRead = counterpartyRead
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'3px' }}>
      <svg width="13" height="11" viewBox="0 0 14 11" fill="none">
        <path
          d="M1 6l3 3 9-9"
          stroke={isRead ? theme.brandDark : COLORS.t4}
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <span style={{
        fontSize:'11px',
        color: isRead ? theme.brandDark : COLORS.t4,
        fontWeight: 500,
      }}>
        {label}
      </span>
    </span>
  )
}

// 액션 버튼 — 자금 종류별 색상 매핑
function getActionStyle(action, type) {
  const theme = getAccountTheme()
  if (!action) return null
  // 부동산 → 파란 (info 톤), 그 외 액션 → 보라 (브랜드)
  if (action.color === 'info' || type === 'realestate') {
    return {
      bg: '#3B82F6', // 파랑
      color: '#fff',
    }
  }
  return {
    bg: theme.brandDark, // 진한 브랜드
    color: '#fff',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [헷갈림 주의] adaptStoreAlert — store 알림 → UI 알림 형태 변환
//
// store(transactionStore.js)가 생성하는 알림 객체와
// 이 파일의 SYSTEM_ALERTS 객체는 필드명이 다름 → 반드시 변환 필요
//
// store 알림 원본 필드:
//   id, txId, userId, direction('sent'|'received'), icon, title, body,
//   isRead(bool), createdAt(ISO string), walletRoute(string|null)
//
// 변환 후 UI 필드:
//   id, isRead, type, title(icon+title 합침), desc(body), time(상대 시간),
//   tag, tagColor, tagBg, route(walletRoute),
//   _fromStore: true   ← 정렬 로직에서 store 출처 구분용 (반드시 포함)
//   _createdAt         ← 정확한 timestamp 정렬용 (ISO string 그대로)
//   _txId              ← 거래 상세 연결 시 사용 (현재 미사용, 추후 라우팅 확장용)
//
// 실제 개발 시 주의:
//   - direction 'sent'    → 사용자가 돈을 보낸 집행 완료 (예: 생활비 자동지급)
//   - direction 'received' → 사용자에게 입금이 들어온 알림
// ─────────────────────────────────────────────────────────────────────────────
function adaptStoreAlert(a) {
  // direction 'sent' (내가 보낸 거 — 집행 완료) / 'received' (입금 받음)
  const tag = a.direction === 'sent' ? '집행' : '입금'
  const tagBg = a.direction === 'sent' ? '#EDF3FA' : '#E6F5EF'
  const tagColor = a.direction === 'sent' ? '#1E5294' : '#085041'
  return {
    id: a.id,
    isRead: a.isRead,
    type: a.direction,
    title: `${a.icon} ${a.title}`,
    desc: a.body,
    time: formatRelativeTime(a.createdAt),
    tag,
    tagColor,
    tagBg,
    route: a.walletRoute || null,  // 생활비 등 지갑 상세 연결
    _fromStore: true,             // store 출처 표시 (정렬/클릭 처리용)
    _createdAt: a.createdAt,      // 정렬용 raw timestamp
    _txId: a.txId,                // 거래 상세로 연결 시 사용
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [헷갈림 주의] 정적 알림 정렬 — 문자열 "3시간 전" → 분(minute) 수치 변환
//
// SYSTEM_ALERTS(정적 데이터)는 createdAt(Date)이 없고 time: '3시간 전' 같은
// 한국어 문자열만 존재. store 알림은 createdAt ISO string이 있음.
//
// 두 출처를 하나의 배열로 정렬하려면 단위를 통일해야 함:
//   store 알림  → Math.floor((now - new Date(createdAt)) / 60000) = 분 전
//   정적 알림   → staticAlertSortValue(time) = 분 전(근사치)
//
// 값이 작을수록 최신(화면 위). 큰 값(99999999)은 아주 오래된 항목으로 간주.
// 단 정적 데이터는 매 렌더마다 same value → 상대 순서는 SYSTEM_ALERTS 배열 순서 유지.
// ─────────────────────────────────────────────────────────────────────────────
// 기존 SYSTEM_ALERTS에 임의 정렬용 timestamp 부여
// (데모 데이터는 _createdAt 없으니 'time' 문자열 기반으로 대충 매핑)
const STATIC_TIME_MAP = {
  '방금': 0, '1분 전': 1, '10분 전': 10,
  '1시간 전': 60, '2시간 전': 120, '3시간 전': 180, '5시간 전': 300, '6시간 전': 360,
  '오늘': 600, '어제': 60 * 24, '2일 전': 60 * 24 * 2, '3일 전': 60 * 24 * 3,
  '1주 전': 60 * 24 * 7, '2주 전': 60 * 24 * 14,
}

function staticAlertSortValue(timeStr) {
  if (!timeStr) return 99999999
  // X분 전 / X시간 전 / X일 전 매칭
  const minMatch = timeStr.match(/^(\d+)분/)
  if (minMatch) return parseInt(minMatch[1], 10)
  const hourMatch = timeStr.match(/^(\d+)시간/)
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60
  const dayMatch = timeStr.match(/^(\d+)일/)
  if (dayMatch) return parseInt(dayMatch[1], 10) * 60 * 24
  const weekMatch = timeStr.match(/^(\d+)주/)
  if (weekMatch) return parseInt(weekMatch[1], 10) * 60 * 24 * 7
  return STATIC_TIME_MAP[timeStr] ?? 99999999
}

// ─────────────────────────────────────────────────────────
// store 거래(contract) → TRANSACTIONS 카드 형태로 변환
//
// store deal: { id, type, dealTitle, milestones, statusLabel, myAction, ... }
// TRANSACTIONS 형태: { id, type, role, counterparty, amount, title,
//                     statusLabel, statusColor, statusBg, progress,
//                     myAction, counterpartyRead, updatedAt }
// ─────────────────────────────────────────────────────────

// 상태 라벨 → 색상 매핑
const STATUS_TONE_BY_KEYWORD = [
  { keys: ['검수', '서명 대기'],     color: '#854F0B', bg: '#FFF4E0' },     // 노랑 — 액션 필요
  { keys: ['거절', '취소'],          color: '#9B9990', bg: '#F2EFE9' },     // 회색
  { keys: ['진행 중', '진행중'],     color: '#085041', bg: '#E6F5EF' },     // 녹색 — 정상
  { keys: ['대기'],                 color: '#854F0B', bg: '#FFF4E0' },     // 노랑 — 그 외 대기
  { keys: ['완료'],                 color: '#085041', bg: '#E6F5EF' },     // 녹색
]

function getStatusTone(statusLabel) {
  if (!statusLabel) return { color: '#085041', bg: '#E6F5EF' }
  for (const rule of STATUS_TONE_BY_KEYWORD) {
    if (rule.keys.some(k => statusLabel.includes(k))) {
      return { color: rule.color, bg: rule.bg }
    }
  }
  return { color: '#085041', bg: '#E6F5EF' }
}

function adaptStoreDeal(deal, currentUserId) {
  const role = deal.fromUserId === currentUserId ? 'sender' : 'receiver'
  const otherParty = role === 'sender'
    ? {
        name: deal.toRecipientName,
        initial: deal.toRecipientInitial || (deal.toRecipientName?.charAt(0) || '?'),
        kind: deal.toRecipientIsBusiness ? 'business' : 'person',
      }
    : {
        name: deal.fromUserName,
        initial: deal.fromUserName?.charAt(0) || '?',
        kind: deal.fromUserType === 'business' ? 'business' : 'person',
      }

  // 진행률 = executedAmount / amount
  const progress = deal.amount > 0
    ? Math.round((deal.executedAmount / deal.amount) * 100)
    : 0

  const tone = getStatusTone(deal.statusLabel)
  const rejected = deal.dealStatus === 'rejected' || deal.dealStatus === 'cancelled'

  return {
    id: deal.id,                   // 'tx_0001' 같은 string ID
    type: deal.type,
    role,
    counterparty: otherParty,
    amount: deal.amount,
    title: deal.dealTitle || deal.reason || '',
    statusLabel: deal.statusLabel || (rejected ? '거절됨' : '진행 중'),
    statusColor: rejected ? '#9B9990' : tone.color,
    statusBg: rejected ? '#F2EFE9' : tone.bg,
    progress,
    myAction: deal.myAction,
    counterpartyRead: true,        // 데모 — 이후 실제 read 상태로 대체
    updatedAt: formatRelativeTime(deal.createdAt),
    rejected,
    _fromStore: true,
    _txId: deal.id,
    _createdAt: deal.createdAt,
  }
}

export default function Alerts() {
  useNoSwipeBack()
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const { userType } = useUser()
  const currentUserId = getCurrentUserId(userType)
  const scrollRef = useScrollRestore()
  const [mainTab, setMainTab] = useState('transactions') // 'transactions' | 'system'
  const [roleFilter, setRoleFilter] = useState('all')

  // ── 권한 체크 ──────────────────────────────────────────
  // 기업 viewer는 계약 서명·검수 등 액션 버튼 비활성
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canAct = userType !== 'business' || !['viewer'].includes(bizRole)

  // ── 기업 초대 상태 ─────────────────────────────────────
  const [inviteStatus, setInviteStatus] = useState(
    () => sessionStorage.getItem('bizInviteStatus') || 'pending' // 'pending'|'accepted'|'declined'
  )

  const handleInviteAccept = () => {
    sessionStorage.setItem('bizInviteAccepted', 'true')
    sessionStorage.setItem('bizInviteStatus', 'accepted')
    sessionStorage.setItem('bizInviteCompany', '㈜주다컴퍼니')
    sessionStorage.setItem('bizInviteRole', '재무담당자')
    setInviteStatus('accepted')
  }

  const handleInviteDecline = () => {
    sessionStorage.setItem('bizInviteStatus', 'declined')
    setInviteStatus('declined')
  }

  // 생활비 자동지급 알림 (개인 전용)
  const [autoPayAlerts, setAutoPayAlerts] = useState([])
  useEffect(() => {
    if (userType !== 'personal') return
    let cancelled = false
    import('../personal/execute/autoPayLivingStore').then(({ subscribeAutoPayLiving, getAutoPayAlerts }) => {
      if (cancelled) return
      return subscribeAutoPayLiving(() => {
        setAutoPayAlerts(getAutoPayAlerts())
      })
    })
    return () => { cancelled = true }
  }, [userType])

  // store에서 본인 알림 구독 (자동 리렌더)
  const storeAlerts = useStoreData(
    () => getMyAlerts({ userId: currentUserId })
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // [헷갈림 주의] 시스템 알림 3중 병합 — fromStore + fromAutoPay + fromStatic
  //
  // 알림 출처가 3개인 이유:
  //   1. fromStore      → transactionStore.js의 실시간 알림 (거래 발생 즉시 생성됨)
  //                       예: 생활비 집행, 외주비 입금 등 실제 거래 기반
  //   2. fromAutoPay    → autoPayLivingStore.js의 자동지급 알림 (개인 전용)
  //                       생활비 자동지급 결과 (충전 성공/잔액 부족 등)
  //                       개인 userType에서만 구독 (useEffect에서 userType 체크)
  //   3. fromStatic     → 이 파일의 SYSTEM_ALERTS 배열 (데모 전용 하드코딩)
  //                       차단, 만료, 한도, 공지 등 시스템 알림 예시
  //                       실제 개발 시 백엔드 API 또는 별도 store로 대체 예정
  //
  // 정렬 기준: "몇 분 전" 단위로 통일 후 오름차순 (작을수록 최신 → 화면 위)
  //   - fromStore: _createdAt(ISO string) → 분 단위 계산 (정확)
  //   - fromAutoPay/fromStatic: _staticSort(분 근사값) 사용 (부정확하나 데모용)
  //
  // 동점 처리: fromStore를 배열 앞에 두므로 같은 분이면 store 알림이 우선
  // ─────────────────────────────────────────────────────────────────────────────
  // 합쳐진 시스템 알림 — auto-pay 알림 + store alert + 정적 SYSTEM_ALERTS, 시간 역순
  const mergedSystemAlerts = (() => {
    // 생활비 자동지급 알림을 SYSTEM_ALERTS 형태로 변환
    const fromAutoPay = autoPayAlerts.map(a => ({
      id: a.id,
      isRead: false,
      type: a.type === 'auto_pay_insufficient' ? 'warning' : 'limit',
      title: a.title,
      desc: a.body,
      time: a.time,
      tag: a.type === 'auto_pay_insufficient' ? '잔액부족' : '자동지급',
      tagColor: a.type === 'auto_pay_insufficient' ? '#C2410C' : '#047857',
      tagBg: a.type === 'auto_pay_insufficient' ? '#FFF7ED' : '#ECFDF5',
      route: a.route,
      _fromStore: false,
      _staticSort: staticAlertSortValue(a.time),  // 실시간 timestamp 기반 정렬
    }))
    const fromStore = storeAlerts.map(adaptStoreAlert)
    const fromStatic = SYSTEM_ALERTS.map(a => ({
      ...a,
      _fromStore: false,
      _staticSort: staticAlertSortValue(a.time),
    }))
    // fromStore를 배열 앞에 두면 동점(같은 분) 시 store 알림이 앞에 위치
    return [...fromStore, ...fromAutoPay, ...fromStatic].sort((a, b) => {
      // store 항목은 _createdAt 사용 (최신이 위)
      // 정적 항목은 _staticSort (작을수록 최신)
      // 둘 다 같이 정렬: store 거를 정확한 timestamp 기반,
      // 정적은 분 단위 근사값으로
      const now = Date.now()
      const aMinAgo = a._fromStore
        ? Math.floor((now - new Date(a._createdAt).getTime()) / 60000)
        : a._staticSort
      const bMinAgo = b._fromStore
        ? Math.floor((now - new Date(b._createdAt).getTime()) / 60000)
        : b._staticSort
      return aMinAgo - bMinAgo
    })
  })()

  // store에서 본인의 거래형 거래 구독 (Alerts 거래 탭용)
  const storeDeals = useStoreData(
    () => getMyContractDeals({ userId: currentUserId })
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // [헷갈림 주의] allTx = storeDeals + TRANSACTIONS 병합
  //
  // 거래 탭에는 두 출처의 거래가 합쳐짐:
  //   1. storeDeals  → transactionStore.js에서 실시간으로 생성된 거래
  //                    사용자가 앱 안에서 새로 진행한 계약/집행 등
  //   2. TRANSACTIONS → 이 파일 상단의 하드코딩 데모 거래 목록
  //                    실제 개발 시 전부 storeDeals로 대체 예정
  //
  // storeDeals가 앞에 오므로 실시간 거래가 최신 순으로 앞에 위치.
  // 각 항목은 adaptStoreDeal()로 UI 카드 형태(TRANSACTIONS 구조)로 변환됨.
  //
  // adaptStoreDeal: store deal { fromUserId, toRecipientName, ... }
  //              → UI   { id, type, role, counterparty, amount, ... }
  //   - role: fromUserId === currentUserId → 'sender', 아니면 'receiver'
  //   - counterparty: role에 따라 상대방 정보 다르게 추출
  //   - counterpartyRead: 데모에서는 항상 true, 실제는 read 상태 API 필요
  // ─────────────────────────────────────────────────────────────────────────────
  // 거래 탭: 정적 TRANSACTIONS + store 거래형 합침
  const allTx = [
    ...storeDeals.map(d => adaptStoreDeal(d, currentUserId)),
    ...TRANSACTIONS,
  ]

  const filteredTx = allTx.filter(tx => {
    if (roleFilter === 'all') return true
    if (roleFilter === 'sender') return tx.role === 'sender'
    if (roleFilter === 'receiver') return tx.role === 'receiver'
    if (roleFilter === 'action') return !!tx.myAction
    return true
  })

  const sortedTx = [...filteredTx].sort((a, b) => {
    // "액션 필요" 탭에서만 urgent 우선 → 시간순
    // 그 외 탭(전체/내가 보낸/내가 받은)은 시간순만
    if (roleFilter === 'action') {
      const aUrgent = a.myAction?.urgent ? 2 : a.myAction ? 1 : 0
      const bUrgent = b.myAction?.urgent ? 2 : b.myAction ? 1 : 0
      if (aUrgent !== bUrgent) return bUrgent - aUrgent
    }

    // 시간 역순 (최신이 위) — 분 단위 통일
    // store 항목: _createdAt → 분 단위 변환
    // 정적 항목: updatedAt 문자열 ("3시간 전") → staticAlertSortValue
    const now = Date.now()
    const aMinAgo = a._createdAt
      ? Math.floor((now - new Date(a._createdAt).getTime()) / 60000)
      : staticAlertSortValue(a.updatedAt)
    const bMinAgo = b._createdAt
      ? Math.floor((now - new Date(b._createdAt).getTime()) / 60000)
      : staticAlertSortValue(b.updatedAt)
    return aMinAgo - bMinAgo   // 분 단위 작을수록 최신 → 위
  })

  const actionCount = allTx.filter(tx => !!tx.myAction).length
  const txCount = allTx.length
  const unreadAlertCount = mergedSystemAlerts.filter(a => !a.isRead).length

  // 시스템 알림 클릭
  const handleAlertClick = (a) => {
    // store alert이면 읽음 처리
    if (a._fromStore) {
      markAlertRead(a.id)
    }
    if (a.route) navigate(a.route)
    // store alert도 거래 상세로 연결하고 싶으면 추후 라우트 추가
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#F4F6FB' }}>

        {/* 다크 그라데이션 헤더 */}
        <GradientHeader paddingBottom="16px" bg={theme.headerGrad}>
          <div style={{ padding:'4px 20px 18px' }}>
            <div style={{ fontSize:'24px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px', marginBottom:'4px' }}>
              알림
            </div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)' }}>
              처리 필요한 항목이{' '}
              <strong style={{ color:'#FCA5A5', fontWeight:700 }}>{actionCount}개</strong> 있어요
            </div>
          </div>

          {/* 메인 탭 (거래 / 알림) */}
          <div style={{
            display:'flex',
            padding:'0 20px',
            gap:'24px',
            borderBottom:'1px solid rgba(255,255,255,0.12)',
            marginBottom:'14px',
          }}>
            {[
              { id:'transactions', label:'거래', count: txCount },
              { id:'system',       label:'알림', count: unreadAlertCount },
            ].map(tab => {
              const active = mainTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  style={{
                    padding:'8px 0',
                    background:'none', border:'none',
                    borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                    marginBottom:'-1px',
                    cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:'6px',
                  }}>
                  <span style={{
                    fontSize:'15px',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  }}>
                    {tab.label}
                  </span>
                  {tab.count > 0 && (
                    <span style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      minWidth:'18px', height:'18px',
                      padding:'0 6px',
                      borderRadius:'9px',
                      background: COLORS.danger,
                      color:'#fff',
                      fontSize:'10px', fontWeight:700,
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 역할 필터 (거래 탭일 때만) */}
          {mainTab === 'transactions' && (
            <FilterChips
              dark
              value={roleFilter}
              onChange={setRoleFilter}
              items={[
                { id:'all',      label:'전체' },
                { id:'sender',   label:'내가 보낸' },
                { id:'receiver', label:'내가 받은' },
                { id:'action',   label:'액션 필요', count: actionCount },
              ]}
            />
          )}
        </GradientHeader>

        {/* 라이트 영역 — 카드 리스트 */}
        <div style={{ padding:'18px 16px 24px' }}>

          {/* 거래 탭 */}
          {mainTab === 'transactions' && (
            sortedTx.length === 0 ? (
              <div style={{ padding:'40px 16px', textAlign:'center', color:COLORS.t4, fontSize:'13px' }}>
                해당 거래가 없어요
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {sortedTx.map(tx => {
                  const meta = FUND_META[tx.type] || { emoji:'', label:'' }
                  const fundColor = FUND_COLORS[tx.type]
                  const actionStyle = getActionStyle(tx.myAction, tx.type)
                  const isFinished = tx.progress >= 100 || tx.rejected

                  return (
                    <button
                      key={tx.id}
                      onClick={() => navigate(`/transactions/${tx.id}`)}
                      style={{
                        width:'100%',
                        background: COLORS.bgCard,
                        borderRadius: RADIUS.lg,
                        boxShadow: SHADOWS.card,
                        padding:'14px 16px',
                        border:'none',
                        cursor:'pointer', textAlign:'left',
                        fontFamily:'inherit',
                        display:'flex', flexDirection:'column', gap:'10px',
                      }}>
                      {/* 1행: 이름 + 송수신 화살표 + 자금 종류 + 시간 */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
                          <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
                            {tx.counterparty.name}
                          </span>
                          {/* 송수신 화살표 */}
                          {tx.role === 'sender' ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6h7 M6 2l3 4-3 4" stroke={COLORS.t4} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10 6H3 M6 2L3 6l3 4" stroke={theme.brandDark} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {fundColor && (
                            <span style={{
                              display:'inline-flex', alignItems:'center', gap:'3px',
                              padding:'2px 7px',
                              background: fundColor.bg,
                              color: fundColor.main,
                              borderRadius:'5px',
                              fontSize:'10px', fontWeight:700,
                            }}>
                              {meta.emoji} {meta.label}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize:'10px', color: COLORS.t4, flexShrink:0, marginLeft:'8px' }}>
                          {tx.updatedAt}
                        </span>
                      </div>

                      {/* 2행: 금액 (큰 글씨) */}
                      <div style={{ fontSize:'20px', fontWeight:700, color: COLORS.t1, letterSpacing:'-0.5px' }}>
                        {tx.amount.toLocaleString()}원
                      </div>

                      {/* 3행: 진행률 바 (제목 자리) — title이 있으면 위에 작은 글씨로 */}
                      {tx.title && tx.progress > 0 && tx.progress < 100 && (
                        <div>
                          <div style={{
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            marginBottom:'4px',
                          }}>
                            <span style={{ fontSize:'11px', color: COLORS.t4 }}>
                              {tx.title}
                            </span>
                            <span style={{
                              fontSize:'11px', fontWeight:700,
                              color: tx.progress >= 100 ? theme.brandDark
                                  : tx.progress >= 70 ? COLORS.danger
                                  : tx.progress >= 40 ? COLORS.warning
                                  : COLORS.danger,
                            }}>
                              {tx.progress}%
                            </span>
                          </div>
                          <div style={{
                            height:'3px', background: COLORS.bgMuted,
                            borderRadius: RADIUS.pill, overflow:'hidden',
                          }}>
                            <div style={{
                              width:`${tx.progress}%`, height:'100%',
                              background: progressGradient(tx.progress),
                              borderRadius: RADIUS.pill,
                              transition:'width .3s',
                            }} />
                          </div>
                        </div>
                      )}

                      {/* title만 있고 진행률 0/100인 경우 — title은 그냥 표시 */}
                      {tx.title && (tx.progress === 0 || tx.progress >= 100) && (
                        <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                          {tx.title}
                        </div>
                      )}

                      {/* 4행: 상태 배지 + 읽음 표시 + 액션 버튼 */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{
                            display:'inline-flex', alignItems:'center',
                            padding:'4px 10px',
                            background: tx.statusBg,
                            color: tx.statusColor,
                            borderRadius:'6px',
                            fontSize:'11px', fontWeight:600,
                          }}>
                            {tx.statusLabel}
                          </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <ReadIndicator
                            role={tx.role}
                            counterpartyRead={tx.counterpartyRead}
                          />
                          {tx.myAction && actionStyle && (
                            canAct ? (
                              <span style={{
                                display:'inline-flex', alignItems:'center', gap:'5px',
                                padding:'6px 12px',
                                background: actionStyle.bg,
                                color: actionStyle.color,
                                borderRadius:'8px',
                                fontSize:'11px', fontWeight:700,
                              }}>
                                {tx.myAction.label}
                                <span style={{ fontSize:'13px' }}>→</span>
                              </span>
                            ) : (
                              <span style={{
                                display:'inline-flex', alignItems:'center', gap:'4px',
                                padding:'6px 10px',
                                background: COLORS.bgMuted,
                                color: COLORS.t4,
                                borderRadius:'8px',
                                fontSize:'11px', fontWeight:600,
                                cursor:'not-allowed',
                              }}>
                                🔒 {tx.myAction.label}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* 메모 박스 (액션 없을 때 안내) */}
                      {!tx.myAction && tx.note && (
                        <div style={{
                          padding:'8px 11px',
                          background: COLORS.bgMuted,
                          borderRadius: '8px',
                          fontSize:'11px', color: COLORS.t3,
                          lineHeight: 1.5,
                        }}>
                          {tx.note}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          )}

          {/* 알림 탭 (시스템 알림) */}
          {mainTab === 'system' && (
            mergedSystemAlerts.length === 0 ? (
              <div style={{ padding:'40px 16px', textAlign:'center', color:COLORS.t4, fontSize:'13px' }}>
                알림이 없어요
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {mergedSystemAlerts.map((a) => {
                  const clickable = !!a.route || a._fromStore

                  // ── 기업 초대 카드 (특별 렌더) ──
                  if (a.type === 'invite') {
                    const accepted = inviteStatus === 'accepted'
                    const declined = inviteStatus === 'declined'
                    return (
                      <div key={a.id} style={{
                        background: accepted ? '#EFF6FF' : declined ? COLORS.bgMuted : COLORS.bgCard,
                        borderRadius: RADIUS.md,
                        boxShadow: SHADOWS.card,
                        border: accepted ? '1.5px solid #93C5FD' : declined ? `1px solid ${COLORS.borderSoft}` : '1.5px solid #BFDBFE',
                        padding:'14px',
                        display:'flex', flexDirection:'column', gap:'10px',
                        position:'relative',
                      }}>
                        {/* 헤더 */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            <span style={{ padding:'2px 7px', background: a.tagBg, color: a.tagColor, borderRadius:'4px', fontSize:'10px', fontWeight:700 }}>
                              {a.tag}
                            </span>
                            <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{a.title}</span>
                          </div>
                          <span style={{ fontSize:'10px', color: COLORS.t4, flexShrink:0 }}>{a.time}</span>
                        </div>

                        {/* 초대 정보 */}
                        <div style={{ background:'rgba(29,78,216,0.06)', borderRadius:'10px', padding:'10px 12px', display:'flex', flexDirection:'column', gap:'4px' }}>
                          <div style={{ display:'flex', gap:'8px', fontSize:'12px' }}>
                            <span style={{ color: COLORS.t4, minWidth:'40px' }}>회사</span>
                            <span style={{ fontWeight:700, color: COLORS.t1 }}>{a.inviteMeta.company}</span>
                          </div>
                          <div style={{ display:'flex', gap:'8px', fontSize:'12px' }}>
                            <span style={{ color: COLORS.t4, minWidth:'40px' }}>직책</span>
                            <span style={{ fontWeight:600, color:'#1D4ED8' }}>{a.inviteMeta.role}</span>
                          </div>
                          <div style={{ display:'flex', gap:'8px', fontSize:'12px' }}>
                            <span style={{ color: COLORS.t4, minWidth:'40px' }}>초대자</span>
                            <span style={{ fontWeight:500, color: COLORS.t2 }}>{a.inviteMeta.inviter}</span>
                          </div>
                        </div>

                        {/* 수락/거절 or 상태 표시 */}
                        {!accepted && !declined && (
                          <div style={{ display:'flex', gap:'8px' }}>
                            <button
                              onClick={handleInviteDecline}
                              style={{ flex:1, height:'40px', background: COLORS.bgMuted, color: COLORS.t3, border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                              거절
                            </button>
                            <button
                              onClick={handleInviteAccept}
                              style={{ flex:2, height:'40px', background:'#1D4ED8', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              수락 → 기업 전환
                            </button>
                          </div>
                        )}
                        {accepted && (
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', background:'#DBEAFE', borderRadius:'10px' }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#1D4ED8"/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span style={{ fontSize:'12px', fontWeight:700, color:'#1D4ED8' }}>수락 완료 — 홈 아이콘으로 기업 전환 가능</span>
                          </div>
                        )}
                        {declined && (
                          <div style={{ fontSize:'12px', color: COLORS.t4, textAlign:'center', padding:'4px 0' }}>
                            초대를 거절했습니다
                          </div>
                        )}
                      </div>
                    )
                  }

                  // ── 일반 시스템 알림 카드 ──
                  return (
                    <button
                      key={a.id}
                      onClick={() => clickable && handleAlertClick(a)}
                      disabled={!clickable}
                      style={{
                        background: COLORS.bgCard,
                        borderRadius: RADIUS.md,
                        boxShadow: SHADOWS.card,
                        border:'none',
                        padding:'12px 14px',
                        display:'flex', flexDirection:'column', gap:'4px',
                        opacity: a.isRead ? 0.7 : 1,
                        position:'relative',
                        cursor: clickable ? 'pointer' : 'default',
                        textAlign:'left',
                        fontFamily:'inherit',
                        width:'100%',
                      }}>
                      {!a.isRead && (
                        <div style={{
                          position:'absolute', top:'14px', left:'4px',
                          width:'4px', height:'4px', borderRadius:'50%',
                          background: theme.brandDark,
                        }} />
                      )}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
                          <span style={{
                            display:'inline-block',
                            padding:'2px 7px',
                            background: a.tagBg,
                            color: a.tagColor,
                            borderRadius:'4px',
                            fontSize:'10px', fontWeight:700,
                            flexShrink:0,
                          }}>
                            {a.tag}
                          </span>
                          <span style={{
                            fontSize:'13px',
                            fontWeight: a.isRead ? 500 : 700,
                            color: COLORS.t1,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>
                            {a.title}
                          </span>
                        </div>
                        <span style={{ fontSize:'10px', color: COLORS.t4, flexShrink:0 }}>
                          {a.time}
                        </span>
                      </div>
                      <div style={{ fontSize:'11px', color: COLORS.t3, lineHeight: 1.5 }}>
                        {a.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          )}

        </div>
      </div>
      <BottomTab />
    </PhoneShell>
  )
}
