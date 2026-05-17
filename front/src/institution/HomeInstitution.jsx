import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import BottomTab from '../components/BottomTab'

// ─── 공공기관 테마 (개인=보라, 기업=하늘, 기관=남색) ──

// ─── 데모 데이터 ──────────────────────────────────────────
const INSTITUTION = {
  name: '서울시청',
  dept: '복지정책과',
  role: '기관 계정 · 담당자',
  budget: 240000000,
  executing: 52400000,
  recipientCount: 38,
}

const RECIPIENTS = [
  {
    id: 'r1',
    name: '김철수',
    type: '교육비 지원',
    current: 180000,
    total: 240000,
    color: GOV.brand,
    status: 'active',
    mccAlert: false,
  },
  {
    id: 'r2',
    name: '이영희',
    type: '소상공인 지원',
    current: 1200000,
    total: 5000000,
    color: '#0EA5E9',
    status: 'active',
    mccAlert: false,
  },
  {
    id: 'r3',
    name: '박지은',
    type: '문화바우처',
    current: 100000,
    total: 100000,
    color: '#10B981',
    status: 'done',
    mccAlert: false,
  },
  {
    id: 'r4',
    name: '최민준',
    type: '청년 창업 지원',
    current: 800000,
    total: 3000000,
    color: '#F59E0B',
    status: 'active',
    mccAlert: true,
  },
]

const DISTRIBUTE_LOGS = [
  {
    id: 'dl1',
    name: 'GS강남게임센터',
    meta: '오늘 22:14 · 김철수 지갑 · MCC 7993',
    amount: null,
    type: 'blocked',
    tag: '차단',
  },
  {
    id: 'dl2',
    name: '강남 YBM 어학원',
    meta: '오늘 14:30 · 김철수 교육비',
    amount: -120000,
    type: 'normal',
  },
  {
    id: 'dl3',
    name: '쿠팡 파트너스 광고',
    meta: '어제 11:20 · 이영희 소상공인',
    amount: -350000,
    type: 'normal',
  },
  {
    id: 'dl4',
    name: '서울시립미술관',
    meta: '어제 15:00 · 박지은 문화바우처',
    amount: -15000,
    type: 'normal',
  },
]

// ─── 액션 버튼 ────────────────────────────────────────────
function ActionBtn({ icon, label, active, onClick }) {
  const GOV = getAccountTheme('institution')
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: 1,
      }}>
      <div style={{
        width: '54px', height: '54px', borderRadius: '18px',
        background: active ? GOV.activeBtnGrad : GOV.inactiveBtn,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: active ? GOV.activeShadow : 'none',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.75)' }}>
        {label}
      </span>
    </button>
  )
}

// ─── 수급자 카드 ──────────────────────────────────────────
function RecipientCard({ item }) {
  const GOV = getAccountTheme('institution')
  const pct = Math.round((item.current / item.total) * 100)
  return (
    <div style={{
      padding: '12px 0',
      borderBottom: `1px solid ${COLORS.borderSoft}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* 상태 dot */}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: item.status === 'done' ? '#10B981' : item.mccAlert ? '#EF4444' : item.color,
          flexShrink: 0,
          boxShadow: `0 0 0 3px ${item.color}25`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.t1 }}>{item.name}</span>
              {item.mccAlert && (
                <span style={{
                  padding: '1px 5px',
                  background: '#FEE2E2', color: '#B91C1C',
                  borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                }}>
                  MCC 위반
                </span>
              )}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>
              {item.current.toLocaleString()}원
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: COLORS.t3 }}>{item.type}</span>
            <span style={{ fontSize: '10px', color: COLORS.t4 }}>
              {item.total.toLocaleString()}원 중 {pct}%
            </span>
          </div>
          <div style={{ height: '3px', borderRadius: '2px', background: COLORS.bgMuted, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: item.status === 'done' ? '#10B981' : item.color,
              borderRadius: '2px', transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 배분 로그 행 ─────────────────────────────────────────
function LogRow({ item }) {
  const GOV = getAccountTheme('institution')
  const blocked = item.type === 'blocked'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px',
      padding: '11px 0',
      borderBottom: `1px solid ${COLORS.borderSoft}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: blocked ? '#B91C1C' : COLORS.t1 }}>
            {item.name}
          </span>
          {item.tag && (
            <span style={{
              padding: '1px 6px',
              background: '#FEE2E2', color: '#B91C1C',
              borderRadius: '4px', fontSize: '9px', fontWeight: 700,
            }}>
              {item.tag}
            </span>
          )}
        </div>
        <div style={{ fontSize: '10px', color: COLORS.t4 }}>{item.meta}</div>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, flexShrink: 0, color: blocked ? '#B91C1C' : COLORS.t1 }}>
        {blocked ? '차단' : `${item.amount.toLocaleString()}원`}
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function HomeInstitution() {
  const GOV = getAccountTheme('institution')
  const navigate = useNavigate()
  const [alertDismissed, setAlertDismissed] = useState(false)

  const mccAlertCount = RECIPIENTS.filter(r => r.mccAlert).length

  return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto', background: COLORS.bg }}>

        {/* ── 다크 헤더 영역 (남색) ── */}
        <div style={{ background: GOV.headerGrad, paddingTop:'max(14px, env(safe-area-inset-top))', paddingBottom: '28px' }}>

          {/* 기관 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>
                  {INSTITUTION.name}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>
                  {INSTITUTION.role}
                </div>
              </div>
            </div>
            <span style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              borderRadius: RADIUS.pill,
              fontSize: '10px', fontWeight: 800, letterSpacing: '1px',
            }}>
              INSTITUTION
            </span>
          </div>

          {/* 예산 카드 */}
          <div style={{
            margin: '0 16px 20px',
            background: GOV.cardBg,
            border: `1px solid ${GOV.cardBorder}`,
            borderRadius: RADIUS.lg, padding: '20px',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', fontWeight: 600 }}>
              배분 가능 예산
            </div>
            <div style={{
              fontSize: '36px', fontWeight: 800, color: '#fff',
              letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '10px',
            }}>
              {INSTITUTION.budget.toLocaleString()}
              <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '4px' }}>원</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                집행 중 <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{INSTITUTION.executing.toLocaleString()}원</strong>
                <span style={{ marginLeft: '8px' }}>
                  수급자 <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{INSTITUTION.recipientCount}명</strong>
                </span>
              </div>
              {mccAlertCount > 0 && (
                <button
                  onClick={() => navigate('/alerts')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: RADIUS.pill,
                    color: '#FCA5A5',
                    fontSize: '10px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  MCC 위반 {mccAlertCount}건
                </button>
              )}
            </div>
          </div>

          {/* 4개 액션 버튼 */}
          <div style={{ display: 'flex', padding: '0 16px' }}>
            <ActionBtn
              label="자금배분"
              active
              onClick={() => navigate('/execute')}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              }
            />
            <ActionBtn
              label="수급자 관리"
              onClick={() => navigate('/wallet')}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
            />
            <ActionBtn
              label="보고서"
              onClick={() => navigate('/payments')}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              }
            />
            <ActionBtn
              label="출금"
              onClick={() => navigate('/withdraw')}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                </svg>
              }
            />
          </div>
        </div>

        {/* ── 라이트 영역 ── */}
        <div style={{ padding: '0 16px 100px' }}>

          {/* MCC 위반 알림 배너 */}
          {!alertDismissed && mccAlertCount > 0 && (
            <div style={{
              margin: '16px 0',
              padding: '12px 14px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: RADIUS.md,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ flex: 1, fontSize: '12px', color: '#B91C1C', lineHeight: 1.5 }}>
                <strong>MCC 위반 감지</strong> 최민준 · 청년 창업 지원 자금에서 차단 카테고리 결제 시도
              </span>
              <button onClick={() => setAlertDismissed(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#DC2626', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {/* 수급자 현황 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: alertDismissed || mccAlertCount === 0 ? '20px' : '4px',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: COLORS.t1 }}>
                수급자 현황
              </span>
              <button onClick={() => navigate('/wallet')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: GOV.linkColor, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '2px',
                }}>
                전체 보기
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOV.linkColor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
            <div style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, borderRadius: RADIUS.lg, padding: '0 16px' }}>
              {RECIPIENTS.map((item, i) => (
                <div key={item.id} style={{
                  borderBottom: i < RECIPIENTS.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <RecipientCard item={item} />
                </div>
              ))}
            </div>
          </div>

          {/* 실시간 배분 로그 */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: COLORS.t1 }}>
                실시간 배분 로그
              </span>
              <button onClick={() => navigate('/payments')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: GOV.linkColor, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '2px',
                }}>
                전체 보기
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOV.linkColor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
            <div style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, borderRadius: RADIUS.lg, padding: '0 16px' }}>
              {DISTRIBUTE_LOGS.map((item, i) => (
                <div key={item.id} style={{
                  borderBottom: i < DISTRIBUTE_LOGS.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <LogRow item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomTab />
    </PhoneShell>
  )
}
