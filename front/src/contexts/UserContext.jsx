import { createContext, useContext, useState, useEffect } from 'react'
import { session } from '../services/api'

// ─── 데모 사용자 프로필 ───────────────────────────────────
// 각 계정 타입의 대표 데모 유저 (기업=최고관리자, 개인=홍길동, 기관=기관장)
export const DEMO_USERS = {
  personal: {
    id: 'u1',
    name: '홍길동',
    role: 'personal',
    roleLabel: '개인',
    email: 'hong@example.com',
    phone: '010-9999-0000',
    isDemo: true,
    isSuperAdmin: false,
  },
  business: {
    id: 'm1',
    name: '이대표',
    role: 'master',          // 최고관리자
    roleLabel: '최고관리자',
    email: 'ceo@company.com',
    phone: '010-1234-5678',
    dept: '경영지원',
    position: '대표이사',
    company: '㈜주다컴퍼니',
    isSuperAdmin: true,      // 최고관리자 여부
    isDemo: true,
  },
  institution: {
    id: 'i1',
    name: '김기관',
    role: 'manager',
    roleLabel: '기관 관리자',
    email: 'inst@org.com',
    phone: '010-7777-8888',
    isDemo: true,
    isSuperAdmin: false,
  },
}

// userType: 'personal' | 'business' | 'institution' | null (로그인 안 함)
const UserContext = createContext({
  userType: null,
  currentUser: null,
  login: () => {},
  logout: () => {},
})

export function UserProvider({ children }) {
  // 초기값: sessionStorage에서 한 번 읽음 (새로고침 대응)
  const [userType, setUserType] = useState(() => {
    try {
      const stored = sessionStorage.getItem('bizType')
      if (stored === 'business' || stored === 'personal' || stored === 'institution') return stored
    } catch {}
    return null
  })

  // 실제 로그인 사용자 정보 (auth.js → session.setUser 가 채움) — { userId, userType, role, name, email }
  const [authUser, setAuthUser] = useState(() => session.user || null)

  // sessionStorage 동기화 (다른 탭에서 변경되면 반영)
  useEffect(() => {
    const handler = () => {
      try {
        const stored = sessionStorage.getItem('bizType')
        if (stored === 'business' || stored === 'personal' || stored === 'institution') {
          setUserType(stored)
        } else {
          setUserType(null)
        }
        setAuthUser(session.user || null)
      } catch {}
    }
    window.addEventListener('storage', handler)
    // 같은 탭에서 로그인/로그아웃 시 즉시 반영하는 커스텀 이벤트
    const localHandler = () => setAuthUser(session.user || null)
    window.addEventListener('judapay:auth', localHandler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('judapay:auth', localHandler)
    }
  }, [])

  // currentUser 우선순위:
  //   1. 실제 로그인 사용자(authUser) — 서버에서 받은 실명
  //   2. 데모 사용자(DEMO_USERS[userType]) — 미로그인 데모 모드용
  //   3. null
  const currentUser = (() => {
    if (authUser && (authUser.name || authUser.userId)) {
      // 서버 응답에 name 이 있으면 실명, dept/position 등 데모 부가 필드는 데모 프로필에서 빌려옴
      const demo = userType ? (DEMO_USERS[userType] || {}) : {}
      return {
        ...demo,
        ...authUser,
        // 서버가 비즈니스 회원가입 시 별도 company 컬럼을 안 채우면 demo 의 company 값으로 fallback
        company: authUser.company || demo.company || null,
        name:    authUser.name    || demo.name    || '',
        isDemo:  false,
      }
    }
    return userType ? (DEMO_USERS[userType] || null) : null
  })()

  const login = (type) => {
    try { sessionStorage.setItem('bizType', type) } catch {}
    setUserType(type)
    setAuthUser(session.user || null)
    // 같은 탭에서도 다른 컴포넌트가 즉시 알 수 있도록
    try { window.dispatchEvent(new Event('judapay:auth')) } catch {}
  }

  const logout = () => {
    try { sessionStorage.removeItem('bizType') } catch {}
    try { session.clear() } catch {}
    setUserType(null)
    setAuthUser(null)
    try { window.dispatchEvent(new Event('judapay:auth')) } catch {}
  }

  return (
    <UserContext.Provider value={{ userType, currentUser, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
