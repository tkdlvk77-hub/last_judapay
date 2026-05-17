// 인증 도메인 API
import { api, tokens } from './api'

export async function signup({ name, phone, userType, pin, email }) {
  const res = await api.post('/api/auth/signup', { name, phone, userType, pin, email })
  persistSession(res)
  return res
}

export async function login({ phone, pin }) {
  const res = await api.post('/api/auth/login', { phone, pin })
  persistSession(res)
  return res
}

export function logout() {
  tokens.clear()
  // sessionStorage 의 bizType / bizRole 도 정리 (기존 가드 호환)
  try {
    sessionStorage.removeItem('bizType')
    sessionStorage.removeItem('bizRole')
  } catch {}
}

function persistSession({ accessToken, refreshToken, userId, userType, bizRole }) {
  tokens.set(accessToken, refreshToken, { userId, userType, bizRole })
  // 기존 라우팅 가드(Protected) 가 sessionStorage.bizType 을 직접 보므로 같이 set
  try {
    sessionStorage.setItem('bizType', userType)
    if (bizRole) sessionStorage.setItem('bizRole', bizRole)
    else sessionStorage.removeItem('bizRole')
  } catch {}
}
