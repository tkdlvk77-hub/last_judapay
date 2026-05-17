import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { dialog } from '../components/Dialog'

// ─── 은행 메타 (로고 색·이니셜) ────────────────────────
// 1차 MVP는 컬러 + 이니셜로 처리. 추후 실제 SVG 로고로 교체 가능.
const BANK_META = {
  kb:    { name: 'KB국민은행',   color: '#FFB300', short: 'KB' },
  kakao: { name: '카카오뱅크',   color: '#FFE600', short: 'k', textColor: '#3C2929' },
  toss:  { name: '토스뱅크',     color: '#0064FF', short: 'T' },
  shinhan:{ name: '신한은행',    color: '#0046FF', short: '신' },
  woori: { name: '우리은행',     color: '#1872E1', short: '우' },
  hana:  { name: '하나은행',     color: '#00857A', short: '하' },
  nh:    { name: '농협은행',     color: '#0E6E37', short: 'N' },
  ibk:   { name: '기업은행',     color: '#0066B3', short: 'I' },
}

// 데모 데이터 — 본인 명의 인증 계좌 2개 (국민은행)
const INITIAL_ACCOUNTS = [
  {
    id: 'acc_1',
    bank: 'kb',
    number: '1234-**-***-5678',
    holder: '이호형',
    isPrimary: true,
    verifiedAt: '2026.04.12',
  },
  {
    id: 'acc_2',
    bank: 'kb',
    number: '9876-**-***-5432',
    holder: '이호형',
    isPrimary: false,
    verifiedAt: '2026.04.28',
  },
]

// ─── 헤더 (보라 그라데이션) ─────────────────────────
function Header({ onBack }) {
  const theme = getAccountTheme()
  return (
    <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'20px', paddingLeft:'16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack}
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>연결 계좌 관리</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>출금 및 충전 연결 계좌</div>
        </div>
      </div>
    </div>
  )
}

// ─── 은행 로고 (컬러 동그라미 + 이니셜) ───────────────
function BankLogo({ bank }) {
  const meta = BANK_META[bank] || BANK_META.kb
  return (
    <div style={{
      width: '40px', height: '40px',
      borderRadius: '50%',
      background: meta.color,
      color: meta.textColor || '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '15px', fontWeight: 800,
      flexShrink: 0,
      letterSpacing: '-0.3px',
    }}>
      {meta.short}
    </div>
  )
}

// ─── 계좌 카드 ───────────────────────────────────────
function AccountCard({ account, onMore }) {
  const theme = getAccountTheme()
  const meta = BANK_META[account.bank] || BANK_META.kb
  return (
    <div style={{
      background: COLORS.bgCard,
      boxShadow: SHADOWS.card,
      border: account.isPrimary ? `1.5px solid ${theme.brand}` : '1.5px solid transparent',
      borderRadius: RADIUS.lg,
      padding: '16px 18px',
      position: 'relative',
    }}>
      {/* 대표 계좌 배지 (우상단) */}
      {account.isPrimary && (
        <div style={{
          position: 'absolute',
          top: '-8px', left: '14px',
          background: theme.brand,
          color: '#fff',
          fontSize: '10px', fontWeight: 700,
          padding: '3px 10px',
          borderRadius: RADIUS.pill,
          boxShadow: SHADOWS.buttonBrand,
          letterSpacing: '-0.1px',
        }}>
          대표 계좌
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BankLogo bank={account.bank} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '3px',
          }}>
            <span style={{
              fontSize: '14px', fontWeight: 700,
              color: COLORS.t1,
            }}>
              {meta.name}
            </span>
            {/* 인증 ✓ 마크 */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '14px', height: '14px',
              background: COLORS.success,
              borderRadius: '50%',
              flexShrink: 0,
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
          </div>
          <div style={{
            fontSize: '13px',
            color: COLORS.t2,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            letterSpacing: '0.2px',
            marginBottom: '3px',
          }}>
            {account.number}
          </div>
          <div style={{
            fontSize: '11px',
            color: COLORS.t4,
          }}>
            {account.holder} · {account.verifiedAt} 인증
          </div>
        </div>

        {/* 더보기 ⋯ */}
        <button onClick={onMore}
          style={{
            width: '32px', height: '32px',
            background: 'transparent',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            flexShrink: 0,
            marginRight: '-6px',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── 새 계좌 등록 버튼 (점선 카드) ────────────────────
function AddAccountButton({ onClick }) {
  const theme = getAccountTheme()
  return (
    <button onClick={onClick}
      style={{
        width: '100%',
        background: 'transparent',
        border: `1.5px dashed ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: '18px 18px',
        cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = theme.brand
        e.currentTarget.style.background = 'rgba(91,79,232,0.03)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = COLORS.border
        e.currentTarget.style.background = 'transparent'
      }}>
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '50%',
        background: 'rgba(91,79,232,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px', fontWeight: 700,
          color: theme.brand,
          marginBottom: '2px',
        }}>
          새 계좌 등록
        </div>
        <div style={{
          fontSize: '11px',
          color: COLORS.t4,
        }}>
          1원 인증으로 본인 명의 확인
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}

// ─── 액션 시트 (계좌 더보기) ──────────────────────────
function ActionSheet({ account, onClose, onSetPrimary, onDelete, canManageAccount }) {
  const theme = getAccountTheme()
  if (!account) return null
  const meta = BANK_META[account.bank] || BANK_META.kb

  return (
    <>
      {/* 백드롭 */}
      <div onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 100,
        }} />

      {/* 시트 */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: '12px 20px 28px',
        zIndex: 101,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
      }}>
        {/* 핸들 바 */}
        <div style={{
          width: '40px', height: '4px',
          background: COLORS.border,
          borderRadius: '2px',
          margin: '0 auto 18px',
        }} />

        {/* 계좌 정보 미니 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 0 16px',
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          marginBottom: '8px',
        }}>
          <BankLogo bank={account.bank} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t1 }}>
              {meta.name}
            </div>
            <div style={{
              fontSize: '12px', color: COLORS.t3,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}>
              {account.number}
            </div>
          </div>
        </div>

        {/* 액션들 */}
        {canManageAccount ? (
          <>
            {!account.isPrimary && (
              <button onClick={onSetPrimary}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '14px 4px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                <div style={{
                  width: '32px', height: '32px',
                  borderRadius: RADIUS.sm,
                  background: 'rgba(91,79,232,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/>
                  </svg>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.t1 }}>
                  대표 계좌로 설정
                </span>
              </button>
            )}

            <button onClick={onDelete}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '14px 4px',
                display: 'flex', alignItems: 'center', gap: '12px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
              <div style={{
                width: '32px', height: '32px',
                borderRadius: RADIUS.sm,
                background: COLORS.dangerBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.danger} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/>
                  <path d="M14 11v6"/>
                </svg>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.danger }}>
                계좌 등록 해제
              </span>
            </button>
          </>
        ) : (
          <div style={{
            padding: '14px 4px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: '32px', height: '32px',
              borderRadius: RADIUS.sm,
              background: '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: '15px',
            }}>
              🔒
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.t2, marginBottom: '2px' }}>
                계좌 관리 권한 없음
              </div>
              <div style={{ fontSize: '11px', color: COLORS.t4, lineHeight: 1.5 }}>
                계좌 등록·해제는 최고관리자·관리자만 가능합니다
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── 삭제 확인 모달 ───────────────────────────────────
function ConfirmModal({ account, onCancel, onConfirm }) {
  if (!account) return null
  const meta = BANK_META[account.bank] || BANK_META.kb

  return (
    <>
      <div onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 200,
        }} />

      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '320px',
        background: '#fff',
        borderRadius: RADIUS.lg,
        padding: '24px 22px 20px',
        zIndex: 201,
        boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          fontSize: '17px', fontWeight: 700,
          color: COLORS.t1,
          marginBottom: '8px',
          letterSpacing: '-0.3px',
        }}>
          계좌 등록 해제
        </div>
        <div style={{
          fontSize: '13px',
          color: COLORS.t3,
          lineHeight: 1.55,
          marginBottom: '20px',
        }}>
          <strong style={{ color: COLORS.t1 }}>{meta.name} {account.number}</strong> 계좌를 등록 해제할까요? 다시 사용하려면 1원 인증을 새로 진행해야 해요.
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 0',
              background: COLORS.bgMuted,
              color: COLORS.t1,
              border: 'none',
              borderRadius: RADIUS.md,
              fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            취소
          </button>
          <button onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 0',
              background: COLORS.danger,
              color: '#fff',
              border: 'none',
              borderRadius: RADIUS.md,
              fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            해제
          </button>
        </div>
      </div>
    </>
  )
}

export default function AccountManagement() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS)
  const [sheetAccount, setSheetAccount] = useState(null)
  const [confirmAccount, setConfirmAccount] = useState(null)

  // [권한] 계좌 등록·해제·대표설정은 master/admin만 가능
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const ACCOUNT_MANAGE_ROLES = ['master', 'admin']
  const canManageAccount = ACCOUNT_MANAGE_ROLES.includes(bizRole)

  const handleSetPrimary = () => {
    if (!sheetAccount) return
    setAccounts(prev =>
      prev.map(a => ({ ...a, isPrimary: a.id === sheetAccount.id }))
    )
    setSheetAccount(null)
  }

  const handleDeleteRequest = () => {
    setConfirmAccount(sheetAccount)
    setSheetAccount(null)
  }

  const handleConfirmDelete = () => {
    if (!confirmAccount) return
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== confirmAccount.id)
      // 대표 계좌 삭제 시 첫 계좌를 자동 대표로
      if (confirmAccount.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true }
      }
      return next
    })
    setConfirmAccount(null)
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: COLORS.bg, position: 'relative' }}>
        <Header onBack={() => navigate(-1)} />

        <div style={{ padding: '20px 16px 32px' }}>

          {/* 등록된 계좌 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '0 4px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.t1 }}>
              등록된 계좌 ({accounts.length})
            </span>
            <span style={{
              fontSize: '11px', color: COLORS.t4,
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLORS.success} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              본인 명의 확인됨
            </span>
          </div>

          {/* 계좌 목록 */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: '12px',
            marginBottom: '20px',
            paddingTop: '8px', // 대표 배지 공간
          }}>
            {accounts.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7 }}>
                  등록된 계좌가 없습니다.
                </div>
              </div>
            ) : accounts.map(acc => (
              <AccountCard key={acc.id}
                account={acc}
                onMore={() => setSheetAccount(acc)}
              />
            ))}

            {/* 새 계좌 등록 — master/admin만 가능 */}
            {canManageAccount ? (
              <AddAccountButton onClick={() => dialog.alert({ title: '1원 인증', message: '추후 구현될 기능입니다.' })} />
            ) : (
              <div style={{
                width: '100%',
                background: '#F9FAFB',
                border: `1.5px dashed ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                padding: '18px 18px',
                display: 'flex', alignItems: 'center', gap: '12px',
                opacity: 0.7,
              }}>
                <div style={{
                  width: '40px', height: '40px',
                  borderRadius: '50%',
                  background: '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '18px',
                }}>
                  🔒
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.t3, marginBottom: '2px' }}>
                    새 계좌 등록
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.t4 }}>
                    최고관리자·관리자만 등록할 수 있습니다
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 안내 박스 */}
          <div style={{
            background: '#EDF3FA',
            borderRadius: RADIUS.lg,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '18px', height: '18px',
                borderRadius: '50%',
                background: '#1E5294',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                flexShrink: 0, marginTop: '1px',
              }}>
                i
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px', fontWeight: 700,
                  color: '#1E5294',
                  marginBottom: '6px',
                }}>
                  연결 계좌는 어떻게 사용되나요?
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#2D6BB0',
                  lineHeight: 1.65,
                  marginBottom: '10px',
                }}>
                  MY 지갑 충전과 출금에 사용돼요. <strong>본인 명의 1원 인증</strong>을 거친 계좌만 등록 가능하며, 타인 명의 계좌로는 출금할 수 없어요. 대표 계좌는 충전/출금 화면에서 기본 선택됩니다.
                </div>
                <div style={{
                  paddingTop: '10px',
                  borderTop: '1px solid #B5CFE8',
                  fontSize: '11px',
                  color: '#1E5294',
                  fontWeight: 600,
                }}>
                  쿠콘 계좌실명조회 적용 · 5년 보관
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 액션 시트 */}
        <ActionSheet
          account={sheetAccount}
          onClose={() => setSheetAccount(null)}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeleteRequest}
          canManageAccount={canManageAccount}
        />

        {/* 삭제 확인 */}
        <ConfirmModal
          account={confirmAccount}
          onCancel={() => setConfirmAccount(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </PhoneShell>
  )
}
