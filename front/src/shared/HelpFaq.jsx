import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ─────────────────────────────────────────────────────────
// 기업 데이터
// ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',      label: '전체',       icon: '🔍' },
  { key: 'start',    label: '시작하기',   icon: '🚀' },
  { key: 'execute',  label: '자금집행',   icon: '💸' },
  { key: 'card',     label: '카드·결제',  icon: '💳' },
  { key: 'contract', label: '계약·증빙',  icon: '📋' },
  { key: 'security', label: '보안·인증',  icon: '🔒' },
  { key: 'biz',      label: '기업계정',   icon: '🏢' },
  { key: 'message',  label: '메시지',     icon: '💬' },
  { key: 'wallet',   label: '지갑·충전',  icon: '💰' },
  { key: 'error',    label: '오류해결',   icon: '⚠️' },
]

const FAQ_DATA = [
  // ── 시작하기 ─────────────────────────────────
  {
    id: 1, cat: 'start',
    q: '주다페이는 어떤 서비스인가요?',
    a: '주다페이는 자금의 이동을 설계·통제·추적하는 자금 운영 인프라입니다.\n\n개인 간 대여금·투자금·선물부터 기업의 급여·임대료·외주비 집행까지, 계약 기반 자금 이동과 법인카드 결제 관리를 하나의 앱에서 처리할 수 있습니다.\n\n모든 거래는 실시간 추적되고 증빙 자료와 함께 보관되어, 세무·감사·투명성 요구에 바로 대응할 수 있습니다.',
  },
  {
    id: 2, cat: 'start',
    q: '개인 계정과 기업 계정의 차이는 무엇인가요?',
    a: '개인 계정은 대여금, 투자금, 선물, 부동산 거래, 외주 수령 등 개인 간 자금 이동에 최적화되어 있습니다.\n\n기업 계정은 급여·임대료·외주비·경조사비 집행, 법인카드 관리, 관리자 시스템, 처리센터(승인라인), 월간 보고서, 세무사 연동 등 기업 운영에 필요한 모든 기능을 추가로 제공합니다.',
  },
  {
    id: 3, cat: 'start',
    q: 'KYC 인증이란 무엇이며 왜 필요한가요?',
    a: 'KYC(Know Your Customer)는 본인 확인 절차로, 전자금융거래법에 따라 필수입니다.\n\n• 1단계: 기본 정보 입력\n• 2단계: 신분증 촬영 인증\n• 3단계: 본인 명의 계좌 연결 인증\n\nKYC 단계가 높을수록 거래 한도와 이용 가능한 기능이 확대됩니다. 개인정보는 금융보안원 기준에 따라 암호화 보관됩니다.',
  },
  {
    id: 4, cat: 'start',
    q: '회원가입은 어떻게 하나요?',
    a: '시작 화면에서 "개인 계정" 또는 "기업 계정"을 선택한 뒤 안내에 따라 정보를 입력합니다.\n\n기업 계정은 사업자등록번호, 법인명, 대표자명이 추가로 필요합니다. 가입 완료 후 6자리 PIN을 설정하면 바로 이용할 수 있습니다.',
  },

  // ── 자금집행 ─────────────────────────────────
  {
    id: 10, cat: 'execute',
    q: '자금 집행이란 무엇인가요?',
    a: '자금 집행은 계약 기반으로 자금을 안전하게 이동시키는 핵심 기능입니다.\n\n상대방과 계약을 체결한 후 마일스톤(단계) 완료 시 자금이 순차 지급됩니다. 선지급·분할지급·조건부 지급이 모두 가능하며, 모든 과정이 채팅방에 기록되어 추적됩니다.',
  },
  {
    id: 11, cat: 'execute',
    q: '집행 금액 한도는 얼마인가요?',
    a: '개인 계정 기본 한도:\n• 1회 최대 500만 원 / 월 3,000만 원\n\nKYC 2단계 완료 시:\n• 1회 최대 1,000만 원 / 월 5,000만 원\n\n기업 계정은 관리자 설정에 따라 한도가 별도 적용됩니다. 한도 상향이 필요하면 고객센터로 문의해주세요.',
  },
  {
    id: 12, cat: 'execute',
    q: '외주비(프리랜서) 집행 시 계약서가 필요한가요?',
    a: '주다페이 내에서 디지털 계약서를 직접 작성·서명합니다. 별도의 종이 계약서 없이도 법적 효력이 있는 전자계약이 체결됩니다.\n\n마일스톤 기반으로 단계별 지급이 이루어지며, 체결된 계약서는 채팅방과 증빙센터에서 언제든 확인할 수 있습니다.',
  },
  {
    id: 13, cat: 'execute',
    q: '자금 집행 후 취소할 수 있나요?',
    a: '현재 자금 집행 취소 기능은 준비 중입니다. 곧 업데이트를 통해 제공될 예정이니 조금만 기다려 주세요.\n\n집행 관련 문제가 발생했다면 더보기 → 분쟁 신고를 통해 문제를 제기하거나, 고객센터(1588-0000)로 문의해주세요.',
  },
  {
    id: 14, cat: 'execute',
    q: '대여금과 투자금은 어떻게 집행하나요?',
    a: '자금 집행 메뉴에서 "개인 대여" 또는 "투자금"을 선택하세요.\n\n대여금: 상환 기한과 이자율(무이자 포함)을 설정하고 계약을 체결합니다. 상환 요청은 메시지 채팅방에서 바로 발송할 수 있습니다.\n\n투자금: 투자 목적과 조건을 명시한 계약서가 자동 생성됩니다.',
  },
  {
    id: 15, cat: 'execute',
    q: '경조사비는 어떻게 보내나요?',
    a: '자금 집행 → 기타통지 → 경조사비를 선택합니다.\n\n경조사 종류(결혼/조문/출산 등), 금액, 메시지를 입력하면 상대방에게 전달됩니다. 수령 내역은 거래 목록에 기록되어 세무 처리 시 활용할 수 있습니다.',
  },

  // ── 카드·결제 ─────────────────────────────────
  {
    id: 20, cat: 'card',
    q: '법인카드 결제 내역은 어떻게 확인하나요?',
    a: '홈 화면에서 카드 메뉴를 클릭하면 법인카드 결제 내역을 확인할 수 있습니다.\n\n영수증 첨부, 사용 목적 입력, 내역확인요청 발송까지 한 화면에서 처리됩니다. 실시간 결제 알림은 알림 탭에서 확인하세요.',
  },
  {
    id: 21, cat: 'card',
    q: '내역확인요청(소명요청)이란 무엇인가요?',
    a: '법인카드 사용 내역 중 목적이 불명확한 결제에 대해 담당자에게 확인을 요청하는 기능입니다.\n\n결제 내역 또는 실시간 결제 화면에서 내역을 선택 후 "내역확인요청" 버튼을 누르면 메시지로 요청이 발송됩니다. 담당자는 증빙 자료 첨부 및 사용 목적 설명으로 응답합니다.',
  },
  {
    id: 22, cat: 'card',
    q: 'MCC(가맹점 분류 코드)란 무엇인가요?',
    a: 'MCC(Merchant Category Code)는 카드 가맹점의 업종을 분류하는 4자리 코드입니다.\n\n주다페이에서는 법인카드 계약 시 허용/차단 MCC를 설정할 수 있습니다. 예: 주류·유흥업종(MCC 5813)을 차단하면 해당 가맹점에서 법인카드 결제가 자동 거부됩니다.',
  },
  {
    id: 23, cat: 'card',
    q: '카드 결제가 차단(FDS 알림)되었어요.',
    a: '이상거래탐지시스템(FDS)이 비정상 패턴을 감지했거나, 설정된 MCC 차단 정책에 의해 결제가 거부된 것입니다.\n\n실시간 결제 알림 화면에서 해당 내역을 확인하고, 필요 시 관리자에게 MCC 정책 변경을 요청하거나 고객센터로 문의해주세요.',
  },

  // ── 계약·증빙 ─────────────────────────────────
  {
    id: 30, cat: 'contract',
    q: '증빙센터는 어떻게 이용하나요?',
    a: '더보기 → 통합 증빙센터에서 모든 거래의 증빙 자료를 한번에 관리할 수 있습니다.\n\n• 누락된 증빙 항목 확인 및 업로드\n• 전체 자료 ZIP 파일 다운로드\n• 세무사 이메일 직접 전송\n• 카테고리별 증빙 현황 확인\n\n증빙 누락 건은 빨간색 뱃지로 강조 표시됩니다.',
  },
  {
    id: 31, cat: 'contract',
    q: '계약서는 어떻게 체결되나요?',
    a: '자금 집행 화면에서 계약 내용(금액, 마일스톤, 기한 등)을 입력하면 상대방에게 계약서가 메시지로 전달됩니다.\n\n상대방이 내용을 확인하고 PIN 번호로 서명하면 계약이 체결됩니다. 체결된 계약서는 메시지 채팅방과 증빙센터에서 언제든 열람할 수 있습니다.',
  },
  {
    id: 32, cat: 'contract',
    q: '월간 보고서는 어디서 확인하나요?',
    a: '더보기 → 월간 보고서에서 확인할 수 있습니다.\n\n• 이번 달 자금 사용 현황 요약\n• 카테고리별 지출 비율 분석\n• 전월 대비 증감 현황\n• 세무 신고용 PDF 다운로드\n• 세무사 이메일 전송\n\n매월 1일 자동으로 전월 보고서가 생성됩니다.',
  },
  {
    id: 33, cat: 'contract',
    q: '영수증은 어떻게 첨부하나요?',
    a: '투자나 자금 대여를 받으셨다면, 상대방의 메시지 채팅창에서 "자료제출" 버튼을 통해 영수증을 제출할 수 있습니다.\n\n지원 형식: JPG, PNG, PDF (파일당 최대 10MB)\n제출된 자료는 증빙센터에 자동으로 분류·저장됩니다.',
  },

  // ── 보안·인증 ─────────────────────────────────
  {
    id: 40, cat: 'security',
    q: 'PIN 번호를 잊어버렸어요.',
    a: '더보기 → 보안/인증 관리 → "PIN 재설정"에서 새 PIN을 설정할 수 있습니다.\n\n본인 인증(휴대폰 인증 또는 등록된 생체인증)을 통해 재설정합니다. 5회 연속 오류 입력 시 계정이 일시 잠기며, 이 경우 고객센터(1588-0000)에 문의해주세요.',
  },
  {
    id: 41, cat: 'security',
    q: '다른 기기에서 로그인이 가능한가요?',
    a: '보안상 1개의 기기에서만 로그인할 수 있습니다.\n\n새 기기에서 로그인하면 기존 기기의 세션이 자동으로 종료됩니다. 의심스러운 기기 로그인이 감지되면 즉시 알림이 발송되며, 더보기 → 보안/인증 관리에서 기기 목록을 확인하고 원격 로그아웃할 수 있습니다.',
  },
  {
    id: 42, cat: 'security',
    q: 'Face ID(지문) 인증은 어떻게 설정하나요?',
    a: '더보기 → 보안/인증 관리 → 생체 인증에서 설정할 수 있습니다.\n\n기기에 등록된 Face ID 또는 지문과 연동되며, 앱 잠금 해제와 거래 승인에 사용됩니다. 생체 인증 실패 시 PIN 번호로 대체 인증이 가능합니다.',
  },
  {
    id: 43, cat: 'security',
    q: '계정이 해킹된 것 같아요. 어떻게 해야 하나요?',
    a: '즉시 다음 조치를 취해주세요:\n\n1. 더보기 → 보안/인증 관리 → 모든 기기 로그아웃\n2. PIN 번호 즉시 변경\n3. 고객센터(1588-0000)에 신고 — 계정 임시 동결 요청\n\n비정상 거래가 발생했다면 더보기 → 분쟁 신고를 통해 이의를 제기할 수 있습니다.',
  },

  // ── 기업계정 ─────────────────────────────────
  {
    id: 50, cat: 'biz',
    q: '관리자(구성원)를 추가하려면 어떻게 하나요?',
    a: '더보기 → 관리자 → 구성원 관리에서 이메일 초대를 통해 추가할 수 있습니다.\n\n권한은 4단계로 설정됩니다:\n• 열람자: 내역 조회만 가능\n• 집행자: 집행 신청 가능 (승인 필요)\n• 관리자: 집행 + 설정 변경 가능\n• 최고관리자: 모든 권한 + 구성원 관리\n\n초대받은 구성원은 이메일 링크로 가입 후 즉시 이용 가능합니다.',
  },
  {
    id: 51, cat: 'biz',
    q: '처리센터(승인 센터)란 무엇인가요?',
    a: '자금 집행, 카드 결제, 계약 체결 등 중요 거래에 대해 관리자의 사전 승인을 받는 결재 시스템입니다.\n\n• 금액 기준으로 승인 필요 조건 설정 (예: 100만 원 이상)\n• 1단계~N단계 결재 라인 구성\n• 승인 요청 → 검토 → 승인/반려 전 과정이 기록됨\n• 모바일 실시간 승인 가능',
  },
  {
    id: 52, cat: 'biz',
    q: '자동지급(정기결제) 기능은 무엇인가요?',
    a: '임대료, 급여, 구독료, 통신비, 보험료 등 매월 정기적으로 발생하는 비용을 자동 집행하는 기능입니다.\n\n지급일, 금액, 수령인을 한 번만 설정하면 이후 자동으로 처리됩니다. 실패 시 관리자에게 즉시 알림이 발송됩니다.',
  },
  {
    id: 53, cat: 'biz',
    q: '세무사 연동은 어떻게 하나요?',
    a: '더보기 → 세무사 연동에서 세무사 이메일을 등록하면, 매월 1일 자동으로 전월 자료가 발송됩니다.\n\n전송 자료: 거래 내역 Excel, 증빙 자료 ZIP, 카테고리별 요약 PDF\n\n연동 후에도 더보기 → 월간 보고서에서 직접 다운로드하거나 수동 발송이 가능합니다.',
  },
  {
    id: 54, cat: 'biz',
    q: '집행 통계는 어디서 볼 수 있나요?',
    a: '더보기 → 집행 통계에서 일별·주별·월별 자금 집행 현황을 분석할 수 있습니다.\n\n카테고리별 비율, 상위 지출 항목, 예산 대비 집행률, 전기 대비 증감 등 다양한 지표를 제공합니다. 데이터는 실시간으로 업데이트됩니다.',
  },

  // ── 메시지 ─────────────────────────────────
  {
    id: 60, cat: 'message',
    q: '메시지 채팅방은 어떻게 생성되나요?',
    a: '자금 집행 또는 계약 체결 시 상대방과의 채팅방이 자동으로 생성됩니다.\n\n채팅방에서 계약서 확인, 결제 내역 공유, 요청 발송, 개인 메모 작성이 가능합니다. 처리센터 알림도 별도 채팅방으로 전달됩니다.',
  },
  {
    id: 61, cat: 'message',
    q: '메모 기능은 어떻게 사용하나요?',
    a: '채팅방 하단의 "메모" 버튼으로 나만 볼 수 있는 메모를 작성할 수 있습니다.\n\n• 작성한 메모는 채팅창에 노란 카드로 표시 (상대방에게는 보이지 않음)\n• 거래와 연결된 메모는 🔗 태그로 표시\n• ... → 상세정보 → 메모 탭에서 전체 메모 목록 확인\n• 길게 누르면 삭제 가능',
  },
  {
    id: 62, cat: 'message',
    q: '증빙요청·상환요청은 어떻게 보내나요?',
    a: '채팅방 하단의 "요청하기" 버튼을 눌러 요청 유형을 선택하세요.\n\n• 증빙요청: 영수증·계약서 등 증빙 자료 요청\n• 상환요청: 대여금·선지급금 상환 요청 (기한 설정 가능)\n• 자료요청: 기타 문서 제출 요청\n\n최근 거래 내역을 선택하고 요청 내용을 작성하면 상대방에게 카드 형태로 발송됩니다.',
  },
  {
    id: 63, cat: 'message',
    q: '채팅에서 메시지를 삭제할 수 있나요?',
    a: '내가 보낸 메시지(미읽음 상태)와 내가 작성한 메모는 삭제할 수 있습니다.\n\n삭제하려면 메시지 말풍선을 길게 누르면 삭제 확인 다이얼로그가 표시됩니다. 삭제된 메시지는 복구할 수 없으며, 메모는 상세정보 탭에서도 함께 삭제됩니다.',
  },

  // ── 지갑·충전 ─────────────────────────────────
  {
    id: 70, cat: 'wallet',
    q: '주다페이 지갑이란 무엇인가요?',
    a: '주다페이 지갑은 전자금융거래법에 따른 선불전자지급수단입니다.\n\n연결된 본인 명의 은행 계좌에서 충전하여 사용하며, 지갑 잔액으로 자금 집행·송금·계약 결제 등을 처리할 수 있습니다. 잔액에는 이자가 발생하지 않습니다.',
  },
  {
    id: 71, cat: 'wallet',
    q: '충전 한도와 방법은 어떻게 되나요?',
    a: '기본 충전 한도:\n• 1회 최대 300만 원 / 일 500만 원 / 월 1,000만 원\n\nKYC 단계에 따라 한도가 확대됩니다.\n\n충전 방법:\n홈 화면 → 충전 버튼 → 연결 계좌 선택 → 금액 입력 → PIN 확인\n\n충전은 즉시 처리됩니다 (영업시간 외 일부 은행 지연 가능).',
  },
  {
    id: 72, cat: 'wallet',
    q: '환불(출금)은 어떻게 하나요?',
    a: '더보기 → 환불 신청 또는 지갑 화면 → 출금에서 신청할 수 있습니다.\n\n• 본인 명의 연결 계좌로만 출금 가능\n• 처리 기간: 영업일 기준 1~2일\n• 출금 수수료: 무료 (월 5회 이내)\n\n진행 중인 거래가 있는 경우 해당 금액은 출금이 제한됩니다.',
  },
  {
    id: 73, cat: 'wallet',
    q: '계좌는 몇 개까지 연결할 수 있나요?',
    a: '본인 명의 계좌를 최대 5개까지 연결할 수 있습니다.\n\n더보기 → 연결 계좌 관리에서 추가·삭제가 가능합니다. 주거래 계좌를 설정하면 충전·출금 시 기본 계좌로 사용됩니다. 지원 은행: 국민, 신한, 우리, 하나, 기업, 농협, 카카오뱅크, 토스뱅크 외 주요 은행 전체.',
  },

  // ── 오류해결 ─────────────────────────────────
  {
    id: 80, cat: 'error',
    q: '자금 집행이 실패했어요.',
    a: '주요 실패 원인과 해결 방법:\n\n• 잔액 부족: 홈 → 충전 후 재시도\n• KYC 미완료: 더보기 → 본인 인증 완료\n• 한도 초과: 다음 날 또는 고객센터 한도 상향 요청\n• 상대방 계좌 오류: 상대방에게 계좌 정보 재확인 요청\n• 처리센터 미승인: 관리자에게 승인 요청\n\n알림 → 처리센터에서 실패 사유를 상세히 확인할 수 있습니다.',
  },
  {
    id: 81, cat: 'error',
    q: '거래 내역이 보이지 않아요.',
    a: '거래 처리에는 최대 30분이 소요될 수 있습니다.\n\n• 홈 화면을 아래로 당겨 새로고침\n• 앱을 완전히 종료 후 재시작\n• 알림 탭에서 처리 상태 확인\n\n1시간 이상 지연된다면 거래 ID를 메모 후 고객센터(1588-0000)에 문의해주세요.',
  },
  {
    id: 82, cat: 'error',
    q: '앱이 자꾸 튕기거나 오류가 발생해요.',
    a: '아래 방법을 순서대로 시도해주세요:\n\n1. 앱을 완전히 종료 후 재시작\n2. 기기를 재부팅\n3. 앱 업데이트 확인 (앱스토어/구글플레이)\n4. 앱 삭제 후 재설치 (데이터는 서버에 보관됨)\n\n위 방법으로 해결되지 않으면 고객센터 또는 앱 내 1:1 문의를 이용해주세요.',
  },
  {
    id: 83, cat: 'error',
    q: '상대방이 수락을 안 해요.',
    a: '주다페이 가입 여부와 알림 설정을 확인해주세요.\n\n• 미가입 상대방: 가입 초대 링크 재발송\n• 알림 미수신: 앱 알림 설정 확인 요청\n• 장기 미수락(7일 초과): 거래 자동 취소 후 환급\n\n채팅방에서 직접 메시지를 보내 확인을 요청할 수 있습니다.',
  },
]

// ─────────────────────────────────────────────────────────
// 도움말 가이드 데이터
// ─────────────────────────────────────────────────────────
const GUIDES = [
  {
    id: 'g1',
    emoji: '🚀',
    title: '처음 시작하기',
    color: '#6366F1',
    bg: '#EEF2FF',
    steps: [
      { label: '1단계', text: '개인 또는 기업 계정으로 회원가입' },
      { label: '2단계', text: 'KYC 본인 인증 (신분증 + 계좌 연결)' },
      { label: '3단계', text: '6자리 PIN 번호 설정' },
      { label: '4단계', text: '지갑에 잔액 충전 후 첫 거래 시작' },
    ],
  },
  {
    id: 'g2',
    emoji: '💸',
    title: '자금 집행 흐름',
    color: '#059669',
    bg: '#ECFDF5',
    steps: [
      { label: '1단계', text: '자금 집행 → 거래 유형 선택 (외주비/급여/임대료 등)' },
      { label: '2단계', text: '수령인 선택 및 금액·조건 입력' },
      { label: '3단계', text: '계약서 확인 → 상대방 서명 (필요 시)' },
      { label: '4단계', text: 'PIN 인증 → 집행 완료 → 채팅방 자동 개설' },
    ],
  },
  {
    id: 'g3',
    emoji: '💳',
    title: '카드 결제 관리',
    color: '#D97706',
    bg: '#FFFBEB',
    steps: [
      { label: '알림 수신', text: '법인카드 결제 시 즉시 실시간 알림 수신' },
      { label: '내역 확인', text: '결제 내역에서 가맹점·금액·MCC 확인' },
      { label: '증빙 첨부', text: '영수증 사진 촬영 또는 파일 업로드' },
      { label: '목적 입력', text: '사용 목적 입력 후 처리 완료' },
    ],
  },
  {
    id: 'g4',
    emoji: '📋',
    title: '처리센터 승인 흐름',
    color: '#7C3AED',
    bg: '#F5F3FF',
    steps: [
      { label: '요청 접수', text: '집행자가 자금 집행 신청' },
      { label: '알림 발송', text: '결재라인 관리자에게 승인 요청 알림' },
      { label: '검토 · 승인', text: '관리자가 내용 확인 후 승인 또는 반려' },
      { label: '처리 완료', text: '승인 시 자동 집행 / 반려 시 사유 전달' },
    ],
  },
  {
    id: 'g5',
    emoji: '🔒',
    title: '보안 설정 가이드',
    color: '#DC2626',
    bg: '#FEF2F2',
    steps: [
      { label: 'PIN 설정', text: '6자리 PIN — 모든 거래 인증의 기본' },
      { label: '생체 인증', text: 'Face ID / 지문 연동으로 빠른 인증' },
      { label: '기기 관리', text: '등록 기기 목록 확인 및 원격 로그아웃' },
      { label: '알림 설정', text: '이상거래 즉시 알림 + 로그인 알림 활성화 권장' },
    ],
  },
  {
    id: 'g6',
    emoji: '📬',
    title: '메시지 & 요청 사용법',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    steps: [
      { label: '채팅방 진입', text: '메시지 탭 → 거래 상대 채팅방 선택' },
      { label: '요청하기', text: '하단 "요청하기" → 증빙·상환·자료 요청 선택' },
      { label: '메모 작성', text: '하단 "메모" → 나만 보이는 개인 메모 기록' },
      { label: '상세 확인', text: '우상단 ··· → 상세정보에서 계약·첨부·메모 통합 조회' },
    ],
  },
]

// ─────────────────────────────────────────────────────────
// 개인 데이터
// ─────────────────────────────────────────────────────────
const CATEGORIES_PERSONAL = [
  { key: 'all',        label: '전체',       icon: '🔍' },
  { key: 'start',      label: '시작하기',   icon: '🚀' },
  { key: 'execute',    label: '자금집행',   icon: '💸' },
  { key: 'lend',       label: '빌려주기',   icon: '🤝' },
  { key: 'realestate', label: '부동산',     icon: '🏠' },
  { key: 'invest',     label: '투자',       icon: '📈' },
  { key: 'security',   label: '보안·인증',  icon: '🔒' },
  { key: 'message',    label: '메시지',     icon: '💬' },
  { key: 'wallet',     label: '지갑·충전',  icon: '💰' },
  { key: 'error',      label: '오류해결',   icon: '⚠️' },
]

const FAQ_DATA_PERSONAL = [
  // ── 시작하기 ──────────────────────────────────────────
  {
    id: 1, cat: 'start',
    q: '주다페이 개인 계정은 어떤 서비스인가요?',
    a: '주다페이 개인 계정은 개인 간 안전한 자금 이동을 위한 서비스입니다.\n\n용돈·선물, 빌려주기(차용증 포함), 외주비 의뢰, 월세·관리비 자동이체, 투자금 집행까지 개인의 다양한 자금 흐름을 계약 기반으로 관리할 수 있습니다.\n\n모든 거래는 실시간 기록되고 증빙 자료와 함께 보관됩니다.',
  },
  {
    id: 2, cat: 'start',
    q: 'KYC 인증이란 무엇이며 왜 필요한가요?',
    a: 'KYC(Know Your Customer)는 본인 확인 절차로, 전자금융거래법에 따라 필수입니다.\n\n• 1단계: 기본 정보 입력\n• 2단계: 신분증 촬영 인증\n• 3단계: 본인 명의 계좌 연결 인증\n\nKYC 단계가 높을수록 거래 한도와 이용 가능한 기능이 확대됩니다.',
  },
  {
    id: 3, cat: 'start',
    q: '회원가입은 어떻게 하나요?',
    a: '시작 화면에서 "개인 계정"을 선택한 뒤 이름·연락처·이메일을 입력합니다.\n\n이후 KYC 인증(신분증 + 계좌 연결)을 완료하고 6자리 PIN을 설정하면 바로 이용할 수 있습니다.',
  },

  // ── 자금집행 ──────────────────────────────────────────
  {
    id: 10, cat: 'execute',
    q: '개인 자금 집행 유형에는 어떤 것이 있나요?',
    a: '주다페이 개인 계정에서 지원하는 자금 집행 유형입니다.\n\n• 용돈·선물: 가족·지인에게 용돈 또는 선물 금액 전달\n• 빌려주기: 차용증 기반 대여금 집행 및 상환 관리\n• 외주비: 프리랜서·외주 계약 기반 보수 지급\n• 부동산: 월세·관리비 자동이체 설정\n• 투자: 개인 간 투자금 집행 및 수익 정산',
  },
  {
    id: 11, cat: 'execute',
    q: '집행 금액 한도는 얼마인가요?',
    a: '개인 계정 기본 한도:\n• 1회 최대 500만 원 / 월 3,000만 원\n\nKYC 2단계 완료 시:\n• 1회 최대 1,000만 원 / 월 5,000만 원\n\n한도 상향이 필요하면 고객센터(1588-0000)로 문의해주세요.',
  },
  {
    id: 12, cat: 'execute',
    q: '자금 집행 후 취소할 수 있나요?',
    a: '현재 자금 집행 취소 기능은 준비 중입니다.\n\n집행 관련 문제가 발생했다면 더보기 → 분쟁 신고를 통해 문제를 제기하거나, 고객센터(1588-0000)로 문의해주세요.',
  },
  {
    id: 13, cat: 'execute',
    q: '경조사비(결혼·조문 등)는 어떻게 보내나요?',
    a: '자금 집행 → 용돈·선물 → 경조사비를 선택합니다.\n\n경조사 종류, 금액, 메모를 입력하면 상대방에게 전달됩니다. 수령 내역은 거래 목록에 기록됩니다.',
  },

  // ── 빌려주기 ──────────────────────────────────────────
  {
    id: 20, cat: 'lend',
    q: '빌려주기는 어떻게 사용하나요?',
    a: '자금 집행 → 빌려주기를 선택합니다.\n\n상대방, 금액, 상환 기한, 이자율(무이자 포함)을 입력하면 차용증이 자동 생성됩니다. 상대방이 PIN으로 서명하면 계약이 체결되고 자금이 이동됩니다.\n\n집행 통계 화면에서 전체 대여 현황(빌려준 금액·받은 상환·남은 상환)을 한눈에 확인할 수 있습니다.',
  },
  {
    id: 21, cat: 'lend',
    q: '차용증은 어떻게 확인하나요?',
    a: '메시지 채팅방 → 상단 상세정보(···)에서 체결된 차용증을 언제든 열람할 수 있습니다.\n\n차용증에는 대여 금액, 상환 기한, 이자율, 양측 서명이 포함됩니다. PDF로 저장하거나 공유하는 것도 가능합니다.',
  },
  {
    id: 22, cat: 'lend',
    q: '상환 요청은 어떻게 보내나요?',
    a: '채팅방 하단 "요청하기" → 상환 요청을 선택하면 상대방에게 상환 요청 카드가 발송됩니다.\n\n상환 기한을 함께 지정할 수 있으며, 요청 내역은 채팅방에 기록됩니다. 상대방이 상환하면 거래 내역에 자동으로 반영됩니다.',
  },
  {
    id: 23, cat: 'lend',
    q: '나도 누군가에게 빌린 돈이 있으면 어떻게 관리하나요?',
    a: '집행 통계 화면에서 "빌린 내역" 섹션에서 총 받은 금액·갚은 금액·남은 상환 금액을 확인할 수 있습니다.\n\n상대방의 채팅방에서 상환 요청을 받으면 알림이 발송되고, 채팅방 내에서 바로 자금을 집행해 갚을 수 있습니다.',
  },

  // ── 부동산 ──────────────────────────────────────────
  {
    id: 30, cat: 'realestate',
    q: '월세 자동이체를 설정하려면 어떻게 하나요?',
    a: '자금 집행 → 부동산 → 월세를 선택합니다.\n\n임대인 정보, 금액, 이체일(매월 며칠)을 입력하면 이후 매월 자동으로 지급됩니다. 집행 전날 확인 알림이 발송되며, 실패 시 즉시 알림을 받을 수 있습니다.',
  },
  {
    id: 31, cat: 'realestate',
    q: '관리비는 월세와 별도로 처리해야 하나요?',
    a: '자금 집행 → 부동산 → 관리비로 별도 집행하거나, 월세와 함께 묶어서 지급할 수도 있습니다.\n\n각 항목이 개별 거래 내역으로 기록되어 집행 통계(부동산 카테고리)에서 정확히 분류됩니다.',
  },
  {
    id: 32, cat: 'realestate',
    q: '전세 보증금 반환은 어떻게 처리하나요?',
    a: '현재 전세 보증금 반환 전용 기능은 준비 중입니다.\n\n임시로 자금 집행 → 빌려주기를 활용하면 보증금 계약 내용과 반환 조건을 차용증 형태로 기록할 수 있습니다.',
  },

  // ── 투자 ──────────────────────────────────────────
  {
    id: 40, cat: 'invest',
    q: '개인 투자금은 어떻게 집행하나요?',
    a: '자금 집행 → 투자를 선택합니다.\n\n투자 대상, 금액, 수익 분배 조건을 입력하면 계약서가 자동 생성됩니다. 상대방이 서명하면 계약이 체결되고 자금이 이동됩니다.\n\n집행 통계 → 투자 항목에서 현재 보유 중인 투자 내역과 평가 현황을 확인할 수 있습니다.',
  },
  {
    id: 41, cat: 'invest',
    q: '투자금 회수(반환)는 어떻게 처리되나요?',
    a: '채팅방에서 "요청하기" → 상환 요청을 통해 투자금 반환을 요청합니다.\n\n반환이 이루어지면 거래 내역에 자동으로 기록되며, 집행 통계의 투자 항목에 반영됩니다.',
  },

  // ── 보안·인증 ─────────────────────────────────
  {
    id: 50, cat: 'security',
    q: 'PIN 번호를 잊어버렸어요.',
    a: '더보기 → 보안/인증 관리 → "PIN 재설정"에서 새 PIN을 설정할 수 있습니다.\n\n본인 인증(휴대폰 또는 생체인증)을 통해 재설정합니다. 5회 연속 오류 시 계정이 일시 잠기며, 이 경우 고객센터(1588-0000)에 문의해주세요.',
  },
  {
    id: 51, cat: 'security',
    q: '다른 기기에서 로그인이 가능한가요?',
    a: '보안상 1개의 기기에서만 로그인할 수 있습니다.\n\n새 기기에서 로그인하면 기존 기기의 세션이 자동 종료됩니다. 의심스러운 로그인이 감지되면 즉시 알림이 발송되며, 더보기 → 보안/인증 관리에서 기기를 원격 로그아웃할 수 있습니다.',
  },
  {
    id: 52, cat: 'security',
    q: 'Face ID(지문) 인증은 어떻게 설정하나요?',
    a: '더보기 → 보안/인증 관리 → 생체 인증에서 설정할 수 있습니다.\n\n기기에 등록된 Face ID 또는 지문과 연동되며, 앱 잠금 해제와 거래 승인에 사용됩니다.',
  },

  // ── 메시지 ──────────────────────────────────────────
  {
    id: 60, cat: 'message',
    q: '메시지 채팅방은 어떻게 생성되나요?',
    a: '자금 집행 또는 계약 체결 시 상대방과의 채팅방이 자동으로 생성됩니다.\n\n채팅방에서 계약서 확인, 요청 발송, 개인 메모 작성이 가능합니다.',
  },
  {
    id: 61, cat: 'message',
    q: '소명 요청이란 무엇인가요?',
    a: '거래와 관련해 상대방에게 설명·증빙을 요청하는 기능입니다.\n\n결제 내역 화면에서 "소명요청" 버튼을 누르면 메시지 채팅방으로 이동하며, "해당 내역 소명 부탁드립니다." 메시지가 자동으로 발송됩니다.',
  },
  {
    id: 62, cat: 'message',
    q: '상환 요청·자료 요청은 어떻게 보내나요?',
    a: '채팅방 하단 "요청하기" 버튼을 눌러 요청 유형을 선택하세요.\n\n• 상환요청: 대여금·투자금 반환 요청 (기한 설정 가능)\n• 자료요청: 계약서·영수증 등 문서 제출 요청\n\n요청 내용을 작성하면 상대방에게 카드 형태로 발송됩니다.',
  },
  {
    id: 63, cat: 'message',
    q: '메모 기능은 어떻게 사용하나요?',
    a: '채팅방 하단 "메모" 버튼으로 나만 볼 수 있는 메모를 작성할 수 있습니다.\n\n• 작성한 메모는 채팅창에 노란 카드로 표시 (상대방에게는 보이지 않음)\n• 상세정보 탭에서 전체 메모 목록 확인 가능\n• 길게 누르면 삭제 가능',
  },

  // ── 지갑·충전 ─────────────────────────────────
  {
    id: 70, cat: 'wallet',
    q: '주다페이 지갑이란 무엇인가요?',
    a: '주다페이 지갑은 전자금융거래법에 따른 선불전자지급수단입니다.\n\n연결된 본인 명의 은행 계좌에서 충전하여 사용하며, 지갑 잔액으로 자금 집행·송금 등을 처리할 수 있습니다. 잔액에는 이자가 발생하지 않습니다.',
  },
  {
    id: 71, cat: 'wallet',
    q: '충전 한도와 방법은 어떻게 되나요?',
    a: '기본 충전 한도:\n• 1회 최대 300만 원 / 일 500만 원 / 월 1,000만 원\n\nKYC 단계에 따라 한도가 확대됩니다.\n\n충전 방법:\n홈 화면 → 충전 버튼 → 연결 계좌 선택 → 금액 입력 → PIN 확인',
  },
  {
    id: 72, cat: 'wallet',
    q: '출금(환불)은 어떻게 하나요?',
    a: '더보기 → 환불 신청 또는 지갑 화면 → 출금에서 신청할 수 있습니다.\n\n• 본인 명의 연결 계좌로만 출금 가능\n• 처리 기간: 영업일 기준 1~2일\n• 출금 수수료: 무료 (월 5회 이내)\n\n진행 중인 거래가 있는 경우 해당 금액은 출금이 제한됩니다.',
  },

  // ── 오류해결 ──────────────────────────────────────────
  {
    id: 80, cat: 'error',
    q: '자금 집행이 실패했어요.',
    a: '주요 실패 원인과 해결 방법:\n\n• 잔액 부족: 홈 → 충전 후 재시도\n• KYC 미완료: 더보기 → 본인 인증 완료\n• 한도 초과: 다음 날 또는 고객센터 한도 상향 요청\n• 상대방 정보 오류: 상대방에게 계정 확인 요청',
  },
  {
    id: 81, cat: 'error',
    q: '거래 내역이 보이지 않아요.',
    a: '거래 처리에는 최대 30분이 소요될 수 있습니다.\n\n• 홈 화면을 아래로 당겨 새로고침\n• 앱을 완전히 종료 후 재시작\n\n1시간 이상 지연된다면 고객센터(1588-0000)에 문의해주세요.',
  },
  {
    id: 82, cat: 'error',
    q: '앱이 자꾸 튕기거나 오류가 발생해요.',
    a: '아래 방법을 순서대로 시도해주세요:\n\n1. 앱을 완전히 종료 후 재시작\n2. 기기를 재부팅\n3. 앱 업데이트 확인 (앱스토어/구글플레이)\n4. 앱 삭제 후 재설치 (데이터는 서버에 보관됨)',
  },
]

const GUIDES_PERSONAL = [
  {
    id: 'g1',
    emoji: '🚀',
    title: '처음 시작하기',
    color: '#6366F1',
    bg: '#EEF2FF',
    steps: [
      { label: '1단계', text: '개인 계정으로 회원가입' },
      { label: '2단계', text: 'KYC 본인 인증 (신분증 + 계좌 연결)' },
      { label: '3단계', text: '6자리 PIN 번호 설정' },
      { label: '4단계', text: '지갑에 잔액 충전 후 첫 거래 시작' },
    ],
  },
  {
    id: 'g2',
    emoji: '💸',
    title: '자금 집행 흐름',
    color: '#059669',
    bg: '#ECFDF5',
    steps: [
      { label: '1단계', text: '자금 집행 → 유형 선택 (용돈·선물 / 빌려주기 / 외주비 / 부동산 / 투자)' },
      { label: '2단계', text: '상대방 선택 및 금액·조건 입력' },
      { label: '3단계', text: '계약서 확인 → 상대방 서명 (필요 시)' },
      { label: '4단계', text: 'PIN 인증 → 집행 완료 → 채팅방 자동 개설' },
    ],
  },
  {
    id: 'g3',
    emoji: '🤝',
    title: '빌려주기 & 상환 관리',
    color: '#7C3AED',
    bg: '#F5F3FF',
    steps: [
      { label: '집행', text: '자금 집행 → 빌려주기 → 상환 기한·이자율 설정' },
      { label: '차용증', text: '자동 생성된 차용증 확인 → 상대방 PIN 서명으로 체결' },
      { label: '상환 요청', text: '채팅방 → 요청하기 → 상환 요청 발송' },
      { label: '현황 확인', text: '집행 통계 → 빌려준 내역에서 상환 진행 상황 모니터링' },
    ],
  },
  {
    id: 'g4',
    emoji: '🏠',
    title: '부동산 자동이체 설정',
    color: '#10B981',
    bg: '#ECFDF5',
    steps: [
      { label: '설정', text: '자금 집행 → 부동산 → 월세 선택' },
      { label: '정보 입력', text: '임대인 정보, 금액, 이체일 입력' },
      { label: '자동 집행', text: '매월 설정일에 자동으로 지급 처리' },
      { label: '알림 수신', text: '집행 전날 확인 알림 + 실패 시 즉시 알림' },
    ],
  },
  {
    id: 'g5',
    emoji: '📬',
    title: '메시지 & 요청 사용법',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    steps: [
      { label: '채팅방 진입', text: '메시지 탭 → 거래 상대 채팅방 선택' },
      { label: '요청하기', text: '하단 "요청하기" → 상환·자료 요청 선택' },
      { label: '메모 작성', text: '하단 "메모" → 나만 보이는 개인 메모 기록' },
      { label: '상세 확인', text: '우상단 ··· → 상세정보에서 계약·첨부·메모 통합 조회' },
    ],
  },
  {
    id: 'g6',
    emoji: '🔒',
    title: '보안 설정 가이드',
    color: '#DC2626',
    bg: '#FEF2F2',
    steps: [
      { label: 'PIN 설정', text: '6자리 PIN — 모든 거래 인증의 기본' },
      { label: '생체 인증', text: 'Face ID / 지문 연동으로 빠른 인증' },
      { label: '기기 관리', text: '등록 기기 목록 확인 및 원격 로그아웃' },
      { label: '알림 설정', text: '이상거래 즉시 알림 + 로그인 알림 활성화 권장' },
    ],
  },
]

// ─────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────
function FaqItem({ item, isOpen, onToggle }) {
  const answerLines = item.a.split('\n')
  return (
    <div style={{
      background: '#fff',
      borderRadius: RADIUS.lg,
      boxShadow: SHADOWS.card,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '15px 16px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
        <span style={{
          width: '22px', height: '22px', borderRadius: '7px',
          background: '#EFF6FF', color: '#1D4ED8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 800, flexShrink: 0, marginTop: '1px',
        }}>Q</span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: COLORS.t1, lineHeight: 1.5 }}>
          {item.q}
        </span>
        <span style={{
          fontSize: '18px', color: COLORS.t4, flexShrink: 0, marginTop: '1px',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>›</span>
      </button>

      {isOpen && (
        <div style={{
          padding: '0 16px 16px 48px',
          borderTop: `1px solid ${COLORS.borderSoft}`,
          paddingTop: '12px',
        }}>
          {answerLines.map((line, i) => {
            if (line === '') return <div key={i} style={{ height: '6px' }} />
            const isBullet = line.startsWith('•')
            const isStep   = /^[0-9]+단계/.test(line) || /^[0-9]+\. /.test(line)
            return (
              <div key={i} style={{
                fontSize: '12px',
                color: isBullet ? COLORS.t2 : isStep ? '#1D4ED8' : COLORS.t2,
                lineHeight: 1.65,
                marginBottom: isBullet || isStep ? '3px' : 0,
                fontWeight: isStep ? 600 : 400,
                paddingLeft: isBullet ? '4px' : 0,
              }}>
                {line}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GuideCard({ guide }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      background: '#fff',
      borderRadius: RADIUS.lg,
      boxShadow: SHADOWS.card,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '11px',
          background: guide.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>
          {guide.emoji}
        </div>
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: COLORS.t1 }}>
          {guide.title}
        </span>
        <span style={{
          fontSize: '18px', color: COLORS.t4,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${COLORS.borderSoft}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {guide.steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                paddingTop: '12px',
              }}>
                <div style={{
                  width: '56px', flexShrink: 0,
                  padding: '2px 6px', borderRadius: '6px',
                  background: guide.bg, color: guide.color,
                  fontSize: '10px', fontWeight: 700, textAlign: 'center',
                }}>
                  {step.label}
                </div>
                <span style={{ fontSize: '12px', color: COLORS.t2, lineHeight: 1.6, flex: 1 }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────────────────
export default function HelpFaq() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const { userType } = useUser()
  const scrollRef = useScrollRestore()
  const isPersonal = userType === 'personal'

  // 유저 타입에 따라 데이터 선택
  const categories = isPersonal ? CATEGORIES_PERSONAL : CATEGORIES
  const faqData    = isPersonal ? FAQ_DATA_PERSONAL   : FAQ_DATA
  const guides     = isPersonal ? GUIDES_PERSONAL     : GUIDES

  const [tab, setTab] = useState('faq')
  const [searchText, setSearchText] = useState('')
  const [openFaq, setOpenFaq] = useState(null)
  const [catFilter, setCatFilter] = useState('all')

  const toggleFaq = (id) => setOpenFaq(prev => prev === id ? null : id)

  // 필터링
  const filtered = faqData.filter(item => {
    const matchCat = catFilter === 'all' || item.cat === catFilter
    const keyword = searchText.trim().toLowerCase()
    const matchSearch = !keyword || item.q.toLowerCase().includes(keyword) || item.a.toLowerCase().includes(keyword)
    return matchCat && matchSearch
  })

  const hasResults = filtered.length > 0

  return (
    <PhoneShell>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* 헤더 */}
        <div style={{ background: theme.headerSolid, flexShrink: 0, paddingTop:'max(20px, env(safe-area-inset-top))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 16px 14px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'rgba(255,255,255,0.85)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                도움말 / FAQ
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', padding: '0 16px', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            {[
              { key: 'faq',   label: '자주 묻는 질문' },
              { key: 'guide', label: '기능 가이드' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.55)',
                  borderBottom: tab === t.key ? '2px solid #fff' : '2px solid transparent',
                  marginBottom: '-1px',
                  transition: 'all 0.15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: COLORS.bgMuted }}>

          {tab === 'faq' && (
            <div>
              {/* 검색 */}
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fff', borderRadius: RADIUS.lg,
                  padding: '10px 14px',
                  boxShadow: SHADOWS.card,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setCatFilter('all') }}
                    placeholder="질문을 검색하세요"
                    style={{
                      flex: 1, border: 'none', outline: 'none', background: 'none',
                      fontSize: '13px', color: COLORS.t1, fontFamily: 'inherit',
                    }}
                  />
                  {searchText && (
                    <button onClick={() => setSearchText('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: COLORS.t4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* 카테고리 칩 */}
              {!searchText && (
                <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {categories.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setCatFilter(cat.key)}
                      style={{
                        padding: '6px 12px', borderRadius: RADIUS.pill,
                        background: catFilter === cat.key ? theme.brandDark : '#fff',
                        color: catFilter === cat.key ? '#fff' : COLORS.t2,
                        border: `1px solid ${catFilter === cat.key ? theme.brandDark : COLORS.borderSoft}`,
                        fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        whiteSpace: 'nowrap', flexShrink: 0,
                        boxShadow: catFilter === cat.key ? theme.activeShadow : 'none',
                        transition: 'all 0.15s',
                      }}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              )}

              {/* FAQ 목록 */}
              <div style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchText && (
                  <div style={{ fontSize: '11px', color: COLORS.t4, padding: '4px 2px', marginBottom: '2px' }}>
                    "{searchText}" 검색 결과 {filtered.length}건
                  </div>
                )}

                {hasResults ? filtered.map(item => (
                  <FaqItem
                    key={item.id}
                    item={item}
                    isOpen={openFaq === item.id}
                    onToggle={() => toggleFaq(item.id)}
                  />
                )) : (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: COLORS.t4, fontSize: '13px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>검색 결과가 없어요</div>
                    <div style={{ fontSize: '12px', color: COLORS.t5 }}>다른 키워드로 검색하거나<br />고객센터로 문의해주세요</div>
                  </div>
                )}

                {/* 고객센터 배너 */}
                <div style={{
                  marginTop: '8px',
                  background: 'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)',
                  borderRadius: RADIUS.lg,
                  padding: '16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '11px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '20px',
                  }}>📞</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                      원하는 답변을 못 찾으셨나요?
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                      고객센터 1588-0000 · 평일 09:00 ~ 18:00
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>›</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'guide' && (
            <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: COLORS.t4, padding: '2px 2px 6px', fontWeight: 500 }}>
                주다페이 주요 기능을 단계별로 안내합니다
              </div>
              {guides.map(guide => (
                <GuideCard key={guide.id} guide={guide} />
              ))}

              {/* 앱 버전 정보 */}
              <div style={{
                marginTop: '8px',
                background: '#fff',
                borderRadius: RADIUS.lg,
                padding: '16px',
                boxShadow: SHADOWS.card,
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.t2, marginBottom: '10px' }}>앱 정보</div>
                {[
                  { label: '버전', value: 'v1.0.0' },
                  { label: '업데이트', value: '2025.05.13' },
                  { label: '서비스 유형', value: '선불전자지급수단 발행업' },
                  { label: '금감원 허가', value: '제2024-핀테크-0001호' },
                  { label: '고객센터', value: '1588-0000' },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                  }}>
                    <span style={{ fontSize: '12px', color: COLORS.t4 }}>{row.label}</span>
                    <span style={{ fontSize: '12px', color: COLORS.t2, fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </PhoneShell>
  )
}
