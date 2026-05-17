// ─────────────────────────────────────────────────────────
// transactionStore.js — 자금집행 통합 데이터 store
//
// 역할:
//   - 자금 집행 1건이 일어나면 transactions에 추가
//   - 자동으로 활동 피드 / 알림 / 메시지가 양쪽(보낸·받은 사람)에 생성
//   - 가입자/비가입자, 기업/개인 모두 처리
//   - 비가입자 거래는 휴대폰 번호 기반으로 보관 → 가입 시 자동 매칭
//
// 데이터 흐름:
//   1) 자금집행 화면의 PinStep 완료 → addTransaction() 호출
//   2) store가 자동으로 activity / alerts / messages 생성
//   3) 화면들은 셀렉터로 필요한 데이터 조회
//   4) subscribe() 로 변화 감지 → 자동 리렌더 가능
//
// 사용 예 (자금집행 화면):
//   import { addTransaction } from '../../shared/transactionStore'
//   addTransaction({
//     type: 'freelance',
//     fromUserId: 'biz_juda',
//     fromUserName: '주다컴퍼니',
//     fromUserType: 'business',
//     recipient: { id, name, phone, verified },
//     amount: 1500000,
//     whtAmount: 49500,
//     netAmount: 1450500,
//     reason: '브랜드 디자인',
//     walletId: 'my',
//     walletLabel: 'MY 지갑',
//     payDateMode: 'immediate',
//     scheduledDate: null,
//     status: 'completed',
//   })
//
// 사용 예 (화면 표시):
//   import { getActivityFeed, getMyAlerts, getMyMessages } from '../../shared/transactionStore'
//   const activities = getActivityFeed({ userId: 'biz_juda', limit: 10 })
//   const alerts = getMyAlerts({ userId: 'biz_juda' })
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// 상수: 메뉴 타입별 표시 정보
// ─────────────────────────────────────────────────────────
export const TX_TYPE_META = {
  // 기업 자금집행
  salary:           { icon: '💰', labelKo: '급여',       labelEn: 'Salary' },
  freelance:        { icon: '🧾', labelKo: '외주비',     labelEn: 'Outsourcing' },
  marketing:        { icon: '📢', labelKo: '마케팅비',    labelEn: 'Marketing' },
  bonus:            { icon: '🎉', labelKo: '상여금',     labelEn: 'Bonus' },
  condolence:       { icon: '💐', labelKo: '경조사비',    labelEn: 'Family Event' },
  otherIncome:      { icon: '📋', labelKo: '기타소득',    labelEn: 'Other Income' },
  insurance4:       { icon: '🛡️', labelKo: '4대보험',    labelEn: '4 Insurances' },
  rent:             { icon: '🏢', labelKo: '임대료',     labelEn: 'Rent' },
  rentLease:        { icon: '🚗', labelKo: '렌트&리스',  labelEn: 'Rent & Lease' },
  subscription:     { icon: '📱', labelKo: '구독료',     labelEn: 'Subscription' },
  telecom:          { icon: '📡', labelKo: '통신비',     labelEn: 'Telecom' },
  utility:          { icon: '💡', labelKo: '공과금',     labelEn: 'Utility' },
  insurancePremium: { icon: '🛡️', labelKo: '보험료',    labelEn: 'Insurance' },
  travelMeal:       { icon: '✈️', labelKo: '출장식대',   labelEn: 'Travel & Meal' },
  welfare:          { icon: '🎁', labelKo: '복리후생',   labelEn: 'Welfare' },
  otherOps:         { icon: '📦', labelKo: '기타 정기지출', labelEn: 'Other Ops' },
  marketing2:       { icon: '📣', labelKo: '마케팅비',   labelEn: 'Marketing' },
  lend:             { icon: '💸', labelKo: '대여금',     labelEn: 'Loan' },
  support:          { icon: '🌱', labelKo: '자금 지원',  labelEn: 'Support' },
  invest:           { icon: '📈', labelKo: '투자',       labelEn: 'Invest' },
  vendorLoan:       { icon: '🤝', labelKo: '대여금',     labelEn: 'Vendor Loan' },
  tax:              { icon: '🧾', labelKo: '세금',       labelEn: 'Tax' },
  // 개인 자금집행
  gift:             { icon: '🎁', labelKo: '용돈/선물',  labelEn: 'Gift' },
  living:           { icon: '🛒', labelKo: '생활비',     labelEn: 'Living' },
  personalLend:     { icon: '💸', labelKo: '빌려주기',   labelEn: 'Lend' },
  realestate:       { icon: '🏠', labelKo: '부동산',     labelEn: 'Real Estate' },
}

// ─────────────────────────────────────────────────────────
// 대카테고리 / 중카테고리 자동 매핑
// ExecutionStats CATEGORY_GROUPS의 subs 레이블과 완전 동일하게 유지
// addTransaction() 호출 시 type 기반으로 mainCat / subCat 자동 주입
// ─────────────────────────────────────────────────────────
export const TYPE_TO_CATEGORY = {
  // 인건비
  salary:           { mainCat: '인건비', subCat: '급여' },
  freelance:        { mainCat: '인건비', subCat: '외주비' },
  bonus:            { mainCat: '인건비', subCat: '상여금' },
  condolence:       { mainCat: '인건비', subCat: '경조사비' },
  otherIncome:      { mainCat: '인건비', subCat: '기타소득' },
  insurance4:       { mainCat: '인건비', subCat: '4대보험' },
  // 운영비
  rent:             { mainCat: '운영비', subCat: '임대료' },
  rentLease:        { mainCat: '운영비', subCat: '렌트&리스' },
  subscription:     { mainCat: '운영비', subCat: '구독료' },
  telecom:          { mainCat: '운영비', subCat: '통신비' },
  utility:          { mainCat: '운영비', subCat: '공과금' },
  insurancePremium: { mainCat: '운영비', subCat: '보험료' },
  travelMeal:       { mainCat: '운영비', subCat: '출장식대' },
  welfare:          { mainCat: '운영비', subCat: '복리후생' },
  otherOps:         { mainCat: '운영비', subCat: '기타 정기지출' },
  // 사업비
  marketing:        { mainCat: '사업비', subCat: '마케팅비' },
  support:          { mainCat: '사업비', subCat: '마케팅비' },   // 자금지원 → 사업비
  // 금융
  invest:           { mainCat: '금융',   subCat: '투자' },
  lend:             { mainCat: '금융',   subCat: '대여금' },
  vendorLoan:       { mainCat: '금융',   subCat: '대여금' },
  personalLend:     { mainCat: '금융',   subCat: '대여금' },
  realestate:       { mainCat: '금융',   subCat: '투자' },
  // 세금
  tax:              { mainCat: '세금',   subCat: '세금' },
  // 개인 (미분류 시 기본값)
  gift:             { mainCat: '운영비', subCat: '복리후생' },
  // 미분류
  misc:             { mainCat: '미분류', subCat: '미분류' },
  otherExpense:     { mainCat: '미분류', subCat: '미분류' },
}

// ─────────────────────────────────────────────────────────
// 거래 카테고리 — contract (계약서/마일스톤 풍부 거래) vs notification (단순 통지)
//
// contract: 외주비/빌려주기/대여금/자금지원/부동산/투자
//   - 양측 서명/검수 단계가 있음
//   - 메시지에 계약서 + 마일스톤 + 결제 이벤트가 표시됨
//   - 알림 "거래" 탭에 진행 상태로 표시
//   - status: 'signing' / 'in_progress' / 'completed' / 'rejected'
//
// notification: 상여금/경조사비/기타소득/용돈
//   - 일방적 송금, 동의 불필요 (인증만)
//   - 메시지는 짧은 시스템 메시지
//   - 알림 "알림" 탭에 단순 통지
//   - status: 'completed' / 'waiting' / 'scheduled'
// ─────────────────────────────────────────────────────────
export const TX_CATEGORY = {
  freelance:    'contract',
  marketing:    'contract',
  lend:         'contract',
  support:      'contract',
  realestate:   'contract',
  invest:       'contract',
  personalLend: 'contract',

  bonus:        'notification',
  condolence:   'notification',
  otherIncome:  'notification',
  gift:         'notification',
  salary:       'notification',
  rent:         'notification',
}

export function getTxCategory(type) {
  return TX_CATEGORY[type] || 'notification'
}

// ─────────────────────────────────────────────────────────
// 내부 상태
// ─────────────────────────────────────────────────────────
let _transactions = []   // 모든 자금집행 거래 (시간 역순)
let _activities = []     // 활동 피드 항목들 (보낸 사람 본인용)
let _alerts = []         // 알림 (보낸/받은 사람 양쪽)
let _messages = []       // 메시지 시스템 메시지
let _rentRegistry = []   // 임대료 자동지급 풀 (부동산 거래에서 등록된 자산 + 직접 등록한 자산)

// 변경 알림 구독자
const _subscribers = new Set()

function notify() {
  _subscribers.forEach(fn => {
    try { fn() } catch (e) { console.error('store subscriber error:', e) }
  })
}

export function subscribe(fn) {
  _subscribers.add(fn)
  return () => _subscribers.delete(fn)
}

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function nextId(prefix, list) {
  const maxNum = list
    .map(x => parseInt((x.id || '').replace(`${prefix}_`, ''), 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}_${String(maxNum + 1).padStart(4, '0')}`
}

function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR')
}

function normalizePhone(phone) {
  return (phone || '').replace(/[-\s]/g, '')
}

// 시간 표시 ("방금 전", "5분 전", "오늘 09:41" 등)
export function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24 && now.getDate() === then.getDate()) {
    const hh = String(then.getHours()).padStart(2, '0')
    const mm = String(then.getMinutes()).padStart(2, '0')
    return `오늘 ${hh}:${mm}`
  }
  if (diffDay < 2) return '어제'
  if (diffDay < 7) return `${diffDay}일 전`
  const mm = String(then.getMonth() + 1).padStart(2, '0')
  const dd = String(then.getDate()).padStart(2, '0')
  return `${mm}.${dd}`
}

// ─────────────────────────────────────────────────────────
// 핵심: 거래 추가 + 부수효과 자동 처리
// ─────────────────────────────────────────────────────────

/**
 * 자금집행 거래를 store에 추가.
 * 자동으로 activity / alerts / messages 항목들을 생성한다.
 *
 * @param {Object} params
 * @param {string} params.type            — 거래 메뉴 타입 (freelance/bonus/...)
 * @param {string} params.fromUserId      — 보낸 사람 ID
 * @param {string} params.fromUserName    — 보낸 사람 표시명
 * @param {string} params.fromUserType    — 'business' | 'personal'
 * @param {Object} params.recipient       — 받는 사람 객체 (id, name, phone, verified, ...)
 * @param {number} params.amount          — 총 지급액
 * @param {number} [params.whtAmount]     — 원천세 (옵션)
 * @param {number} [params.netAmount]     — 실수령액 (옵션, 없으면 amount)
 * @param {string} [params.reason]        — 사유/메모
 * @param {string} [params.walletId]      — 출금 지갑 ID
 * @param {string} [params.walletLabel]   — 출금 지갑 라벨
 * @param {string} [params.payDateMode]   — 'immediate' | 'scheduled'
 * @param {string} [params.scheduledDate] — 예정일 (yyyy-mm-dd)
 * @param {string} [params.status]        — 통지형: 'completed' / 'waiting' / 'scheduled'
 *
 * 거래형(contract) 추가 필드 (옵션):
 * @param {string} [params.dealTitle]     — 계약 제목 (예: "앱 디자인 메인 5종")
 * @param {string} [params.contractDocId] — 계약서 ID (모두싸인 등)
 * @param {string} [params.contractExpires] — 만료일 (yyyy-mm-dd)
 * @param {boolean} [params.contractSigned] — 양측 서명 완료 여부
 * @param {Array} [params.milestones]     — 마일스톤 배열
 *   [{ id, label, amount, status, date, action }, ...]
 *   status: 'paid' | 'reviewing' | 'pending' | 'rejected'
 *   action: null | 'inspect' | 'sign' | 'pay'
 * @param {string} [params.dealStatus]    — 거래 상태 'signing'/'in_progress'/'completed'/'rejected'/'cancelled'
 * @param {string} [params.statusLabel]   — 표시용 상태 라벨 (예: "검수 대기")
 * @param {Object} [params.myAction]      — 내 액션 { label, urgent, color }
 * @param {Object} [params.counterpartyAction] — 상대방 액션 { label, urgent, color }
 *
 * @returns {Object} 생성된 transaction 객체
 */
export function addTransaction(params) {
  const {
    type,
    fromUserId,
    fromUserName,
    fromUserType = 'business',
    recipient,
    amount,
    whtAmount = 0,
    netAmount,
    reason,
    walletId,
    walletLabel,
    payDateMode = 'immediate',
    scheduledDate = null,
    status,
    // 거래형 필드
    dealTitle,
    dealDescription,
    contractDocId,
    contractExpires,
    contractSigned = false,
    contractFile,
    milestones,
    timeline,
    safety,
    dealStatus,
    statusLabel,
    myAction,
    counterpartyAction,
    // 메뉴별 메타
    supportMeta,
    investMeta,
    rentalMeta,
  } = params

  if (!type || !fromUserId || !recipient || !amount) {
    console.warn('addTransaction: missing required fields', params)
    return null
  }

  const meta = TX_TYPE_META[type] || { icon: '💼', labelKo: type, labelEn: type }
  const category = getTxCategory(type)

  // 대/중 카테고리 자동 주입 (TYPE_TO_CATEGORY 매핑 기반)
  // params에 명시적으로 전달된 경우 우선, 없으면 매핑에서 자동 결정
  const catMap = TYPE_TO_CATEGORY[type] || { mainCat: null, subCat: null }
  const resolvedMainCat = params.mainCat || catMap.mainCat
  const resolvedSubCat  = params.subCat  || catMap.subCat

  // 가입자/비가입자
  const recipientVerified = !!recipient.verified

  // 통지형/거래형에 따른 기본 status
  let finalStatus = status
  if (!finalStatus) {
    if (category === 'contract') {
      // 거래형 기본: 비가입자 → waiting, 미서명 → signing, 그 외 → in_progress
      if (!recipientVerified) finalStatus = 'waiting'
      else if (!contractSigned) finalStatus = 'signing'
      else finalStatus = 'in_progress'
    } else {
      // 통지형 기본
      finalStatus = recipientVerified ? 'completed' : 'waiting'
    }
  }

  const tx = {
    id: nextId('tx', _transactions),
    type,
    typeLabel: meta.labelKo,
    typeIcon: meta.icon,
    category,                       // 'contract' | 'notification'
    mainCat: resolvedMainCat,       // 대카테고리: 인건비 / 운영비 / 사업비 / 금융 / 세금
    subCat:  resolvedSubCat,        // 중카테고리: 급여 / 외주비 / 임대료 / ... (ExecutionStats subs 동일)

    fromUserId,
    fromUserName,
    fromUserType,

    toRecipientId: recipient.id || null,
    toRecipientName: recipient.name || '',
    toRecipientPhone: normalizePhone(recipient.phone || ''),
    toRecipientVerified: recipientVerified,
    toRecipientIsBusiness: !!recipient.isBusiness,
    toRecipientInitial: recipient.initial || (recipient.name?.charAt(0) || '?'),
    toRecipientAvatarBg: recipient.avatarBg || '#F2EFE9',
    toRecipientAvatarFg: recipient.avatarFg || '#555550',

    amount,
    whtAmount,
    netAmount: netAmount ?? (amount - whtAmount),

    reason: reason || '',
    walletId: walletId || null,
    walletLabel: walletLabel || '',

    payDateMode,
    scheduledDate,
    status: finalStatus,

    // 거래형 추가 필드 (통지형은 null)
    dealTitle: dealTitle || null,
    dealDescription: dealDescription || null,
    contractDocId: contractDocId || null,
    contractExpires: contractExpires || null,
    contractSigned: !!contractSigned,
    contractFile: contractFile || null,
    milestones: Array.isArray(milestones) ? milestones : null,
    timeline: Array.isArray(timeline) ? timeline : null,
    safety: Array.isArray(safety) ? safety : null,
    dealStatus: dealStatus || (category === 'contract' ? finalStatus : null),
    statusLabel: statusLabel || null,
    myAction: myAction || null,
    counterpartyAction: counterpartyAction || null,
    supportMeta: supportMeta || null,
    investMeta: investMeta || null,
    rentalMeta: rentalMeta || null,

    // 거래형 누적 집행 금액 계산
    executedAmount: Array.isArray(milestones)
      ? milestones.filter(m => m.status === 'paid').reduce((s, m) => s + (m.amount || 0), 0)
      : (finalStatus === 'completed' ? amount : 0),

    createdAt: new Date().toISOString(),
  }

  _transactions = [tx, ..._transactions]

  // 부수효과: 활동 피드, 알림, 메시지 자동 생성 (카테고리에 따라 다르게)
  _appendActivity(tx, meta)
  _appendAlertSender(tx, meta)
  _appendAlertReceiver(tx, meta)
  if (category === 'contract') {
    _appendContractMessages(tx, meta)
  } else {
    _appendNotificationMessage(tx, meta)
  }

  notify()
  return tx
}

// ─────────────────────────────────────────────────────────
// 내부 헬퍼: 부수효과 처리
// ─────────────────────────────────────────────────────────

// 활동 피드 — 보낸 사람 홈에 표시
function _appendActivity(tx, meta) {
  // 활동 피드 텍스트 패턴
  let text = ''
  if (tx.category === 'contract') {
    // 거래형: 상태 라벨로 표시
    if (tx.status === 'signing' || (tx.statusLabel && tx.statusLabel.includes('서명'))) {
      text = `${tx.toRecipientName}과 ${tx.dealTitle || meta.labelKo} 계약 (${fmt(tx.amount)}원) · 서명 대기`
    } else if (tx.statusLabel) {
      text = `${tx.toRecipientName}과 ${tx.dealTitle || meta.labelKo} (${fmt(tx.amount)}원) · ${tx.statusLabel}`
    } else if (tx.status === 'completed') {
      text = `${tx.toRecipientName}과 ${tx.dealTitle || meta.labelKo} 완료 (${fmt(tx.amount)}원)`
    } else {
      text = `${tx.toRecipientName}과 ${tx.dealTitle || meta.labelKo} 진행 중 (${fmt(tx.amount)}원)`
    }
  } else {
    // 통지형: 입금 완료 위주
    if (tx.status === 'waiting') {
      text = `${tx.toRecipientName}에게 ${meta.labelKo} ${fmt(tx.netAmount)}원 (대기)`
    } else if (tx.payDateMode === 'scheduled' && tx.scheduledDate) {
      text = `${tx.toRecipientName}에게 ${meta.labelKo} ${fmt(tx.netAmount)}원 (${tx.scheduledDate} 예정)`
    } else {
      text = `${tx.toRecipientName}에게 ${meta.labelKo} ${fmt(tx.netAmount)}원 입금`
    }
  }

  const activity = {
    id: nextId('act', _activities),
    txId: tx.id,
    userId: tx.fromUserId,           // 본인 활동 피드용
    icon: meta.icon,
    text,
    time: formatRelativeTime(tx.createdAt),
    createdAt: tx.createdAt,
    isProject: false,
    auto: true,
  }

  _activities = [activity, ..._activities]
}

// ─────────────────────────────────────────────────────────────────────────────
// 알림 생성 — 양방향 설계 원칙
//
// 거래 1건이 발생하면 알림이 최대 2개 생성됨:
//   1) _appendAlertSender   → 보낸 사람(fromUserId) 에게: "집행 완료" 확인용
//   2) _appendAlertReceiver → 받은 사람(toRecipientId) 에게: "입금" 수신 알림
//
// [direction 필드]
//   'sent'     : 보낸 사람의 알림 (Alerts.jsx에서 tag: '집행' 파란색으로 표시)
//   'received' : 받은 사람의 알림 (Alerts.jsx에서 tag: '입금' 초록색으로 표시)
//
// [getMyAlerts({ userId }) 셀렉터]
//   userId 기준으로 _alerts를 필터링 — 보낸/받은 모두 포함해서 반환
//   Alerts.jsx의 storeAlerts가 이 셀렉터를 구독함
//
// [비가입자 처리]
//   _appendAlertReceiver: toRecipientVerified 가 false면 알림 생성 안함
//   (비가입자는 외부링크 SMS로 안내되므로 앱 알림 불필요)
// ─────────────────────────────────────────────────────────────────────────────

// 보낸 사람 본인 알림
function _appendAlertSender(tx, meta) {
  let title = ''
  let body = ''

  if (tx.category === 'contract') {
    // 거래형: 진행 단계에 따라
    if (tx.status === 'waiting') {
      title = `${meta.labelKo} 외부링크 발송`
      body = `${tx.toRecipientName}님 인증 후 양측 서명 단계로 진행됩니다.`
    } else if (tx.status === 'signing') {
      title = `${meta.labelKo} 계약 서명 대기`
      body = `${tx.toRecipientName}님 서명 대기 중. 양측 서명 후 자금이 집행됩니다.`
    } else if (tx.statusLabel) {
      title = `${meta.labelKo} · ${tx.statusLabel}`
      body = `${tx.dealTitle || tx.toRecipientName} (${fmt(tx.amount)}원)`
    } else {
      title = `${meta.labelKo} 진행 중`
      body = `${tx.dealTitle || tx.toRecipientName} (${fmt(tx.amount)}원)`
    }
  } else {
    // 통지형
    if (tx.status === 'waiting') {
      title = `${meta.labelKo} 집행 대기`
      body = `${tx.toRecipientName}님에게 외부링크가 발송됐어요. 인증 후 자동 처리됩니다.`
    } else if (tx.payDateMode === 'scheduled' && tx.scheduledDate) {
      title = `${meta.labelKo} 예약 완료`
      body = `${tx.toRecipientName}님에게 ${tx.scheduledDate}에 ${fmt(tx.netAmount)}원 입금 예정`
    } else {
      title = `${tx.toRecipientName}님에게 ${meta.labelKo} 집행 완료`
      body = `${fmt(tx.netAmount)}원이 입금됐어요.`
    }
  }

  // 생활비 집행 시 알림 탭하면 해당 생활비 지갑 상세로 이동
  // TODO: 실제 개발 시 tx.walletId (집행에 사용된 지갑 ID) 기반으로 동적 라우팅 필요
  //   현재는 데모용으로 living_minjun 하드코딩
  //   실제: const walletRoute = tx.type === 'living' ? `/wallet/${tx.walletId}` : null
  const walletRoute = tx.type === 'living' ? '/wallet/living_minjun' : null

  const alert = {
    id: nextId('alt', _alerts),
    txId: tx.id,
    userId: tx.fromUserId,            // 알림 받는 사람 = 보낸 사람 본인
    direction: 'sent',                // 'sent' (내가 보낸) | 'received' (내가 받은)
    icon: meta.icon,
    title,
    body,
    isRead: false,
    createdAt: tx.createdAt,
    walletRoute,
  }
  _alerts = [alert, ..._alerts]
}

// 받은 사람 알림 (가입자만 — 비가입자는 외부링크로 안내)
function _appendAlertReceiver(tx, meta) {
  if (!tx.toRecipientVerified) return  // 비가입자엔 알림 안 만듦
  if (!tx.toRecipientId) return

  let title = '입금 알림'
  let body = `${tx.fromUserName}으로부터 ${meta.labelKo} ${fmt(tx.netAmount)}원이 입금됐어요.`
  if (tx.payDateMode === 'scheduled' && tx.scheduledDate) {
    title = '입금 예정'
    body = `${tx.fromUserName}으로부터 ${tx.scheduledDate}에 ${fmt(tx.netAmount)}원이 입금될 예정이에요.`
  }

  const alert = {
    id: nextId('alt', _alerts),
    txId: tx.id,
    userId: tx.toRecipientId,         // 받는 사람 ID
    direction: 'received',
    icon: '💰',
    title,
    body,
    isRead: false,
    createdAt: tx.createdAt,
  }
  _alerts = [alert, ..._alerts]
}

// ─────────────────────────────────────────────────────────
// 메시지 생성: 통지형 / 거래형 분기
// ─────────────────────────────────────────────────────────

// 통지형: 단순 시스템 메시지 1건 (상여금/경조사비/기타소득/용돈)
function _appendNotificationMessage(tx, meta) {
  const threadKey = `${tx.fromUserId}::${tx.toRecipientId || tx.toRecipientPhone}`
  const text = tx.status === 'waiting'
    ? `${meta.labelKo} ${fmt(tx.netAmount)}원 외부링크 발송 (인증 대기)`
    : tx.payDateMode === 'scheduled'
      ? `${meta.labelKo} ${fmt(tx.netAmount)}원 예약 (${tx.scheduledDate})`
      : `${meta.labelKo} ${fmt(tx.netAmount)}원 입금 완료`

  const msg = {
    id: nextId('msg', _messages),
    txId: tx.id,
    threadKey,
    fromUserId: tx.fromUserId,
    fromUserName: tx.fromUserName,
    toRecipientId: tx.toRecipientId,
    toRecipientName: tx.toRecipientName,
    toRecipientPhone: tx.toRecipientPhone,
    toRecipientVerified: tx.toRecipientVerified,
    icon: meta.icon,
    text,
    isSystem: true,
    msgType: 'simple',
    createdAt: tx.createdAt,
  }
  _messages = [msg, ..._messages]
}

// 거래형: 계약서 + 마일스톤 결제 이벤트들 + 진행 단계
//   - 'contract' 메시지: 계약서 카드 (제목, 만료, 마일스톤, 서명 상태)
//   - 'payment' 메시지: 각 마일스톤이 paid 상태일 때
//   - 'progress' 메시지: 검수 대기/서명 대기 등 진행 상태 변화
function _appendContractMessages(tx, meta) {
  const threadKey = `${tx.fromUserId}::${tx.toRecipientId || tx.toRecipientPhone}`
  const baseFields = {
    txId: tx.id,
    threadKey,
    fromUserId: tx.fromUserId,
    fromUserName: tx.fromUserName,
    toRecipientId: tx.toRecipientId,
    toRecipientName: tx.toRecipientName,
    toRecipientPhone: tx.toRecipientPhone,
    toRecipientVerified: tx.toRecipientVerified,
    icon: meta.icon,
    isSystem: true,
  }

  // 1) 계약서 카드 메시지
  const contractMsg = {
    ...baseFields,
    id: nextId('msg', _messages),
    msgType: 'contract',
    contract: {
      title: tx.dealTitle || `${meta.labelKo} 계약`,
      docId: tx.contractDocId || `${tx.type.toUpperCase()}_${tx.id}`,
      executor: tx.fromUserName,
      recipient: tx.toRecipientName,
      amount: tx.amount,
      typeLabel: meta.labelKo,
      expires: tx.contractExpires || null,
      milestones: tx.milestones || [],
      signed: tx.contractSigned,
    },
    text: `${meta.labelKo} 계약서 — ${tx.dealTitle || ''} (${fmt(tx.amount)}원)`,
    createdAt: tx.createdAt,
  }
  _messages = [contractMsg, ..._messages]

  // 2) 이미 paid 상태인 마일스톤이 있으면 결제 이벤트 메시지 추가
  if (Array.isArray(tx.milestones)) {
    tx.milestones.forEach((m, idx) => {
      if (m.status === 'paid' && m.amount) {
        // 결제 시간을 약간 뒤로 분산 (계약서 다음 순서로)
        const delayMs = (idx + 1) * 60 * 1000
        const eventTime = new Date(new Date(tx.createdAt).getTime() + delayMs).toISOString()
        const paymentMsg = {
          ...baseFields,
          id: nextId('msg', _messages),
          msgType: 'payment',
          payment: {
            label: m.label || `${idx+1}차 지급`,
            amount: m.amount,
            milestoneId: m.id,
            mccLabel: meta.labelKo,
          },
          text: `${m.label || `${idx+1}차 지급`} ${fmt(m.amount)}원 입금 완료`,
          createdAt: eventTime,
        }
        _messages = [paymentMsg, ..._messages]
      }
    })
  }

  // 3) 진행 상태 메시지 (서명 대기 / 검수 대기 등)
  if (tx.statusLabel) {
    const stateMsg = {
      ...baseFields,
      id: nextId('msg', _messages),
      msgType: 'progress',
      progress: {
        statusLabel: tx.statusLabel,
        actionLabel: tx.myAction?.label || null,
      },
      text: `[진행 상태] ${tx.statusLabel}`,
      createdAt: tx.createdAt,
    }
    _messages = [stateMsg, ..._messages]
  }
}

// ─────────────────────────────────────────────────────────
// 셀렉터: 화면이 필요한 데이터 가져가는 함수들
// ─────────────────────────────────────────────────────────

// 활동 피드 (홈 화면용) — 본인이 한 활동
export function getActivityFeed({ userId, limit = 10 } = {}) {
  let list = _activities
  if (userId) list = list.filter(a => a.userId === userId)
  return list
    .slice(0, limit)
    .map(a => ({ ...a, time: formatRelativeTime(a.createdAt) }))
}

// 내 알림 — 보낸 + 받은 모두
export function getMyAlerts({ userId, limit = 50 } = {}) {
  let list = _alerts
  if (userId) list = list.filter(a => a.userId === userId)
  return list.slice(0, limit)
}

// 미읽음 알림 카운트
export function getUnreadAlertCount({ userId } = {}) {
  let list = _alerts.filter(a => !a.isRead)
  if (userId) list = list.filter(a => a.userId === userId)
  return list.length
}

// 알림 읽음 처리
export function markAlertRead(alertId) {
  const a = _alerts.find(x => x.id === alertId)
  if (a && !a.isRead) {
    a.isRead = true
    notify()
  }
}

export function markAllAlertsRead({ userId } = {}) {
  let changed = false
  _alerts.forEach(a => {
    if (a.userId === userId && !a.isRead) {
      a.isRead = true
      changed = true
    }
  })
  if (changed) notify()
}

// 내 메시지 (스레드로 그룹핑)
// returns: [{ threadKey, lastMessage, txCount, recipient: {...} }, ...]
export function getMyMessageThreads({ userId } = {}) {
  // 보낸 사람 본인 또는 받는 사람으로 들어간 메시지들
  const filtered = userId
    ? _messages.filter(m => m.fromUserId === userId || m.toRecipientId === userId)
    : _messages

  // threadKey로 그룹핑, 각 그룹의 가장 최근 메시지 + 카운트
  const groups = {}
  filtered.forEach(m => {
    const key = m.threadKey
    if (!groups[key]) {
      groups[key] = {
        threadKey: key,
        messages: [],
        lastMessage: m,
        otherSide: {
          id: m.fromUserId === userId ? m.toRecipientId : m.fromUserId,
          name: m.fromUserId === userId ? m.toRecipientName : m.fromUserName,
          phone: m.fromUserId === userId ? m.toRecipientPhone : null,
          verified: m.fromUserId === userId ? m.toRecipientVerified : true,
        },
      }
    }
    groups[key].messages.push(m)
    // 더 최근 거 갱신 (이미 _messages가 시간역순이라 첫 항목이 최신)
    if (new Date(m.createdAt) > new Date(groups[key].lastMessage.createdAt)) {
      groups[key].lastMessage = m
    }
  })

  return Object.values(groups).sort(
    (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
  )
}

// 특정 스레드의 메시지 목록
export function getMessagesForThread(threadKey) {
  return _messages
    .filter(m => m.threadKey === threadKey)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))   // 오래된 → 최신
}

// 거래 단건
export function getTransactionById(txId) {
  return _transactions.find(t => t.id === txId)
}

// 사용자별 거래 (보낸 거래)
export function getTransactionsBySender(fromUserId) {
  return _transactions.filter(t => t.fromUserId === fromUserId)
}

// 사용자별 거래 (받은 거래 — ID 매칭)
export function getTransactionsByReceiverId(recipientId) {
  return _transactions.filter(t => t.toRecipientId === recipientId)
}

// 거래형(contract) 거래 — 사용자 기준 (보낸/받은 모두) — Alerts "거래" 탭용
export function getMyContractDeals({ userId, role = 'all' } = {}) {
  let list = _transactions.filter(t => t.category === 'contract')
  if (userId) {
    list = list.filter(t =>
      t.fromUserId === userId || t.toRecipientId === userId
    )
  }
  if (role === 'sender') {
    list = list.filter(t => t.fromUserId === userId)
  } else if (role === 'receiver') {
    list = list.filter(t => t.toRecipientId === userId)
  } else if (role === 'action') {
    list = list.filter(t => !!t.myAction)
  }
  return list
}

// 거래형 거래에서 액션 필요 카운트 (Alerts 헤더 표시용)
export function getActionRequiredCount({ userId } = {}) {
  return getMyContractDeals({ userId }).filter(t => !!t.myAction).length
}

// 휴대폰 번호로 받은 거래 조회 (가입자/비가입자 모두)
// — 비가입자 → 가입자 매칭 시 사용
export function getTransactionsByPhone(phone) {
  const normalized = normalizePhone(phone)
  return _transactions.filter(t => t.toRecipientPhone === normalized)
}

// 비가입자 거래 (전체)
export function getPendingTransactions() {
  return _transactions.filter(t => !t.toRecipientVerified)
}

// 거래 상태 변경 (예: 비가입자 인증 완료 시 status 업데이트)
export function updateTransactionStatus(txId, newStatus) {
  const t = _transactions.find(x => x.id === txId)
  if (t && t.status !== newStatus) {
    t.status = newStatus
    notify()
  }
}

// 비가입자 → 가입자로 전환 시 거래 데이터 갱신
// (해당 휴대폰의 거래들에 verified=true, recipientId 부여)
export function migratePendingToVerified(phone, newRecipientId) {
  const normalized = normalizePhone(phone)
  let changed = false
  _transactions.forEach(t => {
    if (t.toRecipientPhone === normalized && !t.toRecipientVerified) {
      t.toRecipientVerified = true
      t.toRecipientId = newRecipientId
      if (t.status === 'waiting') t.status = 'completed'
      changed = true
    }
  })
  // 메시지에도 반영
  _messages.forEach(m => {
    if (m.toRecipientPhone === normalized && !m.toRecipientVerified) {
      m.toRecipientVerified = true
      m.toRecipientId = newRecipientId
      changed = true
    }
  })
  if (changed) notify()
  return changed
}

// ─────────────────────────────────────────────────────────
// 임대료 자동지급 풀 (rentRegistry)
//
// 부동산 메뉴(ExecuteRealEstate)에서 월세 거래로 집행한 거래 또는
// 임대료 메뉴에서 직접 등록한 자산을 모아서 자동 지급 대상으로 관리.
//
// asset 구조:
// {
//   assetId,          — 자산 고유 ID
//   sourceTxId,       — 부동산 거래 기반이면 거래 ID, 직접 추가면 null
//   kind,             — 'office' | 'warehouse' | 'shop' | 'vehicle' | 'equipment' | 'housing' | 'etc'
//   alias,            — 자산 별칭
//   address,          — 주소/식별
//   lessor: { type, identifier, name, ceo?, verified },
//   rent,             — 월세 (공급가액)
//   vatMode,          — 'exclude' | 'include' | 'exempt'
//   maint,            — 관리비
//   deposit,          — 보증금
//   contractStart,
//   contractEnd,
//   payable,          — 지급 가능 여부
//   inviteExpiresAt,  — 미가입자일 때 초대 링크 만료
//   lastPay: { date, amount, status } | null,
//   autoPay,          — 자동 지급 활성 여부 (해제 시 false)
//   createdAt,
// }
// ─────────────────────────────────────────────────────────

// 등록된 임대 자산 (자동지급 풀)
export function getRegisteredRentAssets() {
  return [..._rentRegistry]
}

// 부동산 거래에서 발견되지만 아직 풀에 미등록된 거래 목록
export function getDiscoveredRentDeals({ userId } = {}) {
  const registeredTxIds = new Set(_rentRegistry.map(a => a.sourceTxId).filter(Boolean))
  return _transactions.filter(tx =>
    tx.type === 'realestate' &&
    tx.rentalMeta &&
    tx.rentalMeta.rentalType === 'monthly' &&
    !registeredTxIds.has(tx.id) &&
    (!userId || tx.fromUserId === userId)
  )
}

// 부동산 거래 → 자동지급 풀 등록
export function registerRentFromDeal(txId, extra = {}) {
  const tx = _transactions.find(t => t.id === txId)
  if (!tx || !tx.rentalMeta) return null

  const m = tx.rentalMeta
  // 자산 종류 추론 (사용자가 override 가능)
  const guessedKind = extra.kind || 'office'

  const asset = {
    assetId: nextId('rasset', _rentRegistry),
    sourceTxId: txId,
    kind: guessedKind,
    alias: extra.alias || (m.address ? `${m.address.slice(0, 18)}${m.address.length > 18 ? '...' : ''}` : '임대 자산'),
    address: m.address || '',
    lessor: {
      type: tx.toRecipientIsBusiness ? 'business' : 'individual',
      identifier: tx.toRecipientPhone || null,
      name: tx.toRecipientName,
      ceo: null,
      verified: tx.toRecipientVerified,
    },
    rent: m.monthlyRent || 0,
    vatMode: extra.vatMode || m.defaultVatMode || 'exclude',
    maint: extra.maint != null ? extra.maint : (m.defaultMaint || 0),
    deposit: m.depositAmount || 0,
    contractStart: m.contractStart,
    contractEnd: m.contractEnd,
    rentPayDay: m.rentPayDay || 25,
    payable: tx.toRecipientVerified,
    inviteExpiresAt: tx.toRecipientVerified ? null : (tx.createdAt
      ? new Date(new Date(tx.createdAt).getTime() + 72 * 3600 * 1000).toISOString()
      : null),
    lastPay: null,
    autoPay: true,
    createdAt: new Date().toISOString(),
  }
  _rentRegistry = [..._rentRegistry, asset]
  notify()
  return asset
}

// 직접 추가 (부동산 메뉴 안 거친 자산)
export function registerRentManual(asset) {
  const newAsset = {
    assetId: nextId('rasset', _rentRegistry),
    sourceTxId: null,
    kind: asset.kind || 'office',
    alias: asset.alias || '임대 자산',
    address: asset.address || '',
    lessor: asset.lessor || { type: 'business', identifier: '', name: '', verified: false },
    rent: asset.rent || 0,
    vatMode: asset.vatMode || 'exclude',
    maint: asset.maint || 0,
    deposit: asset.deposit || 0,
    contractStart: asset.contractStart || null,
    contractEnd: asset.contractEnd || null,
    rentPayDay: asset.rentPayDay || 25,
    payable: asset.payable !== undefined ? asset.payable : !!asset.lessor?.verified,
    inviteExpiresAt: asset.inviteExpiresAt || null,
    lastPay: null,
    autoPay: true,
    createdAt: new Date().toISOString(),
  }
  _rentRegistry = [..._rentRegistry, newAsset]
  notify()
  return newAsset
}

// 자산 풀에서 해제 (자동지급 중단)
export function unregisterRent(assetId) {
  const before = _rentRegistry.length
  _rentRegistry = _rentRegistry.filter(a => a.assetId !== assetId)
  if (_rentRegistry.length !== before) notify()
}

// 자산 필드 업데이트
export function updateRentAsset(assetId, patch) {
  const a = _rentRegistry.find(x => x.assetId === assetId)
  if (!a) return
  Object.assign(a, patch)
  notify()
}

// 디버그/테스트용
export function _resetStore() {
  _transactions = []
  _activities = []
  _alerts = []
  _messages = []
  _rentRegistry = []
  notify()
}

export function _dumpStore() {
  return {
    transactions: [..._transactions],
    activities: [..._activities],
    alerts: [..._alerts],
    messages: [..._messages],
    rentRegistry: [..._rentRegistry],
  }
}

// ─────────────────────────────────────────────────────────
// 데모 시드 데이터
// 와이어프레임 단계에서 빈 상태 화면을 피하기 위한 가상 거래 내역.
// 실제 운영 시 이 함수는 호출되지 않거나 백엔드 데이터로 대체.
// ─────────────────────────────────────────────────────────
let _seeded = false
export function seedDemoTransactions() {
  if (_seeded) return                     // 멱등성 — 중복 시드 방지
  if (_transactions.length > 0) {         // 이미 데이터 있으면 스킵
    _seeded = true
    return
  }

  const now = new Date()

  // 시드 항목 (offsetMinutes 음수 = 과거)
  // 통지형 (단순 시스템 메시지)
  const notificationSeeds = [
    {
      offsetMinutes: -90,
      type: 'bonus',
      recipient: { id: 'r_001', name: '김민수', phone: '010-1111-2222', verified: true,
                   initial: '김', avatarBg: '#E6F5EF', avatarFg: '#085041' },
      amount: 500000, whtAmount: 33000, netAmount: 467000,
      reason: '명절상여',
    },
    {
      offsetMinutes: -240,
      type: 'condolence',
      recipient: { id: 'r_002', name: '이지영', phone: '010-2222-3333', verified: true,
                   initial: '이', avatarBg: '#EDF3FA', avatarFg: '#1E5294' },
      amount: 300000, whtAmount: 0, netAmount: 300000,
      reason: '결혼',
    },
    {
      offsetMinutes: -60 * 24,    // 어제
      type: 'otherIncome',
      recipient: { id: 'r_009', name: '한도윤', phone: '010-9999-0000', verified: true,
                   initial: '한', avatarBg: '#EEE8F7', avatarFg: '#5D2E92' },
      amount: 800000, whtAmount: 70400, netAmount: 729600,
      reason: '강연료',
    },
  ]

  // 거래형 (계약서 + 마일스톤 풍부 데이터)
  const contractSeeds = [
    {
      // 외주비 — 분할 지급 + 검수 단계
      offsetMinutes: -5,
      type: 'freelance',
      recipient: { id: 'r_007', name: '박민준', phone: '010-7777-8888', verified: true,
                   initial: '박', avatarBg: '#EDF3FA', avatarFg: '#1E5294' },
      amount: 5000000, whtAmount: 0, netAmount: 5000000,
      reason: '브랜드 디자인',
      dealTitle: '앱 디자인 메인 5종',
      contractDocId: 'EX_2026_001',
      contractExpires: '2026-08-06',
      contractSigned: true,
      milestones: [
        { id: 'm1', label: '선금 30%',  amount: 1500000, status: 'paid',      date: '2026-04-25', action: null },
        { id: 'm2', label: '중도금 40%', amount: 2000000, status: 'reviewing', date: null,         action: 'inspect' },
        { id: 'm3', label: '잔금 30%',  amount: 1500000, status: 'pending',   date: null,         action: null },
      ],
      dealStatus: 'in_progress',
      statusLabel: '중도금 검수 대기',
      myAction: { label: '검수하기', urgent: true, color: 'brand' },
    },
    {
      // 빌려주기 — 비가입자 (대기 중)
      offsetMinutes: -60 * 6,
      type: 'lend',
      recipient: { name: '박민준 (지인)', phone: '010-3333-7777', verified: false,
                   initial: '박', avatarBg: '#FFF4E0', avatarFg: '#854F0B' },
      amount: 2000000, whtAmount: 0, netAmount: 2000000,
      reason: '6개월 대여 · 연 6%',
      dealTitle: '단기 대여',
      contractDocId: 'LD_2026_002',
      contractExpires: '2026-11-08',
      contractSigned: false,
      milestones: [
        { id: 'm1', label: '대여금 지급', amount: 2000000, status: 'pending', date: null, action: null },
        { id: 'm2', label: '상환 (6개월 후)', amount: 2060000, status: 'pending', date: '2026-11-08', action: null },
      ],
      dealStatus: 'signing',
      statusLabel: '상대방 서명 대기',
      myAction: null,
    },
    {
      // 부동산 월세 (사업자 임대인) — 강남 본사 → 임대료 화면에서 발견 가능
      offsetMinutes: -60 * 24 * 3,
      type: 'realestate',
      recipient: { id: 'r_re1', name: '(주)벨라부동산', phone: '010-5555-1111', verified: true,
                   initial: '벨', avatarBg: '#E6F5EF', avatarFg: '#085041', isBusiness: true },
      amount: 50000000, whtAmount: 0, netAmount: 50000000,
      reason: '월세 보증금 · 서울 강남구 테헤란로 123, 4층',
      dealTitle: '서울 강남구 테헤란로 123, 4층 월세',
      contractDocId: 'RE_2026_001',
      contractExpires: '2027-05-31',
      contractSigned: true,
      milestones: [
        { id: 'm1', label: '계약금 10%', amount: 5000000, status: 'paid', date: '2025-05-25', action: null },
        { id: 'm2', label: '잔금 90%',  amount: 45000000, status: 'paid', date: '2025-06-01', action: null },
      ],
      dealStatus: 'in_progress',
      statusLabel: '임차 중',
      myAction: null,
      rentalMeta: {
        rentalType: 'monthly',
        monthlyRent: 4500000,
        rentPayDay: 25,
        address: '서울 강남구 테헤란로 123, 4층',
        contractStart: '2025-06-01',
        contractEnd: '2027-05-31',
        autoRenewAlert: true,
        depositAmount: 50000000,
        defaultVatMode: 'exclude',
        defaultMaint: 350000,
      },
    },
    {
      // 부동산 월세 (개인 임대인) — 판교 창고
      offsetMinutes: -60 * 24 * 7,
      type: 'realestate',
      recipient: { id: 'r_re2', name: '최수진', phone: '010-5555-6666', verified: true,
                   initial: '최', avatarBg: '#FCE7F3', avatarFg: '#9D174D' },
      amount: 20000000, whtAmount: 0, netAmount: 20000000,
      reason: '월세 보증금 · 경기 성남시 분당구 판교로 88, 2동',
      dealTitle: '경기 성남시 분당구 판교로 88, 2동 월세',
      contractDocId: 'RE_2026_002',
      contractExpires: '2026-08-31',
      contractSigned: true,
      milestones: [
        { id: 'm1', label: '보증금', amount: 20000000, status: 'paid', date: '2025-08-25', action: null },
      ],
      dealStatus: 'in_progress',
      statusLabel: '임차 중',
      myAction: null,
      rentalMeta: {
        rentalType: 'monthly',
        monthlyRent: 1800000,
        rentPayDay: 25,
        address: '경기 성남시 분당구 판교로 88, 2동',
        contractStart: '2025-09-01',
        contractEnd: '2026-08-31',
        autoRenewAlert: true,
        depositAmount: 20000000,
        defaultVatMode: 'exempt',
        defaultMaint: 0,
      },
    },
  ]

  const allSeeds = [...notificationSeeds, ...contractSeeds]

  allSeeds.forEach(s => {
    const ts = new Date(now.getTime() + s.offsetMinutes * 60 * 1000).toISOString()
    const tx = addTransaction({
      type: s.type,
      fromUserId: 'biz_juda',
      fromUserName: '㈜주다컴퍼니',
      fromUserType: 'business',
      recipient: s.recipient,
      amount: s.amount,
      whtAmount: s.whtAmount,
      netAmount: s.netAmount,
      reason: s.reason,
      walletId: 'my',
      walletLabel: 'MY 지갑',
      payDateMode: 'immediate',
      // 거래형 필드 (있을 때만 전달)
      dealTitle: s.dealTitle,
      contractDocId: s.contractDocId,
      contractExpires: s.contractExpires,
      contractSigned: s.contractSigned,
      milestones: s.milestones,
      dealStatus: s.dealStatus,
      statusLabel: s.statusLabel,
      myAction: s.myAction,
      // 부동산 월세 메타 (있을 때만)
      rentalMeta: s.rentalMeta,
    })
    // 시드 데이터는 createdAt을 인위적으로 조정해서 시간 분산
    if (tx) {
      tx.createdAt = ts
      // 활동/알림/메시지의 createdAt도 같이 맞춰주기
      _activities.forEach(a => { if (a.txId === tx.id) a.createdAt = ts })
      _alerts.forEach(a => { if (a.txId === tx.id) a.createdAt = ts })
      _messages.forEach(m => { if (m.txId === tx.id) m.createdAt = ts })
    }
  })

  // 시간 역순 정렬
  _transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  _activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  _alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  _messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  _seeded = true
  notify()
}
