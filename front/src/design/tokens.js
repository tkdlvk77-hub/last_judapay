// ─────────────────────────────────────────────────────────
// 주다페이 디자인 토큰
// 모든 화면이 이 토큰을 참조합니다.
// 직접 hex 코드를 쓰지 말고 여기서 import 하세요.
// ─────────────────────────────────────────────────────────

// ─── 컬러 ───────────────────────────────────────────────
export const COLORS = {
  // 브랜드 (보라/인디고)
  brand: '#5B4FE8',
  brandDark: '#3D2090',
  brandLight: '#7B6FF0',

  // 헤더 그라데이션 끝 (어두운 남색)
  headerEnd: '#1A1240',
  headerMid: '#2D1F6E',

  // 배경
  bg: '#F4F6FB',
  bgCard: '#FFFFFF',
  bgMuted: '#F1F2F7',
  bgInverse: '#111111',

  // 텍스트
  t1: '#1A1F36',     // 가장 진함 (제목)
  t2: '#374151',     // 본문
  t3: '#6B7280',     // 보조
  t4: '#9CA3AF',     // 흐림 (메타 정보)
  t5: '#BABADA',     // 가장 흐림 (placeholder)
  tInverse: '#FFFFFF',  // 다크 배경 위
  tInverseSoft: 'rgba(255,255,255,0.65)',
  tInverseMuted: 'rgba(255,255,255,0.4)',

  // 보더
  border: '#E5E7EB',
  borderSoft: '#F1F2F7',

  // 시맨틱
  success: '#10B981',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
}

// ─── 자금 종류별 컬러 (도메인 의미 보존) ────────────────────
// Q3 결정: 헤더는 새 보라 톤이지만, 자금 종류별 의미 색상은 유지
export const FUND_COLORS = {
  freelance: { // 외주비 — 파랑
    main: '#2D6BB0',
    bg: '#EDF3FA',
    border: '#B5CFE8',
  },
  realestate: { // 부동산 — 녹색
    main: '#085041',
    bg: '#E6F5EF',
    border: '#B5DDC8',
  },
  invest: { // 자금 지원 — 황갈
    main: '#854F0B',
    bg: '#FFF4E0',
    border: '#F7D98A',
  },
  lend: { // 대여금/빌려주기 — 주황
    main: '#C25018',
    bg: '#FBE9E0',
    border: '#F4B898',
  },
  gift: { // 용돈선물 — 분홍
    main: '#BE185D',
    bg: '#FCE7F3',
    border: '#F9A8D4',
  },
  living: { // 생활비 — 시안
    main: '#0E7490',
    bg: '#E0F7FA',
    border: '#67E8F9',
  },
  salary: { // 급여 — 진한 녹색
    main: '#047857',
    bg: '#D1FAE5',
    border: '#6EE7B7',
  },
  bonus: { // 상여금 — 분홍 톤
    main: '#DB2777',
    bg: '#FCE7F3',
    border: '#F9A8D4',
  },
  condolence: { // 경조사비 — 회색 톤
    main: '#4B5563',
    bg: '#F3F4F6',
    border: '#D1D5DB',
  },
  bounty: { // 기타소득 — 보라
    main: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD',
  },
  marketing: { // 마케팅비 — 오렌지
    main: '#92400E',
    bg: '#FEF3C7',
    border: '#FCD34D',
  },
  support: { // 자금 지원 — 청록
    main: '#0E7490',
    bg: '#ECFEFF',
    border: '#67E8F9',
  },
  otherIncome: { // 기타소득 — 보라 (bounty와 동일)
    main: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD',
  },
  personalLend: { // 개인 빌려주기 — 주황 (lend와 동일)
    main: '#C25018',
    bg: '#FBE9E0',
    border: '#F4B898',
  },
  rent: { // 임대료 — 인디고 (운영비/자동지출 톤)
    main: '#3730A3',
    bg: '#EEF2FF',
    border: '#C7D2FE',
  },
}

// ─── 그라데이션 ─────────────────────────────────────────
export const GRADIENTS = {
  // 헤더 영역 (보라 → 진한 남색)
  header: 'linear-gradient(160deg, #5B4FE8 0%, #3D2090 50%, #1A1240 100%)',
  headerSoft: 'linear-gradient(160deg, #6B5FFF 0%, #5B4FE8 60%, #3D2090 100%)',

  // 잔액 카드 (헤더 안 글래스 카드)
  glass: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',

  // 액션 버튼 (충전/지급 등) 활성 시
  brand: 'linear-gradient(135deg, #5B4FE8, #9333EA)',
  brandSubtle: 'linear-gradient(135deg, #7B6FF0, #5B4FE8)',

  // 진행률 바 — 의미별 색상
  progressLow: 'linear-gradient(90deg, #FF9D5C, #FF6B6B)',     // 0-40% 핑크 주황
  progressMid: 'linear-gradient(90deg, #FBBF24, #F59E0B)',     // 40-70% 노랑 주황
  progressHigh: 'linear-gradient(90deg, #EF4444, #DC2626)',    // 70-90% 빨강
  progressDone: 'linear-gradient(90deg, #5B4FE8, #9333EA)',    // 100% 보라
  progressSuccess: 'linear-gradient(90deg, #10B981, #059669)', // 완료 녹색
}

// ─── 그림자 ─────────────────────────────────────────────
export const SHADOWS = {
  card: '0 1px 3px rgba(0,0,0,0.04)',
  cardHover: '0 4px 12px rgba(0,0,0,0.08)',
  popover: '0 8px 24px rgba(0,0,0,0.12)',
  glass: '0 8px 32px rgba(91,79,232,0.18)',
  buttonBrand: '0 4px 14px rgba(91,79,232,0.4)',
}

// ─── Radius ──────────────────────────────────────────────
export const RADIUS = {
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  pill: '999px',
  circle: '50%',
}

// ─── 간격 ────────────────────────────────────────────────
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
}

// ─── 타이포그라피 ───────────────────────────────────────
export const TYPO = {
  display: { size: '28px', weight: 700, lineHeight: 1.2, letterSpacing: '-1px' },
  h1: { size: '21px', weight: 700, lineHeight: 1.3 },
  h2: { size: '17px', weight: 700, lineHeight: 1.4 },
  h3: { size: '15px', weight: 600, lineHeight: 1.4 },
  body: { size: '13px', weight: 400, lineHeight: 1.5 },
  bodyBold: { size: '13px', weight: 600, lineHeight: 1.5 },
  small: { size: '12px', weight: 400, lineHeight: 1.5 },
  meta: { size: '11px', weight: 400, lineHeight: 1.5 },
  micro: { size: '10px', weight: 500, lineHeight: 1.4 },
  amount: { size: '32px', weight: 700, lineHeight: 1.1, letterSpacing: '-1.5px' },
  amountSm: { size: '18px', weight: 700, lineHeight: 1.2, letterSpacing: '-0.5px' },
}

// ─── 헬퍼: 진행률에 따른 그라데이션 자동 선택 ───────────────
export function progressGradient(pct, status) {
  if (status === 'done' || pct >= 100) return GRADIENTS.progressDone
  if (status === 'success') return GRADIENTS.progressSuccess
  if (pct >= 70) return GRADIENTS.progressHigh
  if (pct >= 40) return GRADIENTS.progressMid
  return GRADIENTS.progressLow
}
