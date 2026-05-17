import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import BottomTab from '../components/BottomTab'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  navy:    '#0F172A',
  navy2:   '#1E293B',
  navy3:   '#334155',
  slate:   '#64748B',
  slateL:  '#94A3B8',
  border:  '#E2E8F0',
  bg:      '#F8FAFC',
  white:   '#FFFFFF',
  accent:  '#0EA5E9',
  accentD: '#0284C7',
  green:   '#059669',
  red:     '#DC2626',
  redBg:   '#FEF2F2',
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const ACCOUNTANTS = [
  {
    id: 'a1', initials: '김', initialBg: '#1E3A5F',
    name: '김민준', firm: '삼일PwC 세무법인',
    clients: 64, specialty: '스타트업 · IT',
    monthlyFee: '28만원', rating: 4.9, reviews: 38,
    responseTime: '2시간 이내', tags: ['스타트업', 'IT/테크'], partner: true, fast: true,
    career: '10년', cert: '공인세무사',
  },
  {
    id: 'a2', initials: '이', initialBg: '#1E3A3A',
    name: '이수연', firm: '한영EY 세무법인',
    clients: 41, specialty: '제조 · 도소매',
    monthlyFee: '22만원', rating: 4.8, reviews: 27,
    responseTime: '3시간 이내', tags: ['제조업', '도소매'], partner: false, fast: false,
    career: '8년', cert: '공인세무사',
  },
  {
    id: 'a3', initials: '박', initialBg: '#2D1B4E',
    name: '박성호', firm: '대주 세무법인',
    clients: 88, specialty: 'IT · 플랫폼',
    monthlyFee: '35만원', rating: 4.7, reviews: 52,
    responseTime: '1시간 이내', tags: ['IT/테크', '스타트업'], partner: true, fast: true,
    career: '14년', cert: '공인세무사',
  },
  {
    id: 'a4', initials: '정', initialBg: '#3B2314',
    name: '정다은', firm: '안진Deloitte 세무법인',
    clients: 33, specialty: '부동산 · 임대',
    monthlyFee: '18만원', rating: 4.6, reviews: 19,
    responseTime: '4시간 이내', tags: ['부동산', '임대'], partner: false, fast: false,
    career: '6년', cert: '공인세무사',
  },
  {
    id: 'a5', initials: '최', initialBg: '#1A3B2A',
    name: '최지훈', firm: '삼덕 세무법인',
    clients: 52, specialty: '스타트업 · SaaS',
    monthlyFee: '25만원', rating: 4.8, reviews: 31,
    responseTime: '2시간 이내', tags: ['스타트업', 'IT/테크'], partner: false, fast: true,
    career: '9년', cert: '공인세무사',
  },
]

const MY_ACCOUNTANT = ACCOUNTANTS[0]

const MONTHLY_TASKS = [
  { label: '종합소득세 신고', done: true, date: '5.10 완료' },
  { label: '부가세 신고', done: true, date: '5.12 완료' },
  { label: '급여 명세 전송', done: false, date: '5.20 마감' },
  { label: '세금계산서 검토', done: false, date: '5.25 마감' },
]

const CONTRACT_INFO = [
  { label: '계약 시작일', value: '2024.03.01' },
  { label: '계약 만료일', value: '2025.02.28' },
  { label: '월 비용', value: '280,000원' },
  { label: '자동 결제', value: '매월 1일' },
  { label: '거래내역 공유', value: '자동 전송 ON' },
]

const PENDING_DOCS = [
  { title: '5월 급여대장', deadline: '5월 20일까지', urgent: true },
  { title: '4월 세금계산서 합계표', deadline: '5월 25일까지', urgent: false },
]

const FILTERS = ['전체', '스타트업', 'IT/테크', '제조업', '부동산', '도소매']

const CONSULT_TOPICS = ['세금 신고', '경비 처리', '급여 관련', '부가세', '세금계산서', '기타']

// ── Monogram Avatar ───────────────────────────────────────────────────────────
function Monogram({ initials, bg, size = 48, fontSize = 18 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
      color: '#fff', fontWeight: 700, fontSize,
      letterSpacing: '-0.5px',
    }}>{initials}</div>
  )
}

// ── Rating Dots ───────────────────────────────────────────────────────────────
function RatingBar({ rating }) {
  return (
    <span style={{ fontSize: '12px', color: C.slate }}>
      <span style={{ color: '#F59E0B', marginRight: '4px' }}>
        {'●'.repeat(Math.round(rating))}{'○'.repeat(5 - Math.round(rating))}
      </span>
      {rating}
    </span>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: '1px', background: C.border, margin: '0 -20px' }} />
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: C.white, borderRadius: '12px',
      border: `1px solid ${C.border}`,
      overflow: 'hidden', ...style,
    }}>{children}</div>
  )
}

// ── Accountant List Card ──────────────────────────────────────────────────────
function AccountantCard({ acc, onConnect, onProfile }) {
  return (
    <SectionCard style={{ marginBottom: '10px' }}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <Monogram initials={acc.initials} bg={acc.initialBg} size={52} fontSize={20} />
            {acc.partner && (
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                background: C.navy, color: C.accent, fontSize: '8px',
                fontWeight: 700, padding: '2px 4px', borderRadius: '4px',
                letterSpacing: '0.3px',
              }}>PRO</div>
            )}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: C.navy }}>{acc.name}</span>
              <span style={{
                fontSize: '11px', color: C.slate,
                background: C.bg, border: `1px solid ${C.border}`,
                padding: '1px 6px', borderRadius: '4px',
              }}>{acc.cert}</span>
              {acc.fast && (
                <span style={{
                  fontSize: '10px', color: C.accentD,
                  background: '#E0F2FE', padding: '1px 6px', borderRadius: '4px',
                  fontWeight: 600,
                }}>빠른응답</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: C.slate, marginBottom: '8px' }}>
              {acc.firm} · 경력 {acc.career}
            </div>
            {/* Stats row */}
            <div style={{
              display: 'flex', gap: '0', background: C.bg,
              borderRadius: '8px', border: `1px solid ${C.border}`,
              overflow: 'hidden',
            }}>
              {[
                { label: '연결 기업', value: `${acc.clients}개` },
                { label: '전문 분야', value: acc.specialty },
                { label: '월 비용', value: `${acc.monthlyFee}~` },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1, padding: '7px 8px', textAlign: 'center',
                  borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ fontSize: '10px', color: C.slateL, marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={() => onProfile(acc)} style={{
            flex: 1, padding: '10px 0', borderRadius: '8px',
            background: 'transparent', color: C.navy2,
            border: `1.5px solid ${C.border}`,
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>프로필 보기</button>
          <button onClick={() => onConnect(acc)} style={{
            flex: 2, padding: '10px 0', borderRadius: '8px',
            background: C.navy, color: C.white, border: 'none',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>연결 신청</button>
        </div>
      </div>
    </SectionCard>
  )
}

// ── Bottom Sheet Wrapper ──────────────────────────────────────────────────────
function Sheet({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(15,23,42,0.6)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: C.white,
        borderRadius: '20px 20px 0 0', padding: '0 20px 36px',
        maxHeight: '88%', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
          <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: C.border }} />
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Primary Button ────────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '14px 0', borderRadius: '10px', border: 'none',
      background: disabled ? C.border : C.navy,
      color: disabled ? C.slateL : C.white,
      fontSize: '15px', fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
      marginTop: '16px', letterSpacing: '-0.3px',
    }}>{children}</button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TaxAccountant() {
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const [connected, setConnected] = useState(false)
  const [myAcc, setMyAcc] = useState(MY_ACCOUNTANT)
  const [filter, setFilter] = useState('전체')
  const [sheet, setSheet] = useState(null)
  const [sheetAcc, setSheetAcc] = useState(null)
  const [consultTopic, setConsultTopic] = useState('')
  const [consultText, setConsultText] = useState('')
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }
  function closeSheet() {
    setSheet(null); setSheetAcc(null)
    setConsultTopic(''); setConsultText('')
  }
  function openConnect(acc) { setSheetAcc(acc); setSheet('connect') }
  function openProfile(acc) { setSheetAcc(acc); setSheet('profile') }

  function handleConnect() {
    setConnected(true)
    setMyAcc({ ...sheetAcc })
    closeSheet()
    showToast('연결 신청이 완료되었습니다')
  }
  function handleConsult() {
    closeSheet()
    showToast('상담 요청을 전송했습니다')
  }
  function handleDisconnect() {
    setConnected(false)
    closeSheet()
    showToast('연결이 해제되었습니다')
  }

  const filtered = filter === '전체'
    ? ACCOUNTANTS
    : ACCOUNTANTS.filter(a => a.tags.includes(filter))

  const doneCount = MONTHLY_TASKS.filter(t => t.done).length

  return (
    <PhoneShell>
      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.white, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', height: '52px',
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.navy, fontSize: '18px', padding: '4px', display: 'flex',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke={C.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{
          flex: 1, textAlign: 'center', fontWeight: 700,
          fontSize: '16px', color: C.navy, letterSpacing: '-0.5px',
        }}>세무사 연동</span>
        <div style={{ width: '28px' }} />
      </div>

      {/* ── Body ── */}
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, background: C.bg, paddingBottom: '80px' }}>

        {/* ══ NOT CONNECTED ══ */}
        {!connected && (<>
          {/* Top banner */}
          <div style={{
            background: C.navy, padding: '28px 20px 24px',
          }}>
            <div style={{
              fontSize: '11px', color: C.slateL, letterSpacing: '1.5px',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>JUDAPAY × 세무법인</div>
            <div style={{
              fontSize: '22px', fontWeight: 800, color: C.white,
              lineHeight: 1.3, marginBottom: '8px', letterSpacing: '-0.8px',
            }}>검증된 세무사와<br />바로 연동하세요</div>
            <div style={{ fontSize: '13px', color: C.slateL, lineHeight: 1.6 }}>
              거래 내역 자동 전송 · 세금 신고 일정 관리<br />
              월 비용 투명 공개 · 계약서 내 서비스 보장
            </div>
            {/* Trust bar */}
            <div style={{
              display: 'flex', gap: '16px', marginTop: '20px',
              paddingTop: '16px', borderTop: `1px solid ${C.navy3}`,
            }}>
              {[['287', '연결 기업'], ['98%', '만족도'], ['4.8', '평균 평점']].map(([val, lab]) => (
                <div key={lab}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: C.white, letterSpacing: '-0.5px' }}>{val}</div>
                  <div style={{ fontSize: '11px', color: C.slateL }}>{lab}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px 16px 0' }}>
            {/* Filter chips */}
            <div style={{
              display: 'flex', gap: '6px', overflowX: 'auto',
              paddingBottom: '4px', marginBottom: '14px',
            }}>
              {FILTERS.map(tag => (
                <button key={tag} onClick={() => setFilter(tag)} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: '6px',
                  border: `1.5px solid ${filter === tag ? C.navy : C.border}`,
                  background: filter === tag ? C.navy : C.white,
                  color: filter === tag ? C.white : C.navy2,
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}>{tag}</button>
              ))}
            </div>

            {/* Count */}
            <div style={{
              fontSize: '12px', color: C.slateL, marginBottom: '12px',
              letterSpacing: '-0.2px',
            }}>세무사 {filtered.length}명</div>

            {/* List */}
            {filtered.map(acc => (
              <AccountantCard
                key={acc.id} acc={acc}
                onConnect={openConnect} onProfile={openProfile}
              />
            ))}
          </div>
        </>)}

        {/* ══ CONNECTED ══ */}
        {connected && (<>
          {/* Current accountant hero */}
          <div style={{ background: C.navy, padding: '24px 20px 20px' }}>
            <div style={{
              fontSize: '11px', color: C.slateL,
              letterSpacing: '1.5px', marginBottom: '16px',
              textTransform: 'uppercase',
            }}>현재 연결된 세무사</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Monogram initials={myAcc.initials} bg={myAcc.initialBg} size={60} fontSize={24} />
              <div>
                <div style={{
                  fontSize: '20px', fontWeight: 800, color: C.white,
                  letterSpacing: '-0.7px', marginBottom: '2px',
                }}>{myAcc.name} 세무사</div>
                <div style={{ fontSize: '13px', color: C.slateL }}>{myAcc.firm}</div>
                <RatingBar rating={myAcc.rating} />
              </div>
            </div>
            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gap: '1px', marginTop: '20px',
              background: C.navy3, borderRadius: '10px', overflow: 'hidden',
            }}>
              {[
                { label: '계약 만료', value: '2025.02.28' },
                { label: '월 비용', value: '280,000원' },
                { label: '응답 속도', value: myAcc.responseTime },
              ].map(item => (
                <div key={item.label} style={{
                  background: C.navy2, padding: '12px 8px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '10px', color: C.slateL, marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: C.white }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px' }}>

            {/* 이번달 처리 상태 */}
            <SectionCard style={{ marginBottom: '10px' }}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: C.navy, letterSpacing: '-0.4px' }}>
                    이번달 처리 현황
                  </span>
                  <span style={{ fontSize: '12px', color: C.green, fontWeight: 700 }}>
                    {doneCount} / {MONTHLY_TASKS.length} 완료
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{
                  background: C.bg, borderRadius: '3px', height: '4px', marginBottom: '16px',
                }}>
                  <div style={{
                    background: C.green, borderRadius: '3px', height: '4px',
                    width: `${(doneCount / MONTHLY_TASKS.length) * 100}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                {MONTHLY_TASKS.map((task, i) => (
                  <div key={i}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
                    }}>
                      {/* Status dot */}
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                        background: task.done ? C.green : 'transparent',
                        border: task.done ? 'none' : `1.5px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {task.done && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{
                        flex: 1, fontSize: '13px',
                        color: task.done ? C.slateL : C.navy2,
                        textDecoration: task.done ? 'line-through' : 'none',
                        letterSpacing: '-0.2px',
                      }}>{task.label}</span>
                      <span style={{
                        fontSize: '11px',
                        color: task.done ? C.slateL : (i === 2 ? C.red : C.slate),
                        fontWeight: task.done ? 400 : 600,
                      }}>{task.date}</span>
                    </div>
                    {i < MONTHLY_TASKS.length - 1 && (
                      <div style={{ height: '1px', background: C.bg, margin: '0 -18px' }} />
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 자료 요청 */}
            <SectionCard style={{ marginBottom: '10px' }}>
              <button onClick={() => setSheet('docs')} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: C.bg, border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z" stroke={C.navy2} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 2v5h5M6 10h6M6 13h4" stroke={C.navy2} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: C.navy, letterSpacing: '-0.4px' }}>
                    자료 요청
                  </div>
                  <div style={{ fontSize: '12px', color: C.slate, marginTop: '2px' }}>
                    미처리 {PENDING_DOCS.length}건 확인 필요
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    background: C.red, color: C.white, borderRadius: '10px',
                    minWidth: '20px', height: '20px', padding: '0 6px',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{PENDING_DOCS.length}</div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3L9 7L5 11" stroke={C.slateL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            </SectionCard>

            {/* 문의하기 */}
            <SectionCard style={{ marginBottom: '10px' }}>
              <button onClick={() => setSheet('consult')} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: C.bg, border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15 11.5c0 .8-.7 1.5-1.5 1.5H5l-3 3V3.5C2 2.7 2.7 2 3.5 2h10c.8 0 1.5.7 1.5 1.5v8z" stroke={C.navy2} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: C.navy, letterSpacing: '-0.4px' }}>
                    문의하기
                  </div>
                  <div style={{ fontSize: '12px', color: C.slate, marginTop: '2px' }}>
                    {myAcc.name} 세무사에게 직접 질문
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3L9 7L5 11" stroke={C.slateL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </SectionCard>

            {/* 계약 상태 */}
            <SectionCard style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px 18px 4px' }}>
                <div style={{
                  fontWeight: 700, fontSize: '14px', color: C.navy,
                  letterSpacing: '-0.4px', marginBottom: '12px',
                }}>계약 정보</div>
              </div>
              {CONTRACT_INFO.map((item, i) => (
                <div key={i}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 18px',
                  }}>
                    <span style={{ fontSize: '13px', color: C.slate }}>{item.label}</span>
                    <span style={{
                      fontSize: '13px', fontWeight: 600, color: C.navy2,
                      letterSpacing: '-0.3px',
                    }}>{item.value}</span>
                  </div>
                  {i < CONTRACT_INFO.length - 1 && (
                    <div style={{ height: '1px', background: C.bg, margin: '0 18px' }} />
                  )}
                </div>
              ))}
              <div style={{ height: '12px' }} />
            </SectionCard>

            {/* Bottom actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConnected(false)} style={{
                flex: 1, padding: '12px 0', borderRadius: '8px',
                background: C.white, color: C.navy2,
                border: `1.5px solid ${C.border}`,
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                letterSpacing: '-0.3px',
              }}>다른 세무사</button>
              <button onClick={() => setSheet('change')} style={{
                flex: 1, padding: '12px 0', borderRadius: '8px',
                background: C.white, color: C.red,
                border: `1.5px solid #FECACA`,
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                letterSpacing: '-0.3px',
              }}>세무사 변경</button>
              <button onClick={() => setSheet('consult')} style={{
                flex: 1.4, padding: '12px 0', borderRadius: '8px',
                background: C.navy, color: C.white, border: 'none',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '-0.3px',
              }}>추가 상담</button>
            </div>

          </div>
        </>)}
      </div>

      {/* ══ Bottom Sheets ══ */}

      {/* Connect */}
      {sheet === 'connect' && sheetAcc && (
        <Sheet onClose={closeSheet}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: C.navy, letterSpacing: '-0.7px', marginBottom: '2px' }}>
            연결 신청
          </div>
          <div style={{ fontSize: '13px', color: C.slate, marginBottom: '20px' }}>
            아래 정보가 세무사에게 안전하게 공유됩니다
          </div>
          {/* Acc mini card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '14px', marginBottom: '18px',
          }}>
            <Monogram initials={sheetAcc.initials} bg={sheetAcc.initialBg} size={46} fontSize={18} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: C.navy }}>{sheetAcc.name} 세무사</div>
              <div style={{ fontSize: '12px', color: C.slate }}>{sheetAcc.firm}</div>
              <RatingBar rating={sheetAcc.rating} />
            </div>
          </div>
          {/* Shared info list */}
          {['사업자 기본 정보', '최근 6개월 거래 내역', '세금계산서 발행 내역', '급여 지급 내역'].map((item, i, arr) => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '11px 0',
              borderBottom: i < arr.length - 1 ? `1px solid ${C.bg}` : 'none',
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: '13px', color: C.navy2 }}>{item}</span>
            </div>
          ))}
          <PrimaryBtn onClick={handleConnect}>연결 신청하기</PrimaryBtn>
        </Sheet>
      )}

      {/* Profile */}
      {sheet === 'profile' && sheetAcc && (
        <Sheet onClose={closeSheet}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: C.navy, letterSpacing: '-0.7px', marginBottom: '18px' }}>
            세무사 프로필
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <Monogram initials={sheetAcc.initials} bg={sheetAcc.initialBg} size={60} fontSize={24} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', color: C.navy, letterSpacing: '-0.6px' }}>{sheetAcc.name}</div>
              <div style={{ fontSize: '13px', color: C.slate }}>{sheetAcc.firm} · {sheetAcc.cert}</div>
              <RatingBar rating={sheetAcc.rating} />
              <div style={{ fontSize: '11px', color: C.slateL }}>리뷰 {sheetAcc.reviews}개</div>
            </div>
          </div>
          {[
            { label: '연결 기업', value: `${sheetAcc.clients}개` },
            { label: '응답 속도', value: sheetAcc.responseTime },
            { label: '경력', value: sheetAcc.career },
            { label: '전문 분야', value: sheetAcc.specialty },
            { label: '월 비용', value: `${sheetAcc.monthlyFee}~` },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 0',
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: '13px', color: C.slate }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: C.navy2, letterSpacing: '-0.3px' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button onClick={closeSheet} style={{
              flex: 1, padding: '13px 0', borderRadius: '9px',
              background: C.white, color: C.navy2,
              border: `1.5px solid ${C.border}`,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>닫기</button>
            <button onClick={() => openConnect(sheetAcc)} style={{
              flex: 2, padding: '13px 0', borderRadius: '9px',
              background: C.navy, color: C.white, border: 'none',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>연결 신청</button>
          </div>
        </Sheet>
      )}

      {/* Consult */}
      {sheet === 'consult' && (
        <Sheet onClose={closeSheet}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: C.navy, letterSpacing: '-0.7px', marginBottom: '4px' }}>
            문의하기
          </div>
          <div style={{ fontSize: '13px', color: C.slate, marginBottom: '18px' }}>
            {myAcc.name} 세무사에게 질문을 보냅니다
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.navy2, marginBottom: '8px', letterSpacing: '-0.3px' }}>
            문의 주제 선택
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '16px' }}>
            {CONSULT_TOPICS.map(t => (
              <button key={t} onClick={() => setConsultTopic(t)} style={{
                padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
                border: `1.5px solid ${consultTopic === t ? C.navy : C.border}`,
                background: consultTopic === t ? C.navy : C.white,
                color: consultTopic === t ? C.white : C.navy2,
                fontSize: '12px', fontWeight: 600, letterSpacing: '-0.2px',
              }}>{t}</button>
            ))}
          </div>
          <textarea
            value={consultText}
            onChange={e => setConsultText(e.target.value)}
            placeholder="궁금한 내용을 구체적으로 입력해주세요"
            style={{
              width: '100%', boxSizing: 'border-box', height: '110px',
              border: `1.5px solid ${C.border}`, borderRadius: '10px',
              padding: '12px 14px', fontSize: '14px', resize: 'none',
              outline: 'none', fontFamily: 'inherit', color: C.navy2,
              lineHeight: 1.6,
            }}
          />
          <PrimaryBtn
            onClick={handleConsult}
            disabled={!consultTopic || !consultText.trim()}
          >전송하기</PrimaryBtn>
        </Sheet>
      )}

      {/* Docs */}
      {sheet === 'docs' && (
        <Sheet onClose={closeSheet}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: C.navy, letterSpacing: '-0.7px', marginBottom: '4px' }}>
            자료 요청
          </div>
          <div style={{ fontSize: '13px', color: C.slate, marginBottom: '20px' }}>
            세무사가 요청한 자료입니다
          </div>
          {PENDING_DOCS.map((doc, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0',
              borderBottom: i < PENDING_DOCS.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.navy, letterSpacing: '-0.3px' }}>{doc.title}</div>
                <div style={{ fontSize: '12px', color: C.slate, marginTop: '2px' }}>{doc.deadline}</div>
              </div>
              {doc.urgent && (
                <div style={{
                  background: C.redBg, color: C.red, border: '1px solid #FECACA',
                  fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '5px',
                }}>긴급</div>
              )}
            </div>
          ))}
          <PrimaryBtn onClick={closeSheet}>자료 제출하러 가기</PrimaryBtn>
        </Sheet>
      )}

      {/* Change */}
      {sheet === 'change' && (
        <Sheet onClose={closeSheet}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: C.navy, letterSpacing: '-0.7px', marginBottom: '4px' }}>
            세무사 변경
          </div>
          <div style={{ fontSize: '13px', color: C.slate, marginBottom: '20px', lineHeight: 1.6 }}>
            계약 중도 해지 시 위약금이 발생할 수 있습니다.<br />
            만료일 이후 변경을 권장합니다.
          </div>
          <div style={{
            background: C.redBg, border: '1px solid #FECACA',
            borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
          }}>
            <div style={{ fontSize: '12px', color: C.red, fontWeight: 600 }}>현재 계약 만료일</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.red, marginTop: '2px' }}>2025년 2월 28일</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={closeSheet} style={{
              flex: 1, padding: '13px 0', borderRadius: '9px',
              background: C.white, color: C.navy2,
              border: `1.5px solid ${C.border}`,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>취소</button>
            <button onClick={handleDisconnect} style={{
              flex: 1, padding: '13px 0', borderRadius: '9px',
              background: C.red, color: C.white, border: 'none',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>연결 해제</button>
          </div>
        </Sheet>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: '90px', left: '50%',
          transform: 'translateX(-50%)',
          background: C.navy, color: C.white,
          padding: '10px 20px', borderRadius: '8px',
          fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', zIndex: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
    </PhoneShell>
  )
}
