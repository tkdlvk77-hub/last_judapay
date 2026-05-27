import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AppRoutes from './AppRoutes'
import { dialog } from './components/Dialog'

// ─────────────────────────────────────────────────────────────
// App.jsx — 단순 라우팅 (슬라이드 애니메이션 제거)
//
//   이전 버전: stack 기반 다중 화면 + translate3d 슬라이드 인/아웃
//   현재 버전: 현재 location 의 단일 화면만 렌더. 전환은 즉시.
//   이유: 슬라이드 transition 도중 stuck/잔여물 이슈 영구 차단.
//
//   네이티브 셸 (iOS WKWebView / Android WebView) 의 swipe-back 는
//   네이티브 측에서 WebView snapshot 으로 처리하므로 JS 측 stack 불필요.
//   브라우저 back 도 React Router 가 location 만 바꿔주면 자동 처리됨.
// ─────────────────────────────────────────────────────────────

export default function App() {
  const location = useLocation()

  // ── 서버 동기화 실패 알림 ────────────────────────────────────
  //   transactionStore._syncToServer 가 실패하면 'judapay:syncerror' 이벤트 발행.
  //   여기서 받아 dialog.alert 로 사용자에게 안내.
  useEffect(() => {
    const onSyncError = (e) => {
      const d = e?.detail || {}
      const title = d.code === 'MFA_REQUIRED' ? '인증이 필요합니다'
                  : d.code === 'NETWORK'      ? '서버 연결 실패'
                  : '서버 저장 실패'
      dialog.alert({
        title,
        message: d.message || '자금집행 내역이 서버에 저장되지 않았어요.',
        okText: '확인',
      })
    }
    window.addEventListener('judapay:syncerror', onSyncError)
    return () => window.removeEventListener('judapay:syncerror', onSyncError)
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div className="phone-stage">
        {/* key={location.pathname} → 경로 바뀔 때마다 React 가 강제로 새 인스턴스 마운트.
            이전 화면의 GPU 컴포지터 잔상 / 자동완성 UI 같은 외부 아티팩트 제거. */}
        <AppRoutes key={location.pathname} location={location} />
      </div>
    </div>
  )
}
