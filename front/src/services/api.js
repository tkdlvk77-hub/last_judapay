// ─────────────────────────────────────────────────────────────
// JudaPay API 클라이언트 — fetch 래퍼
//   - VITE_API_BASE 가 있으면 그걸, 없으면 localhost:8080
//   - sessionStorage 의 accessToken 자동 첨부
//   - 401 발생 시 1회 refresh 시도 → 실패 시 로그아웃 + /login 리다이렉트
//   - 모든 응답은 JSON 파싱 또는 빈 객체 반환
// ─────────────────────────────────────────────────────────────

// API_BASE:
//   - 명시 VITE_API_BASE 가 있으면 그걸 사용 (배포/네이티브 셸)
//   - 그 외에는 빈 문자열 → 같은 origin
//   - 로컬 dev 에서는 vite.config.js 의 proxy 가 /api, /ws 를 백엔드로 자동 포워딩
export const API_BASE = (import.meta?.env?.VITE_API_BASE) || ''

const TOKEN_KEY   = 'judapay.accessToken'
const REFRESH_KEY = 'judapay.refreshToken'
const USER_KEY    = 'judapay.currentUser'

export const tokens = {
  get access()  { try { return sessionStorage.getItem(TOKEN_KEY) }   catch { return null } },
  get refresh() { try { return sessionStorage.getItem(REFRESH_KEY) } catch { return null } },
  get user()    { try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null') } catch { return null } },

  set(at, rt, user) {
    try {
      sessionStorage.setItem(TOKEN_KEY, at)
      sessionStorage.setItem(REFRESH_KEY, rt)
      sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch {}
  },

  clear() {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(REFRESH_KEY)
      sessionStorage.removeItem(USER_KEY)
    } catch {}
  },
}

let refreshing = null   // 동시 401 가 여러 개 떠도 한 번만 refresh

async function tryRefresh() {
  if (refreshing) return refreshing
  const rt = tokens.refresh
  if (!rt) return Promise.resolve(false)
  refreshing = fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${rt}` },
  })
    .then(async (r) => {
      if (!r.ok) return false
      const data = await r.json()
      tokens.set(data.accessToken, data.refreshToken,
                  tokens.user || { userId: data.userId, userType: data.userType, bizRole: data.bizRole })
      return true
    })
    .catch(() => false)
    .finally(() => { refreshing = null })
  return refreshing
}

export async function apiFetch(path, { method = 'GET', headers, body, signal } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const doFetch = async (token) => {
    const h = {
      'Accept': 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    }
    const res = await fetch(url, {
      method,
      headers: h,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal,
    })
    return res
  }

  let res = await doFetch(tokens.access)

  if (res.status === 401 && tokens.refresh) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await doFetch(tokens.access)
    } else {
      tokens.clear()
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/')) {
        window.location.assign('/')
      }
    }
  }

  if (!res.ok) {
    let errBody = null
    try { errBody = await res.json() } catch {}
    const e = new Error(errBody?.message || `HTTP ${res.status}`)
    e.code = errBody?.code
    e.status = res.status
    e.body = errBody
    throw e
  }
  // 본문 없는 응답
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return {}
  try { return await res.json() } catch { return {} }
}

// 단축 헬퍼
export const api = {
  get:    (p, opts)        => apiFetch(p, { ...opts, method: 'GET' }),
  post:   (p, body, opts)  => apiFetch(p, { ...opts, method: 'POST',   body }),
  put:    (p, body, opts)  => apiFetch(p, { ...opts, method: 'PUT',    body }),
  patch:  (p, body, opts)  => apiFetch(p, { ...opts, method: 'PATCH',  body }),
  del:    (p, opts)        => apiFetch(p, { ...opts, method: 'DELETE' }),
}
