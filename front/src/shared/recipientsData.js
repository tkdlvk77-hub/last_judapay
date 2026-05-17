// ─────────────────────────────────────────────────────────
// 사람 풀 데이터 (Recipients Pool)
//
// 핵심 원칙:
//   - 한 번 입력된 사람은 "역할(roles)" 태그로 분류
//   - 같은 사람이 여러 역할 가질 수 있음 (예: 직원 + 외주 받음)
//   - 메뉴별 자동 필터링 → 사용자가 분류할 필요 없음
//   - 새로 추가 시 진입 메뉴 따라 자동 역할 부여 (수정 가능)
//
// 역할(role) 종류:
//   employee    — 직원 (급여, 상여금, 경조사비 대상)
//   freelancer  — 외부 프리랜서 (외주비 대상)
//   vendor      — 사업자 거래처 (마케팅비, 부동산, 외주사)
//   investee    — 투자 대상 (자금 지원 대상)
//   contact     — 일반 연락처 (개인용 - 용돈/빌려주기)
//
// 메뉴 → 역할 매핑:
//   외주비/기타소득      → freelancer
//   상여금/경조사비/대여금 → employee
//   마케팅비/외주사       → vendor (isBusiness: true)
//   부동산              → vendor (isBusiness: true)
//   자금 지원            → employee (직원 위주, 외부는 새로 추가)
//   용돈선물/빌려주기     → contact (개인용)
// ─────────────────────────────────────────────────────────

export const ROLES = {
  employee:   { label: '직원',      labelEn: 'Employee' },
  freelancer: { label: '프리랜서',   labelEn: 'Freelancer' },
  vendor:     { label: '거래처',     labelEn: 'Vendor' },
  investee:   { label: '투자 대상',  labelEn: 'Investee' },
  contact:    { label: '일반 연락처', labelEn: 'Contact' },
}

// 메뉴 → 기본 역할 매핑
export const MENU_TO_ROLE = {
  freelance:     'freelancer',
  bonus:         'employee',
  condolence:    'employee',
  otherIncome:   'freelancer',  // 강연료/원고료 등 개인 사업 형태
  lend:          'employee',     // 직원 대출
  support:       'employee',
  marketing:     'vendor',
  realestate:    'vendor',
  vendorOutsourcing: 'vendor',
  vendorLoan:    'vendor',       // B2B 자금 대여
  vendorInvest:  'vendor',       // B2B 투자
  // 개인용
  gift:          'contact',
  personalLend:  'contact',
}

// 메뉴 → 다중 선택 허용 여부 (상여금/경조사비 등은 다중 가능)
export const MENU_ALLOWS_MULTI = {
  bonus:      true,  // 상여금: 여러 직원 한번에
  condolence: true,  // 경조사비도 한번에 여러 명 가능
  // 그 외는 단일 선택
}

// ─────────────────────────────────────────────────────────
// 데모 데이터
// ─────────────────────────────────────────────────────────
export let RECIPIENTS = [
  // ── 직원 5명 ──
  {
    id: 'r_001',
    name: '김민수',
    phone: '010-1111-2222',
    email: 'minsu.kim@judacompany.com',
    roles: ['employee'],
    isBusiness: false,
    verified: true,
    freelancer: false,
    initial: '김',
    avatarBg: '#E6F5EF', avatarFg: '#085041',
    employeeInfo: {
      department: '개발팀',
      position: '시니어 개발자',
      joinedAt: '2024-03-01',
      salary: 5500000,
    },
  },
  {
    id: 'r_002',
    name: '이지영',
    phone: '010-2222-3333',
    email: 'jiyoung.lee@judacompany.com',
    roles: ['employee'],
    isBusiness: false,
    verified: true,
    freelancer: false,
    initial: '이',
    avatarBg: '#EDF3FA', avatarFg: '#1E5294',
    employeeInfo: {
      department: '디자인팀',
      position: '리드 디자이너',
      joinedAt: '2023-09-15',
      salary: 5200000,
    },
  },
  {
    id: 'r_003',
    name: '박서준',
    phone: '010-3333-4444',
    email: 'seojun.park@judacompany.com',
    roles: ['employee'],
    isBusiness: false,
    verified: true,
    freelancer: false,
    initial: '박',
    avatarBg: '#FFF4E0', avatarFg: '#854F0B',
    employeeInfo: {
      department: '마케팅팀',
      position: '마케터',
      joinedAt: '2024-08-01',
      salary: 3800000,
    },
  },
  {
    id: 'r_004',
    name: '최유진',
    phone: '010-4444-5555',
    email: 'yujin.choi@judacompany.com',
    roles: ['employee'],
    isBusiness: false,
    verified: true,
    freelancer: false,
    initial: '최',
    avatarBg: '#FBE9E0', avatarFg: '#C25018',
    employeeInfo: {
      department: '개발팀',
      position: '주니어 개발자',
      joinedAt: '2025-01-15',
      salary: 3500000,
    },
  },
  {
    id: 'r_005',
    name: '정현우',
    phone: '010-5555-6666',
    email: 'hyunwoo.jung@judacompany.com',
    roles: ['employee'],
    isBusiness: false,
    verified: true,
    freelancer: false,
    initial: '정',
    avatarBg: '#EEE8F7', avatarFg: '#5D2E92',
    employeeInfo: {
      department: '운영팀',
      position: '운영 매니저',
      joinedAt: '2024-06-01',
      salary: 4200000,
    },
  },

  // ── 다중 역할 (직원이면서 외주도 받음) ──
  {
    id: 'r_006',
    name: '강지훈',
    phone: '010-6666-7777',
    email: 'jihoon.kang@judacompany.com',
    roles: ['employee', 'freelancer'],
    isBusiness: false,
    verified: true,
    freelancer: true,
    initial: '강',
    avatarBg: '#D1FAE5', avatarFg: '#047857',
    employeeInfo: {
      department: '개발팀',
      position: '풀스택 개발자',
      joinedAt: '2024-11-01',
      salary: 4800000,
    },
    freelancerInfo: {
      field: '풀스택 개발',
      addedAt: '2025-12-15',
      totalReceived: 6000000,
      avgAmount: 2000000,
    },
  },

  // ── 외부 프리랜서 3명 ──
  {
    id: 'r_007',
    name: '박민준',
    phone: '010-7777-8888',
    email: 'minjun.park@gmail.com',
    roles: ['freelancer'],
    isBusiness: false,
    verified: true,
    freelancer: true,
    field: '디자이너',
    kyc: '실명',
    initial: '박',
    avatarBg: '#EDF3FA', avatarFg: '#1E5294',
    freelancerInfo: {
      field: '브랜드 디자인',
      addedAt: '2025-08-10',
      totalReceived: 4500000,
      avgAmount: 1500000,
    },
  },
  {
    id: 'r_008',
    name: '윤서연',
    phone: '010-8888-9999',
    email: 'seoyeon.yoon@gmail.com',
    roles: ['freelancer'],
    isBusiness: false,
    verified: true,
    freelancer: true,
    field: '번역가',
    kyc: '실명',
    initial: '윤',
    avatarBg: '#FFF4E0', avatarFg: '#854F0B',
    freelancerInfo: {
      field: '영-한 번역',
      addedAt: '2025-11-20',
      totalReceived: 1800000,
      avgAmount: 600000,
    },
  },
  {
    id: 'r_009',
    name: '한도윤',
    phone: '010-9999-0000',
    email: 'doyoon.han@gmail.com',
    roles: ['freelancer'],
    isBusiness: false,
    verified: true,
    freelancer: true,
    field: '개발자',
    kyc: '실명',
    initial: '한',
    avatarBg: '#EEE8F7', avatarFg: '#5D2E92',
    freelancerInfo: {
      field: '백엔드 개발',
      addedAt: '2026-01-05',
      totalReceived: 8000000,
      avgAmount: 4000000,
    },
  },

  // ── 사업자 거래처 4명 ──
  {
    id: 'r_010',
    name: '㈜오로라',
    phone: '02-1234-5678',
    email: 'contact@aurora.co.kr',
    roles: ['vendor'],
    isBusiness: true,
    verified: true,
    riskAccepted: false,
    bizNumber: '123-45-67890',
    industry: '광고대행',
    initial: '오',
    avatarBg: '#D1FAE5', avatarFg: '#047857',
    vendorInfo: {
      addedAt: '2025-06-01',
      totalReceived: 24000000,
      lastReceived: '2026-04-15',
    },
  },
  {
    id: 'r_011',
    name: '㈜네오컴퍼니',
    phone: '02-2345-6789',
    email: 'biz@neocompany.co.kr',
    roles: ['vendor'],
    isBusiness: true,
    verified: true,
    riskAccepted: false,
    bizNumber: '234-56-78901',
    industry: '소프트웨어 개발',
    initial: '네',
    avatarBg: '#EDF3FA', avatarFg: '#1E5294',
    vendorInfo: {
      addedAt: '2025-09-01',
      totalReceived: 15000000,
      lastReceived: '2026-03-20',
    },
  },
  {
    id: 'r_012',
    name: '강남자산관리',
    phone: '02-3456-7890',
    email: 'gangnam@realestate.co.kr',
    roles: ['vendor'],
    isBusiness: true,
    verified: true,
    riskAccepted: false,
    bizNumber: '345-67-89012',
    industry: '부동산 임대',
    initial: '강',
    avatarBg: '#F2EFE9', avatarFg: '#555550',
    vendorInfo: {
      addedAt: '2024-12-01',
      totalReceived: 69600000,  // 12개월 임대료
      lastReceived: '2026-04-30',
    },
  },
  {
    id: 'r_013',
    name: '㈜클라우드웍스',
    phone: '02-4567-8901',
    email: 'sales@cloudworks.co.kr',
    roles: ['vendor'],
    isBusiness: true,
    verified: true,
    riskAccepted: false,
    bizNumber: '456-78-90123',
    industry: 'IT 서비스',
    initial: '클',
    avatarBg: '#FBE9E0', avatarFg: '#C25018',
    vendorInfo: {
      addedAt: '2025-04-01',
      totalReceived: 4800000,
      lastReceived: '2026-04-30',
    },
  },

  // ── 투자 대상 1명 ──
  {
    id: 'r_014',
    name: '㈜스마트팜랩',
    phone: '02-5678-9012',
    email: 'founder@smartfarmlab.kr',
    roles: ['investee'],
    isBusiness: true,
    verified: true,
    riskAccepted: false,
    bizNumber: '567-89-01234',
    industry: '농업 기술',
    initial: '스',
    avatarBg: '#FFFBEB', avatarFg: '#854F0B',
    investeeInfo: {
      addedAt: '2025-10-01',
      totalInvested: 50000000,
      stage: 'Seed',
    },
  },
]

// ─────────────────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────────────────

// 역할로 필터
export function getRecipientsByRole(role) {
  return RECIPIENTS.filter(r => r.roles && r.roles.includes(role))
}

// 메뉴로 필터 (메뉴 → 역할 자동 매핑)
export function getRecipientsByMenu(menuId) {
  const role = MENU_TO_ROLE[menuId]
  if (!role) return RECIPIENTS
  return getRecipientsByRole(role)
}

// 전체 가져오기 (필터 해제 보기)
export function getAllRecipients() {
  return RECIPIENTS
}

// ID로 단일 조회
export function getRecipientById(id) {
  return RECIPIENTS.find(r => r.id === id)
}

// 휴대폰으로 조회 (중복 검사 + 자동 매칭)
export function getRecipientByPhone(phone) {
  const normalized = phone.replace(/[-\s]/g, '')
  return RECIPIENTS.find(r => {
    const rp = (r.phone || '').replace(/[-\s]/g, '')
    return rp === normalized
  })
}

// 사업자번호로 조회
export function getRecipientByBizNumber(bizNumber) {
  return RECIPIENTS.find(r => r.bizNumber === bizNumber)
}

// 다음 ID 생성
function nextId() {
  const maxNum = RECIPIENTS
    .map(r => parseInt((r.id || '').replace('r_', ''), 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `r_${String(maxNum + 1).padStart(3, '0')}`
}

// 새 사람 추가 (자동 역할 부여)
export function addRecipient({
  name,
  phone,
  email,
  isBusiness = false,
  bizNumber,
  industry,
  fromMenu,    // 진입 메뉴 — 자동 역할 부여용
  extraRoles = [],
}) {
  const role = fromMenu ? MENU_TO_ROLE[fromMenu] : 'contact'
  const initial = name ? name.charAt(0) : '?'

  const newOne = {
    id: nextId(),
    name,
    phone,
    email,
    roles: [...new Set([role, ...extraRoles].filter(Boolean))],
    isBusiness,
    bizNumber,
    industry,
    verified: false,    // 외부링크 인증 전이라 미인증
    freelancer: role === 'freelancer',
    initial,
    avatarBg: '#F2EFE9',
    avatarFg: '#555550',
  }
  RECIPIENTS = [newOne, ...RECIPIENTS]
  return newOne
}

// 기존 사람에 역할 추가 (수정 가능)
export function addRoleToRecipient(id, role) {
  const r = RECIPIENTS.find(x => x.id === id)
  if (!r) return null
  if (!r.roles.includes(role)) {
    r.roles = [...r.roles, role]
  }
  return r
}

// 역할 제거
export function removeRoleFromRecipient(id, role) {
  const r = RECIPIENTS.find(x => x.id === id)
  if (!r) return null
  r.roles = r.roles.filter(x => x !== role)
  return r
}
