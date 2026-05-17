import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { dialog } from '../components/Dialog'

// ─── 케이스 데이터 ────────────────────────────────────────
const REFUND_CASES = [
  {
    id: 'my_wallet',
    emoji: '💳',
    title: 'MY 지갑 잔액',
    badge: '즉시 처리',
    badgeColor: '#047857',
    badgeBg: '#D1FAE5',
    desc: '충전한 잔액은 언제든 본인 인증 계좌로 출금할 수 있어요. 별도 환불 신청 없이 출금 메뉴에서 바로 처리됩니다.',
    action: {
      label: '출금하러 가기',
      route: '/withdraw',
      style: 'primary',
    },
    note: null,
  },
  {
    id: 'authority_fund',
    emoji: '🔒',
    title: '권한 자금 (받은 돈)',
    badge: '발신자 문의',
    badgeColor: '#854F0B',
    badgeBg: '#FEF3C7',
    desc: '서울시 교육비, 용돈 등 타인이 보내준 권한 자금은 주다페이가 직접 환불할 수 없어요. 자금을 보내준 분께 직접 회수 요청을 하셔야 합니다.',
    action: null,
    note: '권한 자금은 발신자가 주다페이 앱에서 직접 회수 처리해야 합니다.',
  },
  {
    id: 'card_payment',
    emoji: '🧾',
    title: '카드 결제 취소',
    badge: '가맹점 처리',
    badgeColor: '#1E5294',
    badgeBg: '#EDF3FA',
    desc: '카드로 결제한 금액은 해당 가맹점에 직접 취소를 요청해 주세요. 가맹점이 취소 처리하면 권한 자금으로 자동 환원됩니다.',
    action: {
      label: '결제 내역 보기',
      route: '/payments',
      style: 'secondary',
    },
    note: '취소 처리 후 반영까지 영업일 기준 1~3일 소요될 수 있어요.',
  },
  {
    id: 'subscription',
    emoji: '📋',
    title: '서비스 이용료 (구독료)',
    badge: '고객센터 문의',
    badgeColor: '#4B5563',
    badgeBg: '#F3F4F6',
    desc: '주다페이 월 구독료 환불은 이용약관 환불 정책에 따라 처리됩니다. 결제일로부터 7일 이내 미사용 시 전액 환불, 이후에는 잔여 기간 비례 환불이 원칙입니다.',
    action: {
      label: '고객센터 문의',
      isContact: true,
      style: 'secondary',
    },
    note: null,
  },
  {
    id: 'legal',
    emoji: '⚖️',
    title: '선불전자지급수단 법적 환불 청구',
    badge: '법적 권리',
    badgeColor: '#7C3AED',
    badgeBg: '#EDE9FE',
    desc: '전자금융거래법에 따라 아래 조건에 해당하면 잔액 전액 환불을 청구할 수 있어요.',
    conditions: [
      '잔액이 2만원 이하인 경우',
      '주다페이 서비스가 폐업하는 경우',
      '천재지변 등 불가피한 사유로 사용이 불가한 경우',
      '이용자가 사망한 경우 (상속인 청구 가능)',
    ],
    action: {
      label: '법적 환불 청구 문의',
      isContact: true,
      style: 'secondary',
    },
    note: '법적 환불 청구 시 신분증 사본과 통장 사본이 필요합니다.',
  },
]

// ─── 케이스 카드 ──────────────────────────────────────────
function RefundCard({ item, onNavigate, onContact }) {
  const theme = getAccountTheme()
  return (
    <div style={{
      background: COLORS.bgCard,
      boxShadow: SHADOWS.card,
      borderRadius: RADIUS.lg,
      padding: '16px',
      marginBottom: '12px',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '10px',
      }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: RADIUS.md,
          background: item.badgeBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>
          {item.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.t1 }}>
              {item.title}
            </span>
            <span style={{
              padding: '2px 7px',
              background: item.badgeBg,
              color: item.badgeColor,
              borderRadius: RADIUS.pill,
              fontSize: '10px', fontWeight: 700,
            }}>
              {item.badge}
            </span>
          </div>
        </div>
      </div>

      {/* 설명 */}
      <div style={{
        fontSize: '12px', color: COLORS.t2,
        lineHeight: 1.65,
        marginBottom: item.conditions || item.action || item.note ? '12px' : 0,
      }}>
        {item.desc}
      </div>

      {/* 조건 목록 (법적 환불) */}
      {item.conditions && (
        <div style={{ marginBottom: '12px' }}>
          {item.conditions.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '7px',
              fontSize: '11px', color: COLORS.t2,
              lineHeight: 1.55,
              marginBottom: '4px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '4px', height: '4px',
                borderRadius: '50%',
                background: item.badgeColor,
                flexShrink: 0,
                marginTop: '6px',
              }} />
              {c}
            </div>
          ))}
        </div>
      )}

      {/* 안내 노트 */}
      {item.note && (
        <div style={{
          padding: '8px 10px',
          background: COLORS.bgMuted,
          borderRadius: RADIUS.sm,
          fontSize: '10px', color: COLORS.t4, lineHeight: 1.55,
          marginBottom: item.action ? '10px' : 0,
        }}>
          ⓘ {item.note}
        </div>
      )}

      {/* 액션 버튼 */}
      {item.action && (
        <button
          onClick={() => {
            if (item.action.isContact) onContact()
            else if (item.action.route) onNavigate(item.action.route)
          }}
          style={{
            width: '100%', height: '42px',
            background: item.action.style === 'primary' ? theme.brand : COLORS.bgMuted,
            color: item.action.style === 'primary' ? '#fff' : COLORS.t2,
            border: 'none', borderRadius: RADIUS.md,
            fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: item.action.style === 'primary' ? SHADOWS.buttonBrand : 'none',
          }}>
          {item.action.label}
        </button>
      )}
    </div>
  )
}

// ─── 고객센터 바텀시트 ────────────────────────────────────
function ContactSheet({ onClose }) {
  return (
    <div
      onClick={onClose}
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
          padding: '8px 20px 36px',
        }}>
        {/* 핸들 */}
        <div style={{
          width: '40px', height: '4px',
          background: COLORS.border, borderRadius: '2px',
          margin: '8px auto 20px',
        }} />

        <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.t1, marginBottom: '4px' }}>
          고객센터
        </div>
        <div style={{ fontSize: '11px', color: COLORS.t4, marginBottom: '20px' }}>
          평일 09:00 ~ 18:00 운영 (공휴일 제외)
        </div>

        {/* 카카오 채널 */}
        <button
          onClick={() => dialog.alert({ title: '카카오 채널', message: '카카오톡 채널로 연결됩니다.' })}
          style={{
            width: '100%', height: '52px',
            background: '#FEE500', color: '#3A1D1D',
            border: 'none', borderRadius: RADIUS.md,
            fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            marginBottom: '10px',
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#3A1D1D">
            <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.461 1.388 4.638 3.5 6.014L4.5 21l4.286-2.857C9.834 18.376 10.9 18.5 12 18.5c5.523 0 10-3.358 10-7.5S17.523 3 12 3z"/>
          </svg>
          카카오 채널 문의
        </button>

        {/* 이메일 */}
        <button
          onClick={() => dialog.alert({ title: '이메일 문의', message: 'support@judapay.com' })}
          style={{
            width: '100%', height: '52px',
            background: COLORS.bgMuted, color: COLORS.t2,
            border: 'none', borderRadius: RADIUS.md,
            fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            marginBottom: '10px',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          이메일 문의 · support@judapay.com
        </button>

        <button onClick={onClose}
          style={{
            width: '100%', height: '42px',
            background: 'transparent', color: COLORS.t4,
            border: 'none', fontSize: '13px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          닫기
        </button>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function Refund() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: COLORS.bg }}>

        {/* 헤더 */}
        <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'20px', paddingLeft:'16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => navigate(-1)}
              style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>환불 안내</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>자금 유형별 환불 정책</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 16px 32px' }}>

          {/* 케이스 카드 5개 */}
          {REFUND_CASES.map(item => (
            <RefundCard
              key={item.id}
              item={item}
              onNavigate={navigate}
              onContact={() => setContactOpen(true)}
            />
          ))}

          {/* 법적 고지 박스 */}
          <div style={{
            marginTop: '8px',
            padding: '14px 16px',
            background: '#EDE9FE',
            borderRadius: RADIUS.md,
            fontSize: '11px', color: '#5B21B6', lineHeight: 1.65,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>
              ⚖️ 법적 고지 (전자금융거래법 제16조)
            </div>
            주다페이는 선불전자지급수단 발행 사업자로서 이용자의 환불 청구권을 보장합니다.
            환불 요청 시 수수료 없이 처리하며, 10영업일 이내에 완료합니다.
          </div>

          {/* 고객센터 버튼 */}
          <button
            onClick={() => setContactOpen(true)}
            style={{
              width: '100%', height: '52px',
              background: theme.brand, color: '#fff',
              border: 'none', borderRadius: RADIUS.md,
              fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: SHADOWS.buttonBrand,
              marginTop: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            고객센터 문의
          </button>

          {/* 하단 회사 정보 */}
          <div style={{
            marginTop: '24px',
            fontSize: '10px', color: COLORS.t5,
            lineHeight: 1.6, textAlign: 'center',
          }}>
            ㈜주다컴퍼니 · 대표 이호형 · 234-56-78912<br />
            선불전자지급수단 발행 사업자 등록 (예정)
          </div>
        </div>
      </div>

      {/* 고객센터 바텀시트 */}
      {contactOpen && (
        <ContactSheet onClose={() => setContactOpen(false)} />
      )}
    </PhoneShell>
  )
}
