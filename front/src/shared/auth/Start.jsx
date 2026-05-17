import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { ACCOUNT_THEMES } from '../../design/accountTokens'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'

// 마지막 접속 계정 타입 읽기
function getLastType() {
  try {
    return sessionStorage.getItem('bizType') || 'personal'
  } catch {
    return 'personal'
  }
}

export default function Start() {
  const navigate = useNavigate()
  const { login } = useUser()

  // 다크 그라데이션 배경 — 상태바 글자 흰색
  useStatusBarStyle('light')

  const lastType = getLastType()
  const theme = ACCOUNT_THEMES[lastType] || ACCOUNT_THEMES.personal

  // 전체 배경 — 테마 헤더 그라데이션 기반 (더 어둡게)
  const BG_COLORS = {
    personal:    { from: '#2D1B69', to: '#1A0F3C' },
    business:    { from: '#0A1F3F', to: '#050F20' },
    institution: { from: '#0F2D1A', to: '#071510' },
  }
  const bg = BG_COLORS[lastType] || BG_COLORS.personal
  const fullBg = `linear-gradient(180deg, ${bg.from} 0%, ${bg.to} 100%)`

  return (
    <div className="phone flex flex-col" style={{
      background: fullBg,
      fontFamily: 'inherit',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* 히어로 영역 — 세로 중앙 정렬 */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '0 32px 32px',
      }}>
        {/* 로고 아이콘 */}
        <div style={{
          width: '64px', height: '64px',
          background: theme.brand,
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: theme.activeShadow,
        }}>
          <svg width="32" height="22" viewBox="0 0 38 26" fill="none">
            <rect x="1" y="1" width="36" height="24" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
            <rect x="1" y="7" width="36" height="6" fill="white" fillOpacity=".9"/>
            <rect x="5" y="17" width="8" height="3" rx="1.5" fill="white" fillOpacity=".6"/>
            <circle cx="31" cy="19.5" r="4" fill="white" fillOpacity=".5"/>
            <circle cx="27" cy="19.5" r="4" fill="white" fillOpacity=".3"/>
          </svg>
        </div>

        {/* JUDAPAY 라벨 */}
        <div style={{
          fontSize: '11px', fontWeight: 800,
          color: theme.brand,
          letterSpacing: '2px',
          marginBottom: '14px',
        }}>
          JUDAPAY
        </div>

        {/* 메인 카피 */}
        <div style={{
          fontSize: '34px', fontWeight: 800,
          color: '#fff',
          lineHeight: 1.25,
          letterSpacing: '-1px',
          marginBottom: '8px',
        }}>
          자금의 흐름을<br />완전히<br />통제하라
        </div>

        {/* 구분선 */}
        <div style={{
          width: '40px', height: '3px',
          background: theme.brand,
          borderRadius: '2px',
          marginBottom: '18px',
        }} />

        {/* 부제 */}
        <div style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.65,
          marginBottom: '0',
        }}>
          집행한 자금이 어디서 어떻게<br />쓰이는지 실시간으로 추적합니다
        </div>
      </div>

      {/* 버튼 영역 */}
      <div style={{ padding: '0 24px 16px' }}>

        {/* 개인으로 시작 */}
        <button
          onClick={() => navigate('/signup/personal')}
          style={{
            width: '100%', height: '54px',
            background: theme.activeBtnGrad,
            color: '#fff',
            border: 'none', borderRadius: '16px',
            fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: '10px',
            boxShadow: theme.activeShadow,
          }}>
          개인으로 시작
        </button>

        {/* 기업으로 시작 */}
        <button
          onClick={() => navigate('/signup/business')}
          style={{
            width: '100%', height: '54px',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '16px',
            fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          기업으로 시작
        </button>

        {/* 이미 계정이 있어요 */}
        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%', height: '48px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: '10px',
          }}>
          이미 계정이 있어요
        </button>

        {/* 데모 버튼 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          {[
            { label: '개인 데모', type: 'personal', route: '/home' },
            { label: '기업 데모', type: 'business', route: '/home-business' },
            { label: '기관 데모', type: 'institution', route: '/home-institution' },
          ].map(d => (
            <button key={d.type}
              onClick={() => { login(d.type); navigate(d.route) }}
              style={{
                flex: 1, height: '36px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.35)',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '10px',
                fontSize: '10px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {d.label} ›
            </button>
          ))}
        </div>
      </div>

      {/* 약관 */}
      <div style={{
        padding: '0 24px',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        textAlign: 'center',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.25)',
        lineHeight: 1.7,
      }}>
        계속 진행하면{' '}
        <span style={{ color: theme.brandLight || theme.brand }}>이용약관</span>
        {' '}및{' '}
        <span style={{ color: theme.brandLight || theme.brand }}>개인정보처리방침</span>에<br />
        동의한 것으로 간주됩니다
      </div>
    </div>
  )
}
