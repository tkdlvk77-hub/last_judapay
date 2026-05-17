import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomTab from '../components/BottomTab'
import { useUser } from '../contexts/UserContext'
import { PhoneShell, GradientHeader } from '../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { LANGUAGES, getLang, setLang } from '../design/i18n'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { dialog } from '../components/Dialog'
import { useNoSwipeBack } from '../hooks/useNoSwipeBack'

// ─────────────────────────────────────────────────────────
// 섹션 헤더 (지원/계정/숨은 기능)
// ─────────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize:'12px', fontWeight:600, color: COLORS.t4,
      padding:'20px 4px 10px',
    }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 메뉴 카드
// ─────────────────────────────────────────────────────────
function MenuItem({ icon, iconBg, title, sub, badge, badgeColor, badgeBg, active, right, onClick, locked = false }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      style={{
        width:'100%',
        padding:'14px 14px',
        background: active ? '#ECFDF5' : COLORS.bgCard,
        border: active ? '1px solid #6EE7B7' : 'none',
        boxShadow: active ? 'none' : SHADOWS.card,
        borderRadius: RADIUS.lg,
        display:'flex', alignItems:'center', gap:'12px',
        cursor: locked ? 'default' : 'pointer', fontFamily:'inherit', textAlign:'left',
        opacity: locked ? 0.55 : 1,
      }}>
      <div style={{
        width:'40px', height:'40px',
        background: iconBg,
        borderRadius:'11px',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0,
      }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:'14px', fontWeight:600,
          color: active ? '#047857' : COLORS.t1,
          marginBottom: sub ? '2px' : 0,
        }}>
          {title}
        </div>
        {sub && (
          <div style={{
            fontSize:'11px',
            color: active ? '#059669' : COLORS.t4,
            lineHeight:1.45,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {sub}
          </div>
        )}
      </div>
      {badge && (
        <span style={{
          display:'inline-flex', alignItems:'center', gap:'3px',
          padding:'3px 8px',
          background: badgeBg, color: badgeColor,
          borderRadius:'10px',
          fontSize:'10px', fontWeight:700,
          flexShrink:0,
        }}>
          {badge}
        </span>
      )}
      {right && <div style={{ flexShrink:0 }}>{right}</div>}
      <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0, marginLeft: badge ? '4px' : 0 }}>›</span>
    </button>
  )
}

const ROLES = [
  { key:'master',     label:'최고관리자', emoji:'👑', color:'#7C3AED', bg:'#F5F3FF' },
  { key:'admin',      label:'관리자',     emoji:'🛡️', color:'#1D4ED8', bg:'#EFF6FF' },
  { key:'accounting', label:'재무담당자', emoji:'💰', color:'#047857', bg:'#F0FDF4' },
  { key:'manager',    label:'승인자',     emoji:'✅', color:'#D97706', bg:'#FFFBEB' },
  { key:'staff',      label:'일반구성원', emoji:'👤', color:'#374151', bg:'#F9FAFB' },
  { key:'viewer',     label:'조회전용',   emoji:'👁️', color:'#6B7280', bg:'#F3F4F6' },
]

export default function More() {
  useNoSwipeBack()
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const [showLangSheet, setShowLangSheet] = useState(false)
  const [currentLang, setCurrentLang] = useState(getLang())
  const { logout, userType } = useUser()
  const bizRole = userType === 'business'
    ? (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : '')
    : ''
  const canManageAccount = !['viewer', 'staff'].includes(bizRole)

  // ── 테스트 역할 전환 ──────────────────────────────────────
  const [showRoleSheet, setShowRoleSheet] = useState(false)
  const [currentBizRole, setCurrentBizRole] = useState(
    () => sessionStorage.getItem('bizRole') || 'master'
  )
  const scrollRef = useScrollRestore()

  const handleRoleChange = (roleKey) => {
    sessionStorage.setItem('bizRole', roleKey)
    setCurrentBizRole(roleKey)
    setShowRoleSheet(false)
    navigate(0)
  }

  const todo = (label) => () => {
    dialog.alert({ title: label, message: '개발 예정 기능입니다.' })
  }

  const handleLogout = async () => {
    const ok = await dialog.confirm({
      title: '로그아웃',
      message: '주다페이에서 로그아웃할까요?',
      okText: '로그아웃',
      destructive: true,
    })
    if (ok) {
      logout()
      navigate('/')
    }
  }

  const handleWithdraw = () => {
    dialog.alert({
      title: '회원 탈퇴',
      message: '회원 탈퇴는 고객센터로 문의해주세요.\n진행 중인 거래·계약이 있으면 모두 정리된 후에만 탈퇴 가능합니다.',
    })
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#F4F6FB' }}>

        {/* 다크 그라데이션 헤더 */}
        <GradientHeader paddingBottom="20px" bg={theme.headerGrad}>
          <div style={{ padding:'4px 20px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'24px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>
              더보기
            </div>
            {userType === 'business' && (
              <button onClick={() => setShowRoleSheet(true)} style={{
                display:'flex', alignItems:'center', gap:'5px',
                background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
                borderRadius: RADIUS.pill, padding:'5px 10px',
                cursor:'pointer', fontFamily:'inherit',
              }}>
                <span style={{ fontSize:'12px' }}>{ROLES.find(r=>r.key===currentBizRole)?.emoji || '👑'}</span>
                <span style={{ fontSize:'11px', fontWeight:600, color:'#fff' }}>{ROLES.find(r=>r.key===currentBizRole)?.label || '최고관리자'}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            )}
          </div>

          {/* 프로필 카드 (헤더 안 글래스) */}
          <div style={{ padding:'0 20px' }}>
            <button
              onClick={() => userType === 'business' ? navigate('/company-profile') : navigate('/personal-profile')}
              style={{
                width:'100%',
                background:'rgba(255,255,255,0.10)',
                border:'1px solid rgba(255,255,255,0.14)',
                borderRadius: RADIUS.lg,
                padding:'14px 16px',
                display:'flex', alignItems:'center', gap:'12px',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                backdropFilter:'blur(10px)',
                WebkitBackdropFilter:'blur(10px)',
              }}>
              <div style={{
                width:'48px', height:'48px',
                background: theme.activeBtnGrad,
                borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
                boxShadow: theme.activeShadow,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', marginBottom:'2px' }}>
                  {userType === 'business' ? '㈜주다컴퍼니' : '이호형'}
                </div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)' }}>
                  {userType === 'business' ? '법인 계정 · 사업자번호 123-45-67890' : 'KYC 2단계 · 개인 계정'}
                </div>
              </div>
              {/* 인증 완료 배지 */}
              <span style={{
                display:'inline-flex', alignItems:'center', gap:'4px',
                padding:'4px 9px',
                background:'rgba(16,185,129,0.18)',
                color:'#34D399',
                border:'1px solid rgba(52,211,153,0.4)',
                borderRadius: RADIUS.pill,
                fontSize:'10px', fontWeight:700,
                flexShrink:0,
              }}>
                인증 완료
              </span>
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'16px', flexShrink:0 }}>›</span>
            </button>
          </div>
        </GradientHeader>

        {/* 라이트 영역 — 섹션들 */}
        <div style={{ padding:'4px 16px 24px' }}>

          {/* 숨은 기능 */}
          <SectionHeader>숨은 기능</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              }
              iconBg="#F59E0B"
              title="통합 증빙센터"
              sub="ZIP 다운로드 · 누락 항목 확인"
              badge={<><span style={{ fontSize:'9px' }}>⚠</span> 2건</>}
              badgeColor="#A02929"
              badgeBg="#FEE2E2"
              onClick={() => navigate('/evidence-center')}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              }
              iconBg="#3B82F6"
              title="집행 통계"
              sub="전체 집행 · 일별·주별·월별"
              onClick={() => navigate('/stats')}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              }
              iconBg="#059669"
              title="월간 보고서"
              sub="자금 사용처 자동 생성 · 세무사 전송"
              onClick={() => navigate('/monthly-report')}
            />
            {/* 관리자 관리 — 개인 로그인은 비노출, 기업/공공기관 분기 */}
            {userType === 'business' && (
              <MenuItem
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                }
                iconBg="#7C3AED"
                title="관리자"
                sub="구성원·카드·집행·보안 관리"
                onClick={() => navigate('/admin-management-biz')}
              />
            )}
            {userType === 'institution' && (
              <MenuItem
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                }
                iconBg="#7C3AED"
                title="관리자 관리"
                sub="결재라인·구성원·예산·증빙·감사"
                onClick={() => navigate('/admin-management')}
              />
            )}
            {userType === 'business' && (
              <MenuItem
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="M9 13l2 2 4-4"/>
                  </svg>
                }
                iconBg="#10B981"
                title="세무사 연동"
                sub="kim@samil.com 연동 중 · 매월 1일"
                active
                onClick={() => navigate('/tax-accountant')}
              />
            )}
          </div>

          {/* 계정 */}
          <SectionHeader>계정</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              }
              iconBg="#6B7280"
              title="보안 / 인증 관리"
              sub="PIN · Face ID · 기기 관리"
              onClick={() => navigate('/security')}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              }
              iconBg="#6B7280"
              title="연결 계좌 관리"
              sub={canManageAccount ? "국민 2개 등록됨" : "🔒 관리자 이상 권한 필요"}
              locked={!canManageAccount}
              onClick={() => navigate('/accounts')}
            />
          </div>

          {/* 지원 */}
          <SectionHeader>지원</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l18-5v12L3 14v-3z"/>
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                </svg>
              }
              iconBg="#EF4444"
              title="공지사항"
              badge="N"
              badgeColor="#fff"
              badgeBg="#EF4444"
              onClick={() => navigate('/notices')}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              }
              iconBg="#6B7280"
              title="도움말 / FAQ"
              onClick={() => navigate('/help-faq')}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              }
              iconBg="#3B82F6"
              title="언어 설정"
              right={<span style={{ fontSize:'12px', color: COLORS.t4, fontWeight:600 }}>{LANGUAGES.find(l => l.code === currentLang)?.nativeLabel}</span>}
              onClick={() => setShowLangSheet(true)}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                  <line x1="12" y1="6" x2="12" y2="8"/>
                  <line x1="12" y1="16" x2="12" y2="18"/>
                </svg>
              }
              iconBg="#F59E0B"
              title="환불 신청"
              onClick={() => navigate('/refund')}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              }
              iconBg="#A02929"
              title="분쟁 신고"
              onClick={() => navigate('/dispute')}
            />
          </div>

          {/* 약관 */}
          <div style={{
            marginTop:'20px',
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
          }}>
            {[
              { label:'이용약관' },
              { label:'개인정보처리방침' },
              { label:'전자금융거래 이용약관' },
            ].map((row, i, arr) => (
              <button
                key={row.label}
                onClick={todo(row.label)}
                style={{
                  width:'100%', padding:'14px 16px',
                  background:'transparent', border:'none',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                <span style={{ fontSize:'13px', color: COLORS.t2, fontWeight:500 }}>
                  {row.label}
                </span>
                <span style={{ color: COLORS.t5, fontSize:'16px' }}>›</span>
              </button>
            ))}
          </div>

          {/* 로그아웃 / 탈퇴 */}
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'14px', marginTop:'24px' }}>
            <button
              onClick={handleLogout}
              style={{ background:'none', border:'none', color: COLORS.danger, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:'4px 8px' }}>
              로그아웃
            </button>
            <span style={{ width:'1px', height:'10px', background: COLORS.border }} />
            <button
              onClick={handleWithdraw}
              style={{ background:'none', border:'none', color: COLORS.t4, fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit', padding:'4px 8px' }}>
              회원 탈퇴
            </button>
          </div>

          {/* 라이센스 정보 */}
          <div style={{
            marginTop:'14px', textAlign:'center',
            fontSize:'10px', color: COLORS.t5, lineHeight:1.6,
          }}>
            주다페이 v1.0.0 · 선불전자지급수단 발행업 · 금감원 허가
          </div>
        </div>

      </div> {/* 스크롤 영역 끝 */}

      <BottomTab />

      {/* 역할 전환 바텀시트 (기업 데모용) */}
      {showRoleSheet && (
        <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          <div onClick={() => setShowRoleSheet(false)} style={{ flex:1, background:'rgba(0,0,0,0.4)' }} />
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 0 32px' }}>
            <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:COLORS.bgMuted, margin:'0 auto 20px' }} />
            <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, padding:'0 20px 4px' }}>권한 역할 선택</div>
            <div style={{ fontSize:'11px', color:COLORS.t4, padding:'0 20px 16px' }}>데모용 — 역할에 따라 기능이 제한됩니다</div>
            {ROLES.map(role => (
              <button key={role.key}
                onClick={() => handleRoleChange(role.key)}
                style={{
                  width:'100%', padding:'13px 20px',
                  display:'flex', alignItems:'center', gap:'12px',
                  background: currentBizRole === role.key ? role.bg : 'none',
                  border:'none', cursor:'pointer', fontFamily:'inherit',
                  borderBottom: '1px solid ' + COLORS.borderSoft,
                }}>
                <span style={{ fontSize:'20px' }}>{role.emoji}</span>
                <span style={{ fontSize:'14px', fontWeight:600, color: role.color, flex:1, textAlign:'left' }}>{role.label}</span>
                {currentBizRole === role.key && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={role.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 언어 선택 바텀시트 */}
      {showLangSheet && (
        <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          <div onClick={() => setShowLangSheet(false)} style={{ flex:1, background:'rgba(0,0,0,0.4)' }} />
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 0 32px' }}>
            <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:COLORS.bgMuted, margin:'0 auto 20px' }} />
            <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, padding:'0 20px', marginBottom:'12px' }}>언어 설정</div>
            {LANGUAGES.map(lang => (
              <button key={lang.code}
                onClick={() => { setLang(lang.code); setCurrentLang(lang.code); setShowLangSheet(false) }}
                style={{
                  width:'100%', padding:'14px 20px',
                  display:'flex', alignItems:'center', gap:'14px',
                  background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                  borderBottom: '1px solid ' + COLORS.borderSoft,
                }}>
                <span style={{ fontSize:'24px' }}>{lang.flag}</span>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:COLORS.t1 }}>{lang.nativeLabel}</div>
                  <div style={{ fontSize:'11px', color:COLORS.t4 }}>{lang.label}</div>
                </div>
                {currentLang === lang.code && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.brandDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </PhoneShell>
  )
}
