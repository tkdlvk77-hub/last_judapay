// ─────────────────────────────────────────────────────────
// JudaPay API 클라이언트 — fetch 래퍼 (쿠키 인증 기반, v2)
//
// 변경 사항 (보안 강화):
//   ❌ sessionStorage 토큰 저장 (XSS 시 토큰 탈취 위험)
//   ✅ HttpOnly Cookie (jp_app_token) — 서버가 발급, JS 접근 불가
//   ✅ credentials: 'include' 로 모든 요청에 쿠키 자동 송수신
//   ✅ X-XSRF-TOKEN 헤더 자동 첨부 (서버 CookieCsrfTokenRepository 와 매칭)
//   ✅ 401 발생 시 단순 로그아웃 (refresh 토큰 없음 — 서버는 single-token TTL 24h)
//
// 사용:
//   import { api, currentUser } from '../services/api'
//   const wallets = await api.get('/api/v1/app/wallets')
//   const me = currentUser()   // 로컬에 저장된 사용자 정보 (UI 표시용)
// ─────────────────────────────────────────────────────────

// API_BASE:
//   - VITE_API_BASE 명시 시 사용 (네이티브 셸/모바일)
//   - 그 외엔 same-origin (Vite proxy 또는 동일 도메인 배포)
export const API_BASE = (import.meta?.env?.VITE_API_BASE) || ''

// ─────────────────────────────────────────────────────────
// 로컬 사용자 정보 (UI 표시 전용 — 인증 자체는 쿠키가 담당)
// ─────────────────────────────────────────────────────────
const USER_KEY = 'judapay.currentUser'

export const session = {
  get user() {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null') }
    catch { return null }
  },
  setUser(u) {
    try { sessionStorage.setItem(USER_KEY, JSON.stringify(u)) } catch {}
    try {
      if (u?.userType) sessionStorage.setItem('bizType', u.userType)
      if (u?.role)     sessionStorage.setItem('bizRole', u.role)
    } catch {}
  },
  clear() {
    try {
      sessionStorage.removeItem(USER_KEY)
      sessionStorage.removeItem('bizType')
      sessionStorage.removeItem('bizRole')
    } catch {}
  },
}

export function currentUser() { return session.user }

// ─────────────────────────────────────────────────────────
// CSRF 토큰 — 서버가 XSRF-TOKEN 쿠키로 발급 (HttpOnly 아님)
// 클라이언트는 그 값을 X-XSRF-TOKEN 헤더로 다시 전송 → 서버 검증
// ─────────────────────────────────────────────────────────
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}
function getCsrfToken() { return getCookie('XSRF-TOKEN') }

// ─────────────────────────────────────────────────────────
// fetch 래퍼
// ─────────────────────────────────────────────────────────
export async function apiFetch(path, { method = 'GET', headers, body, signal } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const csrf = getCsrfToken()
  const isMutation = method !== 'GET' && method !== 'HEAD'

  const h = {
    'Accept': 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(isMutation && csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
    ...headers,
  }

  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    credentials: 'include',   // ★ 쿠키 자동 송수신
    signal,
  })

  // 인증 만료 → 단순 로그아웃 + 시작 화면으로
  if (res.status === 401 || res.status === 403) {
    session.clear()
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/')) {
      // 라우트가 깊이 들어가 있을 때만 리다이렉트 (Start 화면에서의 무한 루프 방지)
      const isPublic = ['/', '/login', '/signup/personal', '/signup/business', '/signup/pin']
        .includes(window.location.pathname)
      if (!isPublic) window.location.assign('/')
    }
  }

  if (!res.ok) {
    let errBody = null
    try { errBody = await res.json() } catch {}
    const e = new Error(errBody?.message || errBody?.error?.message || `HTTP ${res.status}`)
    e.code = errBody?.code || errBody?.error?.code
    e.status = res.status
    e.body = errBody
    throw e
  }

  // 본문 없는 응답
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return {}
  try {
    const json = await res.json()
    // ApiResponse<T> 래퍼 자동 언랩 (서버가 { success, data, pageMeta? } 형태로 줌)
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data
    }
    return json
  } catch { return {} }
}

// 단축 헬퍼
export const api = {
  get:    (p, opts)        => apiFetch(p, { ...opts, method: 'GET' }),
  post:   (p, body, opts)  => apiFetch(p, { ...opts, method: 'POST',   body }),
  put:    (p, body, opts)  => apiFetch(p, { ...opts, method: 'PUT',    body }),
  patch:  (p, body, opts)  => apiFetch(p, { ...opts, method: 'PATCH',  body }),
  del:    (p, opts)        => apiFetch(p, { ...opts, method: 'DELETE' }),
}

// 호환용: 예전 코드가 import { tokens } 로 쓰던 부분을 위해 stub 노출
// (실제 토큰은 더 이상 클라이언트가 보지 못함)
export const tokens = {
  get access()  { return null },
  get refresh() { return null },
  get user()    { return session.user },
  set(_at, _rt, user) { if (user) session.setUser(user) },
  clear()       { session.clear() },
}
