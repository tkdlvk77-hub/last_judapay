/**
 * merchantCategoryMapper.js
 * ──────────────────────────────────────────────────────────────────
 * 카드 결제 자동 카테고리 분류기
 *
 * 분류 우선순위:
 *   1. MCC (Merchant Category Code) 범위 매핑  ← 카드사/VAN사 제공
 *   2. 업종코드 키워드 매핑                    ← 여신금융협회 표준
 *   3. 가맹점명 키워드 매핑                    ← Fallback
 *   4. 미분류                                   ← 위 3가지 불일치 시
 *
 * mainCat / subCat 은 ExecutionStats CATEGORY_GROUPS 와 동일
 * ──────────────────────────────────────────────────────────────────
 */

// ─── 1) MCC 범위 → 중분류 매핑 (Visa/Mastercard 표준) ──────────
// MCC 전체 목록: https://www.citibank.com/tts/solutions/commercial-cards/assets/docs/govt/Merchant-Category-Codes.pdf
export const MCC_RANGES = [
  // 출장식대 ──────────────────────────────────
  { from: 5811, to: 5815, mainCat: '운영비', subCat: '출장식대', label: '음식점·식음료' },
  { from: 5810, to: 5810, mainCat: '운영비', subCat: '출장식대', label: '주류 판매점' },
  { from: 5441, to: 5441, mainCat: '운영비', subCat: '출장식대', label: '베이커리·카페' },
  { from: 5451, to: 5451, mainCat: '운영비', subCat: '출장식대', label: '유제품·음료' },
  { from: 7011, to: 7011, mainCat: '운영비', subCat: '출장식대', label: '호텔·숙박' },
  { from: 7012, to: 7012, mainCat: '운영비', subCat: '출장식대', label: '단기임대숙박' },
  { from: 4111, to: 4112, mainCat: '운영비', subCat: '출장식대', label: '대중교통' },
  { from: 4131, to: 4131, mainCat: '운영비', subCat: '출장식대', label: '버스' },
  { from: 4121, to: 4121, mainCat: '운영비', subCat: '출장식대', label: '택시·리무진' },
  { from: 4411, to: 4411, mainCat: '운영비', subCat: '출장식대', label: '항공' },
  { from: 3000, to: 3350, mainCat: '운영비', subCat: '출장식대', label: '항공사' },
  { from: 7523, to: 7523, mainCat: '운영비', subCat: '출장식대', label: '주차장' },
  { from: 5541, to: 5542, mainCat: '운영비', subCat: '출장식대', label: '주유소' },

  // 복리후생 ──────────────────────────────────
  { from: 5411, to: 5411, mainCat: '운영비', subCat: '복리후생', label: '대형마트·슈퍼' },
  { from: 5912, to: 5912, mainCat: '운영비', subCat: '복리후생', label: '약국' },
  { from: 8011, to: 8099, mainCat: '운영비', subCat: '복리후생', label: '의료·병원·클리닉' },
  { from: 7941, to: 7941, mainCat: '운영비', subCat: '복리후생', label: '스포츠·헬스장' },
  { from: 7997, to: 7997, mainCat: '운영비', subCat: '복리후생', label: '피트니스·클럽' },
  { from: 7922, to: 7922, mainCat: '운영비', subCat: '복리후생', label: '공연·문화티켓' },
  { from: 7832, to: 7832, mainCat: '운영비', subCat: '복리후생', label: '영화관' },
  { from: 5621, to: 5699, mainCat: '운영비', subCat: '복리후생', label: '의류·패션' },
  { from: 5977, to: 5977, mainCat: '운영비', subCat: '복리후생', label: '화장품·뷰티' },
  { from: 7230, to: 7230, mainCat: '운영비', subCat: '복리후생', label: '미용실·네일' },

  // 구독료 ────────────────────────────────────
  { from: 7372, to: 7374, mainCat: '운영비', subCat: '구독료', label: 'SaaS·클라우드·IT서비스' },
  { from: 7379, to: 7379, mainCat: '운영비', subCat: '구독료', label: '컴퓨터 유지보수' },
  { from: 5734, to: 5734, mainCat: '운영비', subCat: '구독료', label: '소프트웨어' },
  { from: 5045, to: 5045, mainCat: '운영비', subCat: '구독료', label: '컴퓨터·IT장비' },
  { from: 7375, to: 7375, mainCat: '운영비', subCat: '구독료', label: '정보검색·DB서비스' },

  // 통신비 ────────────────────────────────────
  { from: 4812, to: 4816, mainCat: '운영비', subCat: '통신비', label: '통신사·인터넷·우편' },

  // 보험료 ────────────────────────────────────
  { from: 6300, to: 6399, mainCat: '운영비', subCat: '보험료', label: '보험' },

  // 공과금 ────────────────────────────────────
  { from: 4900, to: 4900, mainCat: '운영비', subCat: '공과금', label: '전기·가스·수도' },
  { from: 9311, to: 9311, mainCat: '운영비', subCat: '공과금', label: '세금·공과금 납부' },

  // 임대료 ────────────────────────────────────
  { from: 6513, to: 6513, mainCat: '운영비', subCat: '임대료', label: '부동산임대' },

  // 렌트&리스 ─────────────────────────────────
  { from: 7512, to: 7513, mainCat: '운영비', subCat: '렌트&리스', label: '차량렌트' },
  { from: 7394, to: 7394, mainCat: '운영비', subCat: '렌트&리스', label: '장비리스' },

  // 마케팅비 ──────────────────────────────────
  { from: 7311, to: 7311, mainCat: '사업비', subCat: '마케팅비', label: '광고대행' },
  { from: 7319, to: 7319, mainCat: '사업비', subCat: '마케팅비', label: '인쇄·홍보물' },
  { from: 7372, to: 7372, mainCat: '사업비', subCat: '마케팅비', label: '디지털마케팅' },

  // 기타 정기지출 ──────────────────────────────
  { from: 5940, to: 5948, mainCat: '운영비', subCat: '기타 정기지출', label: '사무용품·문구' },
  { from: 5111, to: 5113, mainCat: '운영비', subCat: '기타 정기지출', label: '사무용품도매' },
  { from: 5200, to: 5251, mainCat: '운영비', subCat: '기타 정기지출', label: '인테리어·철물' },

  // 세금 ──────────────────────────────────────
  { from: 9222, to: 9222, mainCat: '세금', subCat: '세금', label: '벌금·과태료' },
  { from: 9399, to: 9399, mainCat: '세금', subCat: '세금', label: '정부기관 납부' },

  // 외주비 ────────────────────────────────────
  { from: 7389, to: 7389, mainCat: '인건비', subCat: '외주비', label: '전문서비스·외주' },
  { from: 8111, to: 8111, mainCat: '인건비', subCat: '외주비', label: '법무·회계·세무' },
  { from: 8931, to: 8931, mainCat: '인건비', subCat: '외주비', label: '회계·감사' },
  { from: 8999, to: 8999, mainCat: '인건비', subCat: '외주비', label: '전문직서비스' },
]

// ─── 2) 가맹점명 키워드 → 중분류 매핑 ─────────────────────────
// 우선순위: 배열 위쪽이 높음 (첫 매칭 사용)
export const KEYWORD_RULES = [
  // 구독료 (SaaS / 클라우드) — 키워드 우선
  { keywords: ['AWS', 'AMAZON WEB', 'AZURE', 'GOOGLE CLOUD', 'GCP', 'ORACLE CLOUD', 'NAVER CLOUD', 'NCP'],
    mainCat: '운영비', subCat: '구독료' },
  { keywords: ['SLACK', 'NOTION', 'FIGMA', 'GITHUB', 'JIRA', 'CONFLUENCE', 'ZOOM', 'DROPBOX', 'ADOBE', '어도비'],
    mainCat: '운영비', subCat: '구독료' },
  { keywords: ['NETFLIX', '넷플릭스', 'YOUTUBE PREMIUM', '유튜브 프리미엄', 'SPOTIFY', '스포티파이', 'APPLE', '애플'],
    mainCat: '운영비', subCat: '구독료' },
  { keywords: ['쿠팡', 'COUPANG', '쿠팡로켓'],
    mainCat: '운영비', subCat: '구독료' },  // 쿠팡 로켓와우 구독

  // 통신비
  { keywords: ['SKT', 'KT', 'LG U+', 'LGU+', 'SK텔레콤', '케이티', 'LG유플러스', '알뜰폰'],
    mainCat: '운영비', subCat: '통신비' },
  { keywords: ['KT비즈', 'SKB', 'SK브로드밴드'],
    mainCat: '운영비', subCat: '통신비' },

  // 출장식대 (카페/식당)
  { keywords: ['스타벅스', 'STARBUCKS', '투썸', '할리스', '이디야', '메가커피', '빽다방', '커피빈'],
    mainCat: '운영비', subCat: '출장식대' },
  { keywords: ['맥도날드', '버거킹', '롯데리아', '맘스터치', 'KFC', '파파이스'],
    mainCat: '운영비', subCat: '출장식대' },
  { keywords: ['GS25', 'CU편의점', '세븐일레븐', '이마트24', '미니스톱'],
    mainCat: '운영비', subCat: '출장식대' },
  { keywords: ['카카오T', '우버', 'KAKAO TAXI', '타다'],
    mainCat: '운영비', subCat: '출장식대' },
  { keywords: ['코레일', '한국철도', 'SR', '수서고속', 'KTX', 'SRT'],
    mainCat: '운영비', subCat: '출장식대' },
  { keywords: ['인천공항', '김포공항', '제주공항', '대한항공', '아시아나', '진에어', '제주항공'],
    mainCat: '운영비', subCat: '출장식대' },

  // 복리후생
  { keywords: ['올리브영', '롭스', 'CJ올리브'],
    mainCat: '운영비', subCat: '복리후생' },
  { keywords: ['이마트', '홈플러스', '롯데마트', '코스트코', 'COSTCO'],
    mainCat: '운영비', subCat: '복리후생' },
  { keywords: ['GS마트', 'GS수퍼', '홈플러스익스프레스'],
    mainCat: '운영비', subCat: '복리후생' },
  { keywords: ['CGV', '롯데시네마', 'MEGABOX', '메가박스'],
    mainCat: '운영비', subCat: '복리후생' },
  { keywords: ['헬스장', '피트니스', 'PT', '골프', '볼링', '수영장'],
    mainCat: '운영비', subCat: '복리후생' },

  // 마케팅비
  { keywords: ['네이버 광고', '카카오 광고', 'META ADS', 'FACEBOOK ADS', 'GOOGLE ADS', '구글 광고'],
    mainCat: '사업비', subCat: '마케팅비' },

  // 외주비
  { keywords: ['세무법인', '세무사', '회계법인', '법무법인', '노무법인'],
    mainCat: '인건비', subCat: '외주비' },

  // 공과금
  { keywords: ['한전', '한국전력', '한국가스공사', '지역도시가스', '수도요금', '상수도'],
    mainCat: '운영비', subCat: '공과금' },

  // 세금
  { keywords: ['국세청', '홈택스', '위택스', '관세청', '지방세'],
    mainCat: '세금', subCat: '세금' },
]

// ─── 3) 핵심 자동분류 함수 ────────────────────────────────────
/**
 * autoClassify(merchant, mcc?)
 * @param {string} merchant  - 가맹점명 (카드사 제공)
 * @param {number} [mcc]     - MCC 코드 (카드사/VAN 제공, 없으면 생략)
 * @returns {{ mainCat: string, subCat: string, matched: boolean }}
 */
export function autoClassify(merchant = '', mcc = null) {
  const name = merchant.toUpperCase()

  // Step 1: 가맹점명 키워드 매핑 (가장 정확)
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(kw => name.includes(kw.toUpperCase()))) {
      return { mainCat: rule.mainCat, subCat: rule.subCat, matched: true }
    }
  }

  // Step 2: MCC 범위 매핑
  if (mcc != null) {
    const code = Number(mcc)
    for (const range of MCC_RANGES) {
      if (code >= range.from && code <= range.to) {
        return { mainCat: range.mainCat, subCat: range.subCat, matched: true }
      }
    }
  }

  // Step 3: 미분류
  return { mainCat: '미분류', subCat: '미분류', matched: false }
}

// ─── 4) 간편 표 확인용 (개발·디버그) ─────────────────────────
export function debugClassify(merchant, mcc) {
  const result = autoClassify(merchant, mcc)
  console.log(`[autoClassify] "${merchant}" (MCC: ${mcc ?? '-'}) → ${result.mainCat} / ${result.subCat} ${result.matched ? '✓' : '(미분류)'}`)
  return result
}
