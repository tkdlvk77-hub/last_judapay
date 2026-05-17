import { useNavigate, useParams } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { NOTICES, NOTICE_CATEGORIES } from './noticesData'
import { dialog } from '../components/Dialog'

// ─── 헤더 (보라 그라데이션) ─────────────────────────
function Header({ onBack, notice }) {
  const theme = getAccountTheme()
  const cat = NOTICE_CATEGORIES[notice.category] || NOTICE_CATEGORIES.general

  return (
    <div style={{ background: theme.headerGrad, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'20px', paddingLeft:'16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <button onClick={onBack}
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>공지 상세</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>공지사항 내용</div>
        </div>
      </div>

      {/* 카테고리 칩 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap',
        marginBottom: '12px',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px',
          background: 'rgba(255,255,255,0.18)',
          color: '#fff',
          borderRadius: RADIUS.pill,
          fontSize: '10px', fontWeight: 700,
        }}>
          <span style={{
            width: '5px', height: '5px',
            borderRadius: '50%',
            background: cat.color,
          }} />
          {cat.label}
        </span>
        {notice.pinned && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px',
            background: 'rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.85)',
            borderRadius: RADIUS.pill,
            fontSize: '10px', fontWeight: 600,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
            상단 고정
          </span>
        )}
      </div>

      {/* 제목 */}
      <div style={{
        fontSize: '20px', fontWeight: 800,
        color: '#fff',
        lineHeight: 1.35,
        letterSpacing: '-0.5px',
        marginBottom: '8px',
      }}>
        {notice.title}
      </div>

      {/* 날짜 */}
      <div style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.65)',
      }}>
        {notice.date}
      </div>
    </div>
  )
}

// ─── 본문 블록 렌더러 ────────────────────────────────
function BodyBlock({ block }) {
  const theme = getAccountTheme()
  if (block.type === 'h2') {
    return (
      <div style={{
        fontSize: '15px', fontWeight: 700,
        color: COLORS.t1,
        letterSpacing: '-0.3px',
        marginTop: '20px',
        marginBottom: '8px',
      }}>
        {block.text}
      </div>
    )
  }
  if (block.type === 'h3') {
    return (
      <div style={{
        fontSize: '13px', fontWeight: 700,
        color: COLORS.t2,
        marginTop: '14px',
        marginBottom: '6px',
      }}>
        {block.text}
      </div>
    )
  }
  if (block.type === 'p') {
    return (
      <div style={{
        fontSize: '13px',
        color: COLORS.t2,
        lineHeight: 1.7,
        marginBottom: '8px',
      }}>
        {block.text}
      </div>
    )
  }
  if (block.type === 'list') {
    return (
      <div style={{ marginBottom: '8px' }}>
        {block.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            fontSize: '13px',
            color: COLORS.t2,
            lineHeight: 1.65,
            marginBottom: '4px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '4px', height: '4px',
              borderRadius: '50%',
              background: theme.brand,
              flexShrink: 0,
              marginTop: '8px',
            }} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    )
  }
  if (block.type === 'attachment') {
    return (
      <div style={{
        marginTop: '14px',
        background: COLORS.bgCard,
        boxShadow: SHADOWS.card,
        borderRadius: RADIUS.md,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: '10px',
        cursor: 'pointer',
      }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'rgba(91,79,232,0.10)',
          color: theme.brand,
          borderRadius: RADIUS.sm,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: '10px', fontWeight: 800,
          letterSpacing: '-0.3px',
        }}>
          {block.ext || 'PDF'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 700, color: COLORS.t1,
            marginBottom: '2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {block.name}
          </div>
          <div style={{ fontSize: '10px', color: COLORS.t4 }}>
            {block.size} · 다운로드
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
    )
  }
  return null
}

export default function NoticeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const notice = NOTICES.find(n => n.id === id)

  if (!notice) {
    return (
      <PhoneShell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: COLORS.t4 }}>
            공지를 찾을 수 없어요
          </span>
          <button onClick={() => navigate('/notices')}
            style={{
              padding: '10px 20px',
              background: theme.brand, color: '#fff',
              border: 'none', borderRadius: RADIUS.md,
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            목록으로
          </button>
        </div>
      </PhoneShell>
    )
  }

  return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto', background: COLORS.bg }}>
        <Header onBack={() => navigate(-1)} notice={notice} />

        <div style={{ padding: '8px 20px 32px' }}>
          {notice.body?.map((block, i) => (
            <BodyBlock key={i} block={block} />
          ))}

          {/* 동의 필요 안내 (약관/정책 등) */}
          {notice.requireConsent && (
            <div style={{
              marginTop: '24px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: RADIUS.md,
              padding: '14px 16px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                marginBottom: '8px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: '#854F0B',
                }}>
                  동의가 필요해요
                </div>
              </div>
              <div style={{
                fontSize: '11px', color: '#854F0B', lineHeight: 1.65,
              }}>
                시행일 이전까지 별도의 거부 의사를 표시하지 않으면 변경된 약관에 동의한 것으로 간주합니다. 동의하지 않으시는 경우 일부 서비스 이용이 제한될 수 있어요.
              </div>
            </div>
          )}

          {/* 회사 정보 (모든 공지 하단) */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: `1px solid ${COLORS.borderSoft}`,
            fontSize: '10px',
            color: COLORS.t5,
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            ㈜주다컴퍼니 · 대표 이호형 · 234-56-78912<br/>
            문의: 더보기 → 도움말 / FAQ
          </div>
        </div>
      </div>

      {/* 동의 필요 시 하단 sticky CTA */}
      {notice.requireConsent && (
        <div style={{
          padding: '12px 16px 24px',
          borderTop: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.bgCard,
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <button
            onClick={() => dialog.alert({ title: '약관 동의', message: '추후 구현될 기능입니다.' })}
            style={{
              width: '100%', height: '52px',
              background: theme.brand, color: '#fff',
              border: 'none', borderRadius: RADIUS.md,
              fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: SHADOWS.buttonBrand,
            }}>
            확인하고 동의
          </button>
          <button onClick={() => navigate(-1)}
            style={{
              width: '100%', height: '42px',
              background: 'transparent', color: COLORS.t4,
              border: 'none',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            나중에 보기
          </button>
        </div>
      )}
    </PhoneShell>
  )
}
