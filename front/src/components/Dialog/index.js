// ─────────────────────────────────────────────────────────────
// Dialog 시스템 진입점.
//
// 어디서든:
//   import { dialog } from '../components/Dialog'
//   dialog.alert({ title:'안내', message:'...' })
//   const ok = await dialog.confirm({ title:'로그아웃', message:'...', destructive:true })
//
// 화면 어디서나 호출 가능. 단, DialogHost 가 트리에 한 번은 마운트돼 있어야 함.
// (main.jsx 에서 App 옆에 마운트되어 있음)
// ─────────────────────────────────────────────────────────────
export { default as DialogHost } from './DialogHost'
export { dialog } from './dialogBus'
