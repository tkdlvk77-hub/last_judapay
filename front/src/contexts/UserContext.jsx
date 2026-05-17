import { createContext, useContext, useState, useEffect } from 'react'

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
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // 현재 로그인 사용자 (데모 프로필)
  const currentUser = userType ? (DEMO_USERS[userType] || null) : null

  const login = (type) => {
    try { sessionStorage.setItem('bizType', type) } catch {}
    setUserType(type)
  }

  const logout = () => {
    try { sessionStorage.removeItem('bizType') } catch {}
    setUserType(null)
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
