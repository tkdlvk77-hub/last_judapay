import { useState } from 'react'
import { getAccountTheme } from '../design/accountTokens'
import { COLORS, RADIUS, SHADOWS, FUND_COLORS } from '../design/tokens'
import { getExecutableWallets } from '../shared/walletsData'

// ─────────────────────────────────────────────────────────
// WalletPicker — 출금 지갑 선택 공통 컴포넌트
//
// props:
//   executeType   — 현재 집행 메뉴 타입 ('gift'|'lend'|'invest'|'freelance'|'realestate'|'invest-biz')
//   selectedId    — 현재 선택된 지갑 ID
//   onChange      — (wallet) => void
//
// 동작:
//   - 탭하면 바텀시트 열림
//   - 집행 가능 지갑: 선택 가능 (보라 체크)
//   - 집행 불가 지갑: 회색 + 자물쇠 + lockedReason 표시
//   - MY 지갑 항상 최상단
//
// 사용:
//   const [walletId, setWalletId] = useState('my')
//   <WalletPicker
//     executeType="invest-biz"
//     selectedId={walletId}
//     onChange={(w) => setWalletId(w.id)}
//   />
// ─────────────────────────────────────────────────────────

// 지갑 fund 타입별 컬러 (없으면 brand)
function getFundColor(fund, brandColor) {
  if (!fund) return brandColor
  return FUND_COLORS[fund]?.main || brandColor
}

function getFundBg(fund) {
  if (!fund) return 'rgba(91,79,232,0.10)'
  return FUND_COLORS[fund]?.bg || 'rgba(91,79,232,0.10)'
}

// 지갑 아이콘 이니셜 (발신자명 첫글자 or MY)
function WalletIcon({ wallet, brandColor }) {
  const char = wallet.id === 'my' ? 'MY' : (wallet.sender || wallet.label).charAt(0)
  const color = getFundColor(wallet.fund, brandColor || '#5B4FE8')
  const bg = getFundBg(wallet.fund)
  return (
    <div style={{
      width: '38px', height: '38px',
      borderRadius: RADIUS.md,
      background: bg,
      color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: 800,
      flexShrink: 0,
      letterSpacing: '-0.3px',
    }}>
      {char}
    </div>
  )
}

// ─── 선택된 지갑 표시 행 (탭하면 시트 열림) ──────────────
function SelectedRow({ wallet, onOpen, theme }) {
  return (
    <button onClick={onOpen}
      style={{
        width: '100%',
        background: COLORS.bgCard,
        boxShadow: SHADOWS.card,
        borderRadius: RADIUS.lg,
        border: `1.5px solid ${theme.brand}`,
        padding: '13px 14px',
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
      <WalletIcon wallet={wallet} brandColor={theme.brand} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px', fontWeight: 700,
          color: COLORS.t1, marginBottom: '2px',
        }}>
          {wallet.label}
        </div>
        <div style={{ fontSize: '11px', color: COLORS.t3 }}>
          {wallet.amount.toLocaleString()}원 · {wallet.sub}
        </div>
      </div>

      {/* 변경 버튼 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: theme.brand,
        }}>
          변경
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </button>
  )
}

// ─── 바텀시트 내 지갑 행 ─────────────────────────────────
function WalletRow({ wallet, isSelected, onSelect, theme }) {
  const disabled = !wallet.selectable

  return (
    <button
      onClick={() => !disabled && onSelect(wallet)}
      disabled={disabled}
      style={{
        width: '100%',
        background: isSelected ? 'rgba(91,79,232,0.06)' : COLORS.bgCard,
        border: isSelected ? `1.5px solid ${theme.brand}` : `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        opacity: disabled ? 0.6 : 1,
      }}>
      <WalletIcon wallet={wallet} brandColor={theme.brand} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '2px',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 700,
            color: disabled ? COLORS.t3 : COLORS.t1,
          }}>
            {wallet.label}
          </span>
          {/* 잔액 */}
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: disabled ? COLORS.t4 : (wallet.id === 'my' ? theme.brand : COLORS.t2),
          }}>
            {wallet.amount.toLocaleString()}원
          </span>
        </div>

        {/* 집행 불가 이유 */}
        {disabled && wallet.lockedReason ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', color: COLORS.t4,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {wallet.lockedReason}
          </div>
        ) : (
          <div style={{ fontSize: '10px', color: COLORS.t4 }}>
            {wallet.sub}
          </div>
        )}
      </div>

      {/* 선택 표시 */}
      {isSelected && !disabled && (
        <div style={{
          width: '20px', height: '20px',
          borderRadius: '50%',
          background: theme.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  )
}

export default function WalletPicker({ executeType, selectedId, onChange }) {
  const theme = getAccountTheme()
  const [open, setOpen] = useState(false)
  const wallets = getExecutableWallets(executeType)
  const selected = wallets.find(w => w.id === selectedId) || wallets.find(w => w.selectable) || wallets[0]

  const handleSelect = (wallet) => {
    onChange(wallet)
    setOpen(false)
  }

  const executableCount = wallets.filter(w => w.selectable).length

  return (
    <>
      {/* 선택된 지갑 표시 행 */}
      <SelectedRow wallet={selected} onOpen={() => setOpen(true)} theme={theme} />

      {/* 바텀시트 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 200,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '390px',
              background: '#fff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '8px 16px 32px',
              maxHeight: '75vh', overflowY: 'auto',
            }}>
            {/* 핸들 */}
            <div style={{
              width: '40px', height: '4px',
              background: COLORS.border, borderRadius: '2px',
              margin: '8px auto 18px',
            }} />

            {/* 제목 */}
            <div style={{
              fontSize: '16px', fontWeight: 700,
              color: COLORS.t1,
              marginBottom: '4px',
            }}>
              출금 지갑 선택
            </div>
            <div style={{
              fontSize: '11px', color: COLORS.t4,
              marginBottom: '16px',
            }}>
              이 집행에 사용할 지갑을 선택하세요 · 사용 가능 {executableCount}개
            </div>

            {/* 지갑 목록 */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: '8px',
            }}>
              {wallets.map(w => (
                <WalletRow
                  key={w.id}
                  wallet={w}
                  isSelected={w.id === selected.id}
                  onSelect={handleSelect}
                  theme={theme}
                />
              ))}
            </div>

            {/* 안내 */}
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: '#EDF3FA',
              borderRadius: RADIUS.md,
              fontSize: '11px', color: '#1E5294', lineHeight: 1.6,
            }}>
              받은 권한 자금은 보내준 사람의 설정 범위 내에서만 집행 가능해요. 집행 시 보내준 사람에게 자동 알림이 발송됩니다.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
