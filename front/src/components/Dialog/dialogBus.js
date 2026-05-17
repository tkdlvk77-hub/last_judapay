// ─────────────────────────────────────────────────────────────
// DialogBus — 컴포넌트 트리 밖에서도 호출 가능한 싱글톤 API.
//
//   사용 (어디서든):
//     import { dialog } from '../components/Dialog'
//     dialog.alert({ title: '안내', message: '...' })
//     const ok = await dialog.confirm({ title:'로그아웃', message:'...', destructive:true })
//
// 실제 UI 는 DialogHost (React 컴포넌트) 가 그림.
// 이 모듈은 Pub/Sub 만 담당 — DialogProvider 가 구독해서 state 로 옮김.
// ─────────────────────────────────────────────────────────────

let _subscriber = null
let _idSeq = 0

function publish(req) {
  if (!_subscriber) {
    console.warn('[dialog] no host mounted — fallback to native')
    if (req.kind === 'alert') {
      window.alert(req.message || req.title || '')
      req.resolve?.()
      return
    }
    if (req.kind === 'confirm') {
      req.resolve?.(window.confirm(req.message || req.title || ''))
      return
    }
  }
  _subscriber(req)
}

// 내부 — DialogProvider 가 호출
export function _setSubscriber(fn) { _subscriber = fn }

export const dialog = {
  /**
   * 알림. fire-and-forget 으로도 쓸 수 있고, await 도 가능.
   *   await dialog.alert({ title, message, okText })
   */
  alert(opts = {}) {
    return new Promise((resolve) => {
      publish({
        id: ++_idSeq,
        kind: 'alert',
        title: opts.title || '안내',
        message: typeof opts === 'string' ? opts : (opts.message ?? ''),
        okText: opts.okText || '확인',
        resolve,
      })
    })
  },

  /**
   * 확인 (true/false).
   *   const ok = await dialog.confirm({ title, message, okText, cancelText, destructive })
   */
  confirm(opts = {}) {
    return new Promise((resolve) => {
      publish({
        id: ++_idSeq,
        kind: 'confirm',
        title: opts.title || '확인',
        message: typeof opts === 'string' ? opts : (opts.message ?? ''),
        okText: opts.okText || '확인',
        cancelText: opts.cancelText || '취소',
        destructive: !!opts.destructive,
        resolve,
      })
    })
  },
}
