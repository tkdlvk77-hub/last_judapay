import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────
// 주다페이 다국어 지원 시스템
// 지원: 한국어(ko), 영어(en), 일본어(ja), 베트남어(vi), 태국어(th)
// ─────────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: 'ko', label: '한국어',     flag: '🇰🇷', nativeLabel: '한국어' },
  { code: 'en', label: 'English',   flag: '🇺🇸', nativeLabel: 'English' },
  { code: 'ja', label: '日本語',     flag: '🇯🇵', nativeLabel: '日本語' },
  { code: 'vi', label: 'Tiếng Việt',flag: '🇻🇳', nativeLabel: 'Tiếng Việt' },
  { code: 'th', label: 'ภาษาไทย',   flag: '🇹🇭', nativeLabel: 'ภาษาไทย' },
]

export function getLang() {
  return sessionStorage.getItem('lang') || 'ko'
}

export function setLang(code) {
  sessionStorage.setItem('lang', code)
  window.dispatchEvent(new Event('langchange'))
}

export function t(key, lang) {
  const currentLang = lang || getLang()
  const entry = TRANSLATIONS[key]
  if (!entry) return key
  return entry[currentLang] || entry['ko'] || key
}

export function useT() {
  const [lang, setLangState] = useState(getLang())
  useEffect(() => {
    const handler = () => setLangState(getLang())
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])
  return (key) => t(key, lang)
}

const TRANSLATIONS = {
  'common.cancel':        { ko: '취소',        en: 'Cancel' },
  'common.confirm':       { ko: '확인',        en: 'Confirm' },
  'common.save':          { ko: '저장',        en: 'Save' },
  'common.close':         { ko: '닫기',        en: 'Close' },
  'common.back':          { ko: '뒤로',        en: 'Back' },
  'common.next':          { ko: '다음',        en: 'Next' },
  'common.done':          { ko: '완료',        en: 'Done' },
  'common.viewAll':       { ko: '전체 보기',    en: 'View All' },
  'common.won':           { ko: '원',          en: 'KRW' },
  'nav.home':             { ko: '홈',          en: 'Home' },
  'nav.execute':          { ko: '집행',        en: 'Execute' },
  'nav.alerts':           { ko: '알림',        en: 'Alerts' },
  'nav.messages':         { ko: '메시지',      en: 'Messages' },
  'nav.more':             { ko: '더보기',      en: 'More' },
  'home.balance':         { ko: '총 보유 자금', en: 'Total Balance' },
  'home.withdraw':        { ko: '출금 가능',    en: 'Withdrawable' },
  'home.charge':          { ko: '충전',        en: 'Charge' },
  'home.execute':         { ko: '집행',        en: 'Execute' },
  'home.card':            { ko: '카드',        en: 'Card' },
  'wallet.title':         { ko: '내 지갑',     en: 'My Wallet' },
  'wallet.priority':      { ko: '결제 우선순위', en: 'Payment Priority' },
  'wallet.completed':     { ko: '완료된 지갑',  en: 'Completed' },
  'wallet.myWallet':      { ko: 'MY 지갑',     en: 'MY Wallet' },
  'wallet.canWithdraw':   { ko: '출금 가능',    en: 'Withdrawable' },
  'alerts.title':         { ko: '알림',        en: 'Alerts' },
  'alerts.all':           { ko: '전체',        en: 'All' },
  'alerts.unread':        { ko: '안읽음',      en: 'Unread' },
  'messages.title':       { ko: '메시지',      en: 'Messages' },
  'messages.input':       { ko: '메시지 입력...', en: 'Type a message...' },
  'messages.execute':     { ko: '⚡ 자금집행', en: '⚡ Execute' },
  'messages.request':     { ko: '요청하기',    en: 'Request' },
  'messages.memo':        { ko: '메모',        en: 'Memo' },
  'more.title':           { ko: '더보기',      en: 'More' },
  'more.language':        { ko: '언어 설정',    en: 'Language' },
  'more.help':            { ko: '도움말 / FAQ', en: 'Help / FAQ' },
  'more.security':        { ko: '보안 설정',    en: 'Security' },
  'more.notice':          { ko: '공지사항',     en: 'Notices' },
  'stats.title':          { ko: '집행 통계',    en: 'Execution Stats' },
  'stats.period.day':     { ko: '일별',        en: 'Daily' },
  'stats.period.week':    { ko: '주별',        en: 'Weekly' },
  'stats.period.month':   { ko: '월별',        en: 'Monthly' },
  'stats.total':          { ko: '총 집행',     en: 'Total Executed' },
  'stats.count':          { ko: '집행 건수',    en: 'Transactions' },
  'stats.avg':            { ko: '평균 집행액',  en: 'Avg. Amount' },
  'stats.byType':         { ko: '유형별 집행',  en: 'By Type' },
  'stats.byMonth':        { ko: '월별 집행 추이', en: 'Monthly Trend' },
  'stats.topRecipient':   { ko: '주요 집행 대상', en: 'Top Recipients' },
  'stats.gift':           { ko: '선물·용돈',    en: 'Gift' },
  'stats.lend':           { ko: '빌려주기',     en: 'Lending' },
  'stats.invest':         { ko: '자금지원',     en: 'Investment' },
  'stats.freelance':      { ko: '외주비',       en: 'Freelance' },
  'stats.realestate':     { ko: '부동산',       en: 'Real Estate' },
  'stats.times':          { ko: '건',          en: 'txns' },
  'charge.title':         { ko: '충전',        en: 'Charge' },
  'withdraw.title':       { ko: '출금',        en: 'Withdraw' },
  'business.menu':        { ko: '기업 메뉴',    en: 'Business Menu' },

  // BusinessMenu 화면
  'businessMenu.badge':           { ko: 'BUSINESS',      en: 'BUSINESS' },
  'businessMenu.limitWarning':    { ko: '한도 임박',      en: 'Limit Approaching' },
  'businessMenu.limitDetail':     { ko: '예상 {expected}원 · 한도 {limit}원 · {dueDate} 예정', en: 'Est. {expected} KRW · Limit {limit} KRW · Due {dueDate}' },
  'businessMenu.spentSoFar':      { ko: '지금까지',       en: 'Spent So Far' },
  'businessMenu.spentSoFarSub':   { ko: '({date}까지)',  en: '(as of {date})' },
  'businessMenu.prevDiff':        { ko: '전월 대비 +{pct}%', en: '{pct}% vs last month' },
  'businessMenu.toGo':            { ko: '월말까지 추가',   en: 'Until Month-End' },
  'businessMenu.toGoSub':         { ko: '급여·임대료 포함', en: 'Incl. payroll & rent' },
  'businessMenu.expectedTotal':   { ko: '예상 총 {amount}원', en: 'Est. total: {amount} KRW' },
  'businessMenu.dayProgress':     { ko: '{current}일차 / {total}일', en: 'Day {current} / {total}' },
  'businessMenu.scheduled':       { ko: '자동 지급 예정',  en: 'Auto Payment Schedule' },
  'businessMenu.statusAuto':      { ko: '자동',           en: 'Auto' },
  'businessMenu.statusReview':    { ko: '검수 필요',       en: 'Review Needed' },
  'businessMenu.employees':       { ko: '직원',           en: 'Employees' },
  'businessMenu.employeesUnit':   { ko: '명',             en: '' },
  'businessMenu.payrollSetting':  { ko: '급여 설정',       en: 'Payroll Setup' },
  'businessMenu.autoPayments':    { ko: '자동지출',        en: 'Auto Pay' },
  'businessMenu.autoPaymentsUnit':{ ko: '건',             en: '' },
  'businessMenu.opsExpense':      { ko: '운영비',          en: 'Ops Expense' },
  'businessMenu.cards':           { ko: '법인카드',        en: 'Corp. Cards' },
  'businessMenu.cardsUnit':       { ko: '장',             en: '' },
  'businessMenu.cardManagement':  { ko: '카드 관리',       en: 'Card Mgmt' },
  'businessMenu.byCategory':      { ko: '이번 달 카테고리별 지출', en: 'This Month by Category' },
  'businessMenu.cat.salary':      { ko: '인건비',          en: 'Payroll' },
  'businessMenu.cat.mktg':        { ko: '마케팅',          en: 'Marketing' },
  'businessMenu.cat.ops':         { ko: '운영비',          en: 'Operations' },
  'businessMenu.cat.etc':         { ko: '기타',            en: 'Others' },
  'businessMenu.sched.salary':    { ko: '직원 급여 12명',   en: 'Payroll · 12 staff' },
  'businessMenu.sched.salarySub': { ko: '{date} ({days}일 후)', en: '{date} (in {days} days)' },
  'businessMenu.sched.rent':      { ko: '강남 사무실 임대료', en: 'Gangnam Office Rent' },
  'businessMenu.sched.rentSub':   { ko: 'D-{days} · {date}', en: 'D-{days} · {date}' },
  'businessMenu.sched.subscription':    { ko: '클라우드·구독료 합산', en: 'Cloud & Subscription Total' },
  'businessMenu.sched.subscriptionSub': { ko: '{date} · 승인 후 자동 지급', en: '{date} · Auto-pay after approval' },
  'businessMenu.warningCategory': { ko: 'SKT 통신비',      en: 'SKT Telecom' },

  // ExecuteToPersonal 화면
  'execToPersonal.smallTitle':    { ko: '개인에게 지급',    en: 'Pay to Individual' },
  'execToPersonal.bigTitle':      { ko: '어떤 자금을\n지급할까요?', en: 'What type of\npayment?' },
  'execToPersonal.bigSub':        { ko: '직원·프리랜서·협력자에게', en: 'To staff, freelancers, partners' },
  'execToPersonal.balanceLabel':  { ko: '법인 출금 가능 자금', en: 'Withdrawable Corp. Funds' },
  'execToPersonal.groupCashable': { ko: '출금 가능 자금',    en: 'Withdrawable Funds' },
  'execToPersonal.groupPermission':{ ko: '권한 자금 (사용처 통제)', en: 'Permission Funds (Restricted)' },
  'execToPersonal.notice':        { ko: '모든 지급은 자동 증빙 + 세무사 자동 전송됩니다. 원천세 처리도 자동 계산되어 명세서가 발급됩니다.', en: 'All payments are auto-documented and sent to your tax accountant. Withholding tax is auto-calculated with statements issued.' },

  // 자금 종류
  'execToPersonal.fund.freelance.label':    { ko: '외주비',          en: 'Outsourcing' },
  'execToPersonal.fund.freelance.desc':     { ko: '프리랜서·도급 계약', en: 'Freelance · Contract' },
  'execToPersonal.fund.freelance.badge':    { ko: '원천 3.3%',        en: 'WHT 3.3%' },
  'execToPersonal.fund.bonus.label':        { ko: '상여금',           en: 'Bonus' },
  'execToPersonal.fund.bonus.desc':         { ko: '직원 보너스·인센티브', en: 'Staff bonus · incentive' },
  'execToPersonal.fund.bonus.badge':        { ko: '근로소득',         en: 'Earned Income' },
  'execToPersonal.fund.condolence.label':   { ko: '경조사비',         en: 'Family Event' },
  'execToPersonal.fund.condolence.desc':    { ko: '결혼·돌·장례',     en: 'Wedding · birthday · funeral' },
  'execToPersonal.fund.condolence.badge':   { ko: '복리후생',         en: 'Welfare' },
  'execToPersonal.fund.otherIncome.label':  { ko: '기타소득',         en: 'Other Income' },
  'execToPersonal.fund.otherIncome.desc':   { ko: '강연료·자문료·원고료', en: 'Speaking · advisory · writing' },
  'execToPersonal.fund.otherIncome.badge':  { ko: '원천 22%',         en: 'WHT 22%' },
  'execToPersonal.fund.lend.label':         { ko: '대여금',           en: 'Loan' },
  'execToPersonal.fund.lend.desc':          { ko: '직원·임원 대출',    en: 'Staff · executive loan' },
  'execToPersonal.fund.lend.badge':         { ko: '차용증',           en: 'IOU' },
  'execToPersonal.fund.support.label':      { ko: '자금 지원',         en: 'Funding Support' },
  'execToPersonal.fund.support.desc':       { ko: '장학금·스타트업 후원·연구비', en: 'Scholarship · startup · research' },
  'execToPersonal.fund.support.badge':      { ko: '용도 통제',         en: 'Usage Controlled' },

  // ExecutePersonal 화면 (개인이 개인에게 지급)
  'execPersonal.smallTitle':    { ko: '개인에게 지급',    en: 'Pay to Individual' },
  'execPersonal.bigTitle':      { ko: '어떤 목적으로\n보내나요?', en: 'For what\npurpose?' },
  'execPersonal.bigSub':        { ko: '목적별로 사용 통제 방식이 달라져요', en: 'Control method varies by purpose' },
  'execPersonal.balanceLabel':  { ko: '내 출금 가능 자금', en: 'My Withdrawable Funds' },
  'execPersonal.groupCashable': { ko: '출금 가능 자금',    en: 'Withdrawable Funds' },
  'execPersonal.groupPermission':{ ko: '권한 자금 (사용처 통제)', en: 'Permission Funds (Restricted)' },
  'execPersonal.notice':        { ko: '개인에게 보내는 자금은 목적에 따라 권한 자금(카드 결제만) 또는 출금 가능 자금으로 처리됩니다.', en: 'Personal payments are processed as permission funds (card-only) or withdrawable funds depending on purpose.' },

  // 자금 종류
  'execPersonal.fund.gift.label':       { ko: '용돈선물',       en: 'Gift Money' },
  'execPersonal.fund.gift.desc':        { ko: '생일·기념일·축하금', en: 'Birthday · anniversary · congrats' },
  'execPersonal.fund.gift.control':     { ko: 'MCC 차단 옵션 · 만료일 설정 가능', en: 'MCC blocking · expiry date' },
  'execPersonal.fund.living.label':     { ko: '생활비',         en: 'Living Expenses' },
  'execPersonal.fund.living.desc':      { ko: '식비·교통·의료·생활용품 지원', en: 'Food · transport · medical · household' },
  'execPersonal.fund.living.control':   { ko: 'MCC 차단 · 1회 결제 한도 설정 가능', en: 'MCC blocking · per-payment limit' },
  'execPersonal.fund.lend.label':       { ko: '빌려주기',       en: 'Lending' },
  'execPersonal.fund.lend.desc':        { ko: '차용증 자동 + 상환 일정 추적', en: 'Auto IOU + repayment tracking' },
  'execPersonal.fund.lend.control':     { ko: '차용증 + 이자율 + 상환일 자동 차감', en: 'IOU + interest + auto deduction' },
  'execPersonal.fund.invest.label':     { ko: '자금 지원',      en: 'Funding Support' },
  'execPersonal.fund.invest.desc':      { ko: '창업·사업 자금 · 사용처 통제 + 정기 보고', en: 'Startup · business · usage control + reports' },
  'execPersonal.fund.invest.control':   { ko: '카테고리별 한도 + MCC 차단 + 분기별 PDF 보고서', en: 'Category limits + MCC + quarterly PDF' },
  'execPersonal.fund.freelance.label':  { ko: '외주비',         en: 'Outsourcing' },
  'execPersonal.fund.freelance.desc':   { ko: '계약서 자동 + 검수 후 지급', en: 'Auto contract + payment after review' },
  'execPersonal.fund.freelance.control':{ ko: '계약서 양측 서명 후 단계별 입금', en: 'Phased payment after signing' },
  'execPersonal.fund.realestate.label': { ko: '부동산',         en: 'Real Estate' },
  'execPersonal.fund.realestate.desc':  { ko: '전세·월세 보증금 + 등기부 조회', en: 'Rent deposit + registry lookup' },
  'execPersonal.fund.realestate.control':{ ko: '근저당 말소 + 잔금일 조건부 집행', en: 'Mortgage release + conditional final payment' },

  // ExecuteFreelance — 외주비 (개인/기업 공용)
  'execFreelance.smallTitle':       { ko: '외주비',          en: 'Outsourcing' },
  'execFreelance.fund.cashable':    { ko: '출금 가능',        en: 'Withdrawable' },
  'execFreelance.fund.permission':  { ko: '권한 자금',        en: 'Permission Fund' },

  // step 1
  'execFreelance.step1.title':      { ko: '어떤 작업을\n맡기시나요?', en: 'What work\nare you assigning?' },
  // 서브타이틀 4종 (수신자 유형 × 출금/권한)
  'execFreelance.sub.bizNormal.personal':  { ko: '{name}는 정상 사업자, 검수 완료 시 세금계산서와 함께 자동 출금됩니다', en: '{name} is a verified business — auto withdrawal with tax invoice after review' },
  'execFreelance.sub.bizClosed.personal':  { ko: '{name}는 폐업 사업자 — 위험 감수 진행, 세금계산서 발행 불가', en: '{name} is a closed business — proceeding at risk, no tax invoice' },
  'execFreelance.sub.freelancer.personal': { ko: '{name}는 프리랜서 인증되어 본인 계좌로 자동 출금됩니다', en: '{name} is a verified freelancer — auto withdrawal to their account' },
  'execFreelance.sub.unverified.personal': { ko: '{name}는 프리랜서 미인증 — 권한 자금으로 보관되어 카드 결제만 가능합니다', en: '{name} is unverified — held as permission funds, card payments only' },
  // 기업 발주 시 서브타이틀
  'execFreelance.sub.bizNormal.business':  { ko: '{name}는 정상 사업자 — 법인 자금에서 출금, 세금계산서 + 원천세 3.3% 자동 처리', en: '{name} is verified — withdraw from corp. funds, tax invoice + 3.3% WHT automated' },
  'execFreelance.sub.bizClosed.business':  { ko: '{name}는 폐업 사업자 — 법인 위험 감수 진행, 세금계산서 발행 불가', en: '{name} is closed — corp. risk acknowledged, no tax invoice' },
  'execFreelance.sub.freelancer.business': { ko: '{name}는 프리랜서 인증 — 법인 자금에서 본인 계좌로 출금, 원천세 3.3% 자동 처리', en: '{name} is a verified freelancer — withdraw to their account with 3.3% WHT' },
  'execFreelance.sub.unverified.business': { ko: '{name}는 프리랜서 미인증 — 법인 권한 자금으로 보관, 카드 결제만 가능 (원천세 처리 불가)', en: '{name} is unverified — held as corp. permission funds, card only (no WHT)' },

  // 받는 사람 카드 라벨
  'execFreelance.recipient.bizNormal':  { ko: '사업자',         en: 'Business' },
  'execFreelance.recipient.bizClosed':  { ko: '폐업 사업자',     en: 'Closed Business' },
  'execFreelance.recipient.freelancer': { ko: '프리랜서',        en: 'Freelancer' },
  'execFreelance.recipient.change':     { ko: '변경',           en: 'Change' },

  // step 4 / confirm
  'execFreelance.contract.title':        { ko: '계약서를 확인하세요', en: 'Review the Contract' },
  'execFreelance.contract.smallTitle':   { ko: '계약서 자동 생성',   en: 'Auto-Generated Contract' },
  'execFreelance.contract.sub':          { ko: '모두싸인 휴대폰 인증으로 양측이 서명해요', en: 'Both parties sign via Modusign phone auth' },
  'execFreelance.contract.modeSplit':    { ko: '분할',           en: 'Split' },
  'execFreelance.contract.modeSingle':   { ko: '단일',           en: 'Single' },
  'execFreelance.confirm.smallTitle':    { ko: '집행 내용 확인',   en: 'Confirm Execution' },
  'execFreelance.confirm.subPersonal':   { ko: '{name}에게 외주비 · {fundLabel}', en: 'Outsourcing to {name} · {fundLabel}' },
  'execFreelance.confirm.subBusiness':   { ko: '{name}에게 외주비 · 법인 {fundLabel}', en: 'Corp. outsourcing to {name} · {fundLabel}' },

  // 지급 출처 라벨
  'execFreelance.source.personal':   { ko: '출금 지갑',         en: 'Source Wallet' },
  'execFreelance.source.business':   { ko: '법인 자금',          en: 'Corp. Funds' },

  // done
  'execFreelance.done.titleWaiting':     { ko: '{name} 동의 대기 중',  en: 'Awaiting {name}\'s Consent' },
  'execFreelance.done.descPersonal':     { ko: '{name}에게 계약서 SMS가 발송됐어요. 양측 서명 완료 시 자금이 보관됩니다.', en: 'Contract SMS sent to {name}. Funds held upon both signatures.' },
  'execFreelance.done.descBusiness':     { ko: '{name}에게 계약서 SMS가 발송됐어요. 양측 서명 완료 시 법인 자금에서 처리되며 세무사에게 자동 전송됩니다.', en: 'Contract SMS sent to {name}. Upon signing, processed from corp. funds and auto-sent to tax accountant.' },
  'execFreelance.done.notePersonal':     { ko: '3일 내 {name} 미서명 시 자동 취소 · 알림센터 + 메시지에서 진행 상태 확인 가능', en: 'Auto-cancel if {name} doesn\'t sign within 3 days · check status in alerts + messages' },
  'execFreelance.done.noteBusiness':     { ko: '3일 내 {name} 미서명 시 자동 취소 · 원천세 명세서 + 세금계산서는 서명 완료 후 발급', en: 'Auto-cancel if {name} doesn\'t sign in 3 days · WHT statement + tax invoice issued after signing' },

  // 2차: 원천세 / 세무사 / 미인증 안내 / rows 라벨
  // 원천세
  'execFreelance.wht.label':           { ko: '원천세 3.3%',         en: 'WHT 3.3%' },
  'execFreelance.wht.autoDeduct':      { ko: '자동 차감',            en: 'Auto-deducted' },
  'execFreelance.wht.netLabel':        { ko: '실수령액',             en: 'Net Payment' },
  'execFreelance.wht.notApplicable':   { ko: '원천세 처리 보류 (수신자 인증 후 자동 처리)', en: 'WHT pending (auto-processed after recipient verification)' },

  // 세무사 자동 전송
  'execFreelance.tax.autoInvoice':     { ko: '세금계산서 자동 발행 + 세무사 자동 전송', en: 'Tax invoice auto-issued + sent to accountant' },

  // 미인증자 안내 박스 (step1)
  'execFreelance.unverified.title':    { ko: '미인증 수신자 안내',    en: 'Unverified Recipient Notice' },
  'execFreelance.unverified.body':     { ko: '권한 자금으로 보관됩니다. {name}님이 외부링크에서 본인 인증 + 통장/주민번호(또는 사업자번호) 입력을 완료하면 출금 가능 자금으로 전환되며 원천세도 자동 처리됩니다.', en: 'Held as permission funds. Once {name} completes identity verification + bank/SSN (or business number) entry via the external link, funds convert to withdrawable and WHT is auto-processed.' },

  // ConfirmStep rows 라벨
  'execFreelance.row.recipient':       { ko: '받는 분',              en: 'Recipient' },
  'execFreelance.row.recipientBizSub': { ko: '{bizNumber} · 사업자',   en: '{bizNumber} · Business' },
  'execFreelance.row.recipientKycSub': { ko: '실명 ✓',                en: 'KYC ✓' },
  'execFreelance.row.payMode':         { ko: '지급 방식',             en: 'Payment Mode' },
  'execFreelance.row.paySingle':       { ko: '단일 지급',             en: 'Single Payment' },
  'execFreelance.row.paySplit':        { ko: '분할 지급',             en: 'Split Payment' },
  'execFreelance.row.inspection':      { ko: '검수 방식',             en: 'Review Method' },
  'execFreelance.row.splitRatio':      { ko: '분할 비율',             en: 'Split Ratio' },
  'execFreelance.row.contract':        { ko: '계약서',               en: 'Contract' },
  'execFreelance.row.contractAuto':    { ko: '외주 용역 계약서 자동 생성', en: 'Outsourcing contract auto-generated' },
  'execFreelance.row.contractSign':    { ko: '모두싸인 양측 서명',     en: 'Modusign both-party signing' },
  'execFreelance.row.balanceLabel':    { ko: '잔액 {balance}원',       en: 'Balance {balance} KRW' },

  // ConfirmStep autoActions
  'execFreelance.auto.smsSent':        { ko: '{name}에게 계약서 SMS 발송', en: 'Contract SMS sent to {name}' },
  'execFreelance.auto.signedCashable': { ko: '양측 서명 완료 시 법인 자금에서 자동 출금 (원천세 자동 차감)', en: 'Auto-withdraw from corp. funds upon both signatures (WHT auto-deducted)' },
  'execFreelance.auto.signedPermission': { ko: '양측 서명 완료 시 권한 자금으로 보관 (외부링크 인증 후 출금 전환)', en: 'Hold as permission funds upon signing (converts after external verification)' },
  'execFreelance.auto.afterInsp':      { ko: '검수 컨펌 후 {name} 계좌로 입금', en: 'Deposit to {name}\'s account after review' },
  'execFreelance.auto.afterDeadline':  { ko: '마감일에 자동 입금',     en: 'Auto-deposit on deadline date' },
  'execFreelance.auto.archive':        { ko: '계약서·거래 원장 5년 보관', en: 'Contract & ledger archived for 5 years' },

  // 푸터
  'execFreelance.footer.afterExec':    { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원 · 수수료 0원', en: 'After execution: {wallet} {before} → {after} KRW · Fee 0' },

  // 버튼
  'execFreelance.btn.execute':         { ko: '집행하기',             en: 'Execute' },
  'execFreelance.btn.toHome':          { ko: '홈으로',               en: 'Home' },
  'execFreelance.btn.chat':            { ko: '{name}과 대화하기',     en: 'Chat with {name}' },

  // DarkHeader 공용 — X 버튼 / 종료 확인 모달
  'darkHeader.exit.title':       { ko: '나가시겠어요?',         en: 'Exit?' },
  'darkHeader.exit.body':        { ko: '작성 중인 내용은 저장되지 않습니다.', en: 'Your unsaved progress will be lost.' },
  'darkHeader.exit.cancel':      { ko: '계속 작성',             en: 'Continue' },
  'darkHeader.exit.confirm':     { ko: '나가기',               en: 'Exit' },

  // SelectRecipientBusiness — 받는 사람 선택 (기업)
  'selectRecipB.smallTitle':      { ko: '받는 사람 선택',        en: 'Select Recipient' },
  'selectRecipB.title.freelance': { ko: '외주비\n받을 분을 선택해주세요', en: 'Who will receive\nthis outsourcing fee?' },
  'selectRecipB.title.bonus':     { ko: '상여금\n받을 직원을 선택해주세요', en: 'Which employees\nwill receive bonuses?' },
  'selectRecipB.title.condolence':{ ko: '경조사비\n받을 직원을 선택해주세요', en: 'Which employees\nwill receive family event support?' },
  'selectRecipB.title.otherIncome':{ ko: '기타소득\n받을 분을 선택해주세요', en: 'Who will receive\nthis other income?' },
  'selectRecipB.title.lend':      { ko: '대여금\n받을 직원을 선택해주세요', en: 'Which employee\nwill receive the loan?' },
  'selectRecipB.title.support':   { ko: '자금 지원\n받을 곳을 선택해주세요', en: 'Who will receive\nthe funding support?' },
  'selectRecipB.title.default':   { ko: '받는 분을\n선택해주세요',         en: 'Select a recipient' },
  'selectRecipB.sub.single':      { ko: '풀에서 선택하거나 새로 추가할 수 있어요', en: 'Choose from pool or add new' },
  'selectRecipB.sub.multi':       { ko: '여러 명을 한번에 선택할 수 있어요', en: 'Select multiple at once' },

  'selectRecipB.tab.recommended': { ko: '자동 추천',            en: 'Recommended' },
  'selectRecipB.tab.all':         { ko: '전체',                en: 'All' },
  'selectRecipB.search.ph':       { ko: '이름·부서·휴대폰 검색', en: 'Search name, dept, phone' },
  'selectRecipB.empty.recommended':{ ko: '추천 대상이 없어요. 새로 추가하거나 전체에서 선택해주세요.', en: 'No recommendations yet. Add new or browse all.' },
  'selectRecipB.empty.search':    { ko: '검색 결과가 없어요',    en: 'No results' },

  'selectRecipB.addNew':          { ko: '+ 새로 추가',           en: '+ Add new' },
  'selectRecipB.addModal.title':  { ko: '새 사람 추가',          en: 'Add Recipient' },
  'selectRecipB.addModal.body':   { ko: '휴대폰 번호로 외부링크를 보내요. 받는 분이 인증을 마치면 출금 가능 자금으로 전환됩니다.', en: 'External link sent via phone. Funds convert to withdrawable after verification.' },
  'selectRecipB.addModal.namePh': { ko: '이름',                 en: 'Name' },
  'selectRecipB.addModal.phonePh':{ ko: '휴대폰 번호',           en: 'Phone number' },
  'selectRecipB.addModal.cancel': { ko: '취소',                 en: 'Cancel' },
  'selectRecipB.addModal.submit': { ko: '추가하고 진행',         en: 'Add & Continue' },
  'selectRecipB.addModal.duplicate':{ ko: '이미 등록된 사람이에요. 자동으로 선택됩니다.', en: 'Already registered. Auto-selected.' },

  'selectRecipB.btn.next':        { ko: '다음',                 en: 'Next' },
  'selectRecipB.btn.nextMulti':   { ko: '{count}명 선택 · 다음', en: '{count} selected · Next' },
  'selectRecipB.btn.nextEmpty':   { ko: '선택해주세요',           en: 'Please select' },

  // 카드 라벨
  'selectRecipB.card.dept':       { ko: '{dept} · {position}',  en: '{dept} · {position}' },
  'selectRecipB.card.field':      { ko: '{field}',              en: '{field}' },
  'selectRecipB.card.lastReceived':{ ko: '최근 {date}',           en: 'Last {date}' },
  'selectRecipB.card.totalReceived':{ ko: '누적 {amount}원',     en: 'Total {amount} KRW' },
  'selectRecipB.card.unverified': { ko: '인증 대기',             en: 'Unverified' },
  'selectRecipB.card.alsoRole':   { ko: '+{role} 역할',          en: '+{role} role' },

  // ExecuteBonusBusiness — 상여금 (기업)
  'execBonus.smallTitle':         { ko: '상여금',               en: 'Bonus' },
  'execBonus.step1.title':        { ko: '상여금',                en: 'Bonus' },
  'execBonus.step1.sub':          { ko: '{count}명에게 지급할 금액과 사유를 입력해주세요', en: 'Enter amount and reason for {count} employee(s)' },
  'execBonus.recipients.label':   { ko: '받는 직원',             en: 'Recipients' },
  'execBonus.recipients.summary': { ko: '{names}{etc}',         en: '{names}{etc}' },
  'execBonus.recipients.etc':     { ko: ' 외 {count}명',         en: ' +{count} more' },
  'execBonus.recipients.change':  { ko: '변경',                  en: 'Change' },

  'execBonus.wallet.label':       { ko: '출금 지갑',             en: 'Source Wallet' },
  'execBonus.wallet.balance':     { ko: '잔액 {amount}원',        en: 'Balance {amount} KRW' },

  'execBonus.mode.label':         { ko: '지급 방식',             en: 'Payment Mode' },
  'execBonus.mode.uniform':       { ko: '일괄 동일 금액',         en: 'Same Amount' },
  'execBonus.mode.individual':    { ko: '개별 입력',             en: 'Individual' },

  'execBonus.amount.uniformPh':   { ko: '1인당 금액 입력',        en: 'Per-person amount' },
  'execBonus.amount.perPerson':   { ko: '1인당 {amount}원',       en: '{amount} KRW per person' },
  'execBonus.amount.total':       { ko: '총 {amount}원 ({count}명)', en: 'Total {amount} KRW ({count})' },
  'execBonus.amount.totalSimple': { ko: '총 {amount}원',           en: 'Total {amount} KRW' },
  'execBonus.amount.totalLabel':  { ko: '합계',                  en: 'Total' },

  'execBonus.reason.label':       { ko: '지급 사유',             en: 'Reason' },
  'execBonus.reason.holiday':     { ko: '명절상여',              en: 'Holiday Bonus' },
  'execBonus.reason.performance': { ko: '성과상여',              en: 'Performance' },
  'execBonus.reason.quarterly':   { ko: '분기상여',              en: 'Quarterly' },
  'execBonus.reason.etc':         { ko: '기타',                 en: 'Other' },

  'execBonus.payDate.label':      { ko: '지급일',               en: 'Pay Date' },
  'execBonus.payDate.immediate':  { ko: '즉시',                 en: 'Immediate' },
  'execBonus.payDate.scheduled':  { ko: '지정일',               en: 'Scheduled' },

  'execBonus.memo.label':         { ko: '메모 (선택)',           en: 'Memo (optional)' },
  'execBonus.memo.ph':            { ko: '예: 추석 명절 상여',     en: 'e.g. Chuseok holiday bonus' },

  'execBonus.btn.next':           { ko: '다음',                 en: 'Next' },
  'execBonus.btn.execute':        { ko: '집행하기',              en: 'Execute' },
  'execBonus.btn.toHome':         { ko: '홈으로',               en: 'Home' },

  // 확인 화면
  'execBonus.confirm.smallTitle': { ko: '집행 내용 확인',        en: 'Confirm Execution' },
  'execBonus.confirm.sub':        { ko: '{count}명에게 상여금 · 법인 자금', en: 'Bonus to {count} employees · Corp. funds' },
  'execBonus.row.recipients':     { ko: '받는 직원',             en: 'Recipients' },
  'execBonus.row.recipientsCount':{ ko: '{count}명',            en: '{count}' },
  'execBonus.row.payMode':        { ko: '지급 방식',             en: 'Payment Mode' },
  'execBonus.row.reason':         { ko: '지급 사유',             en: 'Reason' },
  'execBonus.row.payDate':        { ko: '지급일',               en: 'Pay Date' },
  'execBonus.row.memo':           { ko: '메모',                 en: 'Memo' },
  'execBonus.row.totalAmount':    { ko: '총 지급액',             en: 'Total' },
  'execBonus.row.wht':            { ko: '근로소득세 6.6%',        en: 'Income tax 6.6%' },
  'execBonus.row.whtSub':         { ko: '자동 차감 · 4대보험은 급여에 합산 정산', en: 'Auto-deducted · Insurance settled with payroll' },
  'execBonus.row.netTotal':       { ko: '실수령 합계',            en: 'Net Total' },

  'execBonus.auto.deposit':       { ko: '{count}명 직원 계좌로 {when} 입금', en: 'Deposit to {count} employee accounts {when}' },
  'execBonus.auto.depositNow':    { ko: '즉시',                 en: 'now' },
  'execBonus.auto.depositOn':     { ko: '{date}에',             en: 'on {date}' },
  'execBonus.auto.tax':           { ko: '근로소득세 자동 처리 + 급여명세서 합산', en: 'Auto income tax + merge with payslip' },
  'execBonus.auto.insurance':     { ko: '4대보험은 다음 달 급여에 합산 정산', en: '4 insurances settled with next month\'s payroll' },
  'execBonus.auto.taxAccountant': { ko: '세무사 자동 전송',       en: 'Sent to tax accountant' },

  'execBonus.footer.afterExec':   { ko: '집행 후 법인 자금 잔액 {before}원 → {after}원', en: 'After: corp. funds {before} → {after} KRW' },

  // 완료 화면
  'execBonus.done.title':         { ko: '상여금 집행 완료',       en: 'Bonus Executed' },
  'execBonus.done.desc':          { ko: '{count}명 직원에게 상여금이 처리됐어요. 근로소득세는 자동 차감되어 급여명세서에 합산됩니다.', en: 'Bonus processed for {count} employees. Income tax auto-deducted and merged with payslips.' },
  'execBonus.done.note':          { ko: '4대보험은 다음 달 급여에서 합산 정산됩니다 · 세무사에게 자동 전송 완료', en: '4 insurances will be settled with next month\'s payroll · Auto-sent to tax accountant' },

  // ExecuteCondolenceBusiness — 경조사비 (기업, 다중)
  'execCondolence.smallTitle':         { ko: '경조사비',           en: 'Family Event Support' },
  'execCondolence.step1.title':        { ko: '경조사비',           en: 'Family Event Support' },
  'execCondolence.step1.sub':          { ko: '경조사가 있는 직원에게 마음을 전해요', en: 'Send support for life events' },
  'execCondolence.recipients.label':   { ko: '받는 직원',          en: 'Recipients' },
  'execCondolence.recipients.change':  { ko: '변경',              en: 'Change' },
  'execCondolence.wallet.label':       { ko: '출금 지갑',          en: 'Source Wallet' },
  'execCondolence.wallet.balance':     { ko: '잔액 {amount}원',    en: 'Balance {amount} KRW' },

  // 금액 (항상 개별 입력)
  'execCondolence.amount.label':       { ko: '지급 금액',           en: 'Amount' },
  'execCondolence.amount.singlePh':    { ko: '금액 입력',           en: 'Enter amount' },
  'execCondolence.amount.totalLabel':  { ko: '합계',               en: 'Total' },

  // 경조 사유 칩
  'execCondolence.reason.label':       { ko: '경조 사유',          en: 'Event Type' },
  'execCondolence.reason.wedding':     { ko: '결혼',              en: 'Wedding' },
  'execCondolence.reason.childbirth':  { ko: '출산',              en: 'Childbirth' },
  'execCondolence.reason.funeral':     { ko: '장례',              en: 'Funeral' },
  'execCondolence.reason.illness':     { ko: '병문안',             en: 'Illness' },
  'execCondolence.reason.etc':         { ko: '기타',              en: 'Other' },

  // 경조사 일자
  'execCondolence.payDate.label':      { ko: '경조사 일자',        en: 'Event Date' },
  'execCondolence.payDate.immediate':  { ko: '즉시 지급',           en: 'Immediate' },
  'execCondolence.payDate.scheduled':  { ko: '행사일 지정',         en: 'On event date' },

  // 메모 (권장)
  'execCondolence.memo.label':         { ko: '사건 안내 메모 (권장)', en: 'Event Memo (recommended)' },
  'execCondolence.memo.ph':            { ko: '예: 김민수 사원 결혼식 (5/20)', en: 'e.g. Minsu Kim wedding (5/20)' },
  'execCondolence.memo.help':          { ko: '메모는 회계 처리에 도움이 됩니다', en: 'Memo helps with accounting' },

  // 비과세 안내
  'execCondolence.taxFree.title':      { ko: '비과세 경조금',        en: 'Tax-free Support' },
  'execCondolence.taxFree.body':       { ko: '경조금은 비과세 대상으로 세금 차감 없이 전액 입금됩니다.', en: 'Family event support is tax-free. Full amount is deposited.' },
  'execCondolence.taxFree.short':      { ko: '비과세 처리',          en: 'Tax-free' },

  'execCondolence.btn.next':           { ko: '다음',               en: 'Next' },
  'execCondolence.btn.execute':        { ko: '집행하기',            en: 'Execute' },
  'execCondolence.btn.toHome':         { ko: '홈으로',             en: 'Home' },

  // 확인 화면
  'execCondolence.confirm.smallTitle': { ko: '집행 내용 확인',       en: 'Confirm Execution' },
  'execCondolence.confirm.subSingle':  { ko: '{name}에게 경조사비 · 법인 자금', en: 'Support to {name} · Corp. funds' },
  'execCondolence.confirm.subMulti':   { ko: '{count}명에게 경조사비 · 법인 자금', en: 'Support to {count} people · Corp. funds' },
  'execCondolence.row.recipients':     { ko: '받는 직원',           en: 'Recipients' },
  'execCondolence.row.recipientsCount':{ ko: '{count}명',           en: '{count}' },
  'execCondolence.row.reason':         { ko: '경조 사유',           en: 'Event Type' },
  'execCondolence.row.payDate':        { ko: '지급일',             en: 'Pay Date' },
  'execCondolence.row.memo':           { ko: '사건 메모',           en: 'Event Memo' },
  'execCondolence.row.totalAmount':    { ko: '총 지급액',           en: 'Total' },

  'execCondolence.auto.deposit':       { ko: '{count}명 직원 계좌로 {when} 입금', en: 'Deposit to {count} accounts {when}' },
  'execCondolence.auto.depositNow':    { ko: '즉시',               en: 'now' },
  'execCondolence.auto.depositOn':     { ko: '{date}에',           en: 'on {date}' },
  'execCondolence.auto.taxFree':       { ko: '비과세 경조금으로 처리',  en: 'Processed as tax-free support' },
  'execCondolence.auto.taxAccountant': { ko: '세무사 자동 전송 + 5년 보관', en: 'Auto-sent to tax accountant + 5yr archive' },

  'execCondolence.footer.afterExec':   { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원', en: 'After: {wallet} {before} → {after} KRW' },

  // 완료 화면
  'execCondolence.done.title':         { ko: '경조사비 전달 완료',     en: 'Support Sent' },
  'execCondolence.done.descSingle':    { ko: '{name}님에게 경조사비가 전달됐어요.', en: 'Support has been sent to {name}.' },
  'execCondolence.done.descMulti':     { ko: '{count}명에게 경조사비가 전달됐어요.', en: 'Support has been sent to {count} people.' },
  'execCondolence.done.note':          { ko: '비과세 처리 완료 · 세무사에게 자동 전송됐어요', en: 'Tax-free processing complete · Auto-sent to tax accountant' },

  // ExecuteOtherIncomeBusiness — 기타소득 (기업, 단일)
  'execOtherIncome.smallTitle':        { ko: '기타소득',           en: 'Other Income' },
  'execOtherIncome.step1.title':       { ko: '기타소득',           en: 'Other Income' },
  'execOtherIncome.step1.sub':         { ko: '강연료·원고료·자문료 등 일시적 소득', en: 'Lecture, manuscript, advisory fees, etc.' },
  'execOtherIncome.recipient.label':   { ko: '받는 분',            en: 'Recipient' },
  'execOtherIncome.recipient.change':  { ko: '변경',              en: 'Change' },
  'execOtherIncome.wallet.label':      { ko: '출금 지갑',           en: 'Source Wallet' },
  'execOtherIncome.wallet.balance':    { ko: '잔액 {amount}원',     en: 'Balance {amount} KRW' },

  'execOtherIncome.amount.label':      { ko: '지급 금액',           en: 'Amount' },
  'execOtherIncome.amount.ph':         { ko: '금액 입력',           en: 'Enter amount' },

  // 사유 칩 6가지
  'execOtherIncome.reason.label':      { ko: '지급 사유',           en: 'Reason' },
  'execOtherIncome.reason.lecture':    { ko: '강연료',             en: 'Lecture' },
  'execOtherIncome.reason.manuscript': { ko: '원고료',             en: 'Manuscript' },
  'execOtherIncome.reason.advisory':   { ko: '자문료',             en: 'Advisory' },
  'execOtherIncome.reason.prize':      { ko: '상금',               en: 'Prize' },
  'execOtherIncome.reason.interview':  { ko: '인터뷰료',            en: 'Interview' },
  'execOtherIncome.reason.etc':        { ko: '기타',               en: 'Other' },

  'execOtherIncome.payDate.label':     { ko: '지급일',             en: 'Pay Date' },
  'execOtherIncome.payDate.immediate': { ko: '즉시',               en: 'Immediate' },
  'execOtherIncome.payDate.scheduled': { ko: '지정일',             en: 'Scheduled' },

  'execOtherIncome.memo.label':        { ko: '메모 (선택)',         en: 'Memo (optional)' },
  'execOtherIncome.memo.ph':           { ko: '예: 5월 컨퍼런스 키노트 강연', en: 'e.g. May conference keynote' },

  // 원천세 8.8%
  'execOtherIncome.wht.title':         { ko: '기타소득 원천세 8.8%', en: 'Other income WHT 8.8%' },
  'execOtherIncome.wht.body':          { ko: '소득세 8% + 지방소득세 0.8%가 자동 차감됩니다.', en: 'Income tax 8% + local tax 0.8% auto-deducted.' },
  'execOtherIncome.wht.label':         { ko: '원천세 8.8%',          en: 'WHT 8.8%' },
  'execOtherIncome.wht.autoDeduct':    { ko: '자동 차감',           en: 'Auto-deducted' },
  'execOtherIncome.wht.netLabel':      { ko: '실수령액',            en: 'Net Payment' },
  'execOtherIncome.wht.notApplicable': { ko: '원천세 처리 보류 (수신자 인증 후 자동 처리)', en: 'WHT pending (auto-processed after recipient verification)' },

  // 미인증자 안내
  'execOtherIncome.unverified.title':  { ko: '미인증 수신자 안내',     en: 'Unverified Recipient Notice' },
  'execOtherIncome.unverified.body':   { ko: '권한 자금으로 보관됩니다. {name}님이 외부링크에서 본인 인증 + 통장/주민번호 입력을 완료하면 출금 가능 자금으로 전환되며 원천세도 자동 처리됩니다.', en: 'Held as permission funds. Once {name} completes verification + bank/SSN entry via external link, funds convert and WHT is auto-processed.' },

  'execOtherIncome.btn.next':          { ko: '다음',               en: 'Next' },
  'execOtherIncome.btn.execute':       { ko: '집행하기',            en: 'Execute' },
  'execOtherIncome.btn.toHome':        { ko: '홈으로',             en: 'Home' },
  'execOtherIncome.btn.chat':          { ko: '{name}과 대화하기',    en: 'Chat with {name}' },

  // 확인 화면
  'execOtherIncome.confirm.smallTitle':{ ko: '집행 내용 확인',       en: 'Confirm Execution' },
  'execOtherIncome.confirm.subCashable':{ ko: '{name}에게 기타소득 · 법인 자금', en: 'Other income to {name} · Corp. funds' },
  'execOtherIncome.confirm.subPermission':{ ko: '{name}에게 기타소득 · 권한 자금 보관', en: 'Other income to {name} · Permission funds' },
  'execOtherIncome.row.recipient':     { ko: '받는 분',            en: 'Recipient' },
  'execOtherIncome.row.recipientKyc':  { ko: '실명 ✓',             en: 'KYC ✓' },
  'execOtherIncome.row.recipientUnverified':{ ko: '인증 대기',       en: 'Unverified' },
  'execOtherIncome.row.reason':        { ko: '지급 사유',           en: 'Reason' },
  'execOtherIncome.row.payDate':       { ko: '지급일',             en: 'Pay Date' },
  'execOtherIncome.row.memo':          { ko: '메모',               en: 'Memo' },
  'execOtherIncome.row.amount':        { ko: '지급 금액',           en: 'Amount' },

  'execOtherIncome.auto.depositCashable':{ ko: '{name} 계좌로 {when} 입금', en: 'Deposit to {name} {when}' },
  'execOtherIncome.auto.depositPermission':{ ko: '외부링크 인증 후 자동 입금', en: 'Auto-deposit after external verification' },
  'execOtherIncome.auto.depositNow':   { ko: '즉시',               en: 'now' },
  'execOtherIncome.auto.depositOn':    { ko: '{date}에',           en: 'on {date}' },
  'execOtherIncome.auto.taxStatement': { ko: '원천세 자동 처리 + 지급명세서 자동 생성', en: 'WHT auto-processed + payment statement generated' },
  'execOtherIncome.auto.taxAccountant':{ ko: '세무사 자동 전송 + 5년 보관', en: 'Auto-sent to tax accountant + 5yr archive' },

  'execOtherIncome.footer.afterExec':  { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원', en: 'After: {wallet} {before} → {after} KRW' },

  // 완료 화면
  'execOtherIncome.done.titleCashable':{ ko: '기타소득 지급 완료',    en: 'Other Income Sent' },
  'execOtherIncome.done.titleWaiting': { ko: '{name}님 인증 대기 중', en: 'Waiting for {name}\'s verification' },
  'execOtherIncome.done.descCashable': { ko: '{name}님 계좌로 입금됐어요. 원천세는 자동 차감되었고, 지급명세서가 생성됐어요.', en: 'Sent to {name}. WHT auto-deducted, payment statement generated.' },
  'execOtherIncome.done.descWaiting':  { ko: '{name}님에게 외부링크가 발송됐어요. 인증 완료 시 권한 자금에서 자동 출금되며, 원천세도 함께 처리됩니다.', en: 'External link sent to {name}. Funds will auto-withdraw and WHT will be processed after verification.' },
  'execOtherIncome.done.note':         { ko: '세무사에게 자동 전송됐어요 · 거래 원장 5년 보관', en: 'Auto-sent to tax accountant · Ledger archived 5 years' },

  // ExecuteLendBusiness — 대여금 (기업 → 직원)
  'execLendBiz.smallTitle':         { ko: '대여금',                   en: 'Loan' },
  'execLendBiz.step1.title':        { ko: '대여금',                   en: 'Employee Loan' },
  'execLendBiz.step1.sub':          { ko: '급여/출장비 선지급, 직원 대여 등 처리', en: 'Salary advance, travel, loan, etc.' },

  // 지급 사유 (4가지)
  'execLendBiz.purpose.label':      { ko: '지급 사유',                 en: 'Purpose' },
  'execLendBiz.purpose.salary':     { ko: '급여 선지급',                en: 'Salary advance' },
  'execLendBiz.purpose.loan':       { ko: '직원 대여금',                en: 'Employee loan' },
  'execLendBiz.purpose.travel':     { ko: '출장비 선지급',              en: 'Travel advance' },
  'execLendBiz.purpose.etc':        { ko: '기타',                     en: 'Other' },

  // 사유별 안내 박스
  'execLendBiz.notice.salary.title': { ko: '급여 선지급 처리',           en: 'Salary Advance' },
  'execLendBiz.notice.salary.body':  { ko: '다음 달 정기 급여에서 자동 차감됩니다. 차용증 없이 처리되며 이자가 적용되지 않아요.', en: 'Auto-deducted from next month\'s salary. No promissory note or interest.' },

  'execLendBiz.notice.loan.title':  { ko: '직원 대여금 처리',            en: 'Employee Loan' },
  'execLendBiz.notice.loan.body':   { ko: '차용증이 자동 생성되고 만기일에 일시 상환됩니다. 무이자/저금리 대여 시 인정이자가 추징될 수 있어요.', en: 'Auto-generated promissory note. Lump-sum repayment at maturity. Below-market rate may incur imputed interest tax.' },

  'execLendBiz.notice.travel.title':{ ko: '출장비 선지급 처리',          en: 'Travel Advance' },
  'execLendBiz.notice.travel.body': { ko: '출장 후 영수증 첨부로 정산하면 자동 차감됩니다. 미정산 시 가지급금으로 처리.', en: 'Auto-settled after submitting receipts. Treated as advance if unsettled.' },

  'execLendBiz.notice.etc.title':   { ko: '직원 자금 지급 처리',          en: 'Employee Fund' },
  'execLendBiz.notice.etc.body':    { ko: '차용증이 자동 생성되며 회계 처리가 자동으로 진행됩니다.', en: 'Auto-generated promissory note. Accounting handled automatically.' },

  'execLendBiz.recipient.label':    { ko: '받는 직원',                 en: 'Recipient' },
  'execLendBiz.recipient.change':   { ko: '변경',                     en: 'Change' },

  'execLendBiz.wallet.label':       { ko: '출금 지갑',                 en: 'Source Wallet' },
  'execLendBiz.wallet.balance':     { ko: '잔액 {amount}원',           en: 'Balance {amount} KRW' },

  'execLendBiz.amount.label':       { ko: '지급 금액',                 en: 'Amount' },
  'execLendBiz.amount.ph':          { ko: '금액 입력',                 en: 'Enter amount' },

  // 이자율 (직원 대여금 / 기타에서만 노출)
  'execLendBiz.rate.label':         { ko: '이자율',                   en: 'Interest Rate' },
  'execLendBiz.rate.zero':          { ko: '무이자',                   en: 'Zero interest' },
  'execLendBiz.rate.standard':      { ko: '연 4.6% · 세법상 적정 이자율', en: '4.6% / yr · Tax-compliant rate' },
  'execLendBiz.rate.custom':        { ko: '직접 입력',                 en: 'Custom' },
  'execLendBiz.rate.customPh':      { ko: '연 ?%',                    en: '? % / yr' },
  'execLendBiz.rate.high':          { ko: '⚠ 연 20% 초과는 이자제한법 위반', en: '⚠ Over 20% violates loan rate law' },

  // 만기일 / 차감일 (사유별 라벨 다름)
  'execLendBiz.maturity.label.salary': { ko: '급여 차감일',             en: 'Deduction date' },
  'execLendBiz.maturity.help.salary':  { ko: '다음 달 급여일에 자동 차감', en: 'Auto-deducted on next salary day' },
  'execLendBiz.maturity.label.loan':   { ko: '만기일',                 en: 'Maturity Date' },
  'execLendBiz.maturity.help.loan':    { ko: '만기일에 일시 상환',       en: 'Lump-sum repayment on maturity' },
  'execLendBiz.maturity.label.travel': { ko: '정산 마감일',             en: 'Settlement Deadline' },
  'execLendBiz.maturity.help.travel':  { ko: '영수증 첨부 마감 (출장 후)', en: 'Submit receipts by this date' },
  'execLendBiz.maturity.label.etc':    { ko: '정산일',                 en: 'Settlement Date' },
  'execLendBiz.maturity.help.etc':     { ko: '정산 예정일',             en: 'Expected settlement date' },

  // 메모
  'execLendBiz.memo.label':         { ko: '용도 메모 (선택)',           en: 'Memo (optional)' },
  'execLendBiz.memo.ph':            { ko: '예: 7월 출장, 자녀 학자금 등', en: 'e.g. July business trip, tuition' },

  // 무이자 경고 (직원 대여금에서만)
  'execLendBiz.warn.zero.title':    { ko: '인정이자 추징 가능',          en: 'Imputed Interest Risk' },
  'execLendBiz.warn.zero.body':     { ko: '무이자/저금리 대여 시 세법상 적정 이자율(연 4.6%)과의 차이만큼 인정이자가 추징될 수 있어요.', en: 'Below-market loans may incur imputed interest tax (vs 4.6% statutory rate).' },

  'execLendBiz.btn.next':           { ko: '다음',                     en: 'Next' },
  'execLendBiz.btn.execute':        { ko: '집행하기',                  en: 'Execute' },
  'execLendBiz.btn.toHome':         { ko: '홈으로',                   en: 'Home' },

  // 확인 화면
  'execLendBiz.confirm.smallTitle': { ko: '집행 내용 확인',             en: 'Confirm' },
  'execLendBiz.confirm.sub':        { ko: '{name}님에게 {purpose} · 법인 자금', en: '{purpose} to {name} · Corp. funds' },
  'execLendBiz.row.recipient':      { ko: '받는 직원',                 en: 'Recipient' },
  'execLendBiz.row.purpose':        { ko: '지급 사유',                 en: 'Purpose' },
  'execLendBiz.row.amount':         { ko: '지급 금액',                 en: 'Amount' },
  'execLendBiz.row.rate':           { ko: '이자율',                   en: 'Interest Rate' },
  'execLendBiz.row.maturity':       { ko: '정산일',                   en: 'Settlement' },
  'execLendBiz.row.repayment':      { ko: '상환 예정액',                en: 'Repayment' },
  'execLendBiz.row.memo':           { ko: '용도 메모',                 en: 'Memo' },

  // 자동 처리 안내 (사유별)
  'execLendBiz.auto.deposit':       { ko: '{name} 계좌로 즉시 입금',     en: 'Deposit to {name} now' },
  'execLendBiz.auto.contract':      { ko: '차용증 자동 생성 + 양측 전자서명 발송', en: 'Promissory note + e-signatures sent' },
  'execLendBiz.auto.salaryDeduct':  { ko: '다음 달 급여({date})에서 자동 차감', en: 'Auto-deducted from next salary ({date})' },
  'execLendBiz.auto.travelSettle':  { ko: '출장 후 영수증 첨부로 정산',   en: 'Settle with receipts after trip' },
  'execLendBiz.auto.advance':       { ko: '회계 처리 + 세무사 자동 전송',  en: 'Accounting recorded + sent to tax accountant' },
  'execLendBiz.auto.maturity':      { ko: '{date} 만기 자동 알림',       en: 'Auto-reminder on {date}' },

  'execLendBiz.footer.afterExec':   { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원', en: 'After: {wallet} {before} → {after} KRW' },

  // 완료
  'execLendBiz.done.title':         { ko: '집행 완료',                 en: 'Sent' },
  'execLendBiz.done.titleWaiting':  { ko: '서명 대기 중',               en: 'Awaiting Signature' },
  'execLendBiz.done.descSimple':    { ko: '{name}님에게 즉시 입금됐어요. 회계 처리도 자동으로 완료됐어요.', en: 'Sent to {name}. Accounting auto-completed.' },
  'execLendBiz.done.descContract':  { ko: '{name}님에게 차용증이 발송됐어요. 양측 서명 완료 시 즉시 입금됩니다.', en: 'Promissory note sent to {name}. Auto-deposited after both signatures.' },
  'execLendBiz.done.note':          { ko: '회계 처리 완료 · 세무사에게 자동 전송됐어요', en: 'Accounting recorded · Auto-sent to tax accountant' },

  // ExecuteSupportBusiness — 자금 지원 (권한 자금)
  'execSupport.smallTitle':          { ko: '자금 지원',                 en: 'Funding Support' },
  'execSupport.step1.title':         { ko: '자금 지원',                 en: 'Funding Support' },
  'execSupport.step1.sub':           { ko: '권한 자금으로 사용 통제 + 정기 보고', en: 'Permission-controlled funds + regular reporting' },
  'execSupport.step2.title':         { ko: '권한 설정',                 en: 'Permission Settings' },
  'execSupport.step2.sub':           { ko: '받는 분이 사용할 수 있는 범위와 보고 주기', en: 'Usage scope and reporting cycle' },

  'execSupport.recipient.label':     { ko: '받는 분',                   en: 'Recipient' },
  'execSupport.recipient.change':    { ko: '변경',                     en: 'Change' },

  'execSupport.notice.title':        { ko: '권한 자금이란?',             en: 'About Permission Funds' },
  'execSupport.notice.body':         { ko: '받는 분이 자금을 자유롭게 인출할 수 없고, 허용된 카테고리에서만 사용할 수 있어요. 정기 보고서로 사용 내역이 투명하게 공유됩니다.', en: 'Recipient cannot withdraw freely. Funds are usable only in allowed categories. Usage reports are shared transparently.' },

  'execSupport.wallet.label':        { ko: '출금 지갑',                 en: 'Source Wallet' },
  'execSupport.wallet.balance':      { ko: '잔액 {amount}원',           en: 'Balance {amount} KRW' },

  'execSupport.amount.label':        { ko: '지원 금액',                 en: 'Amount' },
  'execSupport.amount.ph':           { ko: '금액 입력',                 en: 'Enter amount' },

  'execSupport.title.label':         { ko: '지원 명목 (선택)',           en: 'Title (optional)' },
  'execSupport.title.ph':            { ko: '예: 시드 투자, 연구개발 지원',  en: 'e.g. Seed investment, R&D support' },

  'execSupport.purpose.label':       { ko: '지원 사유 (선택)',           en: 'Purpose (optional)' },
  'execSupport.purpose.ph':          { ko: '지원 목적과 기대 효과를 적어주세요', en: 'Describe purpose and expected outcomes' },

  // 보고 주기
  'execSupport.report.label':        { ko: '보고 주기',                 en: 'Reporting Cycle' },
  'execSupport.report.monthly':      { ko: '매월',                     en: 'Monthly' },
  'execSupport.report.quarterly':    { ko: '분기별',                    en: 'Quarterly' },
  'execSupport.report.annual':       { ko: '연 1회',                    en: 'Annually' },
  'execSupport.report.none':         { ko: '보고 없음',                 en: 'No reports' },
  'execSupport.report.help':         { ko: '받는 분이 자금 사용 내역을 정기 제출',  en: 'Recipient submits regular usage reports' },

  // 정산 만료일
  'execSupport.expiry.label':        { ko: '정산 만료일',                en: 'Settlement Deadline' },
  'execSupport.expiry.help':         { ko: '미사용 자금은 만료일에 자동 환수', en: 'Unused funds auto-returned on deadline' },
  'execSupport.expiry.auto':         { ko: '보고 주기에 맞춰 자동 설정 (변경 가능)', en: 'Auto-set based on cycle (changeable)' },

  // MCC 권한 (위임)
  'execSupport.mcc.label':           { ko: '사용 권한',                  en: 'Usage Permissions' },
  'execSupport.mcc.help':            { ko: '차단할 카테고리를 선택하세요',   en: 'Select categories to block' },

  // 경고
  'execSupport.warn.expiry.title':   { ko: '정산 만료일 주의',             en: 'Deadline Warning' },
  'execSupport.warn.expiry.body':    { ko: '만료일까지 사용하지 않은 자금은 자동으로 환수됩니다. 보고서 미제출 시 자금 동결 가능.', en: 'Unused funds auto-returned. Funds may freeze if reports unsubmitted.' },

  'execSupport.btn.next':            { ko: '다음',                     en: 'Next' },
  'execSupport.btn.execute':         { ko: '자금 지원 집행',              en: 'Execute Support' },
  'execSupport.btn.toHome':          { ko: '홈으로',                   en: 'Home' },

  // 확인 화면
  'execSupport.confirm.smallTitle':  { ko: '집행 내용 확인',              en: 'Confirm Support' },
  'execSupport.confirm.sub':         { ko: '{name}에게 자금 지원 · 권한 자금', en: 'Support to {name} · Permission funds' },
  'execSupport.row.recipient':       { ko: '받는 분',                   en: 'Recipient' },
  'execSupport.row.title':           { ko: '지원 명목',                 en: 'Title' },
  'execSupport.row.amount':          { ko: '지원 금액',                 en: 'Amount' },
  'execSupport.row.report':          { ko: '보고 주기',                 en: 'Reporting' },
  'execSupport.row.expiry':          { ko: '정산 만료일',                en: 'Deadline' },
  'execSupport.row.permissions':     { ko: '사용 권한',                 en: 'Permissions' },
  'execSupport.row.purpose':         { ko: '지원 사유',                 en: 'Purpose' },
  'execSupport.row.blocked':         { ko: '{count}개 카테고리 차단',     en: '{count} categories blocked' },
  'execSupport.row.allAllowed':      { ko: '모든 카테고리 허용',           en: 'All categories allowed' },

  // 자동 처리 안내
  'execSupport.auto.deposit':        { ko: '{name} 권한 자금 지갑에 입금', en: 'Deposit to {name} permission wallet' },
  'execSupport.auto.contract':       { ko: '자금 지원 계약서 자동 생성 + 양측 서명', en: 'Support contract auto-generated + e-signatures' },
  'execSupport.auto.mcc':            { ko: '{count}개 카테고리 사용 차단',  en: '{count} categories blocked from use' },
  'execSupport.auto.report':         { ko: '{cycle} 보고서 자동 생성 알림',  en: '{cycle} report auto-reminder' },
  'execSupport.auto.expiry':         { ko: '{date} 만료 시 미사용 자금 자동 환수', en: 'Unused funds auto-return on {date}' },
  'execSupport.auto.invest':         { ko: '투자 자산 회계 처리 + 세무사 자동 전송', en: 'Recorded as investment asset + sent to tax' },

  'execSupport.footer.afterExec':    { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원', en: 'After: {wallet} {before} → {after} KRW' },

  // 완료
  'execSupport.done.title':          { ko: '자금 지원 집행 완료',          en: 'Support Sent' },
  'execSupport.done.titleWaiting':   { ko: '서명 대기 중',                en: 'Awaiting Signature' },
  'execSupport.done.descSigning':    { ko: '{name}님에게 자금 지원 계약서가 발송됐어요. 양측 서명 완료 시 권한 자금이 입금됩니다.', en: 'Support contract sent to {name}. Funds deposited after both signatures.' },
  'execSupport.done.descWaiting':    { ko: '{name}님에게 외부링크로 인증 요청을 보냈어요. 인증 완료 시 권한 자금이 입금됩니다.', en: 'Verification link sent to {name}. Funds deposited after verification.' },
  'execSupport.done.note':           { ko: '투자 자산 등록 완료 · 정기 보고 자동 알림',   en: 'Investment asset registered · Auto-reminders set' },

  // ExecuteVendorLoanBusiness — B2B 자금 대여
  'execVendorLoan.smallTitle':        { ko: '자금 대여',                en: 'B2B Loan' },
  'execVendorLoan.step1.title':       { ko: '자금 대여',                en: 'Business Loan' },
  'execVendorLoan.step1.sub':         { ko: '거래처에 운전자금/단기 차입 대여',  en: 'Lend to vendor for operations' },

  'execVendorLoan.recipient.label':   { ko: '받는 사업자',               en: 'Borrower' },
  'execVendorLoan.recipient.change':  { ko: '변경',                    en: 'Change' },

  'execVendorLoan.notice.title':      { ko: '단기 대여금 처리 안내',       en: 'Short-term Loan Notice' },
  'execVendorLoan.notice.body':       { ko: '단기 대여금(자산)으로 회계 처리됩니다. 차용증이 자동 생성되며 만기 시 자동 회수되고 세무사에게 전달돼요.', en: 'Recorded as short-term loan (asset). Promissory note auto-generated. Auto-collected at maturity.' },

  'execVendorLoan.wallet.label':      { ko: '출금 지갑',                en: 'Source Wallet' },
  'execVendorLoan.wallet.balance':    { ko: '잔액 {amount}원',          en: 'Balance {amount} KRW' },

  'execVendorLoan.amount.label':      { ko: '대여 금액',                en: 'Loan Amount' },
  'execVendorLoan.amount.ph':         { ko: '금액 입력',                en: 'Enter amount' },

  // 이자율 (직원 대여와 동일 패턴)
  'execVendorLoan.rate.label':        { ko: '이자율',                  en: 'Interest Rate' },
  'execVendorLoan.rate.zero':         { ko: '무이자',                  en: 'Zero interest' },
  'execVendorLoan.rate.standard':     { ko: '연 4.6% · 세법상 적정 이자율', en: '4.6% / yr · Tax-compliant rate' },
  'execVendorLoan.rate.custom':       { ko: '직접 입력',                en: 'Custom' },
  'execVendorLoan.rate.customPh':     { ko: '연 ?%',                   en: '? % / yr' },
  'execVendorLoan.rate.high':         { ko: '⚠ 연 20% 초과는 이자제한법 위반', en: '⚠ Over 20% violates loan rate law' },

  'execVendorLoan.maturity.label':    { ko: '만기일',                  en: 'Maturity Date' },
  'execVendorLoan.maturity.help':     { ko: '만기일에 일시 상환 (이자 포함)', en: 'Lump-sum repayment on maturity' },

  'execVendorLoan.memo.label':        { ko: '용도 메모 (선택)',          en: 'Memo (optional)' },
  'execVendorLoan.memo.ph':           { ko: '예: 운전자금, 거래 선급금',   en: 'e.g. Operations, advance' },

  'execVendorLoan.warn.zero.title':   { ko: '인정이자 추징 가능',         en: 'Imputed Interest Risk' },
  'execVendorLoan.warn.zero.body':    { ko: '무이자/저금리 대여 시 세법상 적정 이자율(연 4.6%)과의 차이만큼 인정이자가 추징될 수 있어요.', en: 'Below-market loans may incur imputed interest tax.' },

  'execVendorLoan.btn.next':          { ko: '다음',                    en: 'Next' },
  'execVendorLoan.btn.execute':       { ko: '대여금 집행',               en: 'Execute Loan' },
  'execVendorLoan.btn.toHome':        { ko: '홈으로',                  en: 'Home' },

  'execVendorLoan.confirm.smallTitle': { ko: '대여 내용 확인',           en: 'Confirm Loan' },
  'execVendorLoan.confirm.sub':       { ko: '{name}에게 대여금 · 법인 자금', en: 'Loan to {name} · Corp. funds' },
  'execVendorLoan.row.recipient':     { ko: '받는 사업자',               en: 'Borrower' },
  'execVendorLoan.row.amount':        { ko: '대여 금액',                en: 'Loan Amount' },
  'execVendorLoan.row.rate':          { ko: '이자율',                  en: 'Interest Rate' },
  'execVendorLoan.row.maturity':      { ko: '만기일',                  en: 'Maturity' },
  'execVendorLoan.row.repayment':     { ko: '상환 예정액',               en: 'Repayment' },
  'execVendorLoan.row.memo':          { ko: '용도 메모',                en: 'Memo' },

  'execVendorLoan.auto.deposit':      { ko: '{name} 계좌로 즉시 입금',     en: 'Deposit to {name} now' },
  'execVendorLoan.auto.contract':     { ko: '차용증 자동 생성 + 양측 전자서명 발송', en: 'Promissory note + e-signatures sent' },
  'execVendorLoan.auto.accounting':   { ko: '단기 대여금 자산 등록 + 세무사 자동 전송', en: 'Short-term loan recorded + sent to tax' },
  'execVendorLoan.auto.maturity':     { ko: '{date} 만기 자동 알림',     en: 'Auto-reminder on {date}' },
  'execVendorLoan.auto.interest':     { ko: '매월 이자 자동 계산',         en: 'Monthly interest auto-calculated' },

  'execVendorLoan.footer.afterExec':  { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원', en: 'After: {wallet} {before} → {after} KRW' },

  'execVendorLoan.done.title':        { ko: '서명 대기 중',              en: 'Awaiting Signature' },
  'execVendorLoan.done.desc':         { ko: '{name}에게 차용증이 발송됐어요. 양측 서명 완료 시 즉시 입금됩니다.', en: 'Promissory note sent to {name}. Auto-deposited after signatures.' },
  'execVendorLoan.done.note':         { ko: '단기 대여금 자산 등록 완료 · 세무사에게 자동 전송됐어요', en: 'Short-term loan recorded · Auto-sent to tax accountant' },

  // ExecuteBusiness — 사업자에게 지급 진입 화면
  'execBiz.smallTitle':               { ko: '사업자에게 지급',          en: 'To Vendors' },
  'execBiz.bigTitle':                 { ko: '어떤 거래인가요?',         en: 'What kind of payment?' },
  'execBiz.bigSub':                   { ko: '사업자등록번호로 상대를 조회하고 안전하게 거래해요', en: 'Look up vendors by BRN and transact safely' },

  // 5개 메뉴 (외주비/마케팅비/부동산/자금 대여/투자)
  'execBiz.fund.freelance.label':     { ko: '외주비',                  en: 'Outsourcing' },
  'execBiz.fund.freelance.sub':       { ko: '인테리어·디자인·광고대행 등',  en: 'Interior, design, marketing agencies' },
  'execBiz.fund.freelance.control':   { ko: '계약서 양측 서명 + 검수 후 단계별 입금', en: 'Two-side signed contract + staged payments' },

  'execBiz.fund.marketing.label':     { ko: '마케팅비',                en: 'Marketing' },
  'execBiz.fund.marketing.sub':       { ko: '광고비·홍보비·콘텐츠 제작',    en: 'Ads, PR, content production' },
  'execBiz.fund.marketing.control':   { ko: '세금계산서 자동 처리 + 광고비 회계 분개',  en: 'Auto VAT invoice + ad cost accounting' },

  'execBiz.fund.realestate.label':    { ko: '부동산',                  en: 'Real Estate' },
  'execBiz.fund.realestate.sub':      { ko: '사업자 임대인 보증금·임대료',  en: 'Deposit / Rent for biz lessor' },
  'execBiz.fund.realestate.control':  { ko: '근저당 말소 + 잔금일 조건부 집행', en: 'Mortgage check + conditional final payment' },

  'execBiz.fund.vendorLoan.label':    { ko: '자금 대여',                en: 'B2B Loan' },
  'execBiz.fund.vendorLoan.sub':      { ko: '거래처·협력사에 운전자금 대여', en: 'Operating loans to vendors' },
  'execBiz.fund.vendorLoan.control':  { ko: '차용증 자동 + 만기 자동 회수 + 이자 회계 처리', en: 'Promissory note + auto-collection + interest accounting' },

  'execBiz.fund.vendorInvest.label':  { ko: '투자',                    en: 'Investment' },
  'execBiz.fund.vendorInvest.sub':    { ko: '사업자 지분 투자·전환사채',    en: 'Equity / Convertible bonds' },
  'execBiz.fund.vendorInvest.control':{ ko: '투자 계약서 자동 + 분기별 보고 + 회계 자산 등록', en: 'Investment contract + quarterly reports + asset registration' },

  'execBiz.balanceLabel':             { ko: '법인 출금 가능 자금',        en: 'Corporate available balance' },

  'execBiz.notice.title':             { ko: '사업자 거래 자동 처리',       en: 'Vendor Auto-Processing' },
  'execBiz.notice.body':              { ko: '국세청 사업자 등록 정보 자동 검증 · 세금계산서 자동 발행 · 증빙 자동 정리 + 세무사 자동 전송', en: 'Auto BRN verification · Auto VAT invoice · Auto evidence + tax accountant sync' },

  // ExecuteVendorInvestBusiness — B2B 지분 투자
  'execVendorInvest.smallTitle':       { ko: '투자',                    en: 'B2B Investment' },
  'execVendorInvest.step1.title':      { ko: '지분 투자',                en: 'Equity Investment' },
  'execVendorInvest.step1.sub':        { ko: '사업자에게 지분 투자 · 자기자본법 회계 처리', en: 'Equity investment to vendor · Equity-method accounting' },

  'execVendorInvest.recipient.label':  { ko: '투자 대상 사업자',           en: 'Investee' },
  'execVendorInvest.recipient.change': { ko: '변경',                    en: 'Change' },

  'execVendorInvest.notice.title':     { ko: '투자 자산 회계 처리 안내',     en: 'Investment Asset Accounting' },
  'execVendorInvest.notice.body':      { ko: '투자 자산(자기자본법)으로 회계 처리됩니다. 분기별 평가 손익이 인식되며, 매각 시 처분 손익이 반영됩니다.', en: 'Recorded as investment asset (equity method). Quarterly valuation gains/losses recognized; disposal P&L on exit.' },

  'execVendorInvest.wallet.label':     { ko: '출금 지갑',                en: 'Source Wallet' },
  'execVendorInvest.wallet.balance':   { ko: '잔액 {amount}원',          en: 'Balance {amount} KRW' },

  'execVendorInvest.amount.label':     { ko: '투자 금액',                en: 'Investment Amount' },
  'execVendorInvest.amount.ph':        { ko: '금액 입력',                en: 'Enter amount' },

  'execVendorInvest.equity.label':     { ko: '지분율',                  en: 'Equity Stake' },
  'execVendorInvest.equity.ph':        { ko: '예: 5',                  en: 'e.g. 5' },
  'execVendorInvest.equity.help':      { ko: '취득 지분율 (%)',          en: 'Acquired equity (%)' },

  'execVendorInvest.valuation.label':  { ko: '회사 가치 (자동 계산)',       en: 'Company Valuation (auto)' },
  'execVendorInvest.valuation.help':   { ko: '투자금 ÷ 지분율로 계산된 평가 가치', en: 'Calculated as investment ÷ equity %' },

  'execVendorInvest.title.label':      { ko: '투자 명목',                en: 'Investment Title' },
  'execVendorInvest.title.ph':         { ko: '예: 시리즈 A, 시드 라운드',    en: 'e.g. Series A, Seed Round' },

  'execVendorInvest.memo.label':       { ko: '투자 사유 (선택)',           en: 'Memo (optional)' },
  'execVendorInvest.memo.ph':          { ko: '투자 목적과 기대 효과',        en: 'Purpose and expected outcomes' },

  'execVendorInvest.warn.equity.title': { ko: '지분율 확인 필요',          en: 'Verify Equity Stake' },
  'execVendorInvest.warn.equity.body': { ko: '지분율은 투자 계약서 작성 시 정확히 반영됩니다. 회사 가치는 참고용 자동 계산값입니다.', en: 'Equity stake is finalized in the contract. Company valuation shown is auto-calculated.' },

  'execVendorInvest.btn.next':         { ko: '다음',                    en: 'Next' },
  'execVendorInvest.btn.execute':      { ko: '투자 집행',                en: 'Execute Investment' },
  'execVendorInvest.btn.toHome':       { ko: '홈으로',                  en: 'Home' },

  'execVendorInvest.confirm.smallTitle': { ko: '투자 내용 확인',           en: 'Confirm Investment' },
  'execVendorInvest.confirm.sub':      { ko: '{name}에 지분 투자 · 법인 자금', en: 'Equity investment in {name} · Corp. funds' },
  'execVendorInvest.row.recipient':    { ko: '투자 대상',                en: 'Investee' },
  'execVendorInvest.row.amount':       { ko: '투자 금액',                en: 'Amount' },
  'execVendorInvest.row.equity':       { ko: '취득 지분율',               en: 'Equity Stake' },
  'execVendorInvest.row.valuation':    { ko: '회사 가치',                en: 'Valuation' },
  'execVendorInvest.row.title':        { ko: '투자 명목',                en: 'Title' },
  'execVendorInvest.row.memo':         { ko: '투자 사유',                en: 'Memo' },

  'execVendorInvest.auto.contract':    { ko: '투자 계약서 자동 생성 + 양측 전자서명 발송', en: 'Investment contract + e-signatures sent' },
  'execVendorInvest.auto.deposit':     { ko: '서명 완료 시 {name} 계좌로 즉시 입금', en: 'Auto-deposit to {name} after both signatures' },
  'execVendorInvest.auto.accounting':  { ko: '투자 자산 등록 + 세무사 자동 전송', en: 'Investment asset recorded + sent to tax' },
  'execVendorInvest.auto.valuation':   { ko: '분기별 평가 손익 자동 인식',     en: 'Quarterly valuation P&L auto-recognized' },

  'execVendorInvest.footer.afterExec': { ko: '집행 후 {wallet} 잔액 {before}원 → {after}원', en: 'After: {wallet} {before} → {after} KRW' },

  'execVendorInvest.done.title':       { ko: '서명 대기 중',              en: 'Awaiting Signature' },
  'execVendorInvest.done.desc':        { ko: '{name}에 투자 계약서가 발송됐어요. 양측 서명 완료 시 즉시 입금됩니다.', en: 'Investment contract sent to {name}. Auto-deposited after signatures.' },
  'execVendorInvest.done.note':        { ko: '투자 자산 등록 완료 · 세무사에게 자동 전송됐어요', en: 'Investment asset recorded · Auto-sent to tax accountant' },

  // ─── 임대료 (운영비/자동지출 → 임대료) ─────────────────
  'execRent.smallTitle':            { ko: '임대료 자동 설정',            en: 'Rent Auto-Pay' },
  'execRent.bigTitle':              { ko: '한 번 등록하면\n매월 자동으로\n납부해드려요', en: 'Set once and\nrent is auto-paid\nevery month' },
  'execRent.bigSub':                { ko: '사무실·창고·차량 등 모든 임대 자산을 한 곳에서 관리하세요.', en: 'Manage all leased assets — offices, warehouses, vehicles — in one place.' },

  'execRent.empty.title':           { ko: '아직 등록된 임대 자산이 없어요', en: 'No leased assets yet' },
  'execRent.empty.cta':             { ko: '임대 자산 추가하기',           en: 'Add Leased Asset' },

  'execRent.summary.next':          { ko: '다음 지급 — {date} · 자산 {count}건', en: 'Next Payment — {date} · {count} asset(s)' },
  'execRent.summary.gross':         { ko: '월세 합계 (공급가액)',         en: 'Rent Subtotal' },
  'execRent.summary.vat':           { ko: '부가세 (10%)',                en: 'VAT (10%)' },
  'execRent.summary.maint':         { ko: '관리비 합계',                  en: 'Maintenance Fee' },
  'execRent.summary.total':         { ko: '월 총 납부액',                 en: 'Monthly Total' },
  'execRent.summary.deposit':       { ko: '보증금 합계 (자산)',           en: 'Total Deposits (Asset)' },

  'execRent.toggle.title':          { ko: '자동 지급',                    en: 'Auto-Pay' },
  'execRent.toggle.on':             { ko: '매월 {day}일 09:00 자동 집행 · 1일 전 알림', en: 'Auto-pay on the {day}th at 09:00 · 1-day notice' },
  'execRent.toggle.off':            { ko: '수동 지급 모드 (매월 알림만 발송)', en: 'Manual mode (notifications only)' },

  'execRent.payDay.btn':            { ko: '매월 {day}일 ✎',              en: 'Day {day} ✎' },
  'execRent.payDay.title':          { ko: '지급일 변경',                  en: 'Change Payment Day' },
  'execRent.payDay.body':           { ko: '매월 몇 일에 납부할까요?',       en: 'Which day of the month?' },
  'execRent.payDay.lastDay':        { ko: '말일',                         en: 'Last' },

  'execRent.assets.title':          { ko: '임대 자산 ({count}건)',         en: 'Leased Assets ({count})' },
  'execRent.assets.payable':        { ko: '지급 가능 {payable}건 · 제한 {blocked}건', en: '{payable} ready · {blocked} blocked' },
  'execRent.assets.add':            { ko: '임대 자산 추가',                en: 'Add Leased Asset' },

  // 자산 종류
  'execRent.kind.office':           { ko: '사무실',                       en: 'Office' },
  'execRent.kind.warehouse':        { ko: '창고',                         en: 'Warehouse' },
  'execRent.kind.shop':             { ko: '매장 · 상가',                  en: 'Shop · Retail' },
  'execRent.kind.vehicle':          { ko: '차량',                         en: 'Vehicle' },
  'execRent.kind.equipment':        { ko: '장비 · 기기',                  en: 'Equipment' },
  'execRent.kind.housing':          { ko: '직원 사택',                    en: 'Staff Housing' },
  'execRent.kind.etc':              { ko: '기타',                         en: 'Other' },

  // 임대인 유형
  'execRent.lessor.business':       { ko: '사업자',                       en: 'Business' },
  'execRent.lessor.individual':     { ko: '개인',                         en: 'Individual' },
  'execRent.lessor.brn':            { ko: '사업자번호 (10자리)',           en: 'BRN (10 digits)' },
  'execRent.lessor.phone':          { ko: '휴대폰 번호 (숫자만)',          en: 'Phone (digits only)' },
  'execRent.lessor.name':           { ko: '임대인 / 상호',                en: 'Lessor / Business Name' },
  'execRent.lessor.account':        { ko: '입금 계좌',                    en: 'Deposit Account' },

  // 상태 배지
  'execRent.status.payable':        { ko: '지급 가능',                    en: 'Ready' },
  'execRent.status.invited':        { ko: '초대 발송중',                  en: 'Invite Sent' },
  'execRent.status.expired':        { ko: '링크 만료',                    en: 'Link Expired' },
  'execRent.status.pending':        { ko: '인증 대기',                    en: 'Awaiting Verify' },
  'execRent.status.blocked':        { ko: '지급 제한',                    en: 'Blocked' },
  'execRent.status.expiring':       { ko: '계약 만료 임박',                en: 'Contract Expiring' },
  'execRent.status.expiredContract':{ ko: '계약 만료됨',                  en: 'Contract Ended' },

  // 자산 추가 시트 (3단계: 종류 → 임대인 → 금액·계약)
  'execRent.add.title':             { ko: '임대 자산 추가',                en: 'Add Leased Asset' },
  'execRent.add.step.kind':         { ko: '1. 자산 종류',                 en: '1. Asset Type' },
  'execRent.add.step.identity':     { ko: '2. 자산 식별',                 en: '2. Asset Identity' },
  'execRent.add.step.lessor':       { ko: '3. 임대인',                    en: '3. Lessor' },
  'execRent.add.step.terms':        { ko: '4. 금액 · 계약',                en: '4. Amount · Lease' },
  'execRent.add.address':           { ko: '주소 / 식별 (예: 강남 본사 4층)', en: 'Address / Identifier' },
  'execRent.add.alias':             { ko: '자산 별칭 (예: 강남 사무실)',     en: 'Alias (e.g. Gangnam Office)' },

  'execRent.add.rent':              { ko: '월세 (공급가액)',               en: 'Monthly Rent (excl. VAT)' },
  'execRent.add.vatMode':           { ko: '부가세 처리',                  en: 'VAT Handling' },
  'execRent.add.vatExclude':        { ko: '부가세 별도 (10% 자동 가산)',    en: 'Add 10% VAT' },
  'execRent.add.vatInclude':        { ko: '부가세 포함',                  en: 'Tax Inclusive' },
  'execRent.add.vatExempt':         { ko: '면세 (개인 임대인 등)',          en: 'Tax Exempt' },
  'execRent.add.maint':             { ko: '관리비 (매월 고정, 0이면 변동)',  en: 'Maintenance Fee (fixed; 0 = variable)' },
  'execRent.add.deposit':           { ko: '보증금',                       en: 'Deposit' },
  'execRent.add.depositPay':        { ko: '보증금 즉시 집행',               en: 'Pay Deposit Now' },
  'execRent.add.depositLater':      { ko: '보증금은 이미 지급됨',            en: 'Deposit already paid' },
  'execRent.add.startDate':         { ko: '계약 시작일',                  en: 'Lease Start' },
  'execRent.add.endDate':           { ko: '계약 종료일',                  en: 'Lease End' },
  'execRent.add.contractFile':      { ko: '임대차계약서 첨부 (선택)',        en: 'Attach Lease Agreement (optional)' },

  // 안내 박스
  'execRent.info.invited.title':    { ko: '미가입자 — 초대 링크 발송',       en: 'Unregistered — Invite Sent' },
  'execRent.info.invited.body':     { ko: '72시간 유효한 초대 링크가 발송됩니다. 받는 분이 본인인증 + 입금계좌 등록을 완료하면 자동 지급됩니다.', en: 'A 72h invite link is sent. The lessor completes KYC + bank account to enable auto-pay.' },
  'execRent.info.expiring.title':   { ko: '계약 만료 D-{days}',           en: 'Lease ends in D-{days}' },
  'execRent.info.expiring.body':    { ko: '갱신 또는 보증금 반환 절차를 검토해주세요.', en: 'Review renewal or deposit return.' },
  'execRent.info.lastPay':          { ko: '마지막 납부',                  en: 'Last Payment' },
  'execRent.info.delete':           { ko: '이 자산 삭제',                 en: 'Remove Asset' },

  // 예상 처리 안내
  'execRent.notice.auto.title':     { ko: '자동 처리',                    en: 'Auto-Processing' },
  'execRent.notice.auto.body':      { ko: '• 지급 시 세금계산서 자동 수취\n• 임대인에게 자동 영수증 발급\n• 5년간 증빙센터에 자동 보관\n• 임대료 비용 자동 회계 분개', en: '• Tax invoice auto-received\n• Receipt auto-issued to lessor\n• 5-year auto-archive in Evidence\n• Auto-bookkeeping as rent expense' },
  'execRent.notice.policy.title':   { ko: '이 메뉴는 정기 임대료 전용',      en: 'For Recurring Rent Only' },
  'execRent.notice.policy.body':    { ko: '일회성 부동산 거래(매매·전세 잔금)는 자금집행 → 부동산에서 처리하세요.', en: 'For one-time real-estate (sale, jeonse) use Execute → Real Estate.' },

  // 즉시 지급 / 저장
  'execRent.immediate.title':       { ko: '즉시 지급',                    en: 'Pay Now' },
  'execRent.immediate.body':        { ko: '지금 바로 지급 가능 자산 {count}건에 납부', en: 'Pay {count} ready asset(s) immediately' },
  'execRent.btn.payNow':            { ko: '지급',                         en: 'Pay' },
  'execRent.btn.save':              { ko: '저장',                         en: 'Save' },
  'execRent.btn.saveNoChange':      { ko: '변경된 내용 없음',               en: 'No Changes' },
  'execRent.btn.cancel':            { ko: '취소',                         en: 'Cancel' },
  'execRent.btn.register':          { ko: '등록',                         en: 'Register' },
  'execRent.btn.close':             { ko: '닫기',                         en: 'Close' },

  // 즉시 지급 confirm
  'execRent.confirm.payNow':        { ko: '지금 즉시 지급 가능한 자산 {count}건에 총 {amount}원을 납부할까요?', en: 'Pay total {amount} KRW to {count} ready asset(s) now?' },

  // 자산 카테고리 (운영비 진입)
  'operations.cat.salary':          { ko: '급여',                         en: 'Payroll' },
  'operations.cat.salarySub':       { ko: '직원 급여 매월 자동 지급',         en: 'Auto-pay staff every month' },
  'operations.cat.rent':             { ko: '임대료',                        en: 'Rent' },
  'operations.cat.rentSub':         { ko: '사무실 / 창고 / 차량',           en: 'Office / Warehouse / Vehicle' },

  // 발견된 부동산 거래 (자동지급 등록 가능)
  'execRent.discovered.title':      { ko: '부동산 메뉴에서 발견된 임대',       en: 'Found in Real Estate' },
  'execRent.discovered.sub':        { ko: '월세 거래로 집행한 계약을 자동지급으로 등록할 수 있어요', en: 'Register monthly rent deals as auto-pay' },
  'execRent.discovered.empty':      { ko: '발견된 임대 거래가 없어요',         en: 'No monthly rent deals found' },
  'execRent.discovered.cta':        { ko: '자동지급 등록',                  en: 'Register Auto-Pay' },
  'execRent.discovered.fromDeal':   { ko: '부동산 거래 #{id}',              en: 'Deal #{id}' },
  'execRent.discovered.depositPaid':{ ko: '보증금 {amount}원 집행됨',        en: 'Deposit {amount} KRW paid' },

  // 등록된 자동지급 풀
  'execRent.registered.title':      { ko: '자동지급 등록된 임대 자산',         en: 'Registered Auto-Pay Assets' },
  'execRent.registered.empty':      { ko: '등록된 자동지급 자산이 없어요',     en: 'No assets registered yet' },
  'execRent.registered.fromDeal':   { ko: '부동산 거래 연결됨',              en: 'Linked to RE Deal' },
  'execRent.registered.manual':     { ko: '직접 등록',                     en: 'Manually Added' },

  // 자동지급 등록 시트 (부동산 거래 → 풀)
  'execRent.registerFromDeal.title':{ ko: '자동지급으로 등록',                en: 'Register as Auto-Pay' },
  'execRent.registerFromDeal.sub':  { ko: '부동산 거래 정보를 기반으로 매월 자동 납부 풀에 추가합니다.', en: 'Add to monthly auto-pay pool based on the real-estate deal.' },
  'execRent.registerFromDeal.kind': { ko: '자산 종류 선택',                  en: 'Asset Type' },
  'execRent.registerFromDeal.alias':{ ko: '자산 별칭 (선택)',                en: 'Alias (optional)' },
  'execRent.registerFromDeal.confirm': { ko: '자동지급 풀에 추가',           en: 'Add to Auto-Pay' },

  // 해제
  'execRent.unregister.btn':        { ko: '자동지급 해제',                  en: 'Disable Auto-Pay' },
  'execRent.unregister.confirm':    { ko: '이 자산의 자동 납부를 중단하시겠어요? 부동산 거래 자체는 유지됩니다.', en: 'Stop auto-pay for this asset? The original deal will remain.' },

  // 직접 추가 안내 (deprecated — 직접 추가 섹션 제거됨)
  'execRent.directAdd.hint':        { ko: '부동산 메뉴를 거치지 않은 자산(차량 렌트·장비 임대 등)은 여기서 직접 등록하세요.', en: 'For assets not from Real Estate (vehicle, equipment rentals), add directly.' },

  // 빈 상태 (부동산 거래 0건)
  'execRent.empty.noDealsTitle':    { ko: '부동산 자금 집행 내역이 없어요', en: 'No real-estate deals yet' },
  'execRent.empty.noDealsNotice':   { ko: '임대료 자동 지출은 기존 부동산(월세+보증금) 자금 집행 후에 이용 가능합니다.\n먼저 부동산 자금 집행 후에 자동설정을 진행하세요.', en: 'Rent auto-pay is available after you execute a real-estate (rent + deposit) deal.\nExecute the real-estate deal first, then configure auto-pay here.' },
  'execRent.empty.monthlyOnly':     { ko: '※ 월세 모드로 집행한 부동산만 자동지급 등록이 가능합니다 (전세는 보증금 1회성).', en: 'Only deals executed in Monthly mode can be auto-paid (Jeonse is one-time deposit).' },
  'execRent.empty.goRealEstate':    { ko: '부동산 자금 집행하러 가기',     en: 'Go to Real Estate' },
  'execRent.empty.disabledCta':     { ko: '자동 등록 (부동산 집행 필요)',   en: 'Register (Need RE Deal)' },

  // 토글 기반 자동지급 등록
  'execRent.toggle.autoPayOn':      { ko: '자동 지급 활성',                en: 'Auto-Pay Active' },
  'execRent.toggle.autoPayOff':     { ko: '자동 지급 해제됨',              en: 'Auto-Pay Off' },
  'execRent.toggle.tapToEnable':    { ko: '토글로 자동지급 활성',           en: 'Toggle to enable auto-pay' },

  // 거래 리스트 헤더
  'execRent.dealsList.title':       { ko: '부동산 거래 ({count}건)',        en: 'Real-Estate Deals ({count})' },
  'execRent.dealsList.sub':         { ko: '자동지급 활성 {on}건 · 해제 {off}건', en: '{on} active · {off} off' },
  'execRent.dealsList.hint':        { ko: '각 거래의 토글로 자동 납부 ON/OFF를 정하세요. 활성된 자산만 매월 자동 집행됩니다.', en: 'Toggle each deal to enable monthly auto-pay. Only active assets are auto-paid.' },

  // 펼침 영역 — 인라인 수정
  'execRent.inline.vatHint':        { ko: '부가세 처리 방식',              en: 'VAT Handling' },
  'execRent.inline.maintHint':      { ko: '관리비 (월 고정)',              en: 'Maintenance Fee (monthly)' },
  'execRent.inline.notRegistered':  { ko: '자동지급 활성 시 수정 가능',     en: 'Editable when auto-pay is active' },

  // ─── 개인 생활비 집행 (ExecuteLiving) ───────────────────────────────────
  'execLiving.smallTitle':            { ko: '생활비',                       en: 'Living Expenses' },
  'execLiving.badge':                 { ko: '권한자금',                      en: 'Permission Fund' },
  'execLiving.step1.title':           { ko: '{name}에게 보낼 생활비',         en: 'Living expenses for {name}' },
  'execLiving.recipient.label':       { ko: '받는 사람',                     en: 'Recipient' },
  'execLiving.recipient.change':      { ko: '변경',                          en: 'Change' },
  'execLiving.kyc.verified':          { ko: '본인인증 완료',                  en: 'KYC Verified' },
  'execLiving.wallet.label':          { ko: '출금 지갑',                     en: 'Source Wallet' },
  'execLiving.wallet.info':           { ko: '{name}의 생활비 지갑으로 즉시 입금되며, 출금은 불가하고 카드 결제만 가능합니다. 사용 내역은 자동으로 보관됩니다.', en: 'Deposited instantly to {name}\'s living-expense wallet. Card payments only — no withdrawal. All usage is auto-archived.' },
  'execLiving.amount.label':          { ko: '보낼 금액',                     en: 'Amount to Send' },
  'execLiving.category.label':        { ko: '생활비 항목',                   en: 'Category' },
  'execLiving.category.food':         { ko: '식비',                          en: 'Food' },
  'execLiving.category.transport':    { ko: '교통비',                        en: 'Transport' },
  'execLiving.category.medical':      { ko: '의료·약',                       en: 'Medical' },
  'execLiving.category.household':    { ko: '생활용품',                      en: 'Household' },
  'execLiving.category.etc':          { ko: '기타',                          en: 'Other' },
  'execLiving.mcc.label':             { ko: '사용 통제 설정',                 en: 'Spending Controls' },
  'execLiving.mcc.none':              { ko: 'MCC 차단 없음 — 자유롭게 사용',  en: 'No MCC blocks — free to use' },
  'execLiving.mcc.blocked':           { ko: 'MCC {count}개 차단됨',          en: '{count} MCC(s) blocked' },
  'execLiving.mcc.noneDesc':          { ko: '모든 업종에서 자유롭게 사용 가능합니다',  en: 'Usable at all merchant categories' },
  'execLiving.mcc.step.smallTitle':   { ko: '사용 통제',                     en: 'Spending Controls' },
  'execLiving.mcc.step.title':        { ko: '사용 가능 업종 설정',             en: 'Set Allowed Merchants' },
  'execLiving.mcc.step.sub':          { ko: '{name}의 생활비 지갑에서 차단할 업종을 선택하세요', en: 'Select categories to block in {name}\'s wallet' },
  'execLiving.memo.label':            { ko: '메모 (선택)',                   en: 'Memo (optional)' },
  'execLiving.memo.ph':               { ko: '예) 5월 식비 🛒',               en: 'e.g. May food budget 🛒' },
  'execLiving.btn.insufficient':      { ko: '잔액 부족',                     en: 'Insufficient Balance' },
  'execLiving.btn.send':              { ko: '{amount}원 보내기',              en: 'Send {amount} KRW' },
  'execLiving.btn.noAmount':          { ko: '금액을 입력하세요',               en: 'Enter an amount' },
  'execLiving.btn.next':              { ko: '다음',                          en: 'Next' },
  'execLiving.btn.execute':           { ko: '집행하기',                      en: 'Execute' },
  'execLiving.btn.toHome':            { ko: '홈으로',                        en: 'Go Home' },
  'execLiving.btn.chat':              { ko: '{name}에게 메시지',              en: 'Message {name}' },
  'execLiving.confirm.smallTitle':    { ko: '집행 확인',                     en: 'Confirm Execution' },
  'execLiving.confirm.bigSub':        { ko: '{name}에게 생활비 지급',         en: 'Living expenses to {name}' },
  'execLiving.row.recipient':         { ko: '받는 사람',                     en: 'Recipient' },
  'execLiving.row.walletBalance':     { ko: '잔액 {amount}원',               en: 'Balance {amount} KRW' },
  'execLiving.row.category':          { ko: '항목',                          en: 'Category' },
  'execLiving.row.mcc':               { ko: '사용 통제',                     en: 'Spending Control' },
  'execLiving.row.mccBlocked':        { ko: '{count}개 업종 차단',            en: '{count} category(ies) blocked' },
  'execLiving.row.mccNone':           { ko: '차단 없음',                     en: 'No blocks' },
  'execLiving.row.memo':              { ko: '메모',                          en: 'Memo' },
  'execLiving.auto.deposit':          { ko: '{name}의 생활비 지갑으로 즉시 입금', en: 'Instantly deposited to {name}\'s wallet' },
  'execLiving.auto.notify':           { ko: '{name}에게 입금 알림 발송',       en: 'Deposit notification sent to {name}' },
  'execLiving.auto.archive':          { ko: '지급 증빙 자동 보관 (5년)',       en: 'Auto-archived for 5 years' },
  'execLiving.footer.afterExec':      { ko: '{wallet} 잔액 {before}원 → {after}원', en: '{wallet} balance {before} → {after} KRW' },
  'execLiving.pin.summary':           { ko: '{name}에게 생활비',              en: 'Living expenses for {name}' },
  'execLiving.done.title':            { ko: '생활비 지급 완료!',              en: 'Payment Complete!' },
  'execLiving.done.desc':             { ko: '{name}에게 {amount}원이 생활비로 지급되었습니다.', en: '{amount} KRW sent to {name} for living expenses.' },
  'execLiving.done.label.amount':     { ko: '지급 금액',                     en: 'Amount Sent' },
  'execLiving.done.label.remaining':  { ko: '지갑 잔액',                     en: 'Wallet Balance' },
  'execLiving.done.mccBlocked':       { ko: '{count}개 업종 차단',            en: '{count} category(ies) blocked' },
  'execLiving.done.mccNone':          { ko: '차단 없음',                     en: 'No blocks' },
  'execLiving.done.note':             { ko: '{name}의 생활비 지갑에 입금되었어요. 출금 없이 카드 결제로만 사용 가능합니다.', en: 'Deposited to {name}\'s wallet. Card payments only — no withdrawal.' },

  // ─── 개인 선물·용돈 집행 (ExecuteGift) ───────────────────────────────────
  'execGift.smallTitle':            { ko: '용돈 · 선물',                   en: 'Gift / Allowance' },
  'execGift.badge':                 { ko: '권한자금',                      en: 'Permission Fund' },
  'execGift.step1.title':           { ko: '{name}에게 보낼 금액',           en: 'Amount for {name}' },

  // 받는 사람
  'execGift.recipient.label':       { ko: '받는 사람',                     en: 'Recipient' },
  'execGift.recipient.change':      { ko: '변경',                          en: 'Change' },
  'execGift.kyc.verified':          { ko: '본인인증 완료',                  en: 'KYC Verified' },

  // 지갑
  'execGift.wallet.label':          { ko: '출금 지갑',                     en: 'Source Wallet' },
  'execGift.wallet.info':           { ko: '{name}의 받은 지갑으로 즉시 입금되며, 출금은 불가하고 카드 결제만 가능합니다. 사용 내역은 자동으로 보관됩니다.', en: 'Funds are sent instantly to {name}\'s receive wallet. Withdrawal is not allowed — card payments only. All usage is auto-archived.' },

  // 금액
  'execGift.amount.label':          { ko: '보낼 금액',                     en: 'Amount to Send' },

  // 카테고리
  'execGift.category.label':        { ko: '카테고리',                      en: 'Category' },
  'execGift.category.birthday':     { ko: '생일',                          en: 'Birthday' },
  'execGift.category.allowance':    { ko: '용돈',                          en: 'Allowance' },
  'execGift.category.gift':         { ko: '선물',                          en: 'Gift' },
  'execGift.category.etc':          { ko: '기타',                          en: 'Other' },

  // MCC 사용 통제
  'execGift.mcc.label':             { ko: '사용 통제 설정',                 en: 'Spending Controls' },
  'execGift.mcc.none':              { ko: 'MCC 차단 없음 — 자유롭게 사용',  en: 'No MCC blocks — free to use' },
  'execGift.mcc.blocked':           { ko: 'MCC {count}개 차단됨',          en: '{count} MCC(s) blocked' },
  'execGift.mcc.noneDesc':          { ko: '모든 업종에서 자유롭게 사용 가능합니다',  en: 'Usable at all merchant categories' },
  'execGift.mcc.step.smallTitle':   { ko: '사용 통제',                     en: 'Spending Controls' },
  'execGift.mcc.step.title':        { ko: '사용 가능 업종 설정',             en: 'Set Allowed Merchants' },
  'execGift.mcc.step.sub':          { ko: '{name}의 지갑에서 차단할 업종을 선택하세요', en: 'Select categories to block in {name}\'s wallet' },

  // 메모
  'execGift.memo.label':            { ko: '메모 (선택)',                   en: 'Memo (optional)' },
  'execGift.memo.ph':               { ko: '예) 생일 축하해 🎂',            en: 'e.g. Happy birthday 🎂' },

  // 버튼
  'execGift.btn.insufficient':      { ko: '잔액 부족',                     en: 'Insufficient Balance' },
  'execGift.btn.send':              { ko: '{amount}원 보내기',              en: 'Send {amount} KRW' },
  'execGift.btn.noAmount':          { ko: '금액을 입력하세요',               en: 'Enter an amount' },
  'execGift.btn.next':              { ko: '다음',                          en: 'Next' },
  'execGift.btn.execute':           { ko: '집행하기',                      en: 'Execute' },
  'execGift.btn.toHome':            { ko: '홈으로',                        en: 'Go Home' },
  'execGift.btn.chat':              { ko: '{name}에게 메시지',              en: 'Message {name}' },

  // 확인 단계
  'execGift.confirm.smallTitle':    { ko: '집행 확인',                     en: 'Confirm Execution' },
  'execGift.confirm.bigSub':        { ko: '{name}에게 지급',               en: 'Payment to {name}' },

  // 확인 행
  'execGift.row.recipient':         { ko: '받는 사람',                     en: 'Recipient' },
  'execGift.row.walletBalance':     { ko: '잔액 {amount}원',               en: 'Balance {amount} KRW' },
  'execGift.row.category':          { ko: '카테고리',                      en: 'Category' },
  'execGift.row.mcc':               { ko: '사용 통제',                     en: 'Spending Control' },
  'execGift.row.mccBlocked':        { ko: '{count}개 업종 차단',            en: '{count} category(ies) blocked' },
  'execGift.row.mccNone':           { ko: '차단 없음',                     en: 'No blocks' },
  'execGift.row.memo':              { ko: '메모',                          en: 'Memo' },

  // 자동 처리 안내
  'execGift.auto.deposit':          { ko: '{name}의 받은 지갑으로 즉시 입금', en: 'Instantly deposited to {name}\'s wallet' },
  'execGift.auto.notify':           { ko: '{name}에게 입금 알림 발송',       en: 'Deposit notification sent to {name}' },
  'execGift.auto.archive':          { ko: '지급 증빙 자동 보관 (5년)',       en: 'Auto-archived for 5 years' },

  // 하단 잔액 안내
  'execGift.footer.afterExec':      { ko: '{wallet} 잔액 {before}원 → {after}원', en: '{wallet} balance {before} → {after} KRW' },

  // PIN 단계
  'execGift.pin.summary':           { ko: '{name}에게 선물·용돈',           en: 'Gift to {name}' },

  // 완료 단계
  'execGift.done.title':            { ko: '지급 완료!',                    en: 'Payment Complete!' },
  'execGift.done.desc':             { ko: '{name}에게 {amount}원이 지급되었습니다.', en: '{amount} KRW sent to {name}.' },
  'execGift.done.label.amount':     { ko: '지급 금액',                     en: 'Amount Sent' },
  'execGift.done.label.remaining':  { ko: '지갑 잔액',                     en: 'Wallet Balance' },
  'execGift.done.mccBlocked':       { ko: '{count}개 업종 차단',            en: '{count} category(ies) blocked' },
  'execGift.done.mccNone':          { ko: '차단 없음',                     en: 'No blocks' },
  'execGift.done.note':             { ko: '{name}의 받은 지갑에 입금되었어요. 출금 없이 카드 결제로만 사용 가능합니다.', en: 'Deposited to {name}\'s wallet. Card payments only — no withdrawal.' },
}
