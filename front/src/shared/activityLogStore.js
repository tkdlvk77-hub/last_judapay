// ─────────────────────────────────────────────────────────
// activityLogStore.js — 주다페이 활동 로그 통합 store
//
// 역할:
//   - 금융 PG사 심사 대응용 전체 활동 로그 기록
//   - 12개 카테고리 / 100+ 이벤트 타입 정의
//   - localStorage 기반 임시 저장 (실서비스 → 서버 API 전송)
//   - AdminManagementBiz 화면 5개 카테고리 뷰 데이터 공급
//   - transactionStore 이벤트와 연동하여 자동 로깅
//
// 서버 전송 구조 (백엔드 연동 시):
//   logEvent() 호출 → _queue에 쌓임 → flushToServer() 일괄 전송
//   각 로그 항목: { id, category, action, actor, target, meta, ip, userAgent, createdAt }
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// 1. 카테고리 정의
// ─────────────────────────────────────────────────────────
export const LOG_CATEGORY = {
  AUTH:        'auth',        // 계정/접속
  MEMBER:      'member',      // 구성원/권한
  EXECUTION:   'execution',   // 자금 집행
  APPROVAL:    'approval',    // 승인/처리
  CARD:        'card',        // 법인카드
  AUTO_PAY:    'auto_pay',    // 자동지급/정기지출
  AUTH_FUND:   'auth_fund',   // 권한 자금
  EVIDENCE:    'evidence',    // 증빙
  TAX:         'tax',         // 세금/보험/4대보험
  MESSAGE:     'message',     // 메시지/금융로그
  REPORT:      'report',      // 보고서
  SYSTEM:      'system',      // 시스템/보안
}

// ─────────────────────────────────────────────────────────
// 2. 액션 타입 전체 정의 (PG사 제출용)
// ─────────────────────────────────────────────────────────
export const LOG_ACTION = {
  // ── 계정/접속
  LOGIN:                  'login',
  LOGOUT:                 'logout',
  LOGIN_FAIL:             'login_fail',
  PASSWORD_CHANGE:        'password_change',
  MFA_SUCCESS:            'mfa_success',
  MFA_FAIL:               'mfa_fail',
  NEW_DEVICE:             'new_device',
  IP_CHANGE:              'ip_change',

  // ── 구성원/권한
  MEMBER_INVITE:          'member_invite',
  MEMBER_REMOVE:          'member_remove',
  ROLE_CHANGE:            'role_change',
  APPROVAL_GRANT:         'approval_grant',
  APPROVAL_REVOKE:        'approval_revoke',
  CARD_PERM_CHANGE:       'card_perm_change',
  EXEC_PERM_CHANGE:       'exec_perm_change',
  ADMIN_CHANGE:           'admin_change',

  // ── 자금 집행
  EXEC_REQUEST:           'exec_request',
  EXEC_APPROVED:          'exec_approved',
  EXEC_REJECTED:          'exec_rejected',
  EXEC_MORE_INFO:         'exec_more_info',
  EXEC_COMPLETED:         'exec_completed',
  EXEC_FAILED:            'exec_failed',
  EXEC_RETRY:             'exec_retry',
  EXEC_CANCELLED:         'exec_cancelled',
  EXEC_WALLET_CHANGE:     'exec_wallet_change',
  EXEC_RECIPIENT_CHANGE:  'exec_recipient_change',
  EXEC_AMOUNT_CHANGE:     'exec_amount_change',
  EXEC_PURPOSE_CHANGE:    'exec_purpose_change',

  // ── 승인/처리
  APPROVAL_REQUEST:       'approval_request',
  APPROVAL_DONE:          'approval_done',
  APPROVAL_DENIED:        'approval_denied',
  MORE_INFO_SENT:         'more_info_sent',
  RESUBMIT_DONE:          'resubmit_done',
  REVIEW_REQUEST:         'review_request',
  REVIEW_DONE:            'review_done',
  REVIEW_DENIED:          'review_denied',
  SUPPLEMENT_REQUEST:     'supplement_request',
  CLARIFY_REQUEST:        'clarify_request',
  CLARIFY_SUBMITTED:      'clarify_submitted',
  CLARIFY_DONE:           'clarify_done',
  EVIDENCE_REQUEST:       'evidence_request',
  EVIDENCE_SUBMITTED:     'evidence_submitted',
  EVIDENCE_DONE:          'evidence_done',

  // ── 법인카드
  CARD_ISSUED:            'card_issued',
  CARD_SUSPENDED:         'card_suspended',
  CARD_RESUMED:           'card_resumed',
  CARD_LOST:              'card_lost',
  CARD_LIMIT_CHANGE:      'card_limit_change',
  CARD_MCC_CHANGE:        'card_mcc_change',
  CARD_OVERSEAS_CHANGE:   'card_overseas_change',
  CARD_ONLINE_CHANGE:     'card_online_change',
  CARD_APPROVED:          'card_approved',
  CARD_CANCELLED:         'card_cancelled',
  CARD_DECLINED:          'card_declined',
  CARD_BLOCKED:           'card_blocked',
  CARD_UNCLASSIFIED:      'card_unclassified',
  CARD_CLASSIFIED:        'card_classified',
  CARD_RECLASSIFIED:      'card_reclassified',

  // ── 자동지급/정기지출
  AUTOPAY_REGISTER:       'autopay_register',
  AUTOPAY_UPDATE:         'autopay_update',
  AUTOPAY_CANCEL:         'autopay_cancel',
  AUTOPAY_EXECUTED:       'autopay_executed',
  AUTOPAY_FAILED:         'autopay_failed',
  AUTOPAY_RETRY:          'autopay_retry',
  AUTOPAY_DATE_CHANGE:    'autopay_date_change',
  AUTOPAY_AMOUNT_CHANGE:  'autopay_amount_change',
  AUTOPAY_METHOD_CHANGE:  'autopay_method_change',
  AUTOPAY_LOW_BALANCE:    'autopay_low_balance',

  // ── 권한 자금
  AUTHFUND_INVEST_IN:     'authfund_invest_in',
  AUTHFUND_GRANT_IN:      'authfund_grant_in',
  AUTHFUND_LOAN_CREATE:   'authfund_loan_create',
  AUTHFUND_WALLET_CREATE: 'authfund_wallet_create',
  AUTHFUND_USED:          'authfund_used',
  AUTHFUND_CARD_USED:     'authfund_card_used',
  AUTHFUND_EXPIRY_WARN:   'authfund_expiry_warn',
  AUTHFUND_PURPOSE_CHANGE:'authfund_purpose_change',
  AUTHFUND_RECIPIENT_CHG: 'authfund_recipient_chg',
  AUTHFUND_RATE_CHANGE:   'authfund_rate_change',
  AUTHFUND_BALANCE_CHANGE:'authfund_balance_change',

  // ── 증빙
  EVIDENCE_UPLOAD:        'evidence_upload',
  EVIDENCE_DELETE:        'evidence_delete',
  EVIDENCE_UPDATE:        'evidence_update',
  EVIDENCE_MISSING:       'evidence_missing',
  EVIDENCE_REVIEWED:      'evidence_reviewed',
  EVIDENCE_PACKAGE:       'evidence_package',
  ZIP_DOWNLOAD_REQ:       'zip_download_req',
  ZIP_CREATED:            'zip_created',
  EVIDENCE_SENT_TAX:      'evidence_sent_tax',
  EVIDENCE_SENT_GOV:      'evidence_sent_gov',

  // ── 세금/보험/4대보험
  TAX_REGISTER:           'tax_register',
  TAX_SCHEDULED:          'tax_scheduled',
  TAX_PAID:               'tax_paid',
  TAX_FAILED:             'tax_failed',
  TAX_NOTICE_UPLOAD:      'tax_notice_upload',
  TAX_REF_REGISTER:       'tax_ref_register',
  INS_REGISTER:           'ins_register',
  INS_PAID:               'ins_paid',
  INS_EXPIRY_WARN:        'ins_expiry_warn',
  INS4_CALC:              'ins4_calc',
  INS4_PAID:              'ins4_paid',

  // ── 메시지/금융로그
  MSG_FUND_REQUEST:       'msg_fund_request',
  MSG_PAY_REQUEST:        'msg_pay_request',
  MSG_APPROVAL_REQUEST:   'msg_approval_request',
  MSG_REVIEW_REQUEST:     'msg_review_request',
  MSG_CLARIFY_REQUEST:    'msg_clarify_request',
  MSG_EVIDENCE_REQUEST:   'msg_evidence_request',
  MSG_FILE_ATTACH:        'msg_file_attach',
  MSG_RESPONSE:           'msg_response',
  MSG_COMPLETED:          'msg_completed',
  MSG_REJECTED:           'msg_rejected',

  // ── 보고서
  REPORT_CREATED:         'report_created',
  REPORT_REGENERATED:     'report_regenerated',
  REPORT_DOWNLOADED:      'report_downloaded',
  REPORT_SENT:            'report_sent',
  REPORT_SEND_FAIL:       'report_send_fail',
  REPORT_VIEWED:          'report_viewed',
  REPORT_RECIPIENT_CHANGE:'report_recipient_change',

  // ── 시스템/보안
  ANOMALY_DETECTED:       'anomaly_detected',
  LOW_BALANCE_RISK:       'low_balance_risk',
  REPEAT_FAIL_DETECTED:   'repeat_fail_detected',
  CARD_BLOCK_TRIGGERED:   'card_block_triggered',
  UNAUTHORIZED_ACCESS:    'unauthorized_access',
  CRITICAL_SETTING_CHANGE:'critical_setting_change',
  API_SUCCESS:            'api_success',
  API_FAIL:               'api_fail',
  COOCON_SUCCESS:         'coocon_success',
  COOCON_FAIL:            'coocon_fail',
}

// ─────────────────────────────────────────────────────────
// 3. 사용자 표시용 라벨 (AdminManagementBiz 5개 카테고리)
// ─────────────────────────────────────────────────────────
export const ACTION_LABEL = {
  // 자금 집행
  [LOG_ACTION.EXEC_REQUEST]:          { label:'집행 요청됨',       color:'#1D4ED8', bg:'#EEF2FF' },
  [LOG_ACTION.EXEC_APPROVED]:         { label:'승인 완료',         color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.EXEC_REJECTED]:         { label:'반려됨',            color:'#C0392B', bg:'#FEE9E9' },
  [LOG_ACTION.EXEC_MORE_INFO]:        { label:'추가 요청됨',       color:'#92590A', bg:'#FEF3E0' },
  [LOG_ACTION.EXEC_COMPLETED]:        { label:'집행 완료',         color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.EXEC_FAILED]:           { label:'집행 실패',         color:'#C0392B', bg:'#FEE9E9' },
  // 카드 결제
  [LOG_ACTION.CARD_APPROVED]:         { label:'카드 결제 발생',    color:'#6D28D9', bg:'#F3EEFF' },
  [LOG_ACTION.CARD_UNCLASSIFIED]:     { label:'미분류 결제 발생',  color:'#92590A', bg:'#FEF3E0' },
  [LOG_ACTION.CARD_CLASSIFIED]:       { label:'결제 목적 분류 완료', color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.CARD_BLOCKED]:          { label:'이상 결제 확인 필요', color:'#C0392B', bg:'#FEE9E9' },
  // 검수/소명/증빙
  [LOG_ACTION.REVIEW_DONE]:           { label:'검수 완료',         color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.SUPPLEMENT_REQUEST]:    { label:'보완 요청됨',       color:'#92590A', bg:'#FEF3E0' },
  [LOG_ACTION.CLARIFY_REQUEST]:       { label:'소명 요청 도착',    color:'#C0392B', bg:'#FEE9E9' },
  [LOG_ACTION.CLARIFY_DONE]:          { label:'소명 응답 완료',    color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.EVIDENCE_DONE]:         { label:'증빙 제출 완료',    color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.EVIDENCE_MISSING]:      { label:'증빙 누락 확인',    color:'#C0392B', bg:'#FEE9E9' },
  // 권한 자금
  [LOG_ACTION.AUTHFUND_USED]:         { label:'권한 자금 사용됨',  color:'#6D28D9', bg:'#F3EEFF' },
  [LOG_ACTION.AUTHFUND_EXPIRY_WARN]:  { label:'권한 자금 만료 임박', color:'#C0392B', bg:'#FEE9E9' },
  [LOG_ACTION.AUTHFUND_RATE_CHANGE]:  { label:'지원금 집행률 초과 주의', color:'#C0392B', bg:'#FEE9E9' },
  // 보고서
  [LOG_ACTION.REPORT_CREATED]:        { label:'월간 보고서 생성 완료', color:'#0D7750', bg:'#E6F6EF' },
  [LOG_ACTION.REPORT_SENT]:           { label:'보고서 전송 완료',  color:'#0D7750', bg:'#E6F6EF' },
}

// 사용자 표시 카테고리 분류
export const DISPLAY_CATEGORY = {
  execution: {
    label: '자금 집행',
    emoji: '💰',
    actions: [
      LOG_ACTION.EXEC_REQUEST, LOG_ACTION.EXEC_APPROVED, LOG_ACTION.EXEC_REJECTED,
      LOG_ACTION.EXEC_MORE_INFO, LOG_ACTION.EXEC_COMPLETED, LOG_ACTION.EXEC_FAILED,
    ],
  },
  card: {
    label: '카드 결제',
    emoji: '💳',
    actions: [
      LOG_ACTION.CARD_APPROVED, LOG_ACTION.CARD_UNCLASSIFIED,
      LOG_ACTION.CARD_CLASSIFIED, LOG_ACTION.CARD_BLOCKED,
    ],
  },
  review: {
    label: '검수/소명/증빙',
    emoji: '📋',
    actions: [
      LOG_ACTION.REVIEW_DONE, LOG_ACTION.SUPPLEMENT_REQUEST, LOG_ACTION.CLARIFY_REQUEST,
      LOG_ACTION.CLARIFY_DONE, LOG_ACTION.EVIDENCE_DONE, LOG_ACTION.EVIDENCE_MISSING,
    ],
  },
  authFund: {
    label: '권한 자금',
    emoji: '🔐',
    actions: [
      LOG_ACTION.AUTHFUND_USED, LOG_ACTION.AUTHFUND_EXPIRY_WARN, LOG_ACTION.AUTHFUND_RATE_CHANGE,
    ],
  },
  report: {
    label: '보고서',
    emoji: '📊',
    actions: [LOG_ACTION.REPORT_CREATED, LOG_ACTION.REPORT_SENT],
  },
}

// ─────────────────────────────────────────────────────────
// 4. 내부 상태
// ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'judapay_activity_logs'
const MAX_LOGS    = 500   // 최대 보관 개수 (localStorage 용량 관리)

let _logs      = loadFromStorage()
let _listeners = []
let _queue     = []  // 서버 전송 대기열

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : _buildDemoLogs()
  } catch {
    return _buildDemoLogs()
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_logs.slice(0, MAX_LOGS)))
  } catch { /* localStorage 용량 초과 무시 */ }
}

function notify() {
  _listeners.forEach(fn => fn(_logs))
}

function _now() { return new Date().toISOString() }

function _fmt(iso) {
  try {
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return iso }
}

// ─────────────────────────────────────────────────────────
// 5. 데모 초기 로그 (화면 확인용)
// ─────────────────────────────────────────────────────────
function _buildDemoLogs() {
  const base = new Date('2026-05-12T10:00:00')
  const ago  = (minutes) => new Date(base - minutes * 60000).toISOString()

  return [
    // 자금 집행
    _entry(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_COMPLETED,  '김관리', '급여 집행 완료 · 12명 · 38,400,000원',    { amount:38400000, type:'salary'   }, ago(5)   ),
    _entry(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_REQUEST,    '박팀장', '외주비 집행 요청 · 김개발 · 1,500,000원',  { amount:1500000,  type:'freelance' }, ago(42)  ),
    _entry(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_APPROVED,   '이대표', '외주비 집행 승인 · 1,500,000원',           { amount:1500000,  type:'freelance' }, ago(38)  ),
    _entry(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_REJECTED,   '이대표', '마케팅비 반려 · 사유: 목적 불명확',        { amount:500000,   type:'marketing' }, ago(180) ),
    _entry(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_MORE_INFO,  '김관리', '운영비 추가 요청 · 증빙 서류 요청',        { amount:200000,   type:'ops'       }, ago(360) ),

    // 카드 결제
    _entry(LOG_CATEGORY.CARD, LOG_ACTION.CARD_APPROVED,        '시스템', '법인카드 결제 · 스타벅스 · 15,000원',      { amount:15000  }, ago(20)  ),
    _entry(LOG_CATEGORY.CARD, LOG_ACTION.CARD_UNCLASSIFIED,    '시스템', '미분류 결제 발생 · AWS · 340,000원',        { amount:340000 }, ago(90)  ),
    _entry(LOG_CATEGORY.CARD, LOG_ACTION.CARD_CLASSIFIED,      '박팀장', '결제 목적 분류 완료 · AWS → 개발비',        {               }, ago(85)  ),
    _entry(LOG_CATEGORY.CARD, LOG_ACTION.CARD_BLOCKED,         '시스템', '이상 결제 감지 · 심야 해외 결제 시도',      { amount:890000 }, ago(1440)),

    // 검수/소명/증빙
    _entry(LOG_CATEGORY.APPROVAL, LOG_ACTION.REVIEW_DONE,      '정세무', '4월 세금계산서 검수 완료 · 32건',           {               }, ago(120) ),
    _entry(LOG_CATEGORY.APPROVAL, LOG_ACTION.SUPPLEMENT_REQUEST,'정세무','외주비 보완 요청 · 계약서 추가 필요',        {               }, ago(240) ),
    _entry(LOG_CATEGORY.APPROVAL, LOG_ACTION.CLARIFY_REQUEST,  '시스템', '소명 요청 도착 · 접대비 300,000원',         { amount:300000 }, ago(480) ),
    _entry(LOG_CATEGORY.APPROVAL, LOG_ACTION.CLARIFY_DONE,     '김관리', '소명 응답 완료 · 클라이언트 미팅 식대',     {               }, ago(470) ),
    _entry(LOG_CATEGORY.EVIDENCE, LOG_ACTION.EVIDENCE_DONE,    '박팀장', '증빙 제출 완료 · 외주계약서 첨부',          {               }, ago(200) ),
    _entry(LOG_CATEGORY.EVIDENCE, LOG_ACTION.EVIDENCE_MISSING, '시스템', '증빙 누락 확인 · 구독료 2건 미첨부',        {               }, ago(720) ),

    // 권한 자금
    _entry(LOG_CATEGORY.AUTH_FUND, LOG_ACTION.AUTHFUND_USED,   '김관리', '정부과제 지원금 사용 · 개발비 2,000,000원', { amount:2000000 }, ago(60)  ),
    _entry(LOG_CATEGORY.AUTH_FUND, LOG_ACTION.AUTHFUND_EXPIRY_WARN,'시스템','지원금 만료 임박 · 30일 후 만료',         {               }, ago(720) ),
    _entry(LOG_CATEGORY.AUTH_FUND, LOG_ACTION.AUTHFUND_RATE_CHANGE,'시스템','집행률 92% 도달 · 한도 소진 주의',        { rate:92       }, ago(360) ),

    // 보고서
    _entry(LOG_CATEGORY.REPORT, LOG_ACTION.REPORT_CREATED,     '시스템', '5월 투자자용 보고서 자동 생성 완료',         {               }, ago(1440)),
    _entry(LOG_CATEGORY.REPORT, LOG_ACTION.REPORT_SENT,        '이대표', '세무사 보고서 전송 완료 · 정세무',           {               }, ago(1200)),
  ].reverse()  // 최신 순
}

function _entry(category, action, actor, target, meta = {}, createdAt = _now()) {
  return {
    id:        `log_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    category,
    action,
    actor,
    target,
    meta,
    ip:        '192.168.1.x',
    userAgent: 'Judapay App',
    createdAt,
    displayAt: _fmt(createdAt),
  }
}

// ─────────────────────────────────────────────────────────
// 6. 구독
// ─────────────────────────────────────────────────────────
export function subscribe(fn) {
  _listeners.push(fn)
  return () => { _listeners = _listeners.filter(f => f !== fn) }
}

// ─────────────────────────────────────────────────────────
// 7. 핵심 로그 함수
// ─────────────────────────────────────────────────────────

/**
 * 활동 로그 기록
 * @param {string} category  - LOG_CATEGORY.*
 * @param {string} action    - LOG_ACTION.*
 * @param {object} params    - { actor, target, meta, ip, userAgent }
 */
export function logEvent(category, action, { actor = '시스템', target = '', meta = {}, ip = '', userAgent = '' } = {}) {
  const entry = {
    id:        `log_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    category,
    action,
    actor,
    target,
    meta,
    ip:        ip || _getIp(),
    userAgent: userAgent || navigator?.userAgent?.slice(0, 80) || 'Unknown',
    createdAt: _now(),
    displayAt: _fmt(_now()),
  }

  _logs = [entry, ..._logs].slice(0, MAX_LOGS)
  _queue.push(entry)
  saveToStorage()
  notify()

  // 서버 전송 (실서비스 연동 시 활성화)
  // flushToServer()

  return entry
}

function _getIp() {
  // 실서비스: 서버에서 클라이언트 IP 수신 / 데모: 내부 IP 대체
  return '192.168.1.1'
}

// ─────────────────────────────────────────────────────────
// 8. 카테고리별 단축 함수
// ─────────────────────────────────────────────────────────

// 계정/접속
export const log = {
  login:          (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.LOGIN,          params),
  logout:         (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.LOGOUT,         params),
  loginFail:      (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.LOGIN_FAIL,     params),
  passwordChange: (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.PASSWORD_CHANGE,params),
  mfaSuccess:     (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.MFA_SUCCESS,    params),
  mfaFail:        (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.MFA_FAIL,       params),
  newDevice:      (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.NEW_DEVICE,     params),
  ipChange:       (params) => logEvent(LOG_CATEGORY.AUTH,      LOG_ACTION.IP_CHANGE,      params),

  // 구성원/권한
  memberInvite:   (params) => logEvent(LOG_CATEGORY.MEMBER,    LOG_ACTION.MEMBER_INVITE,  params),
  memberRemove:   (params) => logEvent(LOG_CATEGORY.MEMBER,    LOG_ACTION.MEMBER_REMOVE,  params),
  roleChange:     (params) => logEvent(LOG_CATEGORY.MEMBER,    LOG_ACTION.ROLE_CHANGE,    params),
  approvalGrant:  (params) => logEvent(LOG_CATEGORY.MEMBER,    LOG_ACTION.APPROVAL_GRANT, params),
  adminChange:    (params) => logEvent(LOG_CATEGORY.MEMBER,    LOG_ACTION.ADMIN_CHANGE,   params),

  // 자금 집행
  execRequest:    (params) => logEvent(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_REQUEST,   params),
  execApproved:   (params) => logEvent(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_APPROVED,  params),
  execRejected:   (params) => logEvent(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_REJECTED,  params),
  execCompleted:  (params) => logEvent(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_COMPLETED, params),
  execFailed:     (params) => logEvent(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_FAILED,    params),
  execCancelled:  (params) => logEvent(LOG_CATEGORY.EXECUTION, LOG_ACTION.EXEC_CANCELLED, params),

  // 카드
  cardApproved:   (params) => logEvent(LOG_CATEGORY.CARD,      LOG_ACTION.CARD_APPROVED,  params),
  cardUnclassified:(params) => logEvent(LOG_CATEGORY.CARD,     LOG_ACTION.CARD_UNCLASSIFIED,params),
  cardClassified: (params) => logEvent(LOG_CATEGORY.CARD,      LOG_ACTION.CARD_CLASSIFIED, params),
  cardBlocked:    (params) => logEvent(LOG_CATEGORY.CARD,      LOG_ACTION.CARD_BLOCKED,   params),

  // 검수/소명/증빙
  reviewDone:     (params) => logEvent(LOG_CATEGORY.APPROVAL,  LOG_ACTION.REVIEW_DONE,    params),
  supplementReq:  (params) => logEvent(LOG_CATEGORY.APPROVAL,  LOG_ACTION.SUPPLEMENT_REQUEST,params),
  clarifyRequest: (params) => logEvent(LOG_CATEGORY.APPROVAL,  LOG_ACTION.CLARIFY_REQUEST,params),
  clarifyDone:    (params) => logEvent(LOG_CATEGORY.APPROVAL,  LOG_ACTION.CLARIFY_DONE,   params),
  evidenceDone:   (params) => logEvent(LOG_CATEGORY.EVIDENCE,  LOG_ACTION.EVIDENCE_DONE,  params),
  evidenceMissing:(params) => logEvent(LOG_CATEGORY.EVIDENCE,  LOG_ACTION.EVIDENCE_MISSING,params),

  // 권한 자금
  authFundUsed:   (params) => logEvent(LOG_CATEGORY.AUTH_FUND, LOG_ACTION.AUTHFUND_USED,  params),
  authFundExpiry: (params) => logEvent(LOG_CATEGORY.AUTH_FUND, LOG_ACTION.AUTHFUND_EXPIRY_WARN,params),
  authFundRate:   (params) => logEvent(LOG_CATEGORY.AUTH_FUND, LOG_ACTION.AUTHFUND_RATE_CHANGE,params),

  // 보고서
  reportCreated:  (params) => logEvent(LOG_CATEGORY.REPORT,    LOG_ACTION.REPORT_CREATED, params),
  reportSent:     (params) => logEvent(LOG_CATEGORY.REPORT,    LOG_ACTION.REPORT_SENT,    params),
  reportDownload: (params) => logEvent(LOG_CATEGORY.REPORT,    LOG_ACTION.REPORT_DOWNLOADED,params),
  reportViewed:   (params) => logEvent(LOG_CATEGORY.REPORT,    LOG_ACTION.REPORT_VIEWED,  params),

  // 시스템/보안
  anomalyDetected:(params) => logEvent(LOG_CATEGORY.SYSTEM,    LOG_ACTION.ANOMALY_DETECTED,params),
  lowBalanceRisk: (params) => logEvent(LOG_CATEGORY.SYSTEM,    LOG_ACTION.LOW_BALANCE_RISK,params),
  apiSuccess:     (params) => logEvent(LOG_CATEGORY.SYSTEM,    LOG_ACTION.API_SUCCESS,    params),
  apiFail:        (params) => logEvent(LOG_CATEGORY.SYSTEM,    LOG_ACTION.API_FAIL,       params),
  cooconSuccess:  (params) => logEvent(LOG_CATEGORY.SYSTEM,    LOG_ACTION.COOCON_SUCCESS, params),
  cooconFail:     (params) => logEvent(LOG_CATEGORY.SYSTEM,    LOG_ACTION.COOCON_FAIL,    params),
}

// transactionStore addTransaction 완료 시 자동 로깅 (연동 헬퍼)
export function logFromTransaction(tx) {
  if (!tx) return
  const target = `${tx.type || ''} · ${tx.recipient?.name || tx.toRecipientName || ''} · ${Number(tx.amount||0).toLocaleString('ko-KR')}원`
  if (tx.status === 'completed') {
    log.execCompleted({ actor: tx.fromUserName || '시스템', target, meta: { txId: tx.id, amount: tx.amount, type: tx.type } })
  } else if (tx.status === 'failed') {
    log.execFailed({ actor: tx.fromUserName || '시스템', target, meta: { txId: tx.id, amount: tx.amount, type: tx.type } })
  } else {
    log.execRequest({ actor: tx.fromUserName || '시스템', target, meta: { txId: tx.id, amount: tx.amount, type: tx.type } })
  }
}

// ─────────────────────────────────────────────────────────
// 9. 조회 셀렉터
// ─────────────────────────────────────────────────────────

/** 전체 로그 (서버 제출용) */
export function getAllLogs({ limit = 200 } = {}) {
  return _logs.slice(0, limit)
}

/** 카테고리별 필터 */
export function getLogsByCategory(category, { limit = 50 } = {}) {
  return _logs.filter(l => l.category === category).slice(0, limit)
}

/** AdminManagementBiz 표시용 — 5개 표시 카테고리 액션만 필터 */
export function getDisplayLogs({ displayCategory = 'all', limit = 50 } = {}) {
  const allDisplayActions = Object.values(DISPLAY_CATEGORY).flatMap(c => c.actions)

  let filtered = _logs.filter(l => allDisplayActions.includes(l.action))

  if (displayCategory !== 'all') {
    const cfg = DISPLAY_CATEGORY[displayCategory]
    if (cfg) filtered = filtered.filter(l => cfg.actions.includes(l.action))
  }

  return filtered.slice(0, limit)
}

/** 이상탐지 로그만 */
export function getAnomalyLogs({ limit = 20 } = {}) {
  return _logs.filter(l =>
    l.category === LOG_CATEGORY.SYSTEM &&
    [LOG_ACTION.ANOMALY_DETECTED, LOG_ACTION.UNAUTHORIZED_ACCESS,
     LOG_ACTION.REPEAT_FAIL_DETECTED, LOG_ACTION.CARD_BLOCK_TRIGGERED].includes(l.action)
  ).slice(0, limit)
}

/** 관리자 감사 로그 (구성원/권한 + 시스템 보안) */
export function getAdminAuditLogs({ limit = 50 } = {}) {
  return _logs.filter(l =>
    [LOG_CATEGORY.AUTH, LOG_CATEGORY.MEMBER, LOG_CATEGORY.SYSTEM].includes(l.category)
  ).slice(0, limit)
}

// ─────────────────────────────────────────────────────────
// 10. 서버 전송 (백엔드 연동 시 활성화)
// ─────────────────────────────────────────────────────────
// export async function flushToServer() {
//   if (_queue.length === 0) return
//   const batch = [..._queue]
//   _queue = []
//   try {
//     await fetch('/api/activity-logs', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ logs: batch }),
//     })
//   } catch {
//     _queue = [...batch, ..._queue]  // 실패 시 재삽입
//   }
// }

// ─────────────────────────────────────────────────────────
// 11. 개발/테스트용
// ─────────────────────────────────────────────────────────
export function _resetLogs() {
  _logs = _buildDemoLogs()
  saveToStorage()
  notify()
}

export function _dumpLogs() {
  console.table(_logs.slice(0, 20).map(l => ({
    time: l.displayAt, category: l.category, action: l.action, actor: l.actor, target: l.target,
  })))
}
