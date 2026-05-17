// ─────────────────────────────────────────────────────────────────────────────
// 지갑 공통 데이터 + 집행 권한 메타
// WalletPicker, WalletDetail, MyWallet에서 공유
//
// 핵심 원칙:
//   받은 권한 자금은 보내준 사람이 설정한 MCC/목적 범위 내에서
//   자금 집행 가능. 집행 시 보내준 사람에게 자동 알림 발송.
//   "카드 결제 전용" 개념 없음 — MCC 차단 설정에 따라 집행 가능 여부 결정.
//
// canExecute: 이 지갑 돈으로 자금 집행 가능한가
//   true  = 가능 (보내준 사람 MCC 설정 범위 내)
//   false = 불가 (내가 빌려준 돈 / 검수 대기 / 잔액 없음)
//
// allowedExecuteTypes: 가능한 집행 메뉴 목록
//   ['*']     = 모든 메뉴 허용 (MY 지갑만 해당)
//   string[]  = 특정 메뉴만 (보내준 사람 목적 설정에 따름)
//   []        = 권한자금 집행 완전 불가 (수신 지갑 — 체인 차단 정책)
//
// ─────────────────────────────────────────────────────────────────────────────
// [정책] 권한자금 체인 차단 (Chain Block Policy)
//
//   sender !== null 인 지갑(받은 권한자금)은 allowedExecuteTypes: []로 설정.
//   이 지갑 잔액으로 새 지갑을 생성하는 집행(gift/lend/invest/freelance 등)은
//   절대 불가. 일반 소비(카드 결제 등)만 허용.
//
//   이유: 권한자금을 다시 권한자금으로 전달하면 감사 추적이 불가능해지고,
//         보내준 사람(원래 sender)의 목적 통제 범위를 벗어나게 됨.
//         "받은 돈으로 또 다른 지갑을 만드는 행위" = 체인 생성 = 차단.
//
//   적용 대상: sender !== null인 모든 지갑
//   예외: MY 지갑(sender: null) → allowedExecuteTypes: ['*'] 유지
//
// lockedReason: 집행 불가 시 바텀시트에 표시할 이유
// senderAlertEnabled: 집행 시 보내준 사람에게 알림 발송 여부
//
// ─────────────────────────────────────────────────────────────────────────────
// [헷갈림 주의 1] canExecute vs selectable — 완전히 다른 개념
//
//   canExecute  → 지갑 자체의 속성 (이 파일 WALLETS 배열에 저장)
//                 "이 지갑이 집행 가능한 상태인가?"
//                 예: 검수 대기 → false, 내가 빌려준 돈 → false
//                 지갑 상태가 바뀌지 않는 한 변하지 않음
//
//   selectable  → getExecutableWallets(executeType) 호출 시 계산되는 값
//                 "현재 선택된 집행 메뉴에서 이 지갑을 고를 수 있는가?"
//                 canExecute:true 이어야 하고 + allowedExecuteTypes 범위에 포함돼야 함
//                 같은 지갑이라도 executeType이 다르면 selectable이 달라질 수 있음
//                 예: 서울시 교육비(allowedExecuteTypes:['freelance','invest'])
//                     executeType='gift' → selectable:false
//                     executeType='invest' → selectable:true
//
// ─────────────────────────────────────────────────────────────────────────────
// [헷갈림 주의 2] 지갑 데이터가 이 파일과 WalletDetail.jsx 두 곳에 있는 이유
//
//   이 파일(walletsData.js)의 WALLETS:
//     목적: 집행 흐름(WalletPicker → Execute) + MyWallet 잔액 표시
//     내용: 집행 권한(canExecute, allowedExecuteTypes), 잔액(amount), MCC 설정
//     거래 내역 없음. 상세 화면 전용 필드 없음.
//
//   WalletDetail.jsx의 WALLET_DATA:
//     목적: 지갑 상세 화면(/wallet/:id) 렌더링 전용
//     내용: monthlyDeposits, txns, preHistory 등 상세 내역 중심
//     집행 권한 정보 없음. 화면 표시 전용.
//
//   실제 개발 시: 두 데이터를 동일한 백엔드 API에서 통합 관리.
//   현재는 데모이므로 id만 일치시키고 내용은 각 파일에 분리 관리.
//   (예: id:'living_mom' → 양쪽 파일 모두 존재, 다른 필드 담당)
// ─────────────────────────────────────────────────────────────────────────────

export const EXECUTE_TYPES = {
  gift:         '선물·용돈',
  lend:         '빌려주기',
  invest:       '자금 지원',
  freelance:    '외주비',
  realestate:   '부동산',
  'invest-biz': '투자 (기업)',
}

export const WALLETS = [
  {
    id: 'my',
    label: 'MY 지갑',
    sub: '충전 + 노동 대가 통합',
    amount: 1932000,
    fund: null,
    sender: null,
    senderAlertEnabled: false,
    canExecute: true,
    allowedExecuteTypes: ['*'],
    lockedReason: null,
    completed: false,
  },
  {
    id: 'aurora_contract',
    label: '㈜오로라 · 계약금',
    sub: '업무 관련 지출 허용 · 집행 시 오로라에 알림',
    amount: 500000,
    fund: 'freelance',
    sender: '㈜오로라',
    senderAlertEnabled: true,
    canExecute: true,
    // [체인 차단 정책] sender !== null → allowedExecuteTypes: []
    // 받은 권한자금으로 새 권한자금 지갑 생성 불가.
    // 이 지갑으로 gift/lend/invest/freelance 등 집행 시 WalletPicker에 표시 안 됨.
    allowedExecuteTypes: [],
    lockedReason: null,
    completed: false,
    mccBlocked: ['gambling', 'crypto', 'luxury', 'gaming', 'dining'],
  },
  {
    id: 'edu',
    label: '서울시 · 교육비 지원',
    sub: '교육 목적 집행 허용 · 집행 시 서울시에 알림',
    amount: 240000,
    fund: 'invest',
    sender: '서울시청',
    senderAlertEnabled: true,
    canExecute: true,
    // [체인 차단 정책] sender !== null → allowedExecuteTypes: []
    // 기존 서울시 설정(교육 관련 외주비·자금지원 허용)과 무관하게,
    // 받은 권한자금으로 새 권한자금 지갑 생성은 정책상 차단.
    allowedExecuteTypes: [],
    lockedReason: null,
    completed: false,
    mccBlocked: ['gambling', 'crypto', 'luxury', 'gaming'],
  },
  // [gift 타입 정책] 용돈·선물 집행 결과는 상대방 MY 지갑으로 직접 입금.
  // 받는 쪽에 새 지갑이 생성되지 않으므로,
  // 보내는 쪽(judapay)도 "받은 용돈 지갑"이 별도로 생성되지 않음.
  // → fund:'gift' 타입으로 받은 돈은 MY 지갑에 합산됨.
  //   이 파일에 gift 수신 지갑을 별도 항목으로 넣으면 안 됨.
  //   (예: 엄마 용돈 → MY 지갑 잔액으로 들어옴, 별도 지갑 없음)
  {
    id: 'living_minjun',
    label: '박민준 · 생활비',
    sub: '생활비 · 매월 15일 자동집행',
    amount: 300000,
    fund: 'living',
    sender: '박민준',
    senderAlertEnabled: true,
    canExecute: true,
    // [체인 차단 정책] sender !== null → allowedExecuteTypes: []
    // 생활비 지갑은 일반 소비 전용. 권한자금 집행 불가.
    allowedExecuteTypes: [],
    lockedReason: null,
    completed: false,
    mccBlocked: ['gambling', 'crypto', 'luxury'],
  },
  // [freelance 타입 정책] 외주비 집행 흐름:
  //   발주자 집행 → 에스크로(정산 대기) → 검수 완료 → 수주자 MY 지갑 or 외부 계좌로 자동 이체.
  // 수주자(받는 사람) 입장에서 별도 지갑이 생성되지 않음.
  // → 에스크로 상태는 거래 내역("정산 대기 중") 으로만 표시.
  //   이 파일에 freelance 수신 지갑을 별도 항목으로 넣으면 안 됨.
  //   (예: 박철수 외주비 → 검수 완료 시 MY 지갑 or 계좌로 들어옴, 별도 지갑 없음)
]

// 특정 집행 메뉴에서 사용 가능한 지갑 필터 + 정렬
//
// executeType: EXECUTE_TYPES의 키 ('gift' | 'lend' | 'invest' | 'freelance' | ...)
// 반환값: 원본 WALLETS 항목에 selectable(bool) 필드를 추가한 배열
//
// selectable 결정 조건 (두 가지 모두 충족해야 true):
//   1. canExecute === true  (지갑 자체가 집행 가능 상태)
//   2. allowedExecuteTypes에 '*' 또는 executeType이 포함됨
//      (보내준 사람이 해당 목적 허용)
//
// [체인 차단 정책 적용]
//   sender !== null 인 지갑은 allowedExecuteTypes: [] 로 설정되어 있음.
//   빈 배열이면 '*'도 executeType도 매칭 안 됨 → selectable: false 확정.
//   WalletPicker에서 권한자금 집행 메뉴 선택 시 수신 지갑은 항상 흐리게(비선택).
//   MY 지갑(sender: null, allowedExecuteTypes: ['*'])만 항상 selectable: true.
//
// selectable:false 항목도 배열에 포함됨 (WalletPicker에서 흐리게 표시 목적)
export function getExecutableWallets(executeType) {
  return WALLETS
    .filter(w => !w.completed && w.amount > 0)
    .map(w => {
      // canExecute:false → 지갑 상태 자체가 잠김 (검수 대기 등)
      // selectable:false로 고정, allowedExecuteTypes 체크 불필요
      if (!w.canExecute) return { ...w, selectable: false }
      const allowed =
        w.allowedExecuteTypes?.includes('*') ||
        w.allowedExecuteTypes?.includes(executeType)
      return { ...w, selectable: !!allowed }
    })
    .sort((a, b) => {
      // 선택 가능 먼저, 그 안에서 MY 지갑 최우선, 이후 잔액 내림차순
      if (a.selectable && !b.selectable) return -1
      if (!a.selectable && b.selectable) return 1
      if (a.id === 'my') return -1
      if (b.id === 'my') return 1
      return b.amount - a.amount
    })
}

// 지갑 ID로 단일 지갑 조회
export function getWalletById(id) {
  return WALLETS.find(w => w.id === id) || WALLETS[0]
}
