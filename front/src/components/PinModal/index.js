// PinModal — 공용 step-up 모달.
//
//   import { ensureStepUp } from '../components/PinModal'
//   await ensureStepUp()         // PIN 모달 띄움 → 사용자 입력 → 서버 step-up → resolve
//   addTransaction({ ... })      // 이제 server sync 가 MFA_REQUIRED 안 남
//
//   import { invalidateStepUp } from '../components/PinModal'  // 로그아웃 시 호출
//   invalidateStepUp()
//
//   <PinModalHost /> 는 main.jsx 에 한 번만 마운트.
export { ensureStepUp, invalidateStepUp } from './pinBus'
export { default as PinModalHost } from './PinModalHost'
