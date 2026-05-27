import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { UserProvider } from './contexts/UserContext'
import { DialogHost } from './components/Dialog'
import { PinModalHost } from './components/PinModal'
import './index.css'

// ── 네이티브 셸 감지: <html data-native data-platform> 부여 ──
//   웹이 iOS/Android WebView 안에서 실행될 때 표시.
//   CSS 가 이 속성을 읽어 .phone 을 풀 폭으로 강제 (미디어쿼리 의존 X).
;(function setupNativeShellFlag() {
  const ua = navigator.userAgent || ''
  let platform = null

  // ① Bridge 가 이미 주입했으면 그걸 사용
  if (window.JudaPay?.platform) {
    platform = window.JudaPay.platform
  }
  // ② Bridge 주입 전이면 UA suffix 로 판단 (iOS Config.swift / Android Config.kt 의 userAgentSuffix)
  else if (/JudaPay-iOS/i.test(ua))     platform = 'ios'
  else if (/JudaPay-Android/i.test(ua)) platform = 'android'

  if (platform) {
    document.documentElement.dataset.native   = 'true'
    document.documentElement.dataset.platform = platform
  } else {
    // Bridge 가 documentEnd 시점에 들어오는 경우 대비 — 최대 1초 폴링
    let tries = 0
    const t = setInterval(() => {
      if (window.JudaPay?.platform) {
        document.documentElement.dataset.native   = 'true'
        document.documentElement.dataset.platform = window.JudaPay.platform
        clearInterval(t)
      } else if (++tries >= 10) {
        clearInterval(t)
      }
    }, 100)
  }
})()

// ── 키보드 높이 보정: visualViewport → --vvh CSS 변수 ──
;(function setupVisualViewport() {
  const vv = window.visualViewport
  if (!vv) return
  function update() {
    document.documentElement.style.setProperty('--vvh', vv.height + 'px')
  }
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  update()
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <UserProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      {/* 전역 alert/confirm 호스트 — App 옆에 두어 라우팅과 무관하게 항상 살아있음 */}
      <DialogHost />
      {/* 자금집행 직전 PIN step-up 모달 — ensureStepUp() 호출 시 마운트됨 */}
      <PinModalHost />
    </BrowserRouter>
  </UserProvider>
)
