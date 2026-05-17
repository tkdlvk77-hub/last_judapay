import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { COLORS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'

const HomeIcon = (active, brand) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? brand : 'none'} stroke={active ? brand : COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22" stroke={active ? '#fff' : COLORS.t4} fill="none"/>
  </svg>
)
const MessageIcon = (active, brand) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? brand : 'none'} stroke={active ? brand : COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const AlertIcon = (active, brand) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? brand : 'none'} stroke={active ? brand : COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={active ? '#fff' : COLORS.t4}/>
  </svg>
)
const MoreIcon = (active, brand) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? brand : COLORS.t4} strokeWidth="2" strokeLinecap="round">
    <circle cx="5" cy="12" r="1.6" fill={active ? brand : COLORS.t4}/>
    <circle cx="12" cy="12" r="1.6" fill={active ? brand : COLORS.t4}/>
    <circle cx="19" cy="12" r="1.6" fill={active ? brand : COLORS.t4}/>
  </svg>
)
const BizMenuIcon = (active, brand) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? brand : 'none'} stroke={active ? brand : COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18"/>
    <path d="M5 21V7l8-4v18"/>
    <path d="M19 21V11l-6-4"/>
  </svg>
)

const SupportIcon = (active, brand) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? brand : 'none'} stroke={active ? brand : COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const personalTabs = [
  { id:'home',    label:'홈',     path:'/home',     icon: HomeIcon,    badgeKey: null },
  { id:'message', label:'메시지', path:'/messages', icon: MessageIcon, badgeKey: 'messages' },
  { id:'alert',   label:'알림',   path:'/alerts',   icon: AlertIcon,   badgeKey: 'alerts' },
  { id:'more',    label:'더보기', path:'/more',     icon: MoreIcon,    badgeKey: null },
]

const businessTabs = [
  { id:'home',    label:'홈',       path:'/home-business', icon: HomeIcon, badgeKey: null },
  { id:'message', label:'메시지',   path:'/messages',      icon: MessageIcon, badgeKey: 'messages' },
  { id:'support', label:'기업메뉴', path:'/business-menu',   icon: BizMenuIcon, badgeKey: null },
  { id:'alert',   label:'알림',     path:'/alerts',        icon: AlertIcon, badgeKey: 'alerts' },
  { id:'more',    label:'더보기',   path:'/more',          icon: MoreIcon, badgeKey: null },
]

// 임시 알림 카운트 (실제는 Context에서)
const BADGES = {
  messages: 2,
  alerts: 0, // 알림 탭은 dot만
}

export default function BottomTab() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userType } = useUser()
  const theme = getAccountTheme()

  if (!userType) return null

  const tabs = userType === 'business' ? businessTabs : personalTabs

  const isActive = (tab) => {
    if (tab.id === 'home') {
      return location.pathname === '/home' || location.pathname === '/home-business'
    }
    return location.pathname === tab.path
  }

  return (
    <div className="bottom-tab-safe" style={{
      display: 'flex',
      background: COLORS.bgCard,
      borderTop: `1px solid ${COLORS.borderSoft}`,
      flexShrink: 0,
    }}>
      {tabs.map((tab) => {
        const active = isActive(tab)
        const badge = tab.badgeKey ? BADGES[tab.badgeKey] : null
        const showDot = tab.id === 'alert' && !active // 알림 미읽음 표시
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, padding: '10px 4px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              position: 'relative',
              fontFamily: 'inherit',
            }}>
            <div style={{ position: 'relative' }}>
              {tab.icon(active, theme.brandDark)}
              {/* 미읽음 카운트 배지 (메시지) */}
              {badge > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-8px',
                  minWidth: '16px', height: '16px',
                  padding: '0 4px',
                  borderRadius: '8px',
                  background: COLORS.danger,
                  border: `2px solid ${COLORS.bgCard}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, color: '#fff',
                }}>
                  {badge}
                </div>
              )}
              {/* 미읽음 dot (알림) */}
              {showDot && (
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '7px', height: '7px',
                  borderRadius: '50%',
                  background: COLORS.danger,
                  border: `1.5px solid ${COLORS.bgCard}`,
                }} />
              )}
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              color: active ? theme.brandDark : COLORS.t4,
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
