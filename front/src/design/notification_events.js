// ─────────────────────────────────────────────────────────
// 주다페이 알림 이벤트 시스템
// 
// [프론트 역할]
//   - 이벤트 발생 시 triggerNotification() 호출
//   - 앱 내 알림(Alerts) 상태 업데이트
//   - 메시지 대화방에 시스템 카드 자동 생성
//
// [백엔드 역할] ← 실제 개발 시 구현 필요
//   - 푸시 알림 발송 (FCM/APNs)
//   - 알림 히스토리 DB 저장
//   - 읽음 처리 동기화
// ─────────────────────────────────────────────────────────

// ─── 알림 코드 상수 ───────────────────────────────────────
export const NOTIFICATION_CODES = {
  // 자금 집행
  EX_001: 'EX_001', // 집행 요청됨
  EX_002: 'EX_002', // 집행 완료 → 메시지 계약카드 생성
  EX_003: 'EX_003', // 집행 실패
  EX_004: 'EX_004', // 집행 승인 요청 (다단계)
  EX_005: 'EX_005', // 집행 승인됨
  EX_006: 'EX_006', // 집행 반려됨
  EX_007: 'EX_007', // 정기 집행 예정 D-1
  EX_008: 'EX_008', // 정기 집행 완료

  // 자금 수신
  RX_001: 'RX_001', // 수신 완료 → 메시지 계약카드 + 스케줄 생성
  RX_002: 'RX_002', // 요청 승인됨
  RX_003: 'RX_003', // 요청 반려됨
  RX_004: 'RX_004', // 요청 검토 중
  RX_005: 'RX_005', // 지갑 만료 D-7
  RX_006: 'RX_006', // 지갑 만료 D-1
  RX_007: 'RX_007', // 지갑 소진 완료

  // 이상 감지
  AL_001: 'AL_001', // MCC 차단 결제 → 메시지 차단카드 생성
  AL_002: 'AL_002', // 이상 금액 감지
  AL_003: 'AL_003', // 심야 결제 감지
  AL_004: 'AL_004', // 예산 80% 경고
  AL_005: 'AL_005', // 예산 100% 소진
  AL_006: 'AL_006', // 새 기기 로그인
  AL_007: 'AL_007', // 연속 결제 실패 3회

  // 소명 요청
  JU_001: 'JU_001', // 소명 요청 → 메시지 소명카드 생성
  JU_002: 'JU_002', // 소명 제출됨
  JU_003: 'JU_003', // 소명 미제출 D+3 리마인더
  JU_004: 'JU_004', // 소명 승인됨
  JU_005: 'JU_005', // 소명 반려됨

  // 자금 요청 (지원 탭)
  SR_001: 'SR_001', // 자금 요청서 수신
  SR_002: 'SR_002', // 요청서 검토 시작
  SR_003: 'SR_003', // 추가 서류 요청
  SR_004: 'SR_004', // 요청 승인 → 집행
  SR_005: 'SR_005', // 요청 반려

  // 스케줄 / 마일스톤
  SC_001: 'SC_001', // 마일스톤 완료 → 메시지 마일스톤카드
  SC_002: 'SC_002', // 마일스톤 기한 초과
  SC_003: 'SC_003', // 30일 중간 보고
  SC_004: 'SC_004', // 상환일 D-7
  SC_005: 'SC_005', // 상환일 D-1
  SC_006: 'SC_006', // 상환 완료
  SC_007: 'SC_007', // 상환 연체

  // 충전 / 출금
  CH_001: 'CH_001', // 충전 완료
  CH_002: 'CH_002', // 충전 실패
  WD_001: 'WD_001', // 출금 완료
  WD_002: 'WD_002', // 출금 실패
}

// ─── 우선순위 ─────────────────────────────────────────────
export const PRIORITY = {
  CRITICAL: 'CRITICAL', // 즉시 푸시 + 앱 내 빨간 배너
  HIGH:     'HIGH',     // 즉시 푸시 + 앱 내 알림
  MEDIUM:   'MEDIUM',   // 푸시(설정따라) + 앱 내 알림
  LOW:      'LOW',      // 앱 내 알림만
}

// ─── 코드별 메타 정보 ─────────────────────────────────────
export const NOTIFICATION_META = {
  EX_002: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: 'payment' },
  EX_003: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
  EX_004: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: null },
  RX_001: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: 'contract' },
  RX_005: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: false, msgType: null },
  RX_006: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
  AL_001: { priority: PRIORITY.CRITICAL, push: true,  inApp: true,  message: true,  msgType: 'blocked' },
  AL_002: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
  AL_004: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: false, msgType: null },
  AL_005: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
  AL_006: { priority: PRIORITY.CRITICAL, push: true,  inApp: true,  message: false, msgType: null },
  JU_001: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: 'justify' },
  JU_003: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: true,  msgType: 'justify' },
  JU_005: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: null },
  SR_001: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: null },
  SR_004: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: 'contract' },
  SR_005: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: null },
  SC_001: { priority: PRIORITY.LOW,      push: false, inApp: true,  message: true,  msgType: 'milestone' },
  SC_002: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: false, msgType: null },
  SC_004: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: false, msgType: null },
  SC_005: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
  SC_007: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: true,  msgType: null },
  CH_001: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: false, msgType: null },
  CH_002: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
  WD_001: { priority: PRIORITY.MEDIUM,   push: true,  inApp: true,  message: false, msgType: null },
  WD_002: { priority: PRIORITY.HIGH,     push: true,  inApp: true,  message: false, msgType: null },
}

// ─── 메시지 템플릿 ────────────────────────────────────────
export const NOTIFICATION_TEMPLATES = {
  // 자금 집행 완료 (집행자)
  EX_002_executor: {
    push:  (d) => `집행 완료 | ${d.recipientName}에게 ${d.amount.toLocaleString()}원이 집행됐습니다`,
    inApp: (d) => `${d.recipientName} · ${d.amount.toLocaleString()}원 집행 완료`,
    sub:   (d) => `${d.execType} · ${d.date} ${d.time}`,
  },
  // 자금 수신 완료 (수신자)
  RX_001: {
    push:  (d) => `자금 도착 | ${d.executorName}으로부터 ${d.amount.toLocaleString()}원이 도착했습니다`,
    inApp: (d) => `${d.executorName} · ${d.amount.toLocaleString()}원 수신`,
    sub:   (d) => `${d.execType} · ${d.date} ${d.time}`,
    // message: 계약 카드 자동 생성 (msgType: 'contract')
  },
  // MCC 차단
  AL_001: {
    push:  (d) => `🚨 차단 결제 | ${d.recipientName} · ${d.merchant} ${d.amount.toLocaleString()}원`,
    inApp: (d) => `MCC 차단 결제 감지`,
    sub:   (d) => `${d.recipientName} · ${d.merchant} · ${d.mcc}`,
    // message: 차단 카드 자동 생성 (msgType: 'blocked')
  },
  // 소명 요청
  JU_001: {
    push:  (d) => `💬 소명요청 | ${d.executorName}이 소명을 요청했습니다`,
    inApp: (d) => `소명 요청`,
    sub:   (d) => `${d.merchant} ${d.amount.toLocaleString()}원 · 기한 ${d.deadline}`,
    // message: 소명 카드 자동 생성 (msgType: 'justify')
  },
  // 마일스톤 완료
  SC_001: {
    push:  null, // 푸시 없음
    inApp: (d) => `마일스톤 완료`,
    sub:   (d) => `${d.recipientName} · ${d.milestoneText}`,
    // message: 마일스톤 카드 자동 생성 (msgType: 'milestone')
  },
  // 지갑 만료 D-7
  RX_005: {
    push:  (d) => `지갑 만료 D-7 | ${d.walletName} 7일 후 만료됩니다`,
    inApp: (d) => `지갑 만료 D-7`,
    sub:   (d) => `${d.walletName} · ${d.balance.toLocaleString()}원 잔액`,
  },
  // 상환 연체
  SC_007: {
    push:  (d) => `⚠️ 상환 연체 | ${d.recipientName} 상환이 연체됐습니다`,
    inApp: (d) => `상환 연체`,
    sub:   (d) => `${d.recipientName} · ${d.amount.toLocaleString()}원 · D+${d.lateDays}일`,
  },
}

// ─── 프론트엔드 트리거 함수 ───────────────────────────────
// 실제 사용 예시:
//
// import { triggerNotification, NOTIFICATION_CODES } from '../design/notification_events'
//
// // 집행 완료 시
// triggerNotification(NOTIFICATION_CODES.EX_002, {
//   recipientName: '박철수',
//   amount: 1500000,
//   execType: '외주비',
//   date: '2026.05.07',
//   time: '14:22',
//   threadId: 1, // 메시지 대화방 ID
//   contractData: { ... } // 계약 카드 데이터
// })
//
// // MCC 차단 감지 시
// triggerNotification(NOTIFICATION_CODES.AL_001, {
//   recipientName: '박철수',
//   merchant: '강남 룸살롱',
//   amount: 89000,
//   mcc: 'MCC-7011 (유흥/오락)',
//   threadId: 1,
// })

export function triggerNotification(code, data) {
  const meta = NOTIFICATION_META[code]
  if (!meta) return

  // 1. 앱 내 알림 추가 (Alerts 탭)
  if (meta.inApp) {
    addInAppNotification(code, data, meta)
  }

  // 2. 메시지 대화방에 시스템 카드 생성
  if (meta.message && data.threadId) {
    addMessageCard(code, data, meta)
  }

  // 3. 푸시 알림 (백엔드 API 호출)
  // ↓ 실제 개발 시 구현
  if (meta.push) {
    sendPushNotification(code, data)
  }
}

// ─── 앱 내 알림 추가 ─────────────────────────────────────
function addInAppNotification(code, data, meta) {
  // TODO: AlertsContext 또는 전역 상태에 추가
  // 현재는 콘솔 로그로 대체
  const template = NOTIFICATION_TEMPLATES[code]
  if (!template) return
  console.log('[알림]', code, {
    priority: meta.priority,
    title: template.inApp?.(data),
    sub: template.sub?.(data),
  })
  // 실제 구현 시:
  // alertsStore.add({ id, code, priority, title, sub, read: false, timestamp })
}

// ─── 메시지 카드 생성 ─────────────────────────────────────
function addMessageCard(code, data, meta) {
  // TODO: MessagesContext에서 해당 threadId에 시스템 메시지 추가
  console.log('[메시지 카드]', code, {
    threadId: data.threadId,
    msgType: meta.msgType,
    data,
  })
  // 실제 구현 시:
  // messagesStore.addSystemMessage(data.threadId, {
  //   from: 'system',
  //   type: meta.msgType,
  //   data,
  //   time: new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'}),
  //   date: new Date().toLocaleDateString('ko-KR'),
  // })
}

// ─── 푸시 알림 발송 (백엔드 API) ─────────────────────────
async function sendPushNotification(code, data) {
  // TODO: 백엔드 개발 시 구현
  // POST /api/notifications/push
  // {
  //   code,
  //   recipientUserId: data.recipientUserId,
  //   title: template.push?.(data),
  //   body: template.sub?.(data),
  //   priority: meta.priority,
  //   data: { screen, params } // 탭 시 이동할 화면
  // }
  console.log('[푸시 예정]', code, data)
}

// ─── 백엔드 개발자를 위한 푸시 payload 스펙 ──────────────
//
// POST /api/notifications/push
// {
//   "userId": "string",           // 수신자 ID
//   "code": "AL_001",             // 알림 코드
//   "priority": "CRITICAL",       // 우선순위
//   "title": "string",            // 푸시 제목
//   "body": "string",             // 푸시 내용
//   "data": {
//     "screen": "alerts",         // 탭 시 이동 화면
//     "params": { "id": "..." }   // 화면 파라미터
//   }
// }
//
// 화면 이동 맵:
// AL_001 → /payments (실시간 감시)
// JU_001 → /messages/:threadId
// EX_002 → /messages/:threadId
// RX_001 → /messages/:threadId
// SC_002 → /support (마일스톤)
// SC_007 → /messages/:threadId
//
