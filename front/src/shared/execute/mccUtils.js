// MCC 이중 차단 체크 유틸리티
// 적용 순서: 지갑 MCC (상위 레이어 · 자금 발신자 제한) → 카드 MCC (하위 레이어 · 카드 보유자 제한)
//
// 설계 원칙:
//   - 지갑을 보내준 사람(부모·교육청·기업 등)이 설정한 MCC 제한이 최우선
//   - 카드 보유자 본인이 설정한 MCC 제한이 그 다음
//   - 두 레이어 모두 통과해야 결제 허용
//
// 사용 예시:
//   const result = checkMccAllowed('gambling', walletMccItems, cardMccItems)
//   if (!result.allowed) alert(result.reason)  // "지갑 제한: 유흥·도박 차단됨"

// ─── 가맹점 MCC 카테고리 목록 (시뮬레이션용) ──────────────────────
export const MCC_MERCHANT_MAP = {
  edu:       { id:'edu',       label:'교육비',       emoji:'📚', sub:'학원·교육 기관' },
  groceries: { id:'groceries', label:'마트·식료품',   emoji:'🛒', sub:'마트·슈퍼·식재료' },
  transport: { id:'transport', label:'교통·대중교통', emoji:'🚌', sub:'버스·지하철·택시' },
  medical:   { id:'medical',   label:'의료·병원',     emoji:'🏥', sub:'병원·약국·의료기기' },
  gambling:  { id:'gambling',  label:'유흥·도박',     emoji:'🎰', sub:'유흥주점·카지노·복권' },
  crypto:    { id:'crypto',    label:'암호화폐',      emoji:'₿',  sub:'코인 거래소·ICO' },
  overseas:  { id:'overseas',  label:'해외 결제',     emoji:'✈️', sub:'해외 가맹점·해외 송금' },
  luxury:    { id:'luxury',    label:'명품',          emoji:'💎', sub:'백화점 명품관·고가품' },
  gaming:    { id:'gaming',    label:'게임 아이템',   emoji:'🎮', sub:'게임센터·인앱결제' },
  dining:    { id:'dining',    label:'고급 음식점',   emoji:'🍽️', sub:'1인 5만원 이상' },
}

/**
 * MCC 이중 차단 체크
 *
 * @param {string} merchantMccId  - 가맹점 MCC 카테고리 ID  (e.g. 'gambling', 'edu')
 * @param {Array}  walletMccItems - 지갑 MCC 차단 목록      (자금 발신자가 설정, 상위 레이어)
 * @param {Array}  cardMccItems   - 카드 MCC 차단 목록      (카드 보유자가 설정, 하위 레이어)
 * @returns {{
 *   allowed:    boolean,
 *   blockedBy:  'wallet' | 'card' | null,
 *   reason:     string | null,
 *   ruleLabel:  string | null,
 * }}
 */
export function checkMccAllowed(merchantMccId, walletMccItems = [], cardMccItems = []) {
  // ① 지갑 MCC 체크 — 상위 레이어 (자금 발신자 제한)
  const walletRule = walletMccItems.find(m => m.id === merchantMccId)
  if (walletRule?.block) {
    return {
      allowed:   false,
      blockedBy: 'wallet',
      reason:    `지갑 제한: ${walletRule.label} 차단됨`,
      ruleLabel: walletRule.label,
    }
  }

  // ② 카드 MCC 체크 — 하위 레이어 (카드 보유자 제한)
  const cardRule = cardMccItems.find(m => m.id === merchantMccId)
  if (cardRule?.block) {
    return {
      allowed:   false,
      blockedBy: 'card',
      reason:    `카드 제한: ${cardRule.label} 차단됨`,
      ruleLabel: cardRule.label,
    }
  }

  // 두 레이어 모두 통과
  return { allowed: true, blockedBy: null, reason: null, ruleLabel: null }
}
