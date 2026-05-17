import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { getLang } from '../design/i18n'

// ─── 다국어 ──────────────────────────────────────────────
const S = {
  overview:     { ko: '개요',       en: 'Overview' },
  mccSetting:   { ko: 'MCC 설정',   en: 'MCC' },
  execLog:      { ko: '집행 로그',  en: 'Log' },
  evidence:     { ko: '증빙 센터',  en: 'Evidence' },
  report:       { ko: '보고서',     en: 'Report' },
  riskScore:    { ko: '리스크 스코어', en: 'Risk Score' },
  insight:      { ko: 'AI 인사이트', en: 'AI Insight' },
  nextExec:     { ko: '다음 예정',  en: 'Next Expected' },
  totalExec:    { ko: '총 집행액',  en: 'Total Executed' },
  avgAmount:    { ko: '건당 평균',  en: 'Avg/Txn' },
  thisMonth:    { ko: '이번 달',    en: 'This Month' },
  allowed:      { ko: '허용',       en: 'Allowed' },
  blocked:      { ko: '차단',       en: 'Blocked' },
  alwaysBlocked:{ ko: '항상 차단',  en: 'Always Blocked' },
  liveApply:    { ko: '즉시 적용',  en: 'Apply Now' },
  applied:      { ko: '적용 완료',  en: 'Applied' },
  changeHistory:{ ko: '변경 이력',  en: 'Change History' },
  evidenceRate: { ko: '증빙 완료율', en: 'Evidence Rate' },
  missing:      { ko: '누락',       en: 'Missing' },
  upload:       { ko: '업로드',     en: 'Upload' },
  genReport:    { ko: '보고서 생성', en: 'Generate Report' },
  shareLink:    { ko: '공유 링크',  en: 'Share Link' },
  taxCategory:  { ko: '세무 분류',  en: 'Tax Category' },
  justifyReq:   { ko: '소명요청',   en: 'Request Justify' },
  done:         { ko: '완료',       en: 'Done' },
  pending:      { ko: '진행중',     en: 'Pending' },
  warning:      { ko: '주의',       en: 'Warning' },
  risk:         { ko: '위험',       en: 'Risk' },
  normal:       { ko: '정상',       en: 'Normal' },
}
const t = (key, lang) => S[key]?.[lang] || S[key]?.ko || key

// ─── 데이터 ──────────────────────────────────────────────
const RECIPIENTS_DATA = {
  aurora: {
    id: 'aurora', name: '㈜오로라', entityType: 'business', bizNo: '123-45-67890',
    type: '외주비', typeKey: 'freelance',
    totalAmount: 3200000, count: 8, avg: 400000, trend: 15,
    riskScore: 12, riskLevel: 'normal',
    thisMonth: { exec: 800000, count: 2 },
    monthly: [520000, 400000, 680000, 400000, 800000, 400000],
    mccAllowed: ['design', 'it', 'edu'],
    mccBlocked: ['luxury', 'gambling', 'adult', 'crypto'],
    lastExec: '2026.05.06', nextExpected: '2026.06.01',
    insight: '최근 3개월 집행액 상승 추세. 5월 계약 갱신 예정으로 6월 집행액 증가 예상. 현재까지 이상 결제 없음.',
    warning: null,
    execLogs: [
      { id: 'e1', date: '2026.05.06', time: '14:22', merchant: '어도비 코리아', amount: 340000, category: '구독료', status: 'done', evidence: true, justify: 'none' },
      { id: 'e2', date: '2026.05.02', time: '10:15', merchant: '피그마 구독', amount: 60000, category: '구독료', status: 'done', evidence: true, justify: 'none' },
      { id: 'e3', date: '2026.04.22', time: '09:30', merchant: '강남 룸살롱', amount: 89000, category: null, status: 'risk', evidence: false, justify: 'requested' },
      { id: 'e4', date: '2026.04.15', time: '16:00', merchant: '무신사 스토어', amount: 155000, category: null, status: 'warning', evidence: false, justify: 'none' },
      { id: 'e5', date: '2026.04.08', time: '11:20', merchant: 'AWS 코리아', amount: 280000, category: '외주비/프리랜서', status: 'done', evidence: true, justify: 'none' },
      { id: 'e6', date: '2026.03.20', time: '21:45', merchant: '강남 카지노', amount: 230000, category: null, status: 'blocked', evidence: false, justify: 'none' },
    ],
    evidenceList: [
      { id: 'ev1', name: '어도비 영수증 05.06', date: '2026.05.06', type: 'receipt', auto: true },
      { id: 'ev2', name: '피그마 영수증 05.02', date: '2026.05.02', type: 'receipt', auto: true },
      { id: 'ev3', name: 'AWS 영수증 04.08',    date: '2026.04.08', type: 'receipt', auto: true },
      { id: 'ev4', name: '계약서 2026 v2',       date: '2026.04.01', type: 'contract', auto: false },
    ],
    mccChangeHistory: [
      { date: '2026.04.20', action: 'IT/소프트웨어 허용 추가', by: '관리자' },
      { date: '2026.03.15', action: '패션/쇼핑 허용 제거',     by: '마스터' },
    ],
    reports: [
      { month: '2026년 4월', status: 'done',    taxCategory: '외주비/지급수수료', amount: 1200000 },
      { month: '2026년 3월', status: 'done',    taxCategory: '외주비/지급수수료', amount: 980000 },
      { month: '2026년 2월', status: 'pending', taxCategory: '외주비/지급수수료', amount: 650000 },
    ],
  },
  park: {
    id: 'park', name: '박민준', entityType: 'personal', phone: '010-****-5678',
    type: '빌려주기', typeKey: 'lend',
    totalAmount: 1800000, count: 2, avg: 900000, trend: -8,
    riskScore: 35, riskLevel: 'warning',
    thisMonth: { exec: 0, count: 0 },
    monthly: [0, 900000, 0, 0, 900000, 0],
    mccAllowed: [], mccBlocked: [],
    lastExec: '2026.04.15', nextExpected: '2026.07.15 (상환 예정)',
    insight: '차용증 기반 대출. 상환 기한 D-91. 연체 이력 없음. 단, 카지노 결제 감지로 리스크 상향.',
    warning: '빌려주기 금액 상환 기한 접근 중. 회수 여부를 사전 확인하세요.',
    execLogs: [
      { id: 'e1', date: '2026.04.15', time: '11:00', merchant: '박민준 계좌이체', amount: 900000, mcc: '개인송금', status: 'done', evidence: true, justify: 'none' },
      { id: 'e2', date: '2026.01.10', time: '14:30', merchant: '박민준 계좌이체', amount: 900000, mcc: '개인송금', status: 'done', evidence: true, justify: 'none' },
    ],
    evidenceList: [
      { id: 'ev1', name: '금전소비대차 계약서', date: '2026.01.10', type: 'contract', auto: false },
      { id: 'ev2', name: '이체 확인증 04.15',   date: '2026.04.15', type: 'receipt', auto: true },
    ],
    mccChangeHistory: [],
    reports: [],
  },
}

const MCC_MASTER = [
  { id: 'design',    ko: '디자인/크리에이티브', en: 'Design',     group: 'business', defaultBlocked: false },
  { id: 'it',        ko: 'IT/소프트웨어',        en: 'IT/Software',group: 'business', defaultBlocked: false },
  { id: 'edu',       ko: '교육/학습',             en: 'Education',  group: 'living',   defaultBlocked: false },
  { id: 'food',      ko: '식비/외식',             en: 'Dining',     group: 'living',   defaultBlocked: false },
  { id: 'transport', ko: '교통/이동',             en: 'Transport',  group: 'living',   defaultBlocked: false },
  { id: 'medical',   ko: '의료/건강',             en: 'Medical',    group: 'living',   defaultBlocked: false },
  { id: 'fashion',   ko: '패션/쇼핑',             en: 'Fashion',    group: 'living',   defaultBlocked: false },
  { id: 'welfare',   ko: '복지/지원사업',          en: 'Welfare',    group: 'business', defaultBlocked: false },
  { id: 'luxury',    ko: '명품/사치품',            en: 'Luxury',     group: 'blocked',  defaultBlocked: true },
  { id: 'gambling',  ko: '도박',                  en: 'Gambling',   group: 'blocked',  defaultBlocked: true },
  { id: 'adult',     ko: '유흥/오락',              en: 'Adult',      group: 'blocked',  defaultBlocked: true },
  { id: 'crypto',    ko: '가상화폐',              en: 'Crypto',     group: 'blocked',  defaultBlocked: true },
]

// ─── 다크 팔레트 ─────────────────────────────────────────
const DK = {
  bg:      '#0D1017',
  card:    '#161B25',
  border:  'rgba(212,163,68,0.18)',
  inner:   'rgba(255,255,255,0.05)',
  muted:   'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.07)',
  shadow:  '0 4px 20px rgba(0,0,0,0.45)',
  t1:      '#F2F2F2',
  t2:      'rgba(242,242,242,0.65)',
  t3:      'rgba(242,242,242,0.45)',
  t4:      'rgba(242,242,242,0.3)',
  gold:    '#F4C542',
  goldDim: 'rgba(244,197,66,0.15)',
  green:   '#34D399',
  greenDim:'rgba(52,211,153,0.18)',
  blue:    '#60A5FA',
  blueDim: 'rgba(96,165,250,0.18)',
  red:     '#F87171',
  redDim:  'rgba(248,113,113,0.18)',
  amber:   '#FBBF24',
  amberDim:'rgba(251,191,36,0.18)',
  purple:  '#A78BFA',
  purpleDim:'rgba(167,139,250,0.18)',
}

// ─── 유틸 컴포넌트 ────────────────────────────────────────
function EntityBadge({ type, lang }) {
  const cfg = {
    business:   { ko: '법인',   en: 'Corp',    bg: DK.blueDim,   color: DK.blue   },
    personal:   { ko: '개인',   en: 'Personal',bg: DK.purpleDim, color: DK.purple },
    government: { ko: '기관',   en: 'Gov',     bg: DK.greenDim,  color: DK.green  },
  }[type] || {}
  return (
    <span style={{ padding: '2px 8px', borderRadius: '8px', background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: 700 }}>
      {cfg[lang] || cfg.ko}
    </span>
  )
}

function RiskBadge({ level, lang }) {
  const cfg = {
    normal:  { bg: DK.greenDim,  color: DK.green  },
    warning: { bg: DK.amberDim,  color: DK.amber  },
    risk:    { bg: DK.redDim,    color: DK.red    },
  }[level] || {}
  return (
    <span style={{ padding: '2px 8px', borderRadius: '8px', background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: 700 }}>
      {t(level, lang)}
    </span>
  )
}

function StatusBadge({ status, lang }) {
  const cfg = {
    done:      { bg: DK.greenDim,  color: DK.green  },
    pending:   { bg: DK.blueDim,   color: DK.blue   },
    warning:   { bg: DK.amberDim,  color: DK.amber  },
    risk:      { bg: DK.redDim,    color: DK.red    },
    requested: { bg: DK.amberDim,  color: DK.amber  },
    blocked:   { bg: DK.redDim,    color: DK.red    },
  }[status] || { bg: DK.muted, color: DK.t3 }
  const label = { done: t('done',lang), pending: t('pending',lang), warning: t('warning',lang), risk: t('risk',lang), requested: '소명요청중', blocked: '차단됨' }[status] || status
  return (
    <span style={{ padding: '2px 7px', borderRadius: '8px', background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
      {label}
    </span>
  )
}

// ─── 탭: 개요 ────────────────────────────────────────────
function OverviewTab({ r, lang, theme }) {

  const YEAR_GOALS = ['계약 갱신 안정화', '신규 서비스 연동', '비용 최적화 10%', '증빙 자동화 100%']
  const Q_GOALS    = ['AWS 인프라 재계약', '피그마 팀 플랜 전환', '외주 정산 자동화', '비용 감사 완료']
  const NEXT_PLANS = ['계약 갱신 협의 완료', '어도비 구독 업그레이드 검토', '신규 외주 업체 온보딩', '분기 정산 보고서 제출']
  const STABILITY  = [
    '최근 90일 정상 운영 유지',
    '최근 3개월 외주 정산 지연 없음',
    '증빙 자동수집 정상 작동 중',
    '이상 결제 MCC 자동 차단 작동',
    '운영 중단 기록 없음',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ① 대표 메시지 */}
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: DK.t1, marginBottom: '12px' }}>💬 대표 메시지</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#78350F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {r.name[1]}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: DK.t1 }}>{r.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: DK.green }} />
              <span style={{ fontSize: '11px', color: DK.green, fontWeight: 600 }}>정상 운영 중 · {r.lastExec}</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: DK.t2, lineHeight: 1.8, whiteSpace: 'pre-line', padding: '12px', background: DK.inner, borderRadius: '12px' }}>
          {'이번 달은 외주 계약 갱신 및 구독 서비스 최적화에 집중하고 있습니다.\n\n피그마 팀 플랜 전환과 AWS 인프라 재계약을 준비 중입니다.\n\n자동 정산 시스템 연동 개발을 병행하고 있습니다.'}
        </div>
      </div>

      {/* ② 연간 목표 / 분기 목표 */}
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: DK.t1, marginBottom: '12px' }}>🎯 연간 목표 / 분기 목표</div>

        <div style={{ fontSize: '11px', fontWeight: 700, color: DK.t4, marginBottom: '8px', letterSpacing: '0.5px' }}>2026년 연간 목표</div>
        {YEAR_GOALS.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: i < YEAR_GOALS.length - 1 ? `1px solid ${DK.divider}` : 'none' }}>
            <span style={{ color: DK.gold, fontWeight: 700, flexShrink: 0, fontSize: '12px' }}>{i + 1}.</span>
            <span style={{ fontSize: '12px', color: DK.t2 }}>{g}</span>
          </div>
        ))}

        <div style={{ height: '1px', background: DK.divider, margin: '12px 0' }} />

        <div style={{ fontSize: '11px', fontWeight: 700, color: DK.t4, marginBottom: '8px', letterSpacing: '0.5px' }}>Q2 분기 목표</div>
        {Q_GOALS.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: i < Q_GOALS.length - 1 ? `1px solid ${DK.divider}` : 'none' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `1.5px solid ${DK.divider}`, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: DK.t2 }}>{g}</span>
          </div>
        ))}
      </div>

      {/* ③ 운영 안정성 현황 */}
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: DK.t1, marginBottom: '12px' }}>🛡️ 운영 안정성 현황</div>
        {STABILITY.map((txt, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${DK.divider}` : 'none', alignItems: 'center' }}>
            <span style={{ color: DK.green, fontWeight: 700, flexShrink: 0, fontSize: '14px' }}>✅</span>
            <span style={{ fontSize: '12px', color: DK.t1 }}>{txt}</span>
          </div>
        ))}
      </div>

      {/* ④ 다음 달 계획 */}
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: DK.t1, marginBottom: '12px' }}>🚀 다음 달 계획</div>
        {NEXT_PLANS.map((txt, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${DK.divider}` : 'none' }}>
            <span style={{ color: DK.gold, fontWeight: 700, flexShrink: 0, fontSize: '12px' }}>{i + 1}.</span>
            <span style={{ fontSize: '12px', color: DK.t2 }}>{txt}</span>
          </div>
        ))}
      </div>

    </div>
  )
}


// ─── 탭: MCC 설정 ─────────────────────────────────────────
function MCCTab({ r, lang, theme }) {
  const [allowed, setAllowed] = useState(r.mccAllowed)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState(r.mccChangeHistory)
  const [showAddMCC, setShowAddMCC] = useState(false)
  const hasMCC = r.typeKey !== 'lend' && r.typeKey !== 'gift'
  // [권한] master·admin 만 MCC 편집 가능
  const _mccRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canEditMCC = ['master', 'admin'].includes(_mccRole)

  if (!hasMCC) {
    return (
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '32px', textAlign: 'center', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: DK.t2, marginBottom: '6px' }}>MCC 설정 불가</div>
        <div style={{ fontSize: '12px', color: DK.t4, lineHeight: 1.6 }}>
          {r.typeKey === 'lend' ? '빌려주기 자금은 카드 결제가 아닌 계좌이체로 집행됩니다.' : '선물/용돈 자금은 MCC 제한 없이 자유롭게 사용 가능합니다.'}
        </div>
      </div>
    )
  }

  const toggle = (id) => {
    if (!canEditMCC) return
    if (MCC_MASTER.find(m => m.id === id)?.defaultBlocked) return
    setAllowed(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
    setSaved(false)
  }

  const handleApply = () => {
    const newHistory = [{ date: new Date().toLocaleDateString('ko-KR').replace(/\. /g,'.').replace('.','.'), action: 'MCC 설정 변경', by: '관리자' }, ...history]
    setHistory(newHistory)
    setSaved(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!canEditMCC && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>조회 전용</div>
            <div style={{ fontSize: '11px', color: '#B45309', lineHeight: 1.5 }}>MCC 설정은 최고관리자·관리자만 변경할 수 있습니다.</div>
          </div>
        </div>
      )}
      {['business','living','blocked'].map(group => {
        const items = MCC_MASTER.filter(m => m.group === group)
        const groupLabel = { business: '업무 관련', living: '생활 관련', blocked: t('alwaysBlocked', lang) }[group]
        return (
          <div key={group} style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: DK.t4, marginBottom: '10px', letterSpacing: '0.5px' }}>{groupLabel.toUpperCase()}</div>
            {items.map(m => {
              const isAllowed = allowed.includes(m.id)
              const isLocked = m.defaultBlocked
              return (
                <button key={m.id} onClick={() => toggle(m.id)}
                  style={{
                    width: '100%', padding: '11px 14px', marginBottom: '6px',
                    background: isLocked ? DK.redDim : isAllowed ? DK.goldDim : DK.inner,
                    border: `1.5px solid ${isLocked ? `${DK.red}40` : isAllowed ? `${DK.gold}50` : DK.divider}`,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: isLocked ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    transition: 'all .15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
                      background: isLocked ? DK.red : isAllowed ? DK.gold : DK.muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(isAllowed || isLocked) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isLocked ? '#fff' : '#0D1017'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          {isLocked
                            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                            : <polyline points="20 6 9 17 4 12"/>
                          }
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isLocked ? DK.red : DK.t1 }}>
                      {lang === 'en' ? m.en : m.ko}
                    </span>
                  </div>
                  {isLocked
                    ? <span style={{ fontSize: '10px', color: DK.red, fontWeight: 600 }}>변경불가</span>
                    : <span style={{ fontSize: '10px', color: isAllowed ? DK.gold : DK.t4, fontWeight: 600 }}>{isAllowed ? t('allowed',lang) : t('blocked',lang)}</span>
                  }
                </button>
              )
            })}
          </div>
        )
      })}

      {/* 업종 추가 버튼 */}
      <button onClick={() => canEditMCC && setShowAddMCC(true)}
        style={{
          width: '100%', padding: '14px',
          background: DK.inner,
          border: `1.5px dashed ${DK.divider}`,
          borderRadius: '14px',
          color: DK.t3,
          fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          transition: 'all .15s',
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        업종 추가
      </button>


      {/* 적용 버튼 */}
      <button onClick={canEditMCC ? handleApply : undefined}
        style={{
          width: '100%', padding: '15px',
          background: saved ? DK.greenDim : theme.activeBtnGrad,
          border: saved ? `1px solid ${DK.green}40` : 'none',
          borderRadius: '14px',
          color: saved ? DK.green : '#fff',
          fontSize: '15px', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: saved ? 'none' : theme.activeShadow,
          transition: 'all .2s',
        }}>
        {saved ? '✓ '+t('applied', lang) : '⚡ '+t('liveApply', lang)}
      </button>


      {/* 변경 이력 */}
      {history.length > 0 && (
        <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: DK.t3, marginBottom: '10px' }}>{t('changeHistory', lang)}</div>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < history.length-1 ? '1px solid '+COLORS.borderSoft : 'none' }}>
              <div style={{ width: '4px', borderRadius: '2px', background: theme.brandDark+'50', flexShrink: 0, alignSelf: 'stretch' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: DK.t1, fontWeight: 600, marginBottom: '2px' }}>{h.action}</div>
                <div style={{ fontSize: '10px', color: DK.t4 }}>{h.date} · {h.by}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 업종 추가 모달 */}
      {showAddMCC && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowAddMCC(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.65)' }} />
          <div style={{ background: DK.card, borderRadius: '24px 24px 0 0', padding: '20px 20px 36px', border: `1px solid ${DK.border}`, maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
            {/* 핸들 */}
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: DK.muted, margin: '0 auto 18px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: DK.t1, marginBottom: '4px' }}>업종 추가</div>
            <div style={{ fontSize: '12px', color: DK.t4, marginBottom: '16px' }}>허용할 업종을 선택하세요. 항상 차단 업종은 변경할 수 없습니다.</div>
            {/* 업종 목록 */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MCC_MASTER.filter(m => !m.defaultBlocked).map(m => {
                const isOn = allowed.includes(m.id)
                return (
                  <button key={m.id}
                    onClick={() => { toggle(m.id); setSaved(false) }}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      background: isOn ? DK.goldDim : DK.inner,
                      border: `1.5px solid ${isOn ? `${DK.gold}50` : DK.divider}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
                        background: isOn ? DK.gold : DK.muted,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isOn && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D1017" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: DK.t1, textAlign: 'left' }}>{m.ko}</div>
                        <div style={{ fontSize: '10px', color: DK.t4, textAlign: 'left', marginTop: '1px' }}>
                          {{ business: '업무 관련', living: '생활 관련' }[m.group]}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isOn ? DK.gold : DK.t4, flexShrink: 0 }}>
                      {isOn ? '허용중' : '차단'}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* 닫기 버튼 */}
            <button onClick={() => setShowAddMCC(false)}
              style={{
                marginTop: '14px', width: '100%', padding: '14px',
                background: theme.activeBtnGrad, border: 'none', borderRadius: '14px',
                fontSize: '14px', fontWeight: 700, color: '#fff',
                cursor: 'pointer', fontFamily: 'inherit', boxShadow: theme.activeShadow,
              }}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 탭: 집행 로그 ────────────────────────────────────────
function ExecLogTab({ r, lang, theme, onNavigate }) {
  const [justifyTarget, setJustifyTarget] = useState(null)
  const [justifySent, setJustifySent] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')

  // 소명요청 모달 상태 (PaymentDetail 추가 서류 요청 스타일)
  const [claimReq, setClaimReq]   = useState(true)
  const [evidReq, setEvidReq]     = useState(false)
  const [claimMsg, setClaimMsg]   = useState('소명 부탁드립니다.')
  const [msgEdited, setMsgEdited] = useState(false)

  const autoMsg = (c, e) =>
    c && e ? '소명 및 영수증 증빙 부탁드립니다.'
    : c ? '소명 부탁드립니다.'
    : e ? '영수증 증빙 부탁드립니다.'
    : ''

  const toggleClaim = () => {
    const next = !claimReq; setClaimReq(next)
    if (!msgEdited) setClaimMsg(autoMsg(next, evidReq))
  }
  const toggleEvid = () => {
    const next = !evidReq; setEvidReq(next)
    if (!msgEdited) setClaimMsg(autoMsg(claimReq, next))
  }
  const canSend = (claimReq || evidReq) && claimMsg.trim().length > 0

  const openJustify = (e, log) => {
    e.stopPropagation()
    setJustifyTarget(log)
    setClaimReq(true); setEvidReq(false)
    setClaimMsg('소명 부탁드립니다.'); setMsgEdited(false)
  }
  const handleClaimSend = () => {
    setJustifySent(p => ({ ...p, [justifyTarget.id]: true }))
    setJustifyTarget(null)
  }

  const statusFilters = [
    { key: 'all',       label: '전체' },
    { key: 'requested', label: '소명요청' },
    { key: 'done',      label: '완료' },
    { key: 'risk',      label: '위험' },
    { key: 'warning',   label: '주의' },
    { key: 'blocked',   label: '차단됨' },
  ]

  const filtered = statusFilter === 'all'       ? r.execLogs
    : statusFilter === 'requested' ? r.execLogs.filter(l => l.justify === 'requested' || justifySent[l.id])
    : r.execLogs.filter(l => l.status === statusFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 상태 필터 */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
        {statusFilters.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: RADIUS.pill, flexShrink: 0,
              background: statusFilter === f.key ? DK.gold : DK.card,
              border: statusFilter === f.key ? 'none' : `1px solid ${DK.divider}`,
              color: statusFilter === f.key ? '#0D1017' : DK.t2,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: DK.shadow,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.map((log) => {
        const isBlocked = log.status === 'blocked'
        const catLabel = log.category ?? '미분류'
        const borderColor = isBlocked ? `${DK.red}60`
          : log.status === 'risk' ? `${DK.red}50`
          : log.status === 'warning' ? `${DK.amber}50`
          : DK.border
        return (
          <div key={log.id}
            onClick={() => onNavigate && onNavigate('/payments/' + log.id)}
            style={{
              background: DK.card, borderRadius: RADIUS.lg,
              border: `1.5px solid ${borderColor}`,
              boxShadow: isBlocked ? '0 4px 20px rgba(248,113,113,0.12)' : DK.shadow,
              overflow: 'hidden', cursor: 'pointer',
            }}>
            {/* 차단 배너 */}
            {isBlocked && (
              <div style={{ background: DK.redDim, borderBottom: `1px solid ${DK.red}30`, padding: '6px 16px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: DK.red, letterSpacing: '0.8px' }}>🚫 MCC 차단 — 결제 미차감</span>
              </div>
            )}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: isBlocked ? DK.red : DK.t1, marginBottom: '4px' }}>{log.merchant}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: DK.t4 }}>{log.date} {log.time}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      padding: '1px 7px', borderRadius: '6px',
                      background: log.category ? DK.goldDim : DK.muted,
                      color: log.category ? DK.gold : DK.t4,
                    }}>{catLabel}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: isBlocked ? DK.t3 : DK.t1, marginBottom: '4px', textDecoration: isBlocked ? 'line-through' : 'none' }}>{log.amount.toLocaleString()}원</div>
                  <StatusBadge status={log.status} lang={lang} />
                </div>
              </div>

              {/* 증빙 + 소명요청/재요청 (차단 아닌 경우만) */}
              {!isBlocked && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <div style={{
                    flex: 1, padding: '8px 12px', borderRadius: '10px',
                    background: log.evidence ? DK.greenDim : DK.redDim,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ fontSize: '12px' }}>{log.evidence ? '📎' : '📋'}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: log.evidence ? DK.green : DK.red }}>
                      {log.evidence ? '증빙 첨부됨' : '증빙 누락'}
                    </span>
                  </div>
                  {/* done → 재요청, risk/warning → 소명요청 (같은 크기) */}
                  {log.status !== 'blocked' && (log.status === 'done' || log.status === 'risk' || log.status === 'warning') && (() => {
                    const isDone   = log.status === 'done'
                    const btnLabel = isDone ? '🔄 재요청' : '💬 소명요청'
                    const btnBg    = isDone ? DK.purpleDim : DK.goldDim
                    const btnColor = isDone ? DK.purple    : DK.gold
                    const btnBorder= isDone ? `1px solid ${DK.purple}50` : `1px solid ${DK.gold}40`
                    return (
                      <button
                        onClick={(e) => openJustify(e, log)}
                        style={{
                          width: '76px', padding: '8px 0', borderRadius: '10px', border: btnBorder,
                          background: btnBg, color: btnColor,
                          fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          flexShrink: 0, textAlign: 'center',
                        }}>
                        {btnLabel}
                      </button>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* 소명요청 모달 — 추가 서류 요청 스타일 */}
      {justifyTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '22px 20px', width: '100%', maxWidth: '380px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>추가 서류 요청</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
              "{justifyTarget.merchant}"에 대한 추가 요청을 전송합니다.
            </div>

            {/* 소명 요청 토글 */}
            <div onClick={toggleClaim}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 13px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer',
                background: claimReq ? '#F0FDF4' : '#F9FAFB',
                border: `1.5px solid ${claimReq ? '#6EE7B7' : '#E9EAEC'}`, transition: 'all 0.15s' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: claimReq ? '#047857' : '#374151' }}>소명 요청</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>업무 목적 소명 요청 — 메시지로 전달</div>
              </div>
              <div style={{ width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
                background: claimReq ? '#10B981' : '#D1D5DB', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '2px', left: claimReq ? '20px' : '2px',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* 증빙 요청 토글 */}
            <div onClick={toggleEvid}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 13px', borderRadius: '12px', marginBottom: '16px', cursor: 'pointer',
                background: evidReq ? '#ECFEFF' : '#F9FAFB',
                border: `1.5px solid ${evidReq ? '#67E8F9' : '#E9EAEC'}`, transition: 'all 0.15s' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: evidReq ? '#0E7490' : '#374151' }}>증빙 요청</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>영수증·서류 첨부 요청 — 메시지로 전달</div>
              </div>
              <div style={{ width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
                background: evidReq ? '#0891B2' : '#D1D5DB', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '2px', left: evidReq ? '20px' : '2px',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* 전송 메시지 */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151',
              marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              전송 메시지
              <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 400 }}>(직접 수정 가능)</span>
            </div>
            <textarea value={claimMsg}
              onChange={e => { setMsgEdited(true); setClaimMsg(e.target.value) }}
              rows={3}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #E9EAEC',
                padding: '10px 12px', fontSize: '12px', color: '#111827', fontFamily: 'inherit',
                resize: 'none', outline: 'none', background: '#F8F9FF', marginBottom: '14px',
                boxSizing: 'border-box', lineHeight: 1.6 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => setJustifyTarget(null)}
                style={{ height: '44px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                  background: '#F4F5F7', color: '#374151', border: '1px solid #E9EAEC',
                  cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <button onClick={handleClaimSend} disabled={!canSend}
                style={{ height: '44px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  background: canSend ? (theme.activeBtnGrad || '#4F46E5') : '#E9EAEC',
                  color: canSend ? '#fff' : '#9CA3AF', border: 'none',
                  cursor: canSend ? 'pointer' : 'default', fontFamily: 'inherit',
                  opacity: canSend ? 1 : 0.6 }}>
                💬 메시지로 전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── 탭: 증빙 센터 ────────────────────────────────────────
function EvidenceTab({ r, lang, theme }) {
  const total = r.execLogs.length
  const withEvidence = r.execLogs.filter(l => l.evidence).length
  const pct = Math.round(withEvidence / total * 100)

  const typeIcon = { receipt: '🧾', contract: '📋', invoice: '📄' }
  const typeLabel = { receipt: '영수증', contract: '계약서', invoice: '청구서' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 완료율 */}
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: DK.t1 }}>{t('evidenceRate', lang)}</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: pct >= 80 ? DK.green : pct >= 50 ? DK.amber : DK.red }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', background: DK.muted, overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: pct+'%', height: '100%', background: pct >= 80 ? DK.green : pct >= 50 ? DK.amber : DK.red, borderRadius: '4px', transition: 'width 0.5s', boxShadow: `0 0 8px ${pct >= 80 ? DK.green : pct >= 50 ? DK.amber : DK.red}60` }} />
        </div>
        <div style={{ fontSize: '11px', color: DK.t4 }}>
          {withEvidence}건 완료 · <span style={{ color: DK.red, fontWeight: 600 }}>{total - withEvidence}건 {t('missing', lang)}</span>
        </div>
      </div>

      {/* 누락 증빙 알림 */}
      {total - withEvidence > 0 && (
        <div style={{ background: DK.amberDim, border: `1px solid ${DK.amber}40`, borderRadius: RADIUS.lg, padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: DK.amber, marginBottom: '4px' }}>증빙 누락 {total - withEvidence}건</div>
            <div style={{ fontSize: '11px', color: DK.t2, lineHeight: 1.6 }}>누락 건에 대한 영수증을 업로드하거나 소명요청을 발송하세요.</div>
          </div>
        </div>
      )}

      {/* 증빙 목록 */}
      <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: DK.t3, marginBottom: '12px' }}>첨부 파일</div>
        {r.evidenceList.map((ev, i) => (
          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < r.evidenceList.length-1 ? `1px solid ${DK.divider}` : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: DK.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {typeIcon[ev.type] || '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: DK.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{ev.name}</div>
              <div style={{ fontSize: '10px', color: DK.t4 }}>{ev.date} · {typeLabel[ev.type]} {ev.auto ? '· 자동수집' : '· 수동업로드'}</div>
            </div>
            {ev.auto && <span style={{ padding: '2px 7px', borderRadius: '8px', background: DK.blueDim, color: DK.blue, fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>자동</span>}
          </div>
        ))}
      </div>

    </div>
  )
}

// ─── 탭: 보고서 ───────────────────────────────────────────
function ReportTab({ r, lang, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 보고서 목록 */}
      {r.reports.length > 0 ? (
        <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '16px', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: DK.t3, marginBottom: '12px' }}>생성된 보고서</div>
          {r.reports.map((rep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < r.reports.length-1 ? `1px solid ${DK.divider}` : 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: rep.status === 'done' ? DK.goldDim : DK.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {rep.status === 'done' ? '📊' : '⏳'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: DK.t1, marginBottom: '2px' }}>{rep.month} 집행 보고서</div>
                <div style={{ fontSize: '11px', color: DK.t4 }}>{rep.taxCategory} · {(rep.amount/10000).toFixed(0)}만원</div>
              </div>
              {rep.status === 'done' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={{ padding: '6px 10px', background: DK.goldDim, border: `1px solid ${DK.gold}40`, borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: DK.gold, cursor: 'pointer', fontFamily: 'inherit' }}>PDF</button>
                  <button style={{ padding: '6px 10px', background: DK.blueDim, border: `1px solid ${DK.blue}40`, borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: DK.blue, cursor: 'pointer', fontFamily: 'inherit' }}>공유</button>
                </div>
              ) : (
                <span style={{ padding: '3px 8px', borderRadius: '8px', background: DK.amberDim, color: DK.amber, fontSize: '10px', fontWeight: 700 }}>처리중</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: DK.card, borderRadius: RADIUS.lg, padding: '32px', textAlign: 'center', boxShadow: DK.shadow, border: `1px solid ${DK.border}` }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '13px', color: DK.t3 }}>생성된 보고서가 없습니다</div>
        </div>
      )}

    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function RecipientDetail() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const theme     = getAccountTheme()

  const scrollRef  = useRef(null)
  const title1Ref  = useRef(null)   // "권한 자금"
  const title2Ref  = useRef(null)   // 수신자 이름
  const msgBtnRef  = useRef(null)   // 메세지 버튼

  const [lang, setLang]           = useState(getLang())
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const handler = () => setLang(getLang())
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  // 타이틀 크로스페이드만 scroll-linked으로 처리 (레이아웃 영향 없음)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf = null
    const FADE_START = 60   // 이 px 이후부터 페이드 시작
    const FADE_END   = 110  // 이 px 에서 완전히 교체

    const update = () => {
      const sy  = el.scrollTop
      const p   = Math.min(1, Math.max(0, (sy - FADE_START) / (FADE_END - FADE_START)))

      if (title1Ref.current)
        title1Ref.current.style.opacity = String(Math.max(0, 1 - p * 1.6))
      if (title2Ref.current)
        title2Ref.current.style.opacity = String(Math.max(0, (p - 0.4) * 1.8))
      if (msgBtnRef.current) {
        const mo = Math.max(0, 1 - p * 2)
        msgBtnRef.current.style.opacity      = String(mo)
        msgBtnRef.current.style.pointerEvents = mo < 0.05 ? 'none' : 'auto'
      }
      raf = null
    }

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const r = RECIPIENTS_DATA[id] || RECIPIENTS_DATA.aurora

  const TABS = [
    { key: 'overview', label: t('overview', lang) },
    { key: 'mcc',      label: t('mccSetting', lang) },
    { key: 'log',      label: t('execLog', lang) },
    { key: 'evidence', label: t('evidence', lang) },
    { key: 'report',   label: t('report', lang) },
  ]

  const AMBER_PROFILE = '#78350F'
  const AMBER_NAV     = '#78350F'

  return (
    <PhoneShell className="page-enter-right">
      {/* ── 스크롤 컨테이너 — 헤더 포함 ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* ── Sticky 네비 바 (장식 원 포함, 별도 패딩 div 없음) ── */}
        <div className="sticky-nav-safe" style={{ position:'sticky', top:0, zIndex:10, background: AMBER_NAV, display:'flex', alignItems:'center', gap:'8px', padding:'20px 16px 14px', overflow:'hidden' }}>
          <button onClick={() => navigate(-1)}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          {/* 타이틀 크로스페이드 */}
          <span style={{ flex:1, position:'relative', height:'22px', overflow:'hidden' }}>
            <span ref={title1Ref} style={{ position:'absolute', inset:0, fontSize:'15px', fontWeight:600, color:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center' }}>
              권한 자금
            </span>
            <span ref={title2Ref} style={{ position:'absolute', inset:0, fontSize:'15px', fontWeight:700, color:'#fff', display:'flex', alignItems:'center', opacity:0 }}>
              {r.name}
            </span>
          </span>

          <button ref={msgBtnRef}
            onClick={() => navigate('/messages', { state: { recipientId: r.id, recipientName: r.name } })}
            style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 12px', background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', borderRadius:'20px', cursor:'pointer', flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#fff' }}>메세지하기</span>
          </button>
        </div>

        {/* 프로필 + KPI (자연스럽게 스크롤됨) */}
        <div style={{ background: AMBER_PROFILE, padding:'12px 20px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'18px', background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:800, color:'#fff', flexShrink:0, backdropFilter:'blur(10px)' }}>
              {r.name[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'18px', fontWeight:700, color:'#fff' }}>{r.name}</span>
                <EntityBadge type={r.entityType} lang={lang} />
                <RiskBadge level={r.riskLevel} lang={lang} />
              </div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)' }}>
                {r.type} · {r.bizNo || r.phone || ''}
              </div>
            </div>
          </div>

          {/* KPI 박스 */}
          <div style={{ display:'flex', gap:'8px' }}>
            <div style={{ flex:1, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)', borderRadius: RADIUS.lg, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', fontWeight:600, marginBottom:'4px' }}>{t('totalExec', lang)}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:'#fff' }}>{(r.totalAmount/10000).toFixed(0)}만원</div>
            </div>
            <div style={{ flex:1, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)', borderRadius: RADIUS.lg, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', fontWeight:600, marginBottom:'4px' }}>{t('nextExec', lang)}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:'#FDE68A' }}>{r.nextExpected}</div>
            </div>
          </div>
        </div>

        {/* ── Sticky 탭 바 ── */}
        <div className="sticky-tabs-safe" style={{ position:'sticky', top:'66px', zIndex:9, background: AMBER_NAV, display:'flex', gap:'4px', overflowX:'auto', padding:'10px 16px', scrollbarWidth:'none' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding:'7px 14px', borderRadius: RADIUS.pill, border:'none', flexShrink:0,
                background: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.15)',
                color: activeTab === tab.key ? theme.brandDark : '#fff',
                fontSize:'12px', fontWeight: activeTab === tab.key ? 700 : 500,
                cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 헤더 → 다크 전환 */}
        <div style={{ height:'18px', background:'linear-gradient(to bottom,#78350F,#0D1017)' }} />

        {/* 탭 콘텐츠 */}
        <div style={{ padding:'4px 16px 80px', background:'#0D1017' }}>
          {activeTab === 'overview' && <OverviewTab  r={r} lang={lang} theme={theme} />}
          {activeTab === 'mcc'      && <MCCTab       r={r} lang={lang} theme={theme} />}
          {activeTab === 'log'      && <ExecLogTab   r={r} lang={lang} theme={theme} onNavigate={(path) => navigate(path)} />}
          {activeTab === 'evidence' && <EvidenceTab  r={r} lang={lang} theme={theme} />}
          {activeTab === 'report'   && <ReportTab    r={r} lang={lang} theme={theme} />}
        </div>

      </div>
    </PhoneShell>
  )
}
