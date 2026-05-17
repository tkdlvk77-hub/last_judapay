// ─────────────────────────────────────────────────────────
// 계정 타입별 브랜드 색상 토큰
// src/design/accountTokens.js
//
// 사용법:
//   import { getAccountTheme } from '../design/accountTokens'
//   const theme = getAccountTheme()  // sessionStorage에서 자동 감지
//   // 또는
//   const theme = getAccountTheme('business')
//
//   theme.headerGrad      → 헤더 그라데이션
//   theme.brand           → 브랜드 컬러
//   theme.activeBtnGrad   → 활성 버튼 그라데이션
//   theme.activeShadow    → 활성 버튼 쉐도우
//   theme.inactiveBtn     → 비활성 버튼 배경
//   theme.cardBg          → 잔액 카드 배경
//   theme.cardBorder      → 잔액 카드 보더
//   theme.linkColor       → 링크/액센트 텍스트
//   theme.badgeLabel      → 헤더 배지 텍스트 (PERSONAL / BUSINESS / GOVERNMENT)
// ─────────────────────────────────────────────────────────

export const ACCOUNT_THEMES = {

  // ── 개인 (보라/인디고) ──────────────────────────────────
  personal: {
    badgeLabel: 'PERSONAL',
    brand:          '#5B4FE8',
    brandDark:      '#3D2090',
    brandLight:     '#7B6FF0',

    headerGrad:     'linear-gradient(160deg, #5B4FE8 0%, #3D2090 50%, #1A1240 100%)',
    headerSolid:    '#1A1240',
    activeBtnGrad:  'linear-gradient(135deg, #5B4FE8, #9333EA)',
    activeShadow:   '0 4px 16px rgba(91,79,232,0.45)',
    inactiveBtn:    'rgba(255,255,255,0.12)',

    cardBg:         'rgba(255,255,255,0.08)',
    cardBorder:     'rgba(255,255,255,0.12)',
    linkColor:      '#5B4FE8',
  },

  // ── 기업 (하늘/시안) ────────────────────────────────────
  business: {
    badgeLabel: 'BUSINESS',
    brand:          '#0EA5E9',
    brandDark:      '#0369A1',
    brandLight:     '#38BDF8',

    headerGrad:     'linear-gradient(160deg, #1E3A5F 0%, #0F2035 50%, #0A1628 100%)',
    headerSolid:    '#0A1628',
    activeBtnGrad:  'linear-gradient(135deg, #0EA5E9, #0369A1)',
    activeShadow:   '0 4px 16px rgba(14,165,233,0.45)',
    inactiveBtn:    'rgba(255,255,255,0.10)',

    cardBg:         'rgba(255,255,255,0.07)',
    cardBorder:     'rgba(255,255,255,0.10)',
    linkColor:      '#0EA5E9',
  },

  // ── 공공기관 (딥 포레스트 그린) ─────────────────────────
  // 기준 이미지: 창원진동원 헤더 #1A3D2B ~ #0F2D1A
  institution: {
    badgeLabel: 'GOVERNMENT',
    brand:          '#16A34A',
    brandDark:      '#166534',
    brandLight:     '#22C55E',

    headerGrad:     'linear-gradient(160deg, #2A5C3F 0%, #1A3D2B 50%, #0F2D1A 100%)',
    headerSolid:    '#0F2D1A',
    activeBtnGrad:  'linear-gradient(135deg, #16A34A, #166534)',
    activeShadow:   '0 4px 16px rgba(22,163,74,0.45)',
    inactiveBtn:    'rgba(255,255,255,0.10)',

    cardBg:         'rgba(255,255,255,0.07)',
    cardBorder:     'rgba(255,255,255,0.10)',
    linkColor:      '#16A34A',
  },
}

// sessionStorage에서 userType 읽어서 테마 반환
// 서버사이드 환경 대응을 위해 typeof 체크 포함
export function getAccountTheme(type) {
  const userType = type
    || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizType') : null)
    || 'personal'
  return ACCOUNT_THEMES[userType] || ACCOUNT_THEMES.personal
}

// React hook 없이 쓰는 헬퍼 (일반 컴포넌트용)
export function useAccountTheme() {
  return getAccountTheme()
}
