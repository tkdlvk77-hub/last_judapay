// ─────────────────────────────────────────────────────────
// SignupPin.jsx — PIN 6자리 설정 + Face ID 안내 + 가입 완료
//
// 전 단계(SignupPersonal/SignupBusiness)에서 location.state 로 받은
// { identity, bankCode, bankAccount } 와 함께 PIN을 묶어
// POST /api/v1/app/auth/signup 호출 → 서버가 HttpOnly Cookie 로 JWT 발급.
// ─────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'
import { signup } from '../../services/auth'
import { enrollPin, bridgeAvailable, biometryAvailable } from '../../services/biometric'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const SUB = {2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}

function Keypad({ onKey, disabled }) {
  return (
    <div className="keypad-safe" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', paddingLeft:'28px', paddingRight:'28px', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {KEYS.map((k, i) => (
        <button key={i} onClick={() => onKey(k)}
          style={{
            height:'58px', borderRadius:'16px',
            background: k === null ? 'transparent' : k === 'del' ? 'transparent' : '#F2EFE9',
            border:'none', fontSize:'22px', fontWeight:'500', color: k === 'del' ? '#9B9990' : '#111',
            cursor: k === null ? 'default' : 'pointer', fontFamily:'inherit',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
          }}>
          {k === 'del' ? '⌫' : k !== null ? (
            <>
              <span style={{ lineHeight:1 }}>{k}</span>
              {SUB[k] && <span style={{ fontSize:'9px', color:'#C8C5BE', letterSpacing:'1.5px' }}>{SUB[k]}</span>}
            </>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function Dots({ count, total = 6 }) {
  return (
    <div style={{ display:'flex', gap:'16px', margin:'28px 0 32px', justifyContent:'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width:'14px', height:'14px', borderRadius:'50%',
          border: i < count ? '2px solid #111' : '2px solid #E8E4DC',
          background: i < count ? '#111' : 'transparent',
          transition:'all .15s',
        }} />
      ))}
    </div>
  )
}

export default function SignupPin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useUser()
  const userType = searchParams.get('type') === 'business' ? 'business' : 'personal'

  // 전 단계에서 전달된 정보 (없으면 데모 모드)
  const state = location.state || {}
  const identity    = state.identity    || null   // { ci, di, name, phone }
  const bankCode    = state.bankCode    || null
  const bankAccount = state.bankAccount || null

  // phase: pin → pinConfirm → submitting → faceid → done
  const [phase, setPhase] = useState('pin')
  const [pin, setPin]         = useState('')
  const [pinFirst, setPinFirst] = useState('')   // 1차 입력 보존 (확인용)
  const [savedPin, setSavedPin] = useState('')   // Face ID 등록용 임시 보관 (등록 완료 후 비움)
  const [submitError, setSubmitError] = useState(null)
  const [bioInfo, setBioInfo] = useState({ available: false, type: 'none' })
  const [bioError, setBioError] = useState(null)

  useStatusBarStyle('dark')

  const onKey = (k) => {
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      if (phase === 'pin') {
        setTimeout(() => { setPinFirst(next); setPin(''); setPhase('pinConfirm') }, 400)
      } else if (phase === 'pinConfirm') {
        setTimeout(() => {
          if (next === pinFirst) {
            doSignup(next)
          } else {
            setSubmitError('두 PIN이 일치하지 않습니다. 다시 입력해주세요.')
            setPin('')
            setPinFirst('')
            setPhase('pin')
          }
        }, 400)
      }
    }
  }

  const doSignup = async (finalPin) => {
    setPhase('submitting')
    setSubmitError(null)
    try {
      await signup({
        name:         identity?.name || '사용자',
        phone:        identity?.phone || '',
        role:         userType === 'business' ? 'BUSINESS_OWNER' : 'INDIVIDUAL',
        ci:           identity?.ci || '',
        di:           identity?.di || '',
        pin:          finalPin,
        bankCode:     bankCode || undefined,
        bankAccount:  bankAccount || undefined,
        faceIdEnabled: false,   // Face ID 단계에서 별도 업데이트 (선택 시)
      })
      // Face ID 등록을 위해 finalPin 을 잠시 메모리에 보관
      setSavedPin(finalPin)
      // 네이티브 셸 + 생체인증 가능 여부 확인
      if (bridgeAvailable()) {
        const info = await biometryAvailable()
        setBioInfo(info)
      }
      setPhase('faceid')
    } catch (e) {
      setSubmitError(e?.message || '회원가입에 실패했습니다. 다시 시도해주세요.')
      setPin('')
      setPinFirst('')
      setPhase('pin')
    }
  }

  // Face ID 활성화 — 사용자가 동의 시 Keychain 에 PIN 저장
  const enableFaceId = async (use) => {
    setBioError(null)
    if (use && bridgeAvailable() && bioInfo.available) {
      try {
        const ok = await enrollPin(savedPin)
        if (!ok) setBioError('Face ID 등록에 실패했어요. 나중에 설정에서 등록할 수 있어요.')
      } catch (e) {
        setBioError(e?.message || 'Face ID 등록이 취소되었습니다.')
      }
    }
    try { sessionStorage.setItem('faceIdEnabled', String(use && !bioError)) } catch {}
    setSavedPin('')   // 메모리에서 PIN 제거
    setPhase('done')
  }

  // ── PIN 입력 (1차 / 2차 확인) ─────────────────────
  if (phase === 'pin' || phase === 'pinConfirm' || phase === 'submitting') return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ padding:'2px 20px 0', textAlign:'right', fontSize:'11px', color:'#C8C5BE' }}>
        {phase === 'pin' ? '1단계 — PIN 설정' : phase === 'pinConfirm' ? '2단계 — PIN 확인' : '처리 중...'}
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 24px 0' }}>
        <div style={{ fontSize:'21px', fontWeight:'700', color:'#111', textAlign:'center', lineHeight:'1.35', marginBottom:'6px' }}>
          {phase === 'pin' ? <>PIN 6자리를<br />설정해주세요</> :
           phase === 'pinConfirm' ? <>한 번 더<br />입력해주세요</> :
           <>가입 처리 중...</>}
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', textAlign:'center' }}>
          {phase === 'pin' ? '자금 집행 시 사용하는 비밀번호예요' :
           phase === 'pinConfirm' ? '확인을 위해 같은 PIN을 다시 입력해주세요' :
           '서버에 안전하게 등록하고 있어요'}
        </div>
        <Dots count={pin.length} />
        {submitError && (
          <div style={{ background:'#FEF2F2', borderRadius:'10px', padding:'10px 14px', fontSize:'11px', color:'#DC2626', marginBottom:'12px', maxWidth:'320px', textAlign:'center' }}>
            {submitError}
          </div>
        )}
      </div>

      <div style={{ flex:1 }} />
      <Keypad onKey={onKey} disabled={phase === 'submitting'} />
      <div style={{ paddingBottom:'24px' }} />
    </div>
  )

  // ── Face ID 안내 ─────────────────────────────────
  if (phase === 'faceid') return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ width:'100%', padding:'2px 20px 0', textAlign:'right', fontSize:'11px', color:'#C8C5BE' }}>PIN 설정 완료</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#FBE9E0', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px' }}>
          <svg width="36" height="36" viewBox="0 0 42 42" fill="none">
            <rect x="9" y="4" width="24" height="34" rx="5" stroke="#E8622A" strokeWidth="2"/>
            <circle cx="21" cy="21" r="6" stroke="#E8622A" strokeWidth="2"/>
            <circle cx="21" cy="21" r="2" fill="#E8622A"/>
          </svg>
        </div>
        <div style={{ fontSize:'21px', fontWeight:'700', color:'#111', textAlign:'center', lineHeight:'1.35', marginBottom:'8px' }}>
          Face ID로<br />더 빠르게 쓸게요
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', textAlign:'center', lineHeight:'1.65' }}>
          자금 집행 시 PIN 대신 사용할 수 있어요.<br />Face ID 정보는 기기에만 저장돼요.
        </div>
      </div>
      <div style={{ padding:'0 24px 40px', display:'flex', flexDirection:'column', gap:'10px' }}>
        {bioError && (
          <div style={{ background:'#FEF2F2', borderRadius:'10px', padding:'10px 14px', fontSize:'11px', color:'#DC2626', textAlign:'center' }}>
            {bioError}
          </div>
        )}
        <button onClick={() => enableFaceId(true)}
          disabled={bridgeAvailable() && !bioInfo.available}
          style={{
            width:'100%', height:'52px',
            background: (!bridgeAvailable() || bioInfo.available) ? '#E8622A' : '#E8E4DC',
            color: (!bridgeAvailable() || bioInfo.available) ? '#FAF8F5' : '#9B9990',
            border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600',
            cursor:'pointer', fontFamily:'inherit',
          }}>
          {!bridgeAvailable()        ? 'Face ID 설정하기 (앱에서만 가능)' :
           bioInfo.type === 'faceID' ? 'Face ID 설정하기' :
           bioInfo.type === 'touchID' ? 'Touch ID 설정하기' :
           '생체인증 사용 불가'}
        </button>
        <button onClick={() => enableFaceId(false)}
          style={{ width:'100%', height:'46px', background:'transparent', color:'#9B9990', border:'1px solid #E8E4DC', borderRadius:'16px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
          건너뛰기
        </button>
      </div>
    </div>
  )

  // ── 가입 완료 ────────────────────────────────────
  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ height:'3px', background:'#E8622A' }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 32px 0' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#FBE9E0', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'18px' }}>
          <svg width="32" height="28" viewBox="0 0 36 30">
            <path d="M2 15l11 11L34 2" stroke="#E8622A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize:'22px', fontWeight:'700', color:'#111', textAlign:'center', marginBottom:'8px' }}>가입 완료!</div>
        <div style={{ fontSize:'13px', color:'#9B9990', textAlign:'center', lineHeight:'1.75', marginBottom:'24px' }}>
          {identity?.name}님, 환영해요.<br />이제 자금을 집행하고 끝까지 관리해보세요.
        </div>
      </div>
      <div style={{ padding:'0 24px 44px' }}>
        <button onClick={() => {
            login(userType)
            navigate(userType === 'business' ? '/home-business' : '/home')
          }}
          style={{ width:'100%', height:'52px', background:'#E8622A', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
          시작하기
        </button>
      </div>
    </div>
  )
}

// (Face ID 등록 로직은 컴포넌트 내부 enableFaceId 로 이동됨)
