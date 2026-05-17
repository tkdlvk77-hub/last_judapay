// ─────────────────────────────────────────────────────────
// companyProfileStore.js — 기업 프로필 데이터 store
//
// 역할:
//   - 사용자가 직접 입력하는 프로필 데이터를 localStorage에 영구 저장
//   - transactionStore에서 실제 거래 데이터 기반 운영 지표 계산
//   - MonthlyReport(투자자용) 기업목표 섹션, PublicPreview 등이 이 store를 참조
//
// 저장 항목 (사용자 직접 입력):
//   - msg         : 대표 메시지 (소개탭)
//   - yearGoals   : 연간 목표 4개 (소개탭)
//   - quarterGoals: Q1~Q4 분기별 목표 (소개탭)
//   - quarterDone : Q1~Q4 분기 완료 체크 (소개탭)
//   - projects    : 프로젝트 목록 (프로젝트탭)
//   - vis         : 섹션별 공개 설정
//
// 계산 항목 (transactionStore 기반):
//   - getOperationStability() : 운영 안정성 체크리스트
//   - getActivityContinuity() : 거래 지속성 체크리스트
//   - getTrustSignals()       : 활동 신뢰 지표
// ─────────────────────────────────────────────────────────

import {
  getActivityFeed,
  getTransactionsBySender,
  TX_TYPE_META,
} from './transactionStore'

// ─── 상수 ─────────────────────────────────────────────────
const BIZ_USER_ID = 'biz_juda'
const STORAGE_KEY = 'judapay_company_profile'

const CURRENT_YEAR = new Date().getFullYear()

// 프로젝트 상태 설정
export const STATUS_CFG = {
  ready:       { ko: '준비 단계', color: '#6D28D9', bg: '#F5F3FF' },
  dev:         { ko: '개발 중',   color: '#0369A1', bg: '#EFF6FF' },
  test:        { ko: '테스트 중', color: '#D97706', bg: '#FFFBEB' },
  running:     { ko: '운영 중',   color: '#047857', bg: '#F0FDF4' },
  negotiating: { ko: '협상 중',   color: '#0369A1', bg: '#EFF6FF' },
  signed:      { ko: '계약 완료', color: '#047857', bg: '#F0FDF4' },
  hiring:      { ko: '채용 중',   color: '#D97706', bg: '#FFFBEB' },
  reviewing:   { ko: '검토 중',   color: '#6D28D9', bg: '#F5F3FF' },
  submitted:   { ko: '제출 완료', color: '#0369A1', bg: '#EFF6FF' },
  approved:    { ko: '승인 완료', color: '#047857', bg: '#F0FDF4' },
  done:        { ko: '완료',      color: '#6B7280', bg: '#F9FAFB' },
}

export const CATEGORY_CFG = {
  dev:       { ko: '💻 개발/기술' },
  sales:     { ko: '🤝 영업/계약' },
  invest:    { ko: '💰 투자 유치' },
  hr:        { ko: '👥 채용' },
  marketing: { ko: '📢 마케팅' },
  legal:     { ko: '📋 법무/인증' },
  gov:       { ko: '🏛️ 정부 과제' },
  ops:       { ko: '⚙️ 운영/인프라' },
}

export const CATEGORY_STATUSES = {
  dev:       ['ready', 'dev', 'test', 'running', 'done'],
  sales:     ['ready', 'negotiating', 'signed', 'done'],
  invest:    ['ready', 'reviewing', 'negotiating', 'signed', 'done'],
  hr:        ['ready', 'hiring', 'done'],
  marketing: ['ready', 'running', 'done'],
  legal:     ['ready', 'reviewing', 'submitted', 'approved', 'done'],
  gov:       ['ready', 'reviewing', 'submitted', 'approved', 'running', 'done'],
  ops:       ['ready', 'running', 'done'],
}

// ─── 기본값 ───────────────────────────────────────────────
const DEFAULT_STATE = {
  msg: '이번 달은 기업 자금 자동화 기능 안정화에 집중하고 있습니다.\n\nPG 인프라 구축 및 기업 운영 시스템 연동을 진행 중입니다.\n\n실시간 기업 운영 데이터를 기반으로 자금 흐름 시스템을 개발하고 있습니다.',
  yearGoals: [
    'PG 라이센스 취득',
    '기업 운영 시스템 고도화',
    '투자 연동 구조 구축',
    '기업회원 200곳 확보',
  ],
  quarterGoals: {
    Q1: ['MVP 안정화 및 베타 출시', 'PG 연동 테스트 완료', '기업회원 50곳 확보', '운영 안정화'],
    Q2: ['자동정산 시스템 구축', '기업회원 확대', '운영 안정화', '투자자 데모데이'],
    Q3: ['기업회원 100곳 확보', 'Series A 준비', '실시간 정산 런칭', '운영 리포트 고도화'],
    Q4: ['Series A 클로징', '기업회원 200곳', 'PG 라이센스 취득', '글로벌 확장 준비'],
  },
  quarterDone: {
    Q1: [true, true, false, false],
    Q2: [false, false, false, false],
    Q3: [false, false, false, false],
    Q4: [false, false, false, false],
  },
  projects: [
    { id: 1, name: '기업 자동지출 시스템', status: 'dev',     category: 'dev' },
    { id: 2, name: '법인카드 통합',         status: 'test',    category: 'dev' },
    { id: 3, name: 'PG 인프라 구축',        status: 'ready',   category: 'ops' },
    { id: 4, name: '실시간 정산 시스템',    status: 'running', category: 'dev' },
    { id: 5, name: 'Series A 투자 유치',    status: 'ready',   category: 'invest' },
    { id: 6, name: '개발자 2명 채용',       status: 'running', category: 'hr' },
  ],
  vis: {
    msg:        'public',
    year:       'public',
    quarter:    'public',
    activity:   'public',
    stability:  'public',
    continuity: 'public',
    trust:      'bizOnly',
    projects:   'public',
  },
}

// ─── 내부 상태 ─────────────────────────────────────────────
let _state = loadFromStorage()
let _listeners = []

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw)
    // 누락된 키는 DEFAULT_STATE 값으로 보완
    return {
      ...DEFAULT_STATE,
      ...parsed,
      quarterGoals: { ...DEFAULT_STATE.quarterGoals, ...(parsed.quarterGoals || {}) },
      quarterDone:  { ...DEFAULT_STATE.quarterDone,  ...(parsed.quarterDone  || {}) },
      vis:          { ...DEFAULT_STATE.vis,           ...(parsed.vis          || {}) },
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state))
  } catch {
    // localStorage 미지원 환경 무시
  }
}

function notify() {
  _listeners.forEach(fn => fn(_state))
}

// ─── 구독 ──────────────────────────────────────────────────
export function subscribe(fn) {
  _listeners.push(fn)
  return () => { _listeners = _listeners.filter(f => f !== fn) }
}

// ─── 읽기 셀렉터 ──────────────────────────────────────────
export function getMsg()           { return _state.msg }
export function getYearGoals()     { return _state.yearGoals }
export function getQuarterGoals()  { return _state.quarterGoals }
export function getQuarterDone()   { return _state.quarterDone }
export function getProjects()      { return [..._state.projects] }
export function getVis()           { return { ..._state.vis } }

/** 현재 분기 자동 감지 (Q1~Q4) */
export function getCurrentQuarter() {
  const m = new Date().getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

/** MonthlyReport 투자자용 기업목표 섹션용 데이터 */
export function getBizGoalForReport() {
  const q = getCurrentQuarter()
  return {
    ceoMessage:  _state.msg,
    annualGoal:  _state.yearGoals.filter(Boolean),
    quarterGoal: _state.quarterGoals[q]?.filter(Boolean) ?? [],
    quarterDone: _state.quarterDone[q] ?? [],
    currentQ:    q,
    year:        CURRENT_YEAR,
  }
}

// ─── 쓰기 액션 ────────────────────────────────────────────
export function setMsg(msg) {
  _state = { ..._state, msg }
  saveToStorage()
  notify()
}

export function setYearGoals(yearGoals) {
  _state = { ..._state, yearGoals }
  saveToStorage()
  notify()
}

export function setQuarterGoals(q, goals) {
  _state = {
    ..._state,
    quarterGoals: { ..._state.quarterGoals, [q]: goals },
  }
  saveToStorage()
  notify()
}

export function setQuarterDone(q, done) {
  _state = {
    ..._state,
    quarterDone: { ..._state.quarterDone, [q]: done },
  }
  saveToStorage()
  notify()
}

export function toggleQuarterDone(q, idx) {
  const prev = _state.quarterDone[q] ?? [false, false, false, false]
  const next = prev.map((v, i) => i === idx ? !v : v)
  setQuarterDone(q, next)
}

export function setVis(key, value) {
  _state = { ..._state, vis: { ..._state.vis, [key]: value } }
  saveToStorage()
  notify()
}

// ─── 프로젝트 액션 ────────────────────────────────────────
export function addProject({ name, status, category }) {
  const project = { id: Date.now(), name, status, category }
  _state = { ..._state, projects: [..._state.projects, project] }
  saveToStorage()
  notify()
  return project
}

export function updateProjectStatus(id, status) {
  _state = {
    ..._state,
    projects: _state.projects.map(p => p.id === id ? { ...p, status } : p),
  }
  saveToStorage()
  notify()
}

export function removeProject(id) {
  _state = { ..._state, projects: _state.projects.filter(p => p.id !== id) }
  saveToStorage()
  notify()
}

// ─────────────────────────────────────────────────────────
// 운영 지표 계산 (transactionStore 기반)
// ─────────────────────────────────────────────────────────

/**
 * 운영 안정성 체크리스트
 * — 최근 N개월 급여 지연 없음, 자동 지출 정상 유지 등
 */
export function getOperationStability(userId = BIZ_USER_ID) {
  const txs = getTransactionsBySender(userId)
  const now = Date.now()
  const MS_90  = 90  * 24 * 60 * 60 * 1000
  const MS_180 = 180 * 24 * 60 * 60 * 1000

  // 급여 거래 (최근 6개월)
  const salaryTxs = txs.filter(t =>
    t.type === 'salary' &&
    t.status === 'completed' &&
    new Date(t.createdAt).getTime() > now - MS_180
  )
  const noSalaryDelay = salaryTxs.length > 0

  // 자동 지출 (최근 90일)
  const autoTypes = ['rent', 'subscription', 'telecom', 'utility', 'rentLease', 'insurancePremium']
  const autoTxs = txs.filter(t =>
    autoTypes.includes(t.type) &&
    t.status === 'completed' &&
    new Date(t.createdAt).getTime() > now - MS_90
  )
  const autoPayOk = autoTxs.length > 0

  // 전체 거래 최근 90일 활동
  const recentTxs = txs.filter(t => new Date(t.createdAt).getTime() > now - MS_90)
  const hasRecentActivity = recentTxs.length > 0

  return [
    { icon: noSalaryDelay   ? '✅' : '⚠️', text: `최근 6개월 급여 ${noSalaryDelay ? '지연 없음' : '지연 확인 필요'}`, ok: noSalaryDelay },
    { icon: hasRecentActivity ? '✅' : '⚠️', text: `최근 90일 운영 ${hasRecentActivity ? '중단 없음' : '활동 필요'}`, ok: hasRecentActivity },
    { icon: autoPayOk       ? '✅' : '⚠️', text: `자동 지출 ${autoPayOk ? '정상 유지 중' : '등록 필요'}`, ok: autoPayOk },
    { icon: '✅', text: '사무실 운영 유지 중', ok: true },
  ]
}

/**
 * 거래 지속성 체크리스트
 */
export function getActivityContinuity(userId = BIZ_USER_ID) {
  const txs = getTransactionsBySender(userId)
  const now = Date.now()
  const MS_30 = 30 * 24 * 60 * 60 * 1000
  const MS_90 = 90 * 24 * 60 * 60 * 1000

  const recent30 = txs.filter(t => new Date(t.createdAt).getTime() > now - MS_30)
  const active30 = recent30.length > 0

  // 정기 거래처 (같은 수신자에게 2회 이상 송금)
  const recipientCounts = {}
  txs.forEach(t => {
    if (t.toRecipientId) recipientCounts[t.toRecipientId] = (recipientCounts[t.toRecipientId] || 0) + 1
  })
  const regularPartners = Object.values(recipientCounts).filter(c => c >= 2).length
  const hasRegular = regularPartners > 0

  // 자동 반복 지출 비율
  const autoTypes = ['rent', 'subscription', 'telecom', 'utility', 'rentLease', 'insurancePremium', 'salary']
  const recent90 = txs.filter(t => new Date(t.createdAt).getTime() > now - MS_90)
  const autoCount = recent90.filter(t => autoTypes.includes(t.type)).length
  const autoRatio = recent90.length > 0 ? Math.round(autoCount / recent90.length * 100) : 0
  const autoIncreasing = autoRatio >= 30

  // 외주 정산
  const freelanceTxs = txs.filter(t => t.type === 'freelance' && t.status === 'completed')
  const freelanceOk = freelanceTxs.length > 0

  return [
    { icon: active30     ? '📈' : '⚠️', text: `최근 30일 거래 활성 ${active30 ? '유지' : '없음'}`,                                    ok: active30 },
    { icon: hasRegular   ? '🔄' : '⚠️', text: `정기 거래처 ${hasRegular ? regularPartners + '곳 유지 중' : '없음'}`,                  ok: hasRegular },
    { icon: autoIncreasing ? '📊' : '📊', text: `반복 결제 비율 ${autoRatio}% ${autoIncreasing ? '(증가 추세)' : ''}`,               ok: autoIncreasing },
    { icon: freelanceOk  ? '✅' : '⚠️', text: `외주 정산 ${freelanceOk ? '정상 진행 중' : '내역 없음'}`,                              ok: freelanceOk },
  ]
}

/**
 * 활동 신뢰 지표
 */
export function getTrustSignals(userId = BIZ_USER_ID) {
  const txs = getTransactionsBySender(userId)
  const now = Date.now()
  const MS_30  = 30  * 24 * 60 * 60 * 1000
  const MS_90  = 90  * 24 * 60 * 60 * 1000

  const recent30 = txs.filter(t => new Date(t.createdAt).getTime() > now - MS_30)
  const highActivity = recent30.length >= 3

  const taxTxs = txs.filter(t => t.type === 'tax' && t.status === 'completed')
  const taxDone = taxTxs.length > 0

  const allCompleted = txs.filter(t => new Date(t.createdAt).getTime() > now - MS_90)
  const noPending = allCompleted.length > 0 && allCompleted.every(t => t.status !== 'failed')

  const salaryTxs = txs.filter(t => t.type === 'salary' && t.status === 'completed')
  const salaryOk = salaryTxs.length > 0

  return [
    { icon: '⚡', text: `최근 활동 빈도 ${highActivity ? '높음' : '낮음'}`,  ok: highActivity },
    { icon: '📋', text: `세금 신고 ${taxDone ? '완료' : '내역 없음'}`,       ok: taxDone },
    { icon: '✅', text: `정산 ${noPending ? '누락 없음' : '오류 확인 필요'}`, ok: noPending },
    { icon: '💰', text: `급여 지급 ${salaryOk ? '정상 유지' : '내역 없음'}`, ok: salaryOk },
    { icon: '🔄', text: '운영 데이터 지속 업데이트 중', ok: true },
  ]
}

/**
 * 활동 피드 (transactionStore 기반 — CompanyProfile 활동탭용)
 */
export function getCompanyActivityFeed(userId = BIZ_USER_ID, limit = 20) {
  const raw = getActivityFeed({ userId, limit })
  return raw.map(a => {
    // a.type이 없는 경우 txId로 역참조, 없으면 'other'
    const type = a.type || (a.txId ? a.txId.replace(/^tx_/, '') : null) || 'other'
    const meta = TX_TYPE_META[type] || {}
    return {
      id:       a.id,
      // icon: 활동 항목 자체에 이미 설정된 icon 우선 사용
      icon:     a.icon || meta.icon || '📋',
      // text: 활동 항목 자체에 이미 설정된 text 우선 사용 (undefined 방지)
      text:     a.text || a.title || (meta.labelKo ? `${meta.labelKo} 처리 완료` : '활동 내역'),
      time:     a.time,
      category: mapTypeToFeedCategory(type),
    }
  })
}

function mapTypeToFeedCategory(type) {
  if (['salary', 'bonus', 'condolence', 'otherIncome', 'insurance4'].includes(type)) return 'payroll'
  if (['rent', 'subscription', 'telecom', 'utility', 'rentLease', 'insurancePremium',
       'travelMeal', 'welfare', 'otherOps'].includes(type)) return 'expense'
  if (['freelance', 'marketing', 'marketing2'].includes(type)) return 'contract'
  if (['tax'].includes(type)) return 'tax'
  if (['invest', 'lend', 'support', 'vendorLoan'].includes(type)) return 'invest'
  return 'other'
}
