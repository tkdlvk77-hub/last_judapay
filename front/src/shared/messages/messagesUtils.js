import { getTransactionById, TX_TYPE_META, getMessagesForThread } from '../transactionStore'

// ─── userType → 데모 사용자 ID ───
export function getCurrentUserId(userType) {
  if (userType === 'business') return 'biz_juda'
  if (userType === 'personal') return 'me_juda_kim'
  return null
}

// ─── MCC 코드 → 한글 라벨 (PaymentSimulator 와 동일 표) ───
const MCC_LABEL_MAP = {
  '4111': '대중교통',
  '4121': '택시',
  '5311': '백화점',
  '5411': '식료품/마트',
  '5541': '주유소',
  '5651': '의류',
  '5732': '전자/가전',
  '5812': '음식점',
  '5813': '유흥/주점',
  '5814': '카페',
  '5912': '약국',
  '5921': '주류',
  '5999': '소매(기타)',
  '7011': '숙박',
  '7372': 'IT/소프트웨어',
  '7832': '영화',
  '7993': '오락실/게임',
  '7995': '카지노/도박',
  '8011': '의료',
  '8021': '치과',
  '8211': '교육',
}

// "5814" → "카페", "7993" → "오락실/게임", 매칭 없으면 코드 그대로.
export function formatMccLabel(code) {
  if (code == null) return ''
  const c = String(code).trim()
  if (!c) return ''
  const label = MCC_LABEL_MAP[c]
  return label || c
}

// ─── typeLabel(한글) → typeKey 역매핑 (서버 payload 호환) ───
//   서버 메시지 payload 에 raw type 이 없는 구버전 호환용.
//   현재는 서버가 payload.type 를 같이 보내지만, 누락 시 typeLabel 로 추정.
const LABEL_TO_KEY = (() => {
  const m = {}
  for (const [key, meta] of Object.entries(TX_TYPE_META)) {
    if (meta?.labelKo) m[meta.labelKo] = key
  }
  return m
})()

function resolveTypeKey(payload) {
  // 1순위: 서버가 보내는 raw type
  if (payload?.type) return payload.type
  // 2순위: typeLabel → key 역매핑
  if (payload?.typeLabel && LABEL_TO_KEY[payload.typeLabel]) return LABEL_TO_KEY[payload.typeLabel]
  // 3순위: unknown
  return 'unknown'
}

// ─── 자금 종류별 카드 색상 ───
export const TYPE_TONE_BY_KIND = {
  // 인건비 — 파랑/녹색 계열
  freelance:    { typeBg:'#EDF3FA', typeColor:'#2D6BB0' },
  salary:       { typeBg:'#E6F5EF', typeColor:'#085041' },
  bonus:        { typeBg:'#E6F5EF', typeColor:'#085041' },
  condolence:   { typeBg:'#FCE7F3', typeColor:'#9D174D' },
  otherIncome:  { typeBg:'#EEE8F7', typeColor:'#5D2E92' },
  welfare:      { typeBg:'#FCE7F3', typeColor:'#9D174D' },
  travelMeal:   { typeBg:'#FFF7E5', typeColor:'#854F0B' },
  // 운영비 — 파랑/회색 계열
  rent:         { typeBg:'#EDF3FA', typeColor:'#2D6BB0' },
  rentLease:    { typeBg:'#EDF3FA', typeColor:'#2D6BB0' },
  subscription: { typeBg:'#EEE8F7', typeColor:'#5D2E92' },
  telecom:      { typeBg:'#EDF3FA', typeColor:'#2D6BB0' },
  utility:      { typeBg:'#FFF7E5', typeColor:'#854F0B' },
  insurancePremium: { typeBg:'#F2EFE9', typeColor:'#555550' },
  insurance4:   { typeBg:'#F2EFE9', typeColor:'#555550' },
  marketing:    { typeBg:'#EDF3FA', typeColor:'#2D6BB0' },
  otherOps:     { typeBg:'#F2EFE9', typeColor:'#555550' },
  misc:         { typeBg:'#F2EFE9', typeColor:'#555550' },
  otherExpense: { typeBg:'#F2EFE9', typeColor:'#555550' },
  // 사업비 — 녹색/노랑
  invest:       { typeBg:'#E6F5EF', typeColor:'#2A7D5E' },
  support:      { typeBg:'#E6F5EF', typeColor:'#2A7D5E' },
  lend:         { typeBg:'#FFF4E0', typeColor:'#C8821A' },
  vendorLoan:   { typeBg:'#FFF4E0', typeColor:'#C8821A' },
  // 세금
  tax:          { typeBg:'#FFE5E5', typeColor:'#A02929' },
  // 개인
  gift:         { typeBg:'#FCE7F3', typeColor:'#9D174D' },
  living:       { typeBg:'#FFF7E5', typeColor:'#854F0B' },
  personalLend: { typeBg:'#FFF4E0', typeColor:'#C8821A' },
  realestate:   { typeBg:'#EDF3FA', typeColor:'#2D6BB0' },
}

// ─── store thread → THREADS 카드 형태 어댑터 ───
export function adaptStoreThread(t) {
  const lm = t.lastMessage
  const tx = getTransactionById(lm.txId)
  if (!tx) return null

  const meta = TX_TYPE_META[tx.type] || { icon:'💼', labelKo: tx.type }
  const tone = TYPE_TONE_BY_KIND[tx.type] || { typeBg:'#F2EFE9', typeColor:'#555550' }
  const isContract = tx.category === 'contract'
  const totalExecuted = tx.executedAmount || 0
  const totalAmount = tx.amount

  let status = 'normal', statusLabel = '정상', statusBg = '#E6F5EF', statusColor = '#2A7D5E'
  if (tx.statusLabel) {
    if (tx.statusLabel.includes('검수') || tx.statusLabel.includes('서명') || tx.statusLabel.includes('대기')) {
      status = 'warning'; statusLabel = tx.statusLabel; statusBg = '#FFF4E0'; statusColor = '#C8821A'
    } else { statusLabel = tx.statusLabel }
  } else if (tx.status === 'waiting') {
    status = 'warning'; statusLabel = '인증 대기'; statusBg = '#FFF4E0'; statusColor = '#C8821A'
  } else if (tx.status === 'completed') { statusLabel = '완료' }

  let lastMsgText = lm.text || ''
  if (lastMsgText.startsWith('[진행 상태]')) lastMsgText = lastMsgText.replace('[진행 상태] ', '')

  return {
    id: t.threadKey,
    name: t.otherSide.name,
    initial: tx.toRecipientInitial || (t.otherSide.name?.charAt(0) || '?'),
    emoji: null,
    avatarBg: tx.toRecipientAvatarBg || '#F2EFE9',
    avatarFg: tx.toRecipientAvatarFg || '#555550',
    type: meta.labelKo,
    typeBg: tone.typeBg,
    typeColor: tone.typeColor,
    amount: totalAmount,
    balance: Math.max(0, totalAmount - totalExecuted),
    lastMsg: lastMsgText,
    time: formatThreadTime(lm.createdAt),
    unread: 0,
    status, statusLabel, statusBg, statusColor,
    totalExecuted, totalAmount,
    role: isContract ? '거래 상대' : '수령인',
    _fromStore: true,
    _txId: tx.id,
    _category: tx.category,
    _createdAt: lm.createdAt,
  }
}

// ─── typeLabel → 카드 톤(배경/글자색) 매핑 ───
//   서버가 typeLabel(한글) 만 보낼 때 색을 결정.
//   TYPE_TONE_BY_KIND 는 key 기반이라 별도 매핑 둔다.
const LABEL_TONE = [
  { match: /선물|용돈/,        bg: '#FCE7F3', color: '#9D174D' },
  { match: /외주/,             bg: '#EDF3FA', color: '#2D6BB0' },
  { match: /대여|차용/,        bg: '#FFF4E0', color: '#C8821A' },
  { match: /투자|엔젤/,        bg: '#E6F5EF', color: '#2A7D5E' },
  { match: /임대|부동산|월세/, bg: '#EDF3FA', color: '#2D6BB0' },
  { match: /상여/,             bg: '#E6F5EF', color: '#085041' },
  { match: /경조|축의|부의/,   bg: '#FCE7F3', color: '#9D174D' },
  { match: /지원/,             bg: '#E6F5EF', color: '#2A7D5E' },
  { match: /기타소득/,         bg: '#EEE8F7', color: '#5D2E92' },
  { match: /급여/,             bg: '#E6F5EF', color: '#085041' },
  { match: /세금|부가세/,      bg: '#FCEBEB', color: '#D94040' },
  { match: /4대|보험/,         bg: '#EDF3FA', color: '#2D6BB0' },
  { match: /생활/,             bg: '#FFF4E0', color: '#C8821A' },
  { match: /결제 차단/,        bg: '#FEF2F2', color: '#DC2626' },   // 차단 — 빨강
  { match: /카드결제|결제/,    bg: '#EFF6FF', color: '#2D6BB0' },   // 결제 — 파랑
]

function toneForLabel(label) {
  if (!label) return { bg: '#F2EFE9', color: '#555550' }
  for (const r of LABEL_TONE) if (r.match.test(label)) return { bg: r.bg, color: r.color }
  return { bg: '#F2EFE9', color: '#555550' }
}

// ─── 서버 스레드 → THREADS 카드 형태 어댑터 ───
//   서버 응답 (AppMessageController.threadToMap) 1건을 화면 표시용 카드로 변환.
//   transaction 상세 메타는 클릭 후 별도 fetch 로 채운다 (Messages.jsx 의 serverChat).
//   메시지 텍스트 패턴: "{typeLabel} {amount}원 ..." → typeLabel·amount 파싱.
export function adaptServerThread(t) {
  if (!t) return null
  const lm = t.lastMessage || {}
  const other = t.otherSide || {}
  const name = other.name || '알 수 없음'

  let lastMsgText = lm.text || ''
  if (lastMsgText.startsWith('[진행 상태]')) {
    lastMsgText = lastMsgText.replace('[진행 상태] ', '')
  }

  // "{typeLabel} {N,NNN}원 ..." 패턴에서 typeLabel + 금액 파싱
  //   ex) "용돈/선물 50,000원 입금 완료" → typeLabel='용돈/선물', amount=50000
  //   ex) "외주비 1,200,000원 외부링크 발송 (인증 대기)" → typeLabel='외주비', amount=1200000
  const rawText = lm.text || ''
  const m = rawText.match(/^(.+?)\s+([\d,]+)\s*원/)
  // 결제/차단 메시지는 텍스트 어순과 무관하게 키워드로 typeLabel 고정.
  //   (구버전 텍스트: "가맹점 · 7,500원 결제 차단" → regex 가 가맹점명을 typeLabel 로 잘못 파싱)
  //   (신버전 텍스트: "결제 차단 7,500원 — 가맹점" → regex 결과와 일치)
  let typeLabel
  if (/결제\s*차단|차단\s*결제/.test(rawText))      typeLabel = '결제 차단'
  else if (/카드결제|결제\s*완료/.test(rawText))    typeLabel = '카드결제'
  else                                              typeLabel = m ? m[1].trim() : '자금집행'

  // 금액 — 첫 "N,NNN원" 매치 사용 (어순 무관)
  const amtMatch = rawText.match(/([\d,]+)\s*원/)
  const parsedAmount = amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : 0
  const safeTotal    = parsedAmount > 0 ? parsedAmount : 1
  const tone         = toneForLabel(typeLabel)

  // 서버가 직접 계산해서 보내는 누적 합계 (그 사람과의 모든 자금집행 합)
  const cumulativeAmount = Number(t.totalAmount || 0)
  const cumulativeCount  = Number(t.totalCount  || t.payoutCount || 0)

  return {
    id:           t.threadKey || t.threadId,
    name,
    initial:      name.charAt(0) || '?',
    emoji:        null,
    avatarBg:     '#EEF2FF',
    avatarFg:     '#4338CA',
    type:         typeLabel,
    typeBg:       tone.bg,
    typeColor:    tone.color,
    amount:       parsedAmount,
    balance:      0,                     // 통지형 자금집행은 즉시 완결 → 잔액 0
    lastMsg:      lastMsgText,
    time:         formatThreadTime(lm.createdAt),
    unread:       Number(t.unreadCount) || 0,
    status:       'normal',
    statusLabel:  '완료',
    statusBg:     '#E6F5EF',
    statusColor:  '#2A7D5E',
    // ── 누적 합계 우선 (서버 계산), 없으면 마지막 메시지 금액 폴백 ──
    totalExecuted: cumulativeAmount > 0 ? cumulativeAmount : parsedAmount,
    totalAmount:   cumulativeAmount > 0 ? cumulativeAmount : safeTotal,
    cumulativeAmount,                    // 그 사람과의 누적 집행비 합계
    cumulativeCount,                     // 그 사람과의 자금집행 총 건수
    role:         '수령인',
    msgCat:       '외부',
    txCat:        '거래',
    _fromServer:  true,
    _threadId:    t.threadId,
    _payoutId:    lm.txId,
    _createdAt:   lm.createdAt,
  }
}

// ─── 서버 메시지 배열 → ChatRoom chat.messages 형태 어댑터 ───
//   서버 ChatMessage 의 payload(JSON string) 를 parse 해서
//   adaptStoreChat 과 동일한 메시지 객체 모양으로 만든다.
export function adaptServerMessages(serverMessages) {
  if (!Array.isArray(serverMessages)) return { messages: [], fdsAlert: null }
  let id = 1
  const messages = serverMessages.map(m => {
    const date = (m.createdAt || '').slice(0, 10).replaceAll('-', '.')
    const d = new Date(m.createdAt)
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    const payload = parseJsonSafe(m.payload)

    if (m.msgType === 'contract') {
      return { id: id++, from: 'system', type: 'contract', date, time,
        contract: {
          title:     payload.title     || '',
          executor:  payload.executor  || '',
          recipient: payload.recipient || '',
          amount:    payload.amount    || 0,
          type:      payload.typeLabel || '',
          mccAllowed: [], mccBlocked: [],
          expires:   payload.expires   || '',
          milestones: [],
          signed:    !!payload.signed,
        } }
    }
    if (m.msgType === 'payment') {
      // 권한자금 결제 (신) — payload.merchant/mcc/code
      // 계약 마일스톤 입금 (구) — payload.label/mccLabel/milestoneId
      // 통지형(simple) 카드와 동일 shape 으로 정규화 — UI 일관성.
      const merchant = payload.merchant || payload.label || ''
      const amount   = payload.amount || 0
      const mccRaw   = payload.mcc || payload.mccLabel || ''
      // 라벨 매칭되면 한글 라벨만 / 매칭 없으면 코드 그대로.
      const mcc      = formatMccLabel(mccRaw)
      return { id: id++, from: 'system', type: 'storeNotification', date, time,
        notification: {
          icon:      '💳',
          typeKey:   'payment',
          typeLabel: '카드결제',
          merchant,
          amount,
          mcc,
          status:    payload.status === 'waiting' ? 'waiting' : 'done',
        } }
    }
    if (m.msgType === 'blocked') {
      // 권한자금 결제 차단 — storeNotification 카드(차단 뱃지) 로 통일.
      const merchant = payload.merchant || ''
      const amount   = payload.amount || 0
      const mccRaw   = payload.mcc || ''
      // reason 에 "(MCC 7993)" 같은 괄호 코드 노출은 중복이라 제거.
      const reason   = (payload.reason || '')
                          .replace(/\s*\(MCC\s*\d+\)/gi, '')
                          .replace(/\s*\(\d+\)/g, '')
                          .trim()
      const mccPart  = formatMccLabel(mccRaw)
      // "오락실/게임 · 차단 업종" 형태. reason 없으면 라벨만.
      const mcc = mccPart && reason ? `${mccPart} · ${reason}`
                                    : (mccPart || reason || '차단됨')
      return { id: id++, from: 'system', type: 'storeNotification', date, time,
        notification: {
          icon:      '🛡️',
          typeKey:   'blocked',
          typeLabel: '결제 차단',
          merchant,
          amount,
          mcc,
          status:    'blocked',
        } }
    }
    if (m.msgType === 'progress') {
      return { id: id++, from: 'system', type: 'storeProgress', date, time,
        progress: {
          statusLabel: payload.statusLabel || (m.text || '').replace('[진행 상태] ', ''),
          actionLabel: null,
        } }
    }
    if (m.msgType === 'simple') {
      // payload 우선 — 신규 메시지는 type/typeLabel/typeIcon/amount/reason/recipient 가 들어있음
      // (기존 메시지는 빈 payload 일 수 있어 text 파싱 fallback)
      const am  = (m.text || '').match(/^(.+?)\s+([\d,]+)\s*원/)
      const fbLabel  = am ? am[1].trim() : ''
      const fbAmount = am ? Number(am[2].replace(/,/g, '')) : 0
      const typeKey  = resolveTypeKey(payload)  // ★ gift 폴백 버그 수정
      const typeMeta = TX_TYPE_META[typeKey] || null
      return { id: id++, from: 'system', type: 'storeNotification', date, time,
        notification: {
          icon:      payload.typeIcon || m.icon || typeMeta?.icon || '💸',
          typeKey,                                   // ★ 실제 type 반영
          typeLabel: payload.typeLabel || typeMeta?.labelKo || fbLabel,
          merchant:  payload.recipient || '',
          amount:    payload.amount    ?? fbAmount,
          mcc:       payload.reason    || '',   // 메모를 mcc 자리에 — ChatRoom 카드 부제로 표시됨
          status:    payload.status === 'waiting' ? 'waiting' : 'done',
        } }
    }
    if (m.msgType === 'user') {
      return { id: id++,
        from: m.senderUserId ? 'me' : 'system',
        text: m.text || '',
        date, time,
        read: m.otherRead === true,    // 본인 메시지면 "상대가 읽었는지"
        _clientMsgId: payload.clientMsgId || null,
        _serverId: m.id }
    }
    return { id: id++, from: 'system', text: m.text || '', date, time }
  })
  return { messages, fdsAlert: null }
}

function parseJsonSafe(s) {
  if (!s) return {}
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return {} }
}

// ─── 시간 표시 ("14:22" / "어제" / "3일 전") ───
export function formatThreadTime(iso) {
  if (!iso) return ''
  const now = new Date()
  const then = new Date(iso)
  if (now.toDateString() === then.toDateString()) {
    return `${String(then.getHours()).padStart(2,'0')}:${String(then.getMinutes()).padStart(2,'0')}`
  }
  const diffDay = Math.floor((now - then) / 86400000)
  if (diffDay < 2) return '어제'
  if (diffDay < 7) return `${diffDay}일 전`
  return `${String(then.getMonth()+1).padStart(2,'0')}.${String(then.getDate()).padStart(2,'0')}`
}

// ─── store messages → CHATS 형태 어댑터 ───
export function adaptStoreChat(threadKey) {
  const storeMessages = getMessagesForThread(threadKey)
  let id = 1
  const messages = storeMessages.map(m => {
    const date = (m.createdAt || '').slice(0,10).replaceAll('-','.')
    const d = new Date(m.createdAt)
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`

    if (m.msgType === 'contract') {
      return { id:id++, from:'system', type:'contract', date, time,
        contract:{ title:m.contract?.title||'', executor:m.contract?.executor||'', recipient:m.contract?.recipient||'',
          amount:m.contract?.amount||0, type:m.contract?.typeLabel||'', mccAllowed:[], mccBlocked:[],
          expires:m.contract?.expires||'', milestones:(m.contract?.milestones||[]).map(ms=>({ text:ms.label||'', done:ms.status==='paid', date:ms.date||'' })),
          signed:!!m.contract?.signed } }
    }
    if (m.msgType === 'payment') {
      return { id:id++, from:'system', type:'payment', date, time,
        payment:{ merchant:m.payment?.label||'', amount:m.payment?.amount||0, status:'done', mcc:m.payment?.mccLabel||'', code:m.payment?.milestoneId||'' } }
    }
    if (m.msgType === 'progress') {
      return { id:id++, from:'system', type:'storeProgress', date, time,
        progress:{ statusLabel:m.progress?.statusLabel||m.text?.replace('[진행 상태] ','')||'', actionLabel:m.progress?.actionLabel||null } }
    }
    if (m.msgType === 'simple') {
      const tx = getTransactionById(m.txId)
      const meta = tx ? TX_TYPE_META[tx.type] : null
      // ★ gift 폴백 버그 수정 — tx 없으면 'unknown' 사용, 'gift' 강제 X
      return { id:id++, from:'system', type:'storeNotification', date, time,
        notification:{ icon:meta?.icon||m.icon||'💸', typeKey:tx?.type||'unknown', typeLabel:meta?.labelKo||'',
          merchant:tx?.toRecipientName||'', amount:tx?.netAmount||0, mcc:tx?.reason||'',
          status:tx?.status==='waiting'?'waiting':'done' } }
    }
    return { id:id++, from:'system', text:m.text||'', date, time }
  })

  const lastTx = (() => {
    for (let i = storeMessages.length-1; i>=0; i--) {
      const tx = getTransactionById(storeMessages[i].txId)
      if (tx) return tx
    }
    return null
  })()

  if (lastTx && lastTx.toRecipientVerified === false) {
    const today = new Date()
    const date = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`
    const time = `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`
    messages.push({ id:id++, from:'system', type:'pendingSignup', date, time,
      pendingSignup:{ recipientName:lastTx.toRecipientName, hasEmail:!!lastTx.toRecipientEmail||!!lastTx.recipient?.vendorEmail } })
  }

  return { messages, fdsAlert:null }
}

// ─── 상태 라벨 단축 (좁은 공간용) ───
export function shortStatusLabel(label) {
  if (!label) return ''
  return label
    .replace('상대방 서명 대기', '서명 대기')
    .replace('중도금 검수 대기', '검수 대기')
    .replace('잔금 검수 대기', '검수 대기')
    .replace('외부링크 인증 대기', '인증 대기')
    .replace('계약 서명 대기', '서명 대기')
    .replace('소진 이상', '소진 ↑')
}

// ─── 통지형 카드 메뉴별 색상 톤 ───
export const NOTIF_TONE = {
  bonus:       { bg:'#F0FDF4', border:'#BBF7D0', text:'#047857', sub:'#065F46', badgeBg:'#D1FAE5', badgeText:'#047857' },
  condolence:  { bg:'#FDF2F8', border:'#FBCFE8', text:'#9D174D', sub:'#831843', badgeBg:'#FCE7F3', badgeText:'#9D174D' },
  otherIncome: { bg:'#F5F3FF', border:'#DDD6FE', text:'#5D2E92', sub:'#4C1D95', badgeBg:'#EDE9FE', badgeText:'#5D2E92' },
  gift:        { bg:'#FDF2F8', border:'#FBCFE8', text:'#9D174D', sub:'#831843', badgeBg:'#FCE7F3', badgeText:'#9D174D' },
  // 권한자금 카드결제 — 파랑/초록 결제 톤
  payment:     { bg:'#F0FDF4', border:'#BBF7D0', text:'#047857', sub:'#065F46', badgeBg:'#D1FAE5', badgeText:'#047857' },
  // 권한자금 결제 차단 — 빨강 critical 톤
  blocked:     { bg:'#FEF2F2', border:'#FECACA', text:'#DC2626', sub:'#B91C1C', badgeBg:'#FEE2E2', badgeText:'#DC2626' },
  _default:    { bg:'#F0FDF4', border:'#BBF7D0', text:'#047857', sub:'#065F46', badgeBg:'#D1FAE5', badgeText:'#047857' },
}
