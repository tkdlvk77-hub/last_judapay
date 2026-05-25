// ─────────────────────────────────────────────────────────
// SignupPersonal.jsx — 개인 회원가입 흐름
//
// 단계:
//   1) 본인확인 — phone(010-1234-5678) 입력 → /api/v1/app/auth/verify-identity
//      서버 응답: { ci, di, name, phone, verifiedAt }
//   2) 출금계좌 — 은행 + 계좌번호 입력
//   3) → SignupPin 으로 이동 (모든 신원/계좌 정보 location.state 로 전달)
// ─────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'
import { useGoBack } from '../../hooks/useGoBack'
import { api } from '../../services/api'

const S = {
  backRow:        { display:'flex', alignItems:'center', gap:'4px', padding:'4px 16px 16px' },
  backBtn:        { width:'32px', height:'32px', background:'none', border:'none', fontSize:'22px', color:'#9B9990', cursor:'pointer', padding:'0' },
  title:          { fontSize:'21px', fontWeight:'700', color:'#111', lineHeight:'1.35', marginBottom:'6px' },
  sub:            { fontSize:'13px', color:'#9B9990', marginBottom:'24px' },
  noticeInfo:     { background:'#EDF3FA', borderRadius:'12px', padding:'12px 14px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.65', marginBottom:'18px' },
  noticeSuccess:  { background:'#E6F5EF', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#085041', marginBottom:'16px' },
  fieldLabel:     { fontSize:'11px', color:'#9B9990', fontWeight:'500', marginBottom:'5px' },
  fieldBox:       { height:'50px', border:'1.5px solid #E8E4DC', borderRadius:'14px', padding:'0 16px', background:'#fff', display:'flex', alignItems:'center', fontSize:'15px', color:'#111' },
  fieldInput:     { width:'100%', height:'48px', border:'1.5px solid #111', borderRadius:'14px', padding:'0 16px', background:'#fff', fontSize:'15px', color:'#111', fontFamily:'inherit', outline:'none' },
  btnPrimary:     { width:'100%', height:'52px', background:'#111', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' },
  btnDisabled:    { width:'100%', height:'52px', background:'#E8E4DC', color:'#9B9990', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'not-allowed', fontFamily:'inherit' },
  err:            { background:'#FEF2F2', borderRadius:'10px', padding:'10px 12px', fontSize:'11px', color:'#DC2626', marginBottom:'14px' },
}

function StepBar({ current, total, color = '#111' }) {
  return (
    <div style={{ display:'flex', gap:'4px', marginBottom:'24px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background: i < current ? color : '#E8E4DC' }} />
      ))}
    </div>
  )
}

const BANK_OPTIONS = [
  { code: '004', label: 'KB국민은행' },
  { code: '088', label: '신한은행' },
  { code: '020', label: '우리은행' },
  { code: '081', label: 'KEB하나은행' },
  { code: '003', label: '기업은행' },
  { code: '011', label: 'NH농협' },
  { code: '090', label: '카카오뱅크' },
  { code: '089', label: '케이뱅크' },
  { code: '092', label: '토스뱅크' },
]

// 010 휴대폰 입력 → 010-XXXX-XXXX 자동 포맷.
function formatPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0,3)}-${digits.slice(3)}`
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`
}

export default function SignupPersonal() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // ── 1단계: 본인인증 ────────────────────────────
  const [phone, setPhone] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authDone, setAuthDone] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [identity, setIdentity] = useState(null)        // { ci, di, name, phone, verifiedAt }

  // ── 2단계: 출금계좌 ────────────────────────────
  const [bankCode, setBankCode] = useState('088')
  const [bankAccount, setBankAccount] = useState('')

  // ── 2-1단계: 계좌 인증번호 ─────────────────────
  // sub: 'input' | 'codeRequested' | 'verified'
  const [accountSub, setAccountSub] = useState('input')
  const [verifyId, setVerifyId] = useState(null)
  const [demoCode, setDemoCode] = useState('1234')      // 데모 안내용
  const [accountCode, setAccountCode] = useState('')
  const [accountToken, setAccountToken] = useState(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState(null)

  useStatusBarStyle('dark')

  // 백 버튼: 위저드 중간 단계면 이전 단계, 첫 단계면 라우트 백
  const goBack = useGoBack('/')
  const handleBack = () => {
    if (step > 1) { setStep(step - 1); return }
    goBack()
  }

  // ─── 본인인증 API 호출 ─────────────────────────
  // 이미 가입된 사용자(isRegistered=true)면 가입을 막고 로그인 안내
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const doAuth = async () => {
    setAuthLoading(true)
    setAuthError(null)
    setAlreadyRegistered(false)
    try {
      const data = await api.post('/api/v1/app/auth/verify-identity', { phone })
      if (data.isRegistered) {
        // 가입자 차단
        setAlreadyRegistered(true)
        setAuthError('이미 가입된 사용자입니다.')
        return
      }
      setIdentity(data)
      setAuthDone(true)
      setTimeout(() => setStep(2), 600)
    } catch (e) {
      setAuthError(e?.message || '본인인증에 실패했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }

  // ─── 계좌 인증번호 요청 (1원 송금 mock) ───
  const requestAccountVerify = async () => {
    setAccountLoading(true)
    setAccountError(null)
    try {
      const data = await api.post('/api/v1/app/auth/account-verify-request', {
        bankCode,
        bankAccount: bankAccount.replace(/[^0-9]/g, ''),
        holderName: identity?.name || '',
      })
      setVerifyId(data.verifyId)
      setDemoCode(data.demoCode || '1234')
      setAccountSub('codeRequested')
    } catch (e) {
      setAccountError(e?.message || '계좌 인증 요청에 실패했습니다.')
    } finally {
      setAccountLoading(false)
    }
  }

  // ─── 인증번호 4자리 확인 ───
  const confirmAccountVerify = async () => {
    setAccountLoading(true)
    setAccountError(null)
    try {
      const data = await api.post('/api/v1/app/auth/account-verify-confirm', {
        verifyId,
        code: accountCode,
      })
      setAccountToken(data.accountToken)
      setAccountSub('verified')
      // 자동 다음 단계로 진행 0.6s 후
      setTimeout(() => setStep(3), 600)
    } catch (e) {
      setAccountError(e?.message || '인증번호가 일치하지 않습니다.')
    } finally {
      setAccountLoading(false)
    }
  }

  // ─── 다음 단계 (PIN 화면으로 이동, state 전달) ───
  const goToPinSetup = () => {
    navigate('/signup/pin?type=personal', {
      state: {
        identity,
        bankCode,
        bankAccount: bankAccount.replace(/[^0-9]/g, ''),
        accountToken,
      },
    })
  }

  const bankLabel = BANK_OPTIONS.find(b => b.code === bankCode)?.label || ''
  const accountValid = bankAccount.replace(/[^0-9]/g, '').length >= 10

  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={S.backRow}>
        <button style={S.backBtn} onClick={handleBack}>‹</button>
        <span style={{ fontSize:'15px', fontWeight:'700', color:'#111' }}>개인 가입</span>
      </div>

      <div style={{ padding:'0 24px', flex:1 }}>
        <div style={{ textAlign:'right', fontSize:'11px', color:'#C8C5BE', marginBottom:'4px' }}>{step}/3</div>
        <StepBar current={step} total={3} />

        {/* ── 1단계 — 본인확인 ─────────────────────── */}
        {step === 1 && (
          <>
            <div style={S.title}>휴대폰으로<br />본인 확인을 해주세요</div>
            <div style={S.sub}>KCB 본인인증을 통해 안전하게 처리됩니다</div>

            <div style={S.fieldLabel}>휴대폰 번호</div>
            <input
              style={{ ...S.fieldInput, marginBottom:'14px' }}
              value={phone}
              onChange={e => {
                setPhone(formatPhone(e.target.value))
                if (alreadyRegistered) { setAlreadyRegistered(false); setAuthError(null) }
              }}
              placeholder="010-0000-0000"
              inputMode="numeric"
              maxLength={13}
              disabled={authLoading || authDone}
            />

            {authError && <div style={S.err}>{authError}</div>}

            {authDone && identity && (
              <div style={S.noticeSuccess}>
                ✓ 본인인증 완료 — <strong>{identity.name}</strong>님
              </div>
            )}

            {!authDone && !alreadyRegistered && (
              <div style={S.noticeInfo}>
                아래 버튼을 누르면 KCB 인증이 시작됩니다.<br />인증 완료 후 자동으로 다음 단계로 넘어가요.
              </div>
            )}

            {alreadyRegistered ? (
              <>
                <button
                  onClick={() => navigate('/login')}
                  style={S.btnPrimary}>
                  로그인하러 가기
                </button>
                <button
                  onClick={() => { setAlreadyRegistered(false); setAuthError(null) }}
                  style={{
                    width:'100%', height:'44px', marginTop:'10px',
                    background:'transparent', color:'#9B9990',
                    border:'1px solid #E8E4DC', borderRadius:'14px',
                    fontSize:'13px', cursor:'pointer', fontFamily:'inherit',
                  }}>
                  다른 번호로 가입하기
                </button>
              </>
            ) : (
              <button
                onClick={doAuth}
                disabled={authDone || authLoading || phone.length < 9}
                style={{
                  width:'100%', height:'52px',
                  background: authDone ? '#E6F5EF' : (authLoading ? '#E8E4DC' : '#F2EFE9'),
                  border: authDone ? '1px solid #2A7D5E' : '1px solid #E8E4DC',
                  borderRadius:'14px', fontSize:'14px', fontWeight:'500',
                  color: authDone ? '#2A7D5E' : '#555550',
                  cursor: (authDone || authLoading) ? 'default' : 'pointer',
                  fontFamily:'inherit',
                }}>
                {authLoading ? '인증 중...' : authDone ? '본인인증 완료' : '본인 인증하기'}
              </button>
            )}
          </>
        )}

        {/* ── 2단계 — 출금계좌 (입력 → 1원 인증 → 4자리 확인) ─── */}
        {step === 2 && (
          <>
            <div style={S.title}>출금계좌를<br />등록해주세요</div>
            <div style={S.sub}>자금 충전·출금 시 사용되는 계좌입니다</div>

            <div style={S.noticeInfo}>
              본인 명의 계좌만 등록할 수 있어요. <strong>{identity?.name}</strong>님 명의의 계좌를 입력해주세요.
            </div>

            <div style={S.fieldLabel}>은행</div>
            <select
              style={{ ...S.fieldInput, marginBottom:'14px', appearance:'none', backgroundImage:'none' }}
              value={bankCode}
              onChange={e => setBankCode(e.target.value)}
              disabled={accountSub !== 'input'}>
              {BANK_OPTIONS.map(b => (
                <option key={b.code} value={b.code}>{b.label}</option>
              ))}
            </select>

            <div style={S.fieldLabel}>계좌번호</div>
            <input
              style={{ ...S.fieldInput, marginBottom:'14px' }}
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value.replace(/[^0-9-]/g, ''))}
              placeholder="-없이 숫자만 입력"
              inputMode="numeric"
              disabled={accountSub !== 'input'}
            />

            {/* sub: input — 계좌 인증 요청 버튼 */}
            {accountSub === 'input' && (
              <>
                {accountError && <div style={S.err}>{accountError}</div>}
                <button
                  onClick={requestAccountVerify}
                  disabled={!accountValid || accountLoading}
                  style={accountValid && !accountLoading ? S.btnPrimary : S.btnDisabled}>
                  {accountLoading ? '요청 중...' : '계좌 인증 요청'}
                </button>
                <div style={{ fontSize:'11px', color:'#9B9990', marginTop:'10px', lineHeight:1.55 }}>
                  입력한 계좌로 <strong>1원</strong>이 입금됩니다.<br />
                  입금자명에 표시된 4자리 숫자를 입력해 확인해주세요.
                </div>
              </>
            )}

            {/* sub: codeRequested — 4자리 코드 입력 */}
            {accountSub === 'codeRequested' && (
              <>
                <div style={{ ...S.noticeSuccess, fontSize:'11px', lineHeight:1.55 }}>
                  ✓ 1원 입금 요청 완료<br />
                  입금자명 끝 4자리를 입력해주세요.
                  {demoCode && (
                    <div style={{ marginTop:'6px', color:'#085041' }}>
                      <strong>데모 모드</strong> — 인증번호: <code style={{ fontSize:'13px', fontWeight:700 }}>{demoCode}</code>
                    </div>
                  )}
                </div>
                <div style={S.fieldLabel}>인증번호 (4자리)</div>
                <input
                  style={{ ...S.fieldInput, marginBottom:'14px', textAlign:'center', letterSpacing:'8px', fontSize:'20px', fontWeight:700 }}
                  value={accountCode}
                  onChange={e => setAccountCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="0000"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                />
                {accountError && <div style={S.err}>{accountError}</div>}
                <button
                  onClick={confirmAccountVerify}
                  disabled={accountCode.length !== 4 || accountLoading}
                  style={(accountCode.length === 4 && !accountLoading) ? S.btnPrimary : S.btnDisabled}>
                  {accountLoading ? '확인 중...' : '인증 확인'}
                </button>
                <button
                  onClick={() => { setAccountSub('input'); setAccountCode(''); setAccountError(null) }}
                  style={{ width:'100%', height:'40px', background:'transparent', color:'#9B9990', border:'none', marginTop:'8px', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
                  계좌 다시 입력하기
                </button>
              </>
            )}

            {/* sub: verified — 인증 완료, 자동 다음 */}
            {accountSub === 'verified' && (
              <div style={S.noticeSuccess}>
                ✓ 계좌 인증 완료 — 잠시 후 다음 단계로 이동합니다
              </div>
            )}
          </>
        )}

        {/* ── 3단계 — PIN 설정 안내 ─────────────────── */}
        {step === 3 && (
          <>
            <div style={S.title}>마지막으로<br />PIN을 설정해주세요</div>
            <div style={S.sub}>자금 집행 시 사용되는 6자리 비밀번호입니다</div>

            <div style={S.noticeSuccess}>
              ✓ 본인인증 — <strong>{identity?.name}</strong>님<br />
              ✓ 출금계좌 — {bankLabel} {bankAccount}
            </div>

            <button onClick={goToPinSetup} style={S.btnPrimary}>
              PIN 설정하러 가기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
