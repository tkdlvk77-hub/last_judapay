import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { NOTICES, NOTICE_CATEGORIES } from './noticesData'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ─── 헤더 (보라 그라데이션) ─────────────────────────
function Header({ onBack, unreadCount }) {
  const theme = getAccountTheme()
  return (
    <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'20px', paddingLeft:'16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack}
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>공지사항</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>
            {unreadCount > 0 ? `읽지 않은 공지 ${unreadCount}건` : '서비스 업데이트 및 주요 안내'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 카테고리 칩 ─────────────────────────────────────
function CategoryChip({ catId }) {
  const theme = getAccountTheme()
  const cat = NOTICE_CATEGORIES[catId] || NOTICE_CATEGORIES.general
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap:'4px',
      padding: '3px 9px',
      background: cat.bg,
      color: cat.color,
      borderRadius: RADIUS.pill,
      fontSize: '10px', fontWeight: 700,
      letterSpacing: '-0.1px',
      flexShrink: 0,
    }}>
      <span style={{
        width:'5px', height:'5px',
        borderRadius:'50%',
        background: cat.color,
        display:'inline-block',
      }} />
      {cat.label}
    </span>
  )
}

// ─── 상단 고정 공지 (보라 강조 카드) ──────────────────
function PinnedCard({ notice, onClick }) {
  const theme = getAccountTheme()
  return (
    <button onClick={onClick}
      style={{
        width: '100%',
        background: theme.activeBtnGrad,
        border: 'none',
        borderRadius: RADIUS.lg,
        padding: '16px 18px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        boxShadow: SHADOWS.buttonBrand,
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* 핀 아이콘 (우상단) */}
      <div style={{
        position: 'absolute',
        top: '12px', right: '12px',
        opacity: 0.7,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
        </svg>
      </div>

      {/* 라벨 */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:'4px',
        padding: '3px 9px',
        background: 'rgba(255,255,255,0.20)',
        color: '#fff',
        borderRadius: RADIUS.pill,
        fontSize: '10px', fontWeight: 700,
        marginBottom: '10px',
      }}>
        <span style={{
          width:'5px', height:'5px',
          borderRadius:'50%',
          background:'#fff',
        }} />
        상단 고정 · {NOTICE_CATEGORIES[notice.category]?.label}
      </div>

      <div style={{
        fontSize: '15px', fontWeight: 700,
        color: '#fff',
        lineHeight: 1.4,
        marginBottom: '4px',
        letterSpacing: '-0.3px',
        paddingRight: '20px',
      }}>
        {notice.title}
      </div>

      <div style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.5,
        marginBottom: '10px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {notice.summary}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255,255,255,0.18)',
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          {notice.date}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', color: '#fff', fontWeight: 600,
        }}>
          자세히 보기
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </div>
    </button>
  )
}

// ─── 일반 공지 카드 ──────────────────────────────────
function NoticeCard({ notice, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%',
        background: COLORS.bgCard,
        boxShadow: SHADOWS.card,
        border: 'none',
        borderRadius: RADIUS.lg,
        padding: '14px 16px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        display: 'block',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '8px',
      }}>
        <CategoryChip catId={notice.category} />
        {notice.unread && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '16px', height: '16px',
            background: COLORS.danger,
            color: '#fff',
            borderRadius: '50%',
            fontSize: '9px', fontWeight: 800,
          }}>
            N
          </span>
        )}
      </div>

      <div style={{
        fontSize: '14px', fontWeight: 700,
        color: COLORS.t1,
        lineHeight: 1.4,
        marginBottom: '4px',
        letterSpacing: '-0.2px',
      }}>
        {notice.title}
      </div>

      <div style={{
        fontSize: '11px',
        color: COLORS.t3,
        lineHeight: 1.55,
        marginBottom: '8px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {notice.summary}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: COLORS.t4 }}>
          {notice.date}
        </span>
        {notice.requireConsent && (
          <span style={{
            fontSize: '10px', color: '#854F0B', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: '3px',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            동의 필요
          </span>
        )}
      </div>
    </button>
  )
}

export default function Notices() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()

  const pinned = NOTICES.filter(n => n.pinned)
  const others = NOTICES.filter(n => !n.pinned)
  const unreadCount = NOTICES.filter(n => n.unread).length

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: COLORS.bg }}>
        <Header onBack={() => navigate(-1)} unreadCount={unreadCount} />

        <div style={{ padding: '20px 16px 32px' }}>

          {/* 상단 고정 공지 */}
          {pinned.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {pinned.map(n => (
                <PinnedCard key={n.id} notice={n}
                  onClick={() => navigate(`/notices/${n.id}`)} />
              ))}
            </div>
          )}

          {/* 일반 공지 헤더 */}
          {others.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px',
              padding: '0 4px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>
                전체 공지 ({others.length})
              </span>
            </div>
          )}

          {/* 일반 공지 목록 */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: '10px',
          }}>
            {others.map(n => (
              <NoticeCard key={n.id} notice={n}
                onClick={() => navigate(`/notices/${n.id}`)} />
            ))}
          </div>

          {others.length === 0 && pinned.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: COLORS.t4,
              fontSize: '13px',
            }}>
              등록된 공지사항이 없어요
            </div>
          )}
        </div>
      </div>

    </PhoneShell>
  )
}
