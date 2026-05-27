import { COLORS, GRADIENTS, SHADOWS, RADIUS, SPACING, TYPO, progressGradient } from './tokens'

// ─────────────────────────────────────────────────────────
// PhoneShell — 모든 화면의 최상위 컨테이너
// 내부에서 자동으로 flex column + 배경 처리
// ─────────────────────────────────────────────────────────
export function PhoneShell({ children, bg, className = '' }) {
  // 항상 inline style로 background 지정 — CSS .phone의 transparent(모바일)를 덮어씀.
  // 모바일에서 .phone { background: transparent } 는 safe area 영역을
  // phone-stage(다크 퍼플)가 담당하도록 하기 위한 설정이지만,
  // 각 화면의 스크롤 컨테이너에 background가 없으면 phone-stage가 비쳐 보이는 버그 발생.
  // PhoneShell 레벨에서 기본값 COLORS.bg를 강제 적용하면 모든 화면이 한 번에 해결됨.
  return (
    <div
      className={`phone${className ? ' ' + className : ''}`}
      style={{ background: bg || COLORS.bg }}
    >
      {children}
    </div>
  )
}

// ─── 상태바 (9:41 5G) — 데모에서는 사용 안 함, 호환성 위해 export 유지 ──
export function StatusBar({ inverse = false }) {
  return null
}

// ─────────────────────────────────────────────────────────
// GradientHeader — 화면 상단의 다크 그라데이션 영역
// 홈/메시지/알림/더보기 모두 사용
// ─────────────────────────────────────────────────────────
export function GradientHeader({ children, paddingBottom = '24px', bg }) {
  return (
    <div className="gradient-header-safe" style={{
      background: bg || GRADIENTS.header,
      paddingBottom,
      // sticky: 부모(.phone) 가 scrollable 이 아니어도 첫 flex child 라
      // 자연스럽게 상단에 고정됨. sticky 는 추가 안전장치.
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PageTitle — 헤더 안의 큰 타이틀 (메시지/알림/더보기)
// ─────────────────────────────────────────────────────────
export function PageTitle({ title, subtitle, badge, right }) {
  return (
    <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: COLORS.tInverse, letterSpacing: '-0.5px' }}>
          {title}
        </span>
        {badge != null && badge > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '22px', height: '22px', padding: '0 7px',
            background: COLORS.danger, color: '#fff',
            borderRadius: RADIUS.pill,
            fontSize: '11px', fontWeight: 700,
          }}>
            {badge}
          </span>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ProfileBadge — 프로필 영역 (이름 + 부제, 아이콘과 함께)
// onIconClick 있을 때: 글로우 링 + 전환 배지 + '전환' 칩 표시
// ─────────────────────────────────────────────────────────
export function ProfileBadge({ icon, label, name, sub, action, accent = 'PERSONAL', onIconClick, iconBadge }) {
  const switchable = !!onIconClick
  return (
    <div style={{ padding: '4px 20px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      {switchable && (
        <style>{`@keyframes pb-glow{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}`}</style>
      )}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {switchable && (
          <div style={{
            position: 'absolute', inset: '-5px', borderRadius: '18px',
            border: '2px solid rgba(255,255,255,0.6)',
            animation: 'pb-glow 2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
        <div
          onClick={onIconClick}
          style={{
            width: switchable ? '50px' : '44px',
            height: switchable ? '50px' : '44px',
            background: GRADIENTS.brandSubtle,
            borderRadius: RADIUS.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: switchable ? '0 0 0 3px rgba(255,255,255,0.22), ' + SHADOWS.glass : SHADOWS.glass,
            cursor: switchable ? 'pointer' : 'default',
            position: 'relative',
          }}>
          {icon}
          {switchable && (
            <div style={{
              position: 'absolute', bottom: '-7px', right: '-7px',
              width: '22px', height: '22px',
              background: iconBadge ? '#1D4ED8' : 'rgba(255,255,255,0.95)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              border: iconBadge ? '2px solid rgba(255,255,255,0.2)' : '2px solid rgba(99,102,241,0.3)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={iconBadge ? '#fff' : '#6366F1'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {accent && (
          <div style={{
            fontSize: '10px', color: COLORS.tInverseMuted,
            letterSpacing: '1.5px', fontWeight: 600, marginBottom: '2px',
          }}>
            {accent}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: COLORS.tInverse }}>{name}</div>
          {switchable && (
            <div style={{
              fontSize: '10px', fontWeight: 600,
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.15)',
              padding: '2px 7px', borderRadius: '10px',
            }}>전환</div>
          )}
        </div>
        {sub && (
          <div style={{ fontSize: '11px', color: COLORS.tInverseSoft, marginTop: '1px' }}>{sub}</div>
        )}
      </div>
      {action}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// BalanceCard — 잔액 카드 (그라데이션 헤더 안의 글래스 카드)
// ─────────────────────────────────────────────────────────
export function BalanceCard({ label, amount, sub, secondary, action, dark = true, onClick }) {
  const isClickable = !!onClick
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        margin: '0 20px',
        background: dark ? 'rgba(255,255,255,0.08)' : COLORS.bgCard,
        border: dark ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: '16px 18px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform .15s, background .15s',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '11px', color: dark ? COLORS.tInverseSoft : COLORS.t3 }}>
          {label}
        </span>
        {action}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: sub ? '10px' : 0 }}>
        <span style={{
          fontSize: TYPO.amount.size, fontWeight: TYPO.amount.weight,
          color: dark ? COLORS.tInverse : COLORS.t1,
          letterSpacing: TYPO.amount.letterSpacing,
        }}>
          {amount}
        </span>
        <span style={{ fontSize: '14px', color: dark ? COLORS.tInverseMuted : COLORS.t3 }}>
          원
        </span>
      </div>
      {sub && (
        <div style={{
          paddingTop: '10px',
          borderTop: dark ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${COLORS.borderSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '11px',
          color: dark ? COLORS.tInverseSoft : COLORS.t3,
        }}>
          <span>{sub}</span>
          {secondary && <span>{secondary}</span>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// CircleAction — 원형 액션 버튼 (충전/지급집행/카드결제/출금)
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// CircleAction — 라운드 사각형 액션 버튼 (충전/지급집행/카드결제/출금)
// 이름은 호환성 위해 유지하되 모양은 라운드 사각형
// ─────────────────────────────────────────────────────────
export function CircleAction({ icon, label, onClick, active = false, locked = false }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      style={{
        background: 'transparent', border: 'none',
        padding: '4px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px',
        cursor: locked ? 'default' : 'pointer', fontFamily: 'inherit',
        opacity: locked ? 0.65 : 1,
      }}>
      <div style={{
        width: '54px', height: '54px',
        borderRadius: '14px',
        background: locked ? 'rgba(255,255,255,0.07)' : active ? GRADIENTS.brand : 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: active && !locked ? SHADOWS.buttonBrand : 'none',
        transition: 'all .15s',
        position: 'relative',
      }}>
        {locked
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          : icon
        }
      </div>
      <span style={{ fontSize: '11px', color: COLORS.tInverse, fontWeight: 500 }}>
        {label}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// Card — 흰 카드 (그림자 + radius)
// ─────────────────────────────────────────────────────────
export function Card({ children, padding = '14px', radius = RADIUS.lg, hoverable = false, accent, ...rest }) {
  return (
    <div style={{
      background: COLORS.bgCard,
      borderRadius: radius,
      padding,
      boxShadow: SHADOWS.card,
      border: accent ? `1px solid ${accent}` : 'none',
      ...rest,
    }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SectionHeader — 섹션 위 작은 라벨 ("지갑 우선순위" 등)
// ─────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 4px',
      marginBottom: '10px',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>{title}</span>
      {action && (
        <button onClick={onAction}
          style={{ background: 'none', border: 'none', fontSize: '11px', color: COLORS.brand, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
          {action} ›
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ProgressBar — 그라데이션 진행률 바
// pct: 0-100, status: 'done' | 'success' | undefined
// ─────────────────────────────────────────────────────────
export function ProgressBar({ pct, status, height = 3, showLabel = false }) {
  const bg = progressGradient(pct, status)
  const clampedPct = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1,
        height: `${height}px`,
        background: COLORS.bgMuted,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${clampedPct}%`,
          height: '100%',
          background: bg,
          borderRadius: RADIUS.pill,
          transition: 'width .3s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: pct >= 100 ? COLORS.brand : pct >= 70 ? COLORS.danger : pct >= 40 ? COLORS.warning : COLORS.t3,
          flexShrink: 0, minWidth: '32px', textAlign: 'right',
        }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Badge — 작은 태그/배지
// kind: 'fund' (자금 종류 색 자동), 'status', 'count'
// ─────────────────────────────────────────────────────────
export function Badge({ children, color, bg, kind = 'default', size = 'sm' }) {
  const styles = {
    sm: { padding: '2px 7px', fontSize: '10px', radius: '5px' },
    md: { padding: '3px 9px', fontSize: '11px', radius: '6px' },
    lg: { padding: '4px 10px', fontSize: '12px', radius: '7px' },
  }
  const s = styles[size]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: s.padding,
      background: bg || COLORS.bgMuted,
      color: color || COLORS.t2,
      borderRadius: s.radius,
      fontSize: s.fontSize,
      fontWeight: 700,
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// Avatar — 원형 아바타 (이름 첫 글자 또는 이모지)
// kind: 'person' (원), 'business' (둥근 사각)
// ─────────────────────────────────────────────────────────
export function Avatar({ initial, emoji, kind = 'person', size = 40, color, bg }) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`,
      borderRadius: kind === 'business' ? RADIUS.md : RADIUS.circle,
      background: bg || GRADIENTS.brandSubtle,
      color: color || COLORS.tInverse,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${Math.round(size * 0.42)}px`, fontWeight: 700,
      flexShrink: 0,
    }}>
      {emoji || initial}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// FundEmoji — 자금 종류별 이모지 + 라벨 미니 배지
// ─────────────────────────────────────────────────────────
const FUND_META = {
  freelance: { emoji: '🧾', label: '외주비' },
  realestate: { emoji: '🏠', label: '부동산' },
  invest: { emoji: '🌱', label: '자금 지원' },
  lend: { emoji: '💸', label: '빌려주기' },
  gift: { emoji: '🎁', label: '용돈선물' },
  salary: { emoji: '💼', label: '급여' },
  bonus: { emoji: '🎉', label: '상여금' },
  condolence: { emoji: '💐', label: '경조사비' },
  bounty: { emoji: '📋', label: '기타소득' },
}

export function FundBadge({ type, size = 'md' }) {
  const meta = FUND_META[type]
  if (!meta) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: size === 'sm' ? '10px' : '11px',
      color: COLORS.t3,
    }}>
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// FilterChips — 필터 칩 그룹 (전체/외주비/대여금/투자/주의)
// ─────────────────────────────────────────────────────────
export function FilterChips({ items, value, onChange, dark = false }) {
  return (
    <div style={{
      display: 'flex', gap: '6px',
      padding: '0 20px', marginBottom: '12px',
      overflowX: 'auto',
    }}>
      {items.map(item => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              padding: '7px 14px',
              background: active
                ? (dark ? COLORS.tInverse : COLORS.t1)
                : (dark ? 'rgba(255,255,255,0.12)' : COLORS.bgCard),
              color: active
                ? (dark ? COLORS.t1 : COLORS.tInverse)
                : (dark ? COLORS.tInverse : COLORS.t3),
              border: active ? 'none' : (dark ? '1px solid rgba(255,255,255,0.16)' : `1px solid ${COLORS.border}`),
              borderRadius: RADIUS.pill,
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}>
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
            {item.count != null && item.count > 0 && (
              <span style={{
                color: active ? COLORS.danger : COLORS.danger,
                fontWeight: 700,
              }}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MenuListItem — 더보기 화면 메뉴 행
// icon, title, sub, badge, onClick
// ─────────────────────────────────────────────────────────
export function MenuListItem({ icon, iconBg, title, sub, badge, badgeColor, badgeBg, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px',
        background: active ? '#F0F8F4' : COLORS.bgCard,
        border: active ? '1px solid #B5DDC8' : 'none',
        boxShadow: active ? 'none' : SHADOWS.card,
        borderRadius: RADIUS.lg,
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
      {icon && (
        <div style={{
          width: '36px', height: '36px',
          background: iconBg || COLORS.bgMuted,
          borderRadius: RADIUS.md,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: active ? '#085041' : COLORS.t1,
          marginBottom: sub ? '2px' : 0,
        }}>
          {title}
        </div>
        {sub && (
          <div style={{
            fontSize: '11px',
            color: active ? '#0E7050' : COLORS.t4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sub}
          </div>
        )}
      </div>
      {badge && (
        <Badge color={badgeColor} bg={badgeBg} size="md">
          {badge}
        </Badge>
      )}
      <span style={{ color: COLORS.t5, fontSize: '18px', flexShrink: 0, marginLeft: badge ? '4px' : 0 }}>›</span>
    </button>
  )
}


// ─────────────────────────────────────────────────────────
// AccountTransition — 계정 전환 시 풀스크린 애니메이션 오버레이
// visible=true 이면 페이드인, 이후 navigate 호출
// ─────────────────────────────────────────────────────────
export function AccountTransition({ visible, message, gradient }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 999,
      background: gradient || 'linear-gradient(160deg,#1e1b4b 0%,#312e81 60%,#1D4ED8 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
      animation: 'at-fadein .28s ease both',
    }}>
      <style>{`
        @keyframes at-fadein  { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
        @keyframes at-fadeout { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(.97)} }
        @keyframes at-check   { 0%{transform:scale(0) rotate(-20deg)} 65%{transform:scale(1.18) rotate(4deg)} 100%{transform:scale(1) rotate(0)} }
        .at-out { animation: at-fadeout .25s ease both !important; }
      `}</style>
      {/* 체크 원 */}
      <div style={{
        width: '68px', height: '68px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        border: '2px solid rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'at-check .45s .1s cubic-bezier(.34,1.56,.64,1) both',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      {/* 메시지 */}
      <div style={{
        fontSize: '16px', fontWeight: 700, color: '#fff',
        textAlign: 'center', lineHeight: 1.5,
        padding: '0 32px',
        animation: 'at-fadein .35s .2s ease both',
      }}>
        {message}
      </div>
    </div>
  )
}