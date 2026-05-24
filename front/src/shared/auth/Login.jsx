// ─────────────────────────────────────────────────────────
// Login.jsx — 2단계 로그인
//
//   1단계: 휴대폰 번호 입력 → /verify-identity 호출
//          - 응답 isRegistered = true 면 PIN 화면으로
//          - false 면 회원가입 안내
//   2단계: PIN 6자리 입력 → /login-pin 호출
//          - 성공 시 HttpOnly Cookie 발급 → 홈으로
//          - 실패 5회 → 서버에서 30분 잠금
// ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'
import { verifyIdentity, loginPin } from '../../services/auth'
import { bridgeAvailable, hasStoredPin, loginPinWithBio } from '../../services/biometric'
import { session } from '../../services/api'
import { hydrateHome } from '../../services/hydrate'
import { dialog } from '../../components/Dialog'

const KEYS_WITH_FACEID = [1,2,3,4,5,6,7,8,9,'faceid',0,'del']
const KEYS_NO_FACEID   = [1,2,3,4,5,6,7,8,9,null,    0,'del']
const SUB = {2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}

const S = {
  backRow:    { display:'flex', alignItems:'center', gap:'4px', padding:'4px 16px 16px' },
  backBtn:    { width:'32px', height:'32px', background:'none', border:'none', fontSize:'22px', color:'#9B9990', cursor:'pointer', padding:'0' },
  title:      { fontSize:'21px', fontWeight:'700', color:'#111', lineHeight:'1.35', marginBottom:'6px' },
  sub:        { fontSize:'13px', color:'#9B9990', marginBottom:'24px' },
  fieldLabel: { fontSize:'11px', color:'#9B9990', fontWeight:'500', marginBottom:'5px' },
  fieldInput: { width:'100%', height:'48px', border:'1.5px solid #111', borderRadius:'14px', padding:'0 16px', background:'#fff', fontSize:'15px', color:'#111', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
  btnPrimary: { width:'100%', height:'52px', background:'#111', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' },
  btnDisabled:{ width:'100%', height:'52px', background:'#E8E4DC', color:'#9B9990', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'not-allowed', fontFamily:'inherit' },
  err:        { background:'#FEF2F2', borderRadius:'10px', padding:'10px 12px', fontSize:'11px', color:'#DC2626', marginBottom:'14px' },
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

function Keypad({ onKey, disabled, withFaceId }) {
  const keys = withFaceId ? KEYS_WITH_FACEID : KEYS_NO_FACEID
  return (
    <div className="keypad-safe" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', paddingLeft:'28px', paddingRight:'28px', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {keys.map((k, i) => (
        <button key={i} onClick={() => onKey(k)}
          style={{
            height:'58px', borderRadius:'16px',
            background: k === 'del' || k === 'faceid' ? 'transparent' : k === null ? 'transparent' : '#F2EFE9',
            border:'none', cursor: k === null ? 'default' : 'pointer', fontFamily:'inherit',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
          }}>
          {k === 'del' ? (
            <span style={{ fontSize:'20px', color:'#9B9990' }}>⌫</span>
          ) : k === 'faceid' ? (
            <svg width="24" height="24" viewBox="0 0 42 42" fill="none">
              <rect x="9" y="4" width="24" height="34" rx="5" stroke="#E8622A" strokeWidth="2"/>
              <circle cx="21" cy="21" r="7" stroke="#E8622A" strokeWidth="2"/>
              <circle cx="21" cy="21" r="2" fill="#E8622A"/>
            </svg>
          ) : k !== null ? (
            <>
              <span style={{ fontSize:'22px', fontWeight:'500', color:'#111', lineHeight:1 }}>{k}</span>
              {SUB[k] && <span style={{ fontSize:'9px', color:'#C8C5BE', letterSpacing:'1.5px' }}>{SUB[k]}</span>}
            </>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login: ctxLogin } = useUser()

  // phase: 'phone' | 'pin'
  const [phase, setPhase] = useState('phone')

  // 1단계 — 본인인증
  const [phone, setPhone] = useState('010-1234-5678')   // 데모 prefill
  const [identity, setIdentity] = useState(null)
  const [phoneError, setPhoneError] = useState(null)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [authDone, setAuthDone] = useState(false)
  const [notRegistered, setNotRegistered] = useState(false)

  // 2단계 — PIN
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(null)
  const [pinLoading, setPinLoading] = useState(false)

  // 네이티브 셸 + Keychain 에 저장된 PIN 있음 여부 (Face ID 버튼 노출 조건)
  const [bioEnabled, setBioEnabled] = useState(false)
  useEffect(() => {
    if (phase !== 'pin') return
    if (!bridgeAvailable()) { setBioEnabled(false); return }
    hasStoredPin().then(setBioEnabled)
  }, [phase])

  useStatusBarStyle('dark')

  const handleBack = () => {
    if (phase === 'pin') {
      setPhase('phone'); setPin(''); setPinError(null)
      setAuthDone(false); setNotRegistered(false); setPhoneError(null)
      return
    }
    navigate('/')
  }

  // ── 1단계: 본인인증 ─────────────────────────────────
  const doVerify = async () => {
    setPhoneLoading(true)
    setPhoneError(null)
    setNotRegistered(false)
    try {
      const data = await verifyIdentity({ phone })
      if (!data.isRegistered) {
        // 비가입자 차단 — 회원가입 안내
        setNotRegistered(true)
        setPhoneError('가입된 사용자가 아닙니다.')
        return
      }
      setIdentity(data)
      setAuthDone(true)
      // SignupPersonal 과 동일하게 0.6s 후 다음 단계로 자동 진행
      setTimeout(() => setPhase('pin'), 600)
    } catch (e) {
      setPhoneError(e?.message || '본인인증에 실패했습니다.')
    } finally {
      setPhoneLoading(false)
    }
  }

  // ── 2단계: PIN 입력 → 서버 검증 ────────────────────
  const onPinKey = (k) => {
    if (pinLoading) return
    if (k === 'faceid') { doFaceIdLogin(); return }
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + String(k)
    setPin(next)
    if (next.length === 6) {
      setTimeout(() => submitPin(next), 300)
    }
  }

  // ── Face ID 로그인 ─────────────────────────────────
  const doFaceIdLogin = async () => {
    if (!identity?.ci) return
    if (!bioEnabled) return
    setPinLoading(true)
    setPinError(null)
    try {
      const data = await loginPinWithBio({ ci: identity.ci })
      if (data?.requiresStepUp) {
        // 새 디바이스/위험 신호 — PIN 재입력으로 안내
        setPinError('새 디바이스가 감지되었습니다. 보안 확인을 위해 PIN을 한 번 더 입력해 주세요.')
        setPin('')
        return
      }
      finishLogin(data)
    } catch (e) {
      const msg = e?.message || ''
      if (msg.includes('canceled') || msg.includes('auth canceled')) {
        // 사용자 취소 — 에러 표시 안 함
      } else {
        setPinError(msg || 'Face ID 인증에 실패했습니다.')
      }
    } finally {
      setPinLoading(false)
    }
  }

  const submitPin = async (finalPin) => {
    setPinLoading(true)
    setPinError(null)
    try {
      const data = await loginPin({ ci: identity.ci, pin: finalPin })
      if (data?.requiresStepUp) {
        // 새 디바이스/위험 신호 — PIN 재입력 (두 번째 시도는 RETURNING → 통과)
        setPinError('새 디바이스가 감지되었습니다. 보안 확인을 위해 PIN을 한 번 더 입력해 주세요.')
        setPin('')
        return
      }
      finishLogin(data)
    } catch (e) {
      const msg = e?.message || 'PIN이 일치하지 않습니다.'
      // 서버에서 내려온 메시지로 alert 띄우기 — 5회 잠금 등 중요한 정보 전달
      dialog.alert({
        title: /잠금|RATE|5회/i.test(msg) ? '잠금 안내' : 'PIN 오류',
        message: msg,
      })
      setPinError(msg)
      setPin('')
    } finally {
      setPinLoading(false)
    }
  }

  /** 로그인 성공 후 공통 처리 — userType 분기 + 네비게이션. 홈 데이터는 백그라운드 prefetch. */
  const finishLogin = (data) => {
    session.setUser(data)
    const type = data?.userType === 'business' ? 'business' : 'personal'
    ctxLogin(type)
    // 홈 데이터는 백그라운드로 — navigate 를 막지 않는다.
    // 홈 컴포넌트도 자체적으로 hydrateHome 을 호출하므로 양쪽 모두에서 자연스럽게 반영.
    hydrateHome().catch(() => {})
    navigate(type === 'business' ? '/home-business' : '/home', { replace: true })
  }

  // ─────────────────────────────────────────────────
  // 1단계 UI — 휴대폰 본인인증 (SignupPersonal 과 동일 패턴)
  // ─────────────────────────────────────────────────
  if (phase === 'phone') return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={S.backRow}>
        <button style={S.backBtn} onClick={handleBack}>‹</button>
        <span style={{ fontSize:'15px', fontWeight:'700', color:'#111' }}>로그인</span>
      </div>

      <div style={{ padding:'24px 24px 0', flex:1 }}>
        <div style={S.title}>휴대폰으로<br />본인 확인을 해주세요</div>
        <div style={S.sub}>가입하신 휴대폰 번호를 입력해주세요</div>

        <div style={S.fieldLabel}>휴대폰 번호</div>
        <input
          style={{ ...S.fieldInput, marginBottom:'14px' }}
          value={phone}
          onChange={e => {
            setPhone(e.target.value)
            if (notRegistered) { setNotRegistered(false); setPhoneError(null) }
          }}
          placeholder="010-0000-0000"
          inputMode="tel"
          disabled={phoneLoading || authDone}
          autoFocus
        />

        {phoneError && <div style={S.err}>{phoneError}</div>}

        {authDone && identity && (
          <div style={{ background:'#E6F5EF', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#085041', marginBottom:'16px' }}>
            ✓ 본인인증 완료 — <strong>{identity.name}</strong>님
          </div>
        )}

        {!authDone && !notRegistered && (
          <div style={{ background:'#EDF3FA', borderRadius:'12px', padding:'12px 14px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.65', marginBottom:'18px' }}>
            아래 버튼을 누르면 KCB 인증이 시작됩니다.<br />인증 완료 후 자동으로 다음 단계로 넘어가요.
          </div>
        )}

        {notRegistered ? (
          <>
            <button
              onClick={() => navigate('/signup/personal')}
              style={S.btnPrimary}>
              회원가입하러 가기
            </button>
            <button
              onClick={() => { setNotRegistered(false); setPhoneError(null) }}
              style={{
                width:'100%', height:'44px', marginTop:'10px',
                background:'transparent', color:'#9B9990',
                border:'1px solid #E8E4DC', borderRadius:'14px',
                fontSize:'13px', cursor:'pointer', fontFamily:'inherit',
              }}>
              다른 번호로 로그인하기
            </button>
          </>
        ) : (
          <button
            onClick={doVerify}
            disabled={authDone || phoneLoading || phone.length < 9}
            style={{
              width:'100%', height:'52px',
              background: authDone ? '#E6F5EF' : (phoneLoading ? '#E8E4DC' : '#F2EFE9'),
              border: authDone ? '1px solid #2A7D5E' : '1px solid #E8E4DC',
              borderRadius:'14px', fontSize:'14px', fontWeight:'500',
              color: authDone ? '#2A7D5E' : '#555550',
              cursor: (authDone || phoneLoading) ? 'default' : 'pointer',
              fontFamily:'inherit',
            }}>
            {phoneLoading ? '인증 중...' : authDone ? '본인인증 완료' : '본인 인증하기'}
          </button>
        )}

        {!notRegistered && (
          <div style={{ marginTop:'18px', textAlign:'center' }}>
            <span style={{ fontSize:'12px', color:'#9B9990' }}>아직 회원이 아니신가요? </span>
            <button onClick={() => navigate('/signup/personal')}
              style={{ background:'transparent', border:'none', color:'#2D6BB0', fontSize:'12px', fontWeight:600, cursor:'pointer', padding:0 }}>
              회원가입
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────
  // 2단계 UI — PIN 6자리 입력
  // ─────────────────────────────────────────────────
  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={S.backRow}>
        <button style={S.backBtn} onClick={handleBack}>‹</button>
        <span style={{ fontSize:'15px', fontWeight:'700', color:'#111' }}>로그인</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 24px 0' }}>
        {/* 로고 */}
        <div style={{ width:'52px', height:'52px', background:'#111', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'14px' }}>
          <svg width="28" height="20" viewBox="0 0 38 26" fill="none">
            <rect x="1" y="1" width="36" height="24" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
            <rect x="1" y="7" width="36" height="6" fill="white" fillOpacity=".9"/>
            <circle cx="31" cy="19.5" r="4" fill="#E8622A"/>
            <circle cx="27" cy="19.5" r="4" fill="white" fillOpacity=".35"/>
          </svg>
        </div>
        <div style={{ fontSize:'18px', fontWeight:'700', color:'#111', marginBottom:'4px' }}>
          {identity?.name || '사용자'}님, 환영해요
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', marginBottom:'18px' }}>PIN 6자리를 입력해주세요</div>

        <Dots count={pin.length} />

        {pinError && (
          <div style={{ ...S.err, maxWidth:'320px', textAlign:'center' }}>
            {pinError}
          </div>
        )}
      </div>

      <div style={{ flex:1 }} />

      <Keypad onKey={onPinKey} disabled={pinLoading} withFaceId={bioEnabled} />

      <div style={{ paddingBottom:'max(28px, env(safe-area-inset-bottom))', textAlign:'center' }}>
        <button
          onClick={() => { setPhase('phone'); setPin(''); setPinError(null) }}
          style={{ fontSize:'11px', color:'#2D6BB0', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
          PIN 분실 · 다른 계정으로 로그인
        </button>
      </div>
    </div>
  )
}
