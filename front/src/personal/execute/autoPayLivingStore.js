// ─────────────────────────────────────────────────────────
// 생활비 자동지급 Store
// 모듈 레벨 싱글턴 — 앱 내 어디서든 import 가능
// ─────────────────────────────────────────────────────────

// 다음 지급일 계산 (오늘 이후 가장 가까운 N일)
export function calcNextPayDate(day) {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  let candidate = new Date(y, m, day)
  if (candidate <= today) {
    candidate = new Date(y, m + 1, day)
  }
  const yy = candidate.getFullYear()
  const mm = String(candidate.getMonth() + 1).padStart(2, '0')
  const dd = String(candidate.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

// 3일 전 알림일 계산
export function calcAlertDate(nextPayDate) {
  const [y, m, d] = nextPayDate.split('.').map(Number)
  const alert = new Date(y, m - 1, d - 3)
  return `${alert.getFullYear()}.${String(alert.getMonth()+1).padStart(2,'0')}.${String(alert.getDate()).padStart(2,'0')}`
}

// 잔액 부족 여부 체크 (데모: MY 지갑 기준 잔액 1,932,000원 가정)
const DEMO_WALLET_BALANCE = 1932000

function checkInsufficient(amount, walletId) {
  // 데모: 500,000원 초과 or 특정 지갑이면 부족으로 표시
  if (walletId === 'gift' || walletId === 'lend') return true
  return amount > DEMO_WALLET_BALANCE * 0.8   // 잔액 80% 초과면 부족 표시
}

// ── 스토어 ────────────────────────────────────────────────
let _store = [
  // 데모 데이터: 이미 등록된 생활비 자동지급 1건 (잔액 부족 상태)
  {
    id: 'al-demo-1',
    recipientName: '이유진',
    recipientInitial: '👧',
    avatarBg: '#FCD34D',
    avatarFg: '#92400E',
    amount: 300000,
    dayOfMonth: 15,
    walletId: 'my',
    walletLabel: 'MY 지갑',
    active: true,
    insufficientBalance: true,  // 데모용 플래그
    nextPayDate: calcNextPayDate(15),
    alertDate: calcAlertDate(calcNextPayDate(15)),
    createdAt: '2026.05.01',
  },
]

const _listeners = []

function _notify() {
  _listeners.forEach(fn => fn([..._store]))
}

// ── API ──────────────────────────────────────────────────
export function getAutoPayLivingList() {
  return [..._store]
}

export function addAutoPayLiving({ recipientName, recipientInitial, avatarBg, avatarFg, amount, dayOfMonth, walletId, walletLabel }) {
  const nextPayDate = calcNextPayDate(dayOfMonth)
  const entry = {
    id: `al-${Date.now()}`,
    recipientName,
    recipientInitial,
    avatarBg,
    avatarFg,
    amount,
    dayOfMonth,
    walletId,
    walletLabel,
    active: true,
    insufficientBalance: checkInsufficient(amount, walletId),
    nextPayDate,
    alertDate: calcAlertDate(nextPayDate),
    createdAt: (() => {
      const d = new Date()
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
    })(),
  }
  // 같은 수신자 기존 항목 교체
  _store = [..._store.filter(x => x.recipientName !== recipientName), entry]
  _notify()
  return entry
}

export function removeAutoPayLiving(id) {
  _store = _store.filter(x => x.id !== id)
  _notify()
}

export function updateAutoPayLiving(id, patch) {
  _store = _store.map(x => x.id === id ? { ...x, ...patch } : x)
  _notify()
}

// 구독 / 해제
export function subscribeAutoPayLiving(fn) {
  _listeners.push(fn)
  fn([..._store])   // 즉시 현재 상태 전달
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

// 처리 필요 항목 (잔액 부족 / 3일 이내 예정) 반환
export function getPendingAutoPayItems() {
  const today = new Date()
  return _store
    .filter(x => x.active)
    .map(x => {
      // 잔액 부족
      if (x.insufficientBalance) {
        return {
          id: `pending-${x.id}`,
          autoPayId: x.id,
          category: '자동 지급 잔액 부족',
          emoji: '⚠️',
          from: `${x.recipientName} 생활비`,
          fromInitial: x.recipientInitial || x.recipientName[0],
          avatarBg: x.avatarBg,
          avatarFg: x.avatarFg,
          desc: `${x.nextPayDate} 집행 예정 · 잔액 부족`,
          amount: `필요 ${Number(x.amount).toLocaleString('ko-KR')}원`,
          urgent: true,
          route: '/charge',
          settingsRoute: '/execute/personal/living',
          settingsState: { autoPayId: x.id },
        }
      }
      // 3일 이내 예정
      const [yy, mm, dd] = x.nextPayDate.split('.').map(Number)
      const payDate = new Date(yy, mm - 1, dd)
      const diffDays = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24))
      if (diffDays <= 3 && diffDays >= 0) {
        return {
          id: `pending-${x.id}`,
          autoPayId: x.id,
          category: '자동 지급 예정',
          emoji: '🔔',
          from: `${x.recipientName} 생활비`,
          fromInitial: x.recipientInitial || x.recipientName[0],
          avatarBg: x.avatarBg,
          avatarFg: x.avatarFg,
          desc: `${x.nextPayDate} 집행 예정 · D-${diffDays}`,
          amount: `${Number(x.amount).toLocaleString('ko-KR')}원`,
          urgent: false,
          route: '/execute/personal/living',
          settingsState: { autoPayId: x.id },
        }
      }
      return null
    })
    .filter(Boolean)
}

// 알림 데이터 (Alerts 화면용)
export function getAutoPayAlerts() {
  const today = new Date()
  return _store
    .filter(x => x.active)
    .map(x => {
      const [yy, mm, dd] = x.nextPayDate.split('.').map(Number)
      const payDate = new Date(yy, mm - 1, dd)
      const diffDays = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24))

      if (x.insufficientBalance) {
        return {
          id: `alert-insuf-${x.id}`,
          autoPayId: x.id,
          type: 'auto_pay_insufficient',
          icon: '⚠️',
          title: `${x.recipientName} 생활비 · 잔액 부족`,
          body: `${x.nextPayDate} 자동 집행 예정이나 잔액이 부족합니다. 충전 후 자동 집행됩니다.`,
          time: '방금',
          unread: true,
          route: '/charge',
          settingsRoute: '/execute/personal/living',
        }
      }
      if (diffDays <= 3 && diffDays >= 0) {
        return {
          id: `alert-upcoming-${x.id}`,
          autoPayId: x.id,
          type: 'auto_pay_upcoming',
          icon: '🔔',
          title: `${x.recipientName} 생활비 자동 지급 예정`,
          body: `${x.nextPayDate}에 ${Number(x.amount).toLocaleString('ko-KR')}원이 자동 집행됩니다. 변경이 필요하면 탭하세요.`,
          time: x.alertDate,
          unread: true,
          route: '/execute/personal/living',
          settingsState: { autoPayId: x.id },
        }
      }
      return null
    })
    .filter(Boolean)
}
