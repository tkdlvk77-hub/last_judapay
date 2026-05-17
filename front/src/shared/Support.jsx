import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { getLang } from '../design/i18n'
import { useUser } from '../contexts/UserContext'
import BottomTab from '../components/BottomTab'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ─── 데이터 (실제는 API / 쿠콘 연동) ────────────────────
const BIZ_DATA = {
  name: '㈜주다컴퍼니',
  bizNo: '123-45-67890',
  ceo: '홍길동',
  founded: '2023.03',
  type: '주식회사',
  industry: 'IT / 핀테크',
  url: 'https://judapay.kr',
  intro: '자금의 이동을 설계·통제·추적하는 자금 운영 인프라',
  certLevel: 'silver', // bronze / silver / gold / platinum
  integrityScore: 87,
  mccCompliance: 94,
  justifyRate: 100,
  scheduleRate: 72,

  // 재무 현황
  finance: {
    revenue: { this: 48000000, prev: 32000000 },
    operatingProfit: { this: 8400000, prev: 3200000 },
    capital: 100000000,
    balance: 87420000,
    debt: 12000000,
    investment: [
      { round: 'Pre-Seed', amount: 50000000, date: '2023.06' },
      { round: 'Seed',     amount: 200000000, date: '2024.03' },
    ],
  },

  // 이번달 지출
  monthlyExpense: {
    total: 28400000,
    budget: 35000000,
    items: [
      { label: '임대료',      amount: 5800000,  icon: '🏢', color: '#6366F1' },
      { label: '인건비',      amount: 15000000, icon: '👥', color: '#0EA5E9' },
      { label: '서버/인프라', amount: 1847000,  icon: '☁️', color: '#10B981' },
      { label: '마케팅',      amount: 2500000,  icon: '📢', color: '#F59E0B' },
      { label: '기타 운영비', amount: 3253000,  icon: '📦', color: '#8B5CF6' },
    ],
  },

  // 인건비
  payroll: {
    headcount: 8,
    total: 15000000,
    breakdown: [
      { role: '개발팀',    count: 3, amount: 7200000 },
      { role: '기획/디자인', count: 2, amount: 4000000 },
      { role: '경영지원',  count: 2, amount: 2800000 },
      { role: '인턴',      count: 1, amount: 1000000 },
    ],
    nextPayday: '2026.05.25',
  },

  // 주다페이 운영비 (우리 플랫폼 데이터)
  judapay: {
    thisMonth: 28400000,
    prevMonth: 21200000,
    cardUsage: [
      { name: '법인카드 A (운영비)',  used: 3200000, limit: 5000000, color: '#0EA5E9' },
      { name: '법인카드 B (마케팅)', used: 1850000, limit: 3000000, color: '#6366F1' },
      { name: '임직원카드 (복지)',    used: 420000,  limit: 1000000, color: '#10B981' },
    ],
    recentBlocked: 2,
    pendingJustify: 1,
  },

  // 주요 스케줄
  schedule: [
    { text: '5월 급여 지급',        date: '05.25', status: 'todo',  type: 'payroll' },
    { text: '부가세 신고',           date: '05.31', status: 'todo',  type: 'tax' },
    { text: 'AWS 계약 갱신',         date: '06.01', status: 'todo',  type: 'contract' },
    { text: '투자사 월간 보고',       date: '05.31', status: 'doing', type: 'report' },
    { text: 'v2.0 베타 출시',        date: '05.20', status: 'done',  type: 'product' },
    { text: '법인 세금 계산서 발행', date: '05.10', status: 'done',  type: 'tax' },
  ],
}

const CERT_CFG = {
  bronze:   { label: '브론즈',   color: '#CD7F32', bg: '#FDF5E6', desc: '기본 정보 완성' },
  silver:   { label: '실버',     color: '#9CA3AF', bg: '#F9FAFB', desc: '재무 연동 + 청렴도 70+' },
  gold:     { label: '골드',     color: '#F59E0B', bg: '#FFFBEB', desc: '전체 완성 + 청렴도 90+' },
  platinum: { label: '플래티넘', color: '#6366F1', bg: '#EEF2FF', desc: '6개월+ + 청렴도 95+' },
}

const SCHEDULE_TYPE = {
  payroll:  { icon: '💰', color: '#10B981' },
  tax:      { icon: '🧾', color: '#6366F1' },
  contract: { icon: '📋', color: '#0EA5E9' },
  report:   { icon: '📊', color: '#F59E0B' },
  product:  { icon: '🚀', color: '#8B5CF6' },
}

// ─── 섹션 헤더 ────────────────────────────────────────────
function SectionHeader({ title, sub, action, onAction, actionColor }) {
  const theme = getAccountTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px' }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.t1 }}>{title}</div>
        {sub && <div style={{ fontSize: '11px', color: COLORS.t4, marginTop: '2px' }}>{sub}</div>}
      </div>
      {action && (
        <button onClick={onAction}
          style={{ fontSize: '12px', color: actionColor || theme.brandDark, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '2px' }}>
          {action}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={actionColor || theme.brandDark} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── 1. 기업 정보 카드 ────────────────────────────────────
function CompanyCard({ data, theme, onDetail }) {
  const cert = CERT_CFG[data.certLevel]
  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '18px', boxShadow: SHADOWS.card, overflow: 'hidden', marginBottom: '14px' }}>
      {/* 상단 컬러 바 */}
      <div style={{ height: '4px', background: theme.activeBtnGrad }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
          {/* 로고 */}
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: theme.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {data.name[1]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '3px' }}>
              <span style={{ fontSize: '17px', fontWeight: 800, color: COLORS.t1 }}>{data.name}</span>
              {/* 인증 마크 */}
              <span style={{ padding: '2px 9px', borderRadius: '20px', background: cert.bg, color: cert.color, fontSize: '10px', fontWeight: 800, border: '1px solid ' + cert.color + '40' }}>
                ✦ {cert.label}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: COLORS.t4 }}>{data.type} · {data.industry} · {data.founded} 설립</div>
            <div style={{ fontSize: '12px', color: COLORS.t2, marginTop: '6px', lineHeight: 1.5 }}>{data.intro}</div>
          </div>
        </div>

        {/* 청렴도 스코어 */}
        <div style={{ background: COLORS.bg, borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.t2 }}>주다페이 청렴도</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: data.integrityScore >= 90 ? '#047857' : data.integrityScore >= 70 ? theme.brandDark : '#DC2626' }}>
              {data.integrityScore}
              <span style={{ fontSize: '12px', color: COLORS.t4, fontWeight: 400 }}>/100</span>
            </span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: COLORS.bgMuted, overflow: 'hidden' }}>
            <div style={{ width: data.integrityScore + '%', height: '100%', background: data.integrityScore >= 90 ? '#10B981' : theme.activeBtnGrad, borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {[
              { label: 'MCC 준수', value: data.mccCompliance },
              { label: '소명완료', value: data.justifyRate },
              { label: '스케줄', value: data.scheduleRate },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.t1 }}>{item.value}%</div>
                <div style={{ fontSize: '9px', color: COLORS.t4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onDetail}
          style={{ width: '100%', padding: '11px', background: theme.brandDark + '10', border: '1.5px solid ' + theme.brandDark + '30', borderRadius: '12px', color: theme.brandDark, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          기업 프로필 상세 등록 →
        </button>
      </div>
    </div>
  )
}

// ─── 2. 재무 현황 ─────────────────────────────────────────
function FinanceSection({ data, theme }) {
  const f = data.finance
  const revenueGrowth = Math.round((f.revenue.this - f.revenue.prev) / f.revenue.prev * 100)
  const profitGrowth = Math.round((f.operatingProfit.this - f.operatingProfit.prev) / f.operatingProfit.prev * 100)

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '18px', boxShadow: SHADOWS.card, padding: '16px', marginBottom: '14px' }}>
      <SectionHeader title="재무 현황" sub="쿠콘 API 연동 · 실시간" action="상세" />

      {/* KPI 4박스 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: '이번달 매출', value: (f.revenue.this / 10000).toFixed(0) + '만원', growth: revenueGrowth, color: '#10B981' },
          { label: '영업이익',   value: (f.operatingProfit.this / 10000).toFixed(0) + '만원', growth: profitGrowth, color: theme.brandDark },
          { label: '자본금',     value: (f.capital / 10000000).toFixed(0) + '억원', growth: null, color: '#6366F1' },
          { label: '현금 보유',  value: (data.finance.balance / 10000).toFixed(0) + '만원', growth: null, color: '#F59E0B' },
        ].map((item, i) => (
          <div key={i} style={{ background: COLORS.bg, borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: COLORS.t4, fontWeight: 600, marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.t1, letterSpacing: '-0.5px' }}>{item.value}</div>
            {item.growth !== null && (
              <div style={{ fontSize: '10px', fontWeight: 700, color: item.growth >= 0 ? '#047857' : '#DC2626', marginTop: '2px' }}>
                {item.growth >= 0 ? '▲' : '▼'} 전월 대비 {Math.abs(item.growth)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 투자 유치 */}
      {f.investment.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.t4, marginBottom: '7px' }}>투자 유치 현황</div>
          {f.investment.map((inv, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < f.investment.length - 1 ? '1px solid ' + COLORS.borderSoft : 'none' }}>
              <span style={{ padding: '2px 9px', borderRadius: '8px', background: theme.brandDark + '12', color: theme.brandDark, fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{inv.round}</span>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>{(inv.amount / 10000).toLocaleString()}만원</span>
              <span style={{ fontSize: '11px', color: COLORS.t4 }}>{inv.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 3. 이번달 지출 현황 ─────────────────────────────────
function ExpenseSection({ data, theme }) {
  const e = data.monthlyExpense
  const pct = Math.round(e.total / e.budget * 100)

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '18px', boxShadow: SHADOWS.card, padding: '16px', marginBottom: '14px' }}>
      <SectionHeader title="이번달 지출 현황" sub={'예산 대비 ' + pct + '% 소진'} />

      {/* 예산 바 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.t1, letterSpacing: '-0.5px' }}>
            {(e.total / 10000).toFixed(0)}만원
          </span>
          <span style={{ fontSize: '13px', color: COLORS.t4, fontWeight: 600 }}>
            / {(e.budget / 10000).toFixed(0)}만원
          </span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', background: COLORS.bgMuted, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : theme.activeBtnGrad, borderRadius: '4px', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* 항목별 */}
      {e.items.map((item, i) => {
        const itemPct = Math.round(item.amount / e.total * 100)
        return (
          <div key={i} style={{ marginBottom: i < e.items.length - 1 ? '12px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: COLORS.t1 }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>{(item.amount / 10000).toFixed(0)}만</span>
              <span style={{ fontSize: '11px', color: COLORS.t4, width: '30px', textAlign: 'right' }}>{itemPct}%</span>
            </div>
            <div style={{ height: '5px', borderRadius: '3px', background: COLORS.bgMuted, overflow: 'hidden', marginLeft: '24px' }}>
              <div style={{ width: itemPct + '%', height: '100%', background: item.color, borderRadius: '3px' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 4. 인건비 현황 ───────────────────────────────────────
function PayrollSection({ data, theme }) {
  const p = data.payroll
  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '18px', boxShadow: SHADOWS.card, padding: '16px', marginBottom: '14px' }}>
      <SectionHeader title="인건비 현황" sub={'총 ' + p.headcount + '명 · 급여일 ' + p.nextPayday} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: COLORS.t1, letterSpacing: '-0.5px' }}>
            {(p.total / 10000).toFixed(0)}만
          </div>
          <div style={{ fontSize: '10px', color: COLORS.t4 }}>이번달 총 인건비</div>
        </div>
        <div style={{ flex: 1, height: '1px', background: COLORS.borderSoft }} />
        <div style={{ padding: '8px 14px', background: '#FEF3C7', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>D-{Math.ceil((new Date('2026-05-25') - new Date()) / 86400000)}</div>
          <div style={{ fontSize: '10px', color: '#92400E' }}>급여일</div>
        </div>
      </div>

      {p.breakdown.map((b, i) => {
        const pct = Math.round(b.amount / p.total * 100)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < p.breakdown.length - 1 ? '1px solid ' + COLORS.borderSoft : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: theme.brandDark + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: theme.brandDark, flexShrink: 0 }}>
              {b.count}명
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.t1, marginBottom: '3px' }}>{b.role}</div>
              <div style={{ height: '4px', borderRadius: '2px', background: COLORS.bgMuted, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: theme.brandDark, borderRadius: '2px' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>{(b.amount / 10000).toFixed(0)}만</div>
              <div style={{ fontSize: '10px', color: COLORS.t4 }}>{pct}%</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 5. 주다페이 운영 현황 ────────────────────────────────
function JudapaySection({ data, theme, navigate }) {
  const j = data.judapay
  const growth = Math.round((j.thisMonth - j.prevMonth) / j.prevMonth * 100)

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '18px', boxShadow: SHADOWS.card, padding: '16px', marginBottom: '14px' }}>
      <SectionHeader title="주다페이 운영 현황" sub="이번달 카드 집행 현황" action="전체 분석" onAction={() => navigate('/stats')} />

      {/* 총 집행액 */}
      <div style={{ background: theme.headerGrad, borderRadius: '14px', padding:'14px 16px 0', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>이번달 총 집행</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
            {(j.thisMonth / 10000).toFixed(0)}만
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>원</span>
        </div>
        <div style={{ fontSize: '11px', color: growth >= 0 ? '#FCA5A5' : '#6EE7B7', fontWeight: 700 }}>
          전월 대비 {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}%
        </div>
      </div>

      {/* 카드별 사용 현황 */}
      <div style={{ marginBottom: '12px' }}>
        {j.cardUsage.map((card, i) => {
          const pct = Math.round(card.used / card.limit * 100)
          return (
            <div key={i} style={{ marginBottom: i < j.cardUsage.length - 1 ? '10px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: card.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.t1 }}>{card.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.t1 }}>{(card.used / 10000).toFixed(0)}만</span>
                  <span style={{ fontSize: '10px', color: COLORS.t4 }}>/ {(card.limit / 10000).toFixed(0)}만원</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: pct >= 80 ? '#DC2626' : pct >= 60 ? '#D97706' : '#059669', width: '30px', textAlign: 'right' }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: '5px', borderRadius: '3px', background: COLORS.bgMuted, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: card.color, borderRadius: '3px' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 이상/소명 알림 */}
      {(j.recentBlocked > 0 || j.pendingJustify > 0) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {j.recentBlocked > 0 && (
            <button onClick={() => navigate('/payments')}
              style={{ flex: 1, padding: '9px', background: '#FEF2F2', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: '13px' }}>🚨</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>차단 {j.recentBlocked}건</span>
            </button>
          )}
          {j.pendingJustify > 0 && (
            <button onClick={() => navigate('/payments')}
              style={{ flex: 1, padding: '9px', background: '#FEF3C7', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: '13px' }}>💬</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>소명 대기 {j.pendingJustify}건</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 6. 주요 스케줄 ───────────────────────────────────────
function ScheduleSection({ data, theme }) {
  const [items, setItems] = useState(data.schedule)
  const toggle = (i) => setItems(prev => prev.map((s, idx) => idx === i
    ? { ...s, status: s.status === 'done' ? 'todo' : 'done' }
    : s
  ))
  const STATUS = {
    done:  { color: '#047857', bg: '#D1FAE5', label: '완료' },
    doing: { color: '#0369A1', bg: '#DBEAFE', label: '진행중' },
    todo:  { color: COLORS.t4,  bg: COLORS.bgMuted, label: '예정' },
  }

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '18px', boxShadow: SHADOWS.card, padding: '16px', marginBottom: '14px' }}>
      <SectionHeader title="주요 스케줄" sub={items.filter(s => s.status === 'done').length + '/' + items.length + ' 완료'} />
      {items.map((s, i) => {
        const sc = STATUS[s.status]
        const type = SCHEDULE_TYPE[s.type]
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid ' + COLORS.borderSoft : 'none' }}>
            <button onClick={() => toggle(i)}
              style={{ width: '22px', height: '22px', borderRadius: '7px', border: '2px solid ' + (s.status === 'done' ? theme.brandDark : COLORS.borderSoft), background: s.status === 'done' ? theme.brandDark : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
              {s.status === 'done' && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{type?.icon || '📌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: s.status === 'done' ? COLORS.t4 : COLORS.t1, textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>{s.text}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: COLORS.t4, marginBottom: '3px' }}>{s.date}</div>
              <span style={{ padding: '2px 7px', borderRadius: '7px', background: sc.bg, color: sc.color, fontSize: '10px', fontWeight: 700 }}>{sc.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function Support() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const { userType } = useUser()
  const scrollRef = useScrollRestore()
  const [lang, setLang] = useState(getLang())

  useEffect(() => {
    const h = () => setLang(getLang())
    window.addEventListener('langchange', h)
    return () => window.removeEventListener('langchange', h)
  }, [])

  // 개인 계정이면 개발 예정 안내
  if (userType !== 'business') {
    return (
      <PhoneShell>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: theme.headerGrad, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'20px', paddingBottom:'0', paddingLeft:'20px' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>지원</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>자금 프로필 관리</div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', padding: '32px' }}>
            <div style={{ fontSize: '48px' }}>🚧</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.t1 }}>개인 지원 기능 준비 중</div>
            <div style={{ fontSize: '13px', color: COLORS.t4, textAlign: 'center', lineHeight: 1.7 }}>곧 자금 요청 및 프로필 관리 기능이 오픈됩니다</div>
          </div>
          <BottomTab />
        </div>
      </PhoneShell>
    )
  }

  return (
    <PhoneShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>

          {/* 헤더 */}
          <div style={{ background: theme.headerGrad, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'20px', paddingBottom:'20px', paddingLeft:'20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: '3px' }}>기업 대시보드</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{BIZ_DATA.name} · 실시간 현황</div>
              </div>
              <button onClick={() => navigate('/stats')}
                style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                관제 센터
              </button>
            </div>
          </div>

          {/* 콘텐츠 */}
          <div style={{ padding: '16px 16px 32px' }}>
            <CompanyCard data={BIZ_DATA} theme={theme} onDetail={() => navigate('/stats')} />
            <FinanceSection data={BIZ_DATA} theme={theme} />
            <ExpenseSection data={BIZ_DATA} theme={theme} />
            <PayrollSection data={BIZ_DATA} theme={theme} />
            <JudapaySection data={BIZ_DATA} theme={theme} navigate={navigate} />
          </div>
        </div>
        <BottomTab />
      </div>
    </PhoneShell>
  )
}
