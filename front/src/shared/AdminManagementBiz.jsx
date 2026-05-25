import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'
import {
  subscribe as subscribeLog,
  getDisplayLogs,
  getAnomalyLogs,
  ACTION_LABEL,
  DISPLAY_CATEGORY,
} from './activityLogStore'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ═══════════════════════════════════════════════════════════
// ── 상수
// ═══════════════════════════════════════════════════════════
// ── 권한 체계 (기획안 6종) ─────────────────────────────────
// 최고관리자 > 관리자 > 재무담당자 / 승인자 > 일반구성원 > 조회전용
const ROLES = {
  master:     { id:'master',     label:'최고관리자', icon:'👑', color:'#7C3AED', bg:'#EDE9FE', desc:'회사 최상위 권한자 · 모든 기능 사용 가능' },
  admin:      { id:'admin',      label:'관리자',     icon:'🛠️', color:'#1D4ED8', bg:'#DBEAFE', desc:'실무 운영 · 구성원 관리 · 승인라인 설정' },
  accounting: { id:'accounting', label:'재무담당자', icon:'💼', color:'#059669', bg:'#D1FAE5', desc:'자금 집행 · 증빙 · 세금 · 카드 실무 관리' },
  manager:    { id:'manager',    label:'승인자',     icon:'✅', color:'#0891B2', bg:'#CFFAFE', desc:'지정 범위 내 자금 집행 승인 권한 보유' },
  staff:      { id:'staff',      label:'일반구성원', icon:'✏️', color:'#6B7280', bg:'#F3F4F6', desc:'집행 요청 · 증빙 제출 · 소명 응답' },
  viewer:     { id:'viewer',     label:'조회전용',   icon:'👁️', color:'#9CA3AF', bg:'#F9FAFB', desc:'보고서 · 증빙 · 사용 내역 열람만 가능' },
}

// ── 역할별 권한 매트릭스 ────────────────────────────────────
const ROLE_PERMISSIONS = {
  master: {
    can: ['구성원 초대/삭제','관리자 지정','승인 설정 변경','지갑·카드 관리','카드 출금 지갑 변경','자금 집행','최종 승인자 지정','최고관리자 권한 이전','회사 탈퇴·해지'],
    cannot: [],
    approvalScope: '모든 금액 · 모든 카테고리',
  },
  admin: {
    can: ['일반 구성원 초대/삭제','승인라인 설정','자금 집행 관리','증빙 관리','보고서 관리','자동지급 관리','카드 출금 지갑 변경'],
    cannot: ['최고관리자 삭제/권한 변경','회사 해지','본인 권한 상향'],
    approvalScope: '위임받은 범위',
  },
  accounting: {
    can: ['자금 집행 요청','자동지급 등록·관리','세금·4대보험 관리','증빙 관리','카드 내역 분류','월간 보고서 생성','카드 출금 지갑 변경'],
    cannot: ['승인 설정 변경','최고관리자 권한 변경','단독 고액 집행'],
    approvalScope: '세금·보험·정기지출',
  },
  manager: {
    can: ['승인','반려','추가 요청','승인 이력 확인','담당 집행 상세 확인'],
    cannot: ['승인 설정 변경','구성원 관리','회사 정보 변경'],
    approvalScope: '지정 금액·카테고리·지갑 범위',
  },
  staff: {
    can: ['집행 요청','증빙 제출','소명 응답','카드 내역 확인','개인 메모','파일 첨부','메시지 확인'],
    cannot: ['승인 설정 변경','구성원 관리','회사 정보 변경','단독 자금 집행'],
    approvalScope: '없음 (요청만 가능)',
  },
  viewer: {
    can: ['보고서 열람','증빙 열람','사용 내역 열람','월간 보고서 다운로드'],
    cannot: ['자금 집행','승인·반려·추가 요청','구성원 관리','설정 변경'],
    approvalScope: '없음 (조회만 가능)',
  },
}

const MEMBER_STATUS = {
  active:   { label:'재직중',    color:'#059669', bg:'#D1FAE5' },
  invited:  { label:'초대 대기', color:'#D97706', bg:'#FEF3C7' },
  inactive: { label:'비활성',    color:'#6B7280', bg:'#F3F4F6' },
  resigned: { label:'퇴사',      color:'#DC2626', bg:'#FEE2E2' },
}

const DEPT_LIST = ['경영지원', '개발팀', '마케팅', '영업팀', '디자인', '재무', '기타']

const APPROVAL_MODES = [
  { id:'none',      label:'승인 없음',       sub:'바로 집행 가능',                   icon:'⚡' },
  { id:'single',    label:'1단계 승인',       sub:'관리자 또는 대표 1명 승인',        icon:'✅' },
  { id:'double',    label:'2단계 승인',       sub:'1차 팀장 → 2차 대표 순서 승인',   icon:'✅✅' },
  { id:'threshold', label:'금액 초과시 승인', sub:'한도 이하 즉시·초과 시 승인 요청', icon:'💰' },
]

const DEMO_MEMBERS = [
  { id:'m1', name:'이대표', role:'master',     status:'active',  dept:'경영지원', position:'대표이사',     phone:'010-1234-5678', email:'ceo@company.com',   monthlyUsed:0,       monthlyLimit:null,    singleLimit:null,    approvalMode:'none',      joinDate:'2026.01.01', isSuperAdmin:true  },
  { id:'m2', name:'김관리', role:'admin',      status:'active',  dept:'경영지원', position:'운영 관리자',   phone:'010-2345-6789', email:'admin@company.com', monthlyUsed:1240000, monthlyLimit:3000000, singleLimit:500000,  approvalMode:'threshold', joinDate:'2026.02.15', isSuperAdmin:false },
  { id:'m3', name:'박승인', role:'manager',    status:'active',  dept:'개발팀',   position:'개발팀 승인자', phone:'010-3456-7890', email:'mgr@company.com',   monthlyUsed:680000,  monthlyLimit:2000000, singleLimit:300000,  approvalMode:'single',    joinDate:'2026.02.20', isSuperAdmin:false, approvalScope:'개발팀 300만원 이하' },
  { id:'m4', name:'최직원', role:'staff',      status:'active',  dept:'마케팅',   position:'마케터',       phone:'010-4567-8901', email:'staff@company.com', monthlyUsed:320000,  monthlyLimit:500000,  singleLimit:100000,  approvalMode:'single',    joinDate:'2026.03.01', isSuperAdmin:false },
  { id:'m5', name:'정재무', role:'accounting', status:'active',  dept:'재무',     position:'재무 담당자',   phone:'010-5678-9012', email:'tax@company.com',   monthlyUsed:0,       monthlyLimit:null,    singleLimit:null,    approvalMode:'none',      joinDate:'2026.03.10', isSuperAdmin:false },
  { id:'m6', name:'한신입', role:'staff',      status:'invited', dept:'마케팅',   position:'마케터 (인턴)', phone:'010-6789-0123', email:'new@company.com',   monthlyUsed:0,       monthlyLimit:200000,  singleLimit:50000,   approvalMode:'single',    joinDate:'-',          isSuperAdmin:false },
  { id:'m7', name:'조조회', role:'viewer',     status:'active',  dept:'외부',     position:'담당 세무사',   phone:'010-8888-1111', email:'tax2@samil.com',    monthlyUsed:0,       monthlyLimit:null,    singleLimit:null,    approvalMode:'none',      joinDate:'2026.04.01', isSuperAdmin:false, viewerExpiry:'2026.12.31' },
]

const DEMO_AUDIT_LOGS = [
  { id:'a1', date:'2026.05.09 14:32', actor:'김관리', action:'권한 변경',     target:'한신입 → 일반직원',      ip:'192.168.1.10' },
  { id:'a2', date:'2026.05.09 11:15', actor:'이대표', action:'구성원 초대',   target:'한신입 (마케팅/인턴)',    ip:'192.168.1.1'  },
  { id:'a3', date:'2026.05.08 16:44', actor:'박승인', action:'집행 승인',     target:'사무용품 124,000원',      ip:'192.168.1.22' },
  { id:'a4', date:'2026.05.08 09:30', actor:'정재무', action:'증빙 다운로드', target:'4월 세금계산서 전체',     ip:'192.168.1.33' },
  { id:'a5', date:'2026.05.07 17:00', actor:'시스템', action:'이상 접근 탐지',target:'미인증 IP 로그인 시도',   ip:'123.45.67.89' },
]

// ═══════════════════════════════════════════════════════════
// ── 승인 시스템 상수
// ═══════════════════════════════════════════════════════════
const STAGE2_CONDITIONS = [
  { id:'highAmount',         label:'고액 건',         sub:'500만원 이상 요청',           icon:'💰' },
  { id:'restrictedCategory', label:'제한 카테고리',   sub:'외주비·접대비 등 민감 항목',  icon:'📋' },
  { id:'restrictedFunds',    label:'제한 자금',        sub:'투자·보증금 관련 자금',       icon:'🔒' },
  { id:'newRecipient',       label:'신규 거래처',      sub:'최초 거래 상대방',            icon:'🆕' },
  { id:'anomaly',            label:'이상 징후 탐지',   sub:'AI 이상행동 분류',            icon:'⚠️' },
  { id:'missingEvidence',    label:'증빙 미첨부',      sub:'영수증·계약서 누락',          icon:'📎' },
  { id:'investmentWallet',   label:'투자 지갑 출금',   sub:'투자용 별도 지갑 출금 시',    icon:'💼' },
  { id:'manualRequest',      label:'수동 2차 요청',    sub:'1차 승인자가 직접 2차 요청',  icon:'✋' },
]

const INIT_APPROVAL_CONFIG = {
  mode: 'threshold',
  thresholds: { stage1: 1000000, stage2: 5000000, final: 10000000 },
  stage2Enabled: true,
  stage2Conditions: {
    highAmount: true, restrictedCategory: false, restrictedFunds: false,
    newRecipient: true, anomaly: false, missingEvidence: false,
    investmentWallet: false, manualRequest: true,
  },
  approvers: { stage1: ['m3','m2'], stage2: ['m2'], final: ['m1'] },
}

const APPROVAL_STATUS_CFG = {
  pending:              { label:'승인 필요',       color:'#D97706', bg:'#FEF3C7' },
  stage1_done:          { label:'1차 승인 완료',   color:'#2563EB', bg:'#DBEAFE' },
  waiting_next:         { label:'다음 승인 대기',  color:'#7C3AED', bg:'#EDE9FE' },
  approved:             { label:'최종 승인 완료',  color:'#059669', bg:'#D1FAE5' },
  pending_execute:      { label:'집행 대기',       color:'#0891B2', bg:'#CFFAFE' },
  executed:             { label:'집행 완료',       color:'#6B7280', bg:'#F3F4F6' },
  rejected:             { label:'반려',            color:'#DC2626', bg:'#FEE2E2' },
  additional_requested: { label:'추가 요청 중',    color:'#D97706', bg:'#FEF3C7' },
  resubmitted:          { label:'재제출 완료',     color:'#059669', bg:'#D1FAE5' },
}

const DEMO_APPROVAL_QUEUE = [
  { id:'aq1', title:'사무용품 구매', amount:245000,   category:'비품',   purpose:'프린터 토너 교체',   requester:'최직원', recipient:'오피스디포',  stage:'pending',              approvalStage:1, nextApprover:'박승인', requestDate:'2026.05.11', schedDate:'2026.05.14', hasEvidence:true  },
  { id:'aq2', title:'외주 개발비',   amount:5800000,  category:'외주비', purpose:'앱 UI 리뉴얼 개발',  requester:'박승인', recipient:'(주)디자인랩', stage:'stage1_done',          approvalStage:2, nextApprover:'김관리', requestDate:'2026.05.10', schedDate:'2026.05.20', hasEvidence:true  },
  { id:'aq3', title:'법인 접대비',   amount:1240000,  category:'접대비', purpose:'거래처 저녁 식사',   requester:'김관리', recipient:'강남그릴',     stage:'waiting_next',         approvalStage:2, nextApprover:'김관리', requestDate:'2026.05.09', schedDate:'2026.05.12', hasEvidence:false },
  { id:'aq4', title:'마케팅 광고비', amount:3200000,  category:'광고비', purpose:'SNS 광고 집행',      requester:'최직원', recipient:'메타코리아',   stage:'additional_requested', approvalStage:1, nextApprover:'박승인', requestDate:'2026.05.08', schedDate:'2026.05.15', hasEvidence:true  },
  { id:'aq5', title:'서버 장비 구매',amount:12000000, category:'비품',   purpose:'서버 장비 교체',     requester:'박승인', recipient:'삼성SDS',      stage:'approved',             approvalStage:3, nextApprover:'이대표', requestDate:'2026.05.07', schedDate:'2026.05.25', hasEvidence:true  },
]

// ═══════════════════════════════════════════════════════════
// ── 유틸
// ═══════════════════════════════════════════════════════════
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }

// ═══════════════════════════════════════════════════════════
// ── 공통 컴포넌트
// ═══════════════════════════════════════════════════════════
function Header({ onBack, title, sub, right }) {
  const theme = getAccountTheme()
  return (
    <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'18px', paddingLeft:'16px', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <button onClick={onBack} style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'19px', fontWeight:700, color:'#fff', letterSpacing:'-0.4px' }}>{title}</div>
          {sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginTop:'2px' }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )
}

function SectionTitle({ label, color, extra }) {
  const theme = getAccountTheme()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
        <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: color || theme.brand }}/>
        <span style={{ fontSize:'11px', fontWeight:700, color: color || theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
      </div>
      {extra}
    </div>
  )
}

function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{ width:'46px', height:'26px', borderRadius:'13px', border:'none', cursor:'pointer', background: on ? brand : COLORS.bgMuted, position:'relative', transition:'background 0.2s', padding:0, flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '23px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
    </button>
  )
}

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.viewer
  return <span style={{ padding:'2px 8px', borderRadius:'20px', background:r.bg, color:r.color, fontSize:'10px', fontWeight:700, whiteSpace:'nowrap' }}>{r.icon} {r.label}</span>
}

function StatusBadge({ status }) {
  const s = MEMBER_STATUS[status] || MEMBER_STATUS.inactive
  return <span style={{ padding:'2px 8px', borderRadius:'20px', background:s.bg, color:s.color, fontSize:'10px', fontWeight:700 }}>{s.label}</span>
}

function Avatar({ name, role, size = 44 }) {
  const r = ROLES[role] || ROLES.viewer
  return (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:`${Math.floor(size*0.36)}px`, fontWeight:700, color:r.color, flexShrink:0 }}>
      {name[0]}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 1. 메인 허브 (리디자인)
// ═══════════════════════════════════════════════════════════
function MainHub({ members, onNav, bizRole }) {
  const navigate    = useNavigate()
  const { currentUser } = useUser()
  const active   = members.filter(m => m.status === 'active').length
  const invited  = members.filter(m => m.status === 'invited').length

  // 역할별 색상 (MembersView와 동일)
  const ROLE_STYLE = {
    master:     { label:'최고관리자', color:'#6D28D9', bg:'#F3EEFF' },
    admin:      { label:'관리자',     color:'#1D4ED8', bg:'#EEF2FF' },
    accounting: { label:'재무담당자', color:'#0D7750', bg:'#E6F6EF' },
    manager:    { label:'승인자',     color:'#0369A1', bg:'#E0F2FE' },
    staff:      { label:'일반구성원', color:'#374151', bg:'#F3F4F6' },
    viewer:     { label:'조회전용',   color:'#6B7280', bg:'#F9FAFB' },
  }

  const STATUS_COLOR = {
    active:  { label:'재직중',    color:'#0D7750', bg:'#E6F6EF' },
    invited: { label:'초대 대기', color:'#92590A', bg:'#FEF3E0' },
  }

  const modules = [
    { id:'members',  label:'구성원 관리', sub:`재직 ${active}명 · 초대 ${invited}명`, badge: invited > 0 ? invited : null, iconBg:'#EEF2FF', iconColor:'#1D4ED8',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id:'company',  label:'기업 설정',   sub:'회사정보 · 계좌 · API 연동',          iconBg:'#FEF3E0', iconColor:'#92590A',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92590A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
    // [권한] 보안 및 감사: master 전용. admin은 잠금 표시.
    { id:'security', label:'보안 및 감사', sub: bizRole === 'master' ? '활동로그 · 이상탐지 · 디바이스' : '최고관리자 전용 메뉴', badge: bizRole === 'master' ? 1 : null, locked: bizRole !== 'master', iconBg: bizRole === 'master' ? '#FEE9E9' : '#F3F4F6', iconColor: bizRole === 'master' ? '#C0392B' : '#9CA3AF',
      icon: bizRole === 'master'
        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { id:'approval', label:'승인 설정', sub:'승인 흐름 · 승인자 배정 · 조건',       iconBg:'#EDE9FE', iconColor:'#7C3AED',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  ]

  const theme = getAccountTheme()

  return (
    <>
      {/* ── 헤더 (통일 그라디언트) */}
      <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'22px', paddingLeft:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
          <button onClick={() => navigate(-1)}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'19px', fontWeight:700, color:'#fff', letterSpacing:'-0.4px' }}>관리자</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>㈜주다컴퍼니</div>
          </div>
          {/* 로그인 사용자 배지 */}
          {currentUser && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.15)', borderRadius:'20px', padding:'4px 10px 4px 6px' }}>
                <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#fff' }}>
                  {currentUser.name[0]}
                </div>
                <span style={{ fontSize:'11px', fontWeight:700, color:'#fff' }}>{currentUser.name}</span>
              </div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.65)', paddingRight:'4px' }}>
                {currentUser.roleLabel || '최고관리자'} {currentUser.isSuperAdmin && '👑'}
              </div>
            </div>
          )}
        </div>

        {/* 요약 2칸 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <div style={{ background:'rgba(255,255,255,0.13)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'14px', padding:'13px 14px' }}>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.65)', fontWeight:600, marginBottom:'6px' }}>전체 구성원</div>
            <div style={{ fontSize:'24px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px', marginBottom:'3px' }}>{members.length}명</div>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.5)' }}>재직 {active} · 초대 {invited}</div>
          </div>
          <div style={{ background:'rgba(239,68,68,0.18)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'14px', padding:'13px 14px' }}>
            <div style={{ fontSize:'10px', color:'rgba(252,165,165,0.9)', fontWeight:600, marginBottom:'6px' }}>이상 탐지</div>
            <div style={{ fontSize:'24px', fontWeight:800, color:'#FCA5A5', letterSpacing:'-0.5px', marginBottom:'3px' }}>1건</div>
            <div style={{ fontSize:'10px', color:'rgba(252,165,165,0.7)' }}>미조치 항목</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 36px', background:'#F8F9FB', minHeight:'100%' }}>

        {/* ── 이상 탐지 배너 */}
        <div style={{ background:'#fff', border:'1px solid #FCCFCF', borderRadius:'14px', padding:'13px 14px', display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#FEE9E9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>이상 접근 탐지됨</div>
            <div style={{ fontSize:'11px', color:'#9CA3AF' }}>해외 IP 로그인 시도 — 즉시 확인 필요</div>
          </div>
          <button onClick={() => onNav('security')}
            style={{ padding:'6px 13px', background:'#111827', color:'#fff', border:'none', borderRadius:'8px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            확인
          </button>
        </div>

        {/* ── 메뉴 */}
        <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>메뉴</div>
        <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:'24px' }}>
          {modules.map((mod, i) => (
            <button key={mod.id}
              onClick={() => !mod.locked && onNav(mod.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:'14px', padding:'16px', background:'transparent', border:'none', borderBottom: i < modules.length-1 ? '1px solid #F0F1F3' : 'none', borderLeft:'3px solid transparent', cursor: mod.locked ? 'not-allowed' : 'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.12s', opacity: mod.locked ? 0.6 : 1 }}
              onMouseEnter={e => { if (!mod.locked) { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderLeft = `3px solid ${mod.iconColor}` } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeft = '3px solid transparent' }}>
              <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:mod.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {mod.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'3px' }}>
                  <span style={{ fontSize:'14px', fontWeight:700, color: mod.locked ? '#9CA3AF' : '#111827' }}>{mod.label}</span>
                  {mod.badge && (
                    <span style={{ padding:'1px 7px', borderRadius:'20px', background: mod.id === 'security' ? '#FEE9E9' : '#FEF3E0', color: mod.id === 'security' ? '#C0392B' : '#92590A', fontSize:'10px', fontWeight:800 }}>
                      {mod.badge}
                    </span>
                  )}
                  {mod.locked && (
                    <span style={{ padding:'1px 7px', borderRadius:'20px', background:'#F3F4F6', color:'#9CA3AF', fontSize:'10px', fontWeight:700 }}>
                      최고관리자 전용
                    </span>
                  )}
                </div>
                <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{mod.sub}</div>
              </div>
              {mod.locked
                ? <span style={{ fontSize:'14px' }}>🔒</span>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              }
            </button>
          ))}
        </div>

        {/* ── 구성원 현황 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'9px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase' }}>구성원 현황</div>
          <button onClick={() => onNav('members')}
            style={{ background:'none', border:'none', fontSize:'11px', fontWeight:700, color:'#374151', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
            전체 보기 →
          </button>
        </div>
        <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          {members.filter(m => m.status !== 'resigned').slice(0, 4).map((m, i, arr) => {
            const rs  = ROLE_STYLE[m.role]  || ROLE_STYLE.staff
            const ss  = STATUS_COLOR[m.status]
            return (
              <div key={m.id}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none' }}>
                {/* 아바타 */}
                <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:rs.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color:rs.color, flexShrink:0 }}>
                  {m.name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{m.name}</span>
                    <span style={{ fontSize:'10px', fontWeight:700, color:rs.color, background:rs.bg, padding:'1px 7px', borderRadius:'5px' }}>
                      {rs.label}
                    </span>
                  </div>
                  <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{m.dept} · {m.position}</div>
                </div>
                {ss && (
                  <span style={{ fontSize:'10px', fontWeight:600, color:ss.color, background:ss.bg, padding:'2px 8px', borderRadius:'5px', flexShrink:0 }}>
                    {ss.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}
function MembersView({ members, setMembers, onBack, onInvite, bizRole }) {
  const theme = getAccountTheme()
  const [filter, setFilter]   = useState('all')
  const [editMember, setEdit] = useState(null)

  // [권한] admin은 master/admin 권한 보유자 편집 불가 (권한 상향 방지)
  const canEditMember = (m) => {
    if (bizRole === 'master') return m.role !== 'master' // master는 자신 제외 모두 편집
    if (bizRole === 'admin')  return m.role !== 'master' && m.role !== 'admin' // admin은 master·admin 편집 불가
    return false
  }

  if (editMember) return (
    <MemberDetailView member={editMember} onBack={() => setEdit(null)} bizRole={bizRole}
      onSave={updated => { setMembers(ms => ms.map(m => m.id === updated.id ? updated : m)); setEdit(null) }}
      onResign={id => { setMembers(ms => ms.map(m => m.id === id ? { ...m, status:'resigned' } : m)); setEdit(null) }}
    />
  )

  const FILTERS = [
    { id:'all',     label:'전체' },
    { id:'active',  label:'재직중' },
    { id:'invited', label:'초대중' },
  ]
  const filtered = filter === 'all'
    ? members.filter(m => m.status !== 'resigned')
    : members.filter(m => m.status === filter)

  const activeCount  = members.filter(m => m.status === 'active').length
  const invitedCount = members.filter(m => m.status === 'invited').length

  // 상태 → 스타일
  const STATUS_STYLE = {
    active:   { label:'재직중',    color:'#0D7750', bg:'#E6F6EF' },
    invited:  { label:'초대 대기', color:'#92590A', bg:'#FEF3E0' },
    inactive: { label:'비활성',    color:'#9CA3AF', bg:'#F3F4F6' },
    resigned: { label:'퇴사',      color:'#9CA3AF', bg:'#F3F4F6' },
  }

  // 역할별 색상 (부드럽게)
  const ROLE_STYLE = {
    master:     { label:'최고관리자', color:'#6D28D9', bg:'#F3EEFF' },
    admin:      { label:'관리자',     color:'#1D4ED8', bg:'#EEF2FF' },
    accounting: { label:'재무담당자', color:'#0D7750', bg:'#E6F6EF' },
    manager:    { label:'승인자',     color:'#0369A1', bg:'#E0F2FE' },
    staff:      { label:'일반구성원', color:'#374151', bg:'#F3F4F6' },
    viewer:     { label:'조회전용',   color:'#6B7280', bg:'#F9FAFB' },
  }

  return (
    <>
      {/* ── 헤더 */}
      <Header onBack={onBack} title="구성원 관리" sub={`총 ${members.length}명`}
        right={
          <button onClick={onInvite}
            style={{ display:'flex', alignItems:'center', gap:'4px', padding:'7px 14px', background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            직원 초대
          </button>
        }
      />

      <div style={{ padding:'16px 16px 36px' }}>

        {/* ── 요약 3칸 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginBottom:'20px' }}>
          {[
            { label:'재직중',    value:`${activeCount}명` },
            { label:'초대 대기', value:`${invitedCount}명` },
            { label:'전체',      value:`${members.length}명` },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid #EAECF0', borderRadius:'12px', padding:'13px 10px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#111827', letterSpacing:'-0.5px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:600, marginTop:'3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── 필터 탭 */}
        <div style={{ display:'flex', background:'#F3F4F6', borderRadius:'10px', padding:'3px', gap:'2px', marginBottom:'16px' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ flex:1, padding:'9px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', fontSize:'12px', fontWeight:700, transition:'all 0.15s', background: filter === f.id ? '#fff' : 'transparent', color: filter === f.id ? '#111827' : '#9CA3AF', boxShadow: filter === f.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── 멤버 목록 */}
        <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          {filtered.map((m, i) => {
            const editable = canEditMember(m)
            const usagePct = m.monthlyLimit && m.monthlyUsed
              ? Math.min(100, m.monthlyUsed / m.monthlyLimit * 100) : 0
            const sm = STATUS_STYLE[m.status] || STATUS_STYLE.inactive
            const rs = ROLE_STYLE[m.role] || ROLE_STYLE.staff

            return (
              <button key={m.id} onClick={() => editable && setEdit(m)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'14px', padding:'15px 16px', background:'transparent', border:'none', borderBottom: i < filtered.length-1 ? '1px solid #F0F1F3' : 'none', cursor: editable ? 'pointer' : 'default', fontFamily:'inherit', textAlign:'left', transition:'background 0.12s' }}
                onMouseEnter={e => { if (editable) e.currentTarget.style.background = '#FAFAFA' }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* 아바타 */}
                <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:rs.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:rs.color, flexShrink:0, border:`1px solid ${rs.bg}` }}>
                  {m.name[0]}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  {/* 이름 + 역할 */}
                  <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px' }}>
                    <span style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>{m.name}</span>
                    <span style={{ fontSize:'10px', fontWeight:700, color:rs.color, background:rs.bg, padding:'2px 8px', borderRadius:'6px' }}>
                      {rs.label}
                    </span>
                  </div>
                  {/* 부서 · 직책 */}
                  <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom: usagePct > 0 ? '6px' : '0' }}>
                    {m.dept} · {m.position}
                  </div>
                  {/* 사용량 미니 바 */}
                  {usagePct > 0 && (
                    <div>
                      <div style={{ height:'3px', background:'#F3F4F6', borderRadius:'10px', overflow:'hidden', width:'100%' }}>
                        <div style={{ height:'100%', borderRadius:'10px', background: usagePct > 80 ? '#EF4444' : rs.color, width:`${usagePct}%` }}/>
                      </div>
                      <div style={{ fontSize:'10px', color:'#9CA3AF', marginTop:'3px' }}>
                        {fmt(m.monthlyUsed)}원 사용 ({Math.round(usagePct)}%)
                      </div>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 상태 + 화살표 */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px', flexShrink:0 }}>
                  <span style={{ fontSize:'10px', fontWeight:600, color: sm.color, background: sm.bg, padding:'2px 8px', borderRadius:'5px' }}>
                    {sm.label}
                  </span>
                  {editable
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    : <span style={{ fontSize:'12px', opacity:0.5 }}>🔒</span>
                  }
                </div>
              </button>
            )
          })}
        </div>

        {/* ── 퇴사 인원 표시 (접힘) */}
        {members.filter(m => m.status === 'resigned').length > 0 && filter === 'all' && (
          <div style={{ marginTop:'16px', padding:'13px 16px', background:'#F9FAFB', border:'1px solid #EAECF0', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'12px', color:'#9CA3AF' }}>
              퇴사 {members.filter(m => m.status === 'resigned').length}명 숨겨짐
            </span>
            <button onClick={() => setFilter('resigned')} style={{ background:'none', border:'none', fontSize:'11px', color:'#6B7280', fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
              보기 →
            </button>
          </div>
        )}

      </div>
    </>
  )
}

function MemberDetailView({ member, onBack, onSave, onResign, bizRole }) {
  const theme = getAccountTheme()
  const [role, setRole]               = useState(member.role)
  const [dept, setDept]               = useState(member.dept)
  const [position, setPosition]       = useState(member.position)
  const [approvalMode, setApproval]   = useState(member.approvalMode)
  const [monthlyLimit, setMonthlyLim] = useState(member.monthlyLimit ? String(member.monthlyLimit) : '')
  const [singleLimit, setSingleLim]   = useState(member.singleLimit ? String(member.singleLimit) : '')
  const [showResign, setShowResign]   = useState(false)

  const usagePct = member.monthlyLimit && member.monthlyUsed
    ? Math.min(100, member.monthlyUsed / member.monthlyLimit * 100) : 0
  const isOver80 = usagePct > 80
  const r = ROLES[member.role] || ROLES.viewer

  // [권한] 퇴사 버튼: master는 자신 제외 모두 가능. admin은 master·admin 퇴사 불가.
  const canResign = bizRole === 'master'
    ? member.role !== 'master'
    : bizRole === 'admin'
      ? (member.role !== 'master' && member.role !== 'admin')
      : false

  // 섹션 구분자
  const Divider = () => <div style={{ height:'1px', background:'#F0F1F3', margin:'0 -16px' }} />

  return (
    <>
      {/* ── 헤더 */}
      <Header onBack={onBack} title={member.name} sub={`${r.label} · ${member.dept}`}
        right={canResign && (
          <button onClick={() => setShowResign(true)}
            style={{ padding:'6px 14px', background:'rgba(239,68,68,0.1)', color:'#EF4444', border:'none', borderRadius:'20px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            퇴사
          </button>
        )}
      />

      <div style={{ padding:'16px 16px 100px' }}>

        {/* ── 프로필 카드 */}
        <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', marginBottom:'12px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          {/* 상단 배경 밴드 */}
          <div style={{ height:'52px', background:'linear-gradient(135deg, #F8F9FB 0%, #F1F3F7 100%)' }} />
          <div style={{ padding:'0 18px 18px', marginTop:'-26px' }}>
            {/* 아바타 */}
            <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'#fff', border:'2px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,0.10)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700, color:'#374151', marginBottom:'10px' }}>
              {member.name[0]}
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
              <div>
                <div style={{ fontSize:'17px', fontWeight:700, color:'#111827', letterSpacing:'-0.3px' }}>{member.name}</div>
                <div style={{ fontSize:'12px', color:'#9CA3AF', marginTop:'2px' }}>{member.email}</div>
                <div style={{ fontSize:'12px', color:'#9CA3AF' }}>{member.phone}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px', paddingTop:'2px' }}>
                <span style={{ padding:'3px 9px', borderRadius:'20px', background:'#F3F4F6', color:'#374151', fontSize:'11px', fontWeight:700 }}>
                  {r.icon} {r.label}
                </span>
                <StatusBadge status={member.status} />
              </div>
            </div>
          </div>

          {/* 사용량 바 */}
          {member.monthlyUsed > 0 && member.monthlyLimit && (
            <div style={{ padding:'14px 18px', borderTop:'1px solid #F0F1F3' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <span style={{ fontSize:'11px', color:'#9CA3AF', fontWeight:600 }}>이달 사용 현황</span>
                <span style={{ fontSize:'12px', fontWeight:700, color: isOver80 ? '#EF4444' : '#374151' }}>
                  {fmt(member.monthlyUsed)}원
                  <span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:400 }}> / {fmt(member.monthlyLimit)}원</span>
                </span>
              </div>
              <div style={{ height:'5px', background:'#F3F4F6', borderRadius:'10px', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:'10px', background: isOver80 ? '#EF4444' : theme.brand, width:`${usagePct}%`, transition:'width 0.4s' }}/>
              </div>
              <div style={{ fontSize:'10px', color: isOver80 ? '#EF4444' : '#9CA3AF', textAlign:'right', marginTop:'5px' }}>
                {Math.round(usagePct)}%
              </div>
            </div>
          )}
        </div>

        {/* ── 부서 및 직책 */}
        <div style={{ background:'#fff', borderRadius:'18px', padding:'16px', marginBottom:'12px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:'12px' }}>부서 및 직책</div>

          {/* 부서 선택 */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
            {DEPT_LIST.map(d => (
              <button key={d} onClick={() => setDept(d)}
                style={{ padding:'6px 13px', borderRadius:'8px', border:'none', background: dept===d ? '#111827' : '#F3F4F6', color: dept===d ? '#fff' : '#6B7280', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                {d}
              </button>
            ))}
          </div>

          <Divider />

          {/* 직책 입력 */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'13px' }}>
            <span style={{ fontSize:'13px', color:'#6B7280' }}>직책</span>
            <input value={position} onChange={e => setPosition(e.target.value)} placeholder="직책 입력"
              style={{ width:'160px', fontSize:'14px', fontWeight:600, color:'#111827', background:'transparent', border:'none', outline:'none', fontFamily:'inherit', textAlign:'right' }}/>
          </div>
        </div>

        {/* ── 권한 (역할) */}
        <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', marginBottom:'12px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'16px 16px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.6px', textTransform:'uppercase' }}>권한 (역할)</div>
          </div>
          {/* [권한] admin은 master·admin 역할 부여 불가 (권한 상향 방지) */}
          {['admin','accounting','manager','staff','viewer'].map((rid) => {
            const info = ROLES[rid]
            const active = role === rid
            // admin은 admin 역할 부여 불가 (자신과 동급 권한 생성 방지)
            const roleBlocked = bizRole === 'admin' && rid === 'admin'
            return (
              <button key={rid}
                onClick={() => !roleBlocked && setRole(rid)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'14px', padding:'13px 16px', background: active ? '#FAFAFA' : 'transparent', border:'none', borderTop:'1px solid #F0F1F3', borderLeft: active ? `3px solid #111827` : '3px solid transparent', cursor: roleBlocked ? 'not-allowed' : 'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s', opacity: roleBlocked ? 0.45 : 1 }}>
                {/* 라디오 도트 */}
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', border: active ? '6px solid #111827' : '2px solid #D1D5DB', flexShrink:0, transition:'all 0.15s' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight: active ? 700 : 500, color: active ? '#111827' : '#374151', marginBottom:'2px' }}>{info.label}</div>
                  <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{info.desc}</div>
                </div>
                {active && !roleBlocked && (
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#111827', background:'#F3F4F6', padding:'2px 9px', borderRadius:'6px' }}>선택됨</div>
                )}
                {roleBlocked && (
                  <span style={{ fontSize:'11px', color:'#9CA3AF' }}>🔒</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── 집행 승인 방식 */}
        <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', marginBottom:'12px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'16px 16px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.6px', textTransform:'uppercase' }}>집행 승인 방식</div>
          </div>
          {APPROVAL_MODES.map((m, i) => {
            const active = approvalMode === m.id
            return (
              <button key={m.id} onClick={() => setApproval(m.id)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'14px', padding:'13px 16px', background: active ? '#FAFAFA' : 'transparent', border:'none', borderTop:'1px solid #F0F1F3', borderLeft: active ? '3px solid #111827' : '3px solid transparent', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s' }}>
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', border: active ? '6px solid #111827' : '2px solid #D1D5DB', flexShrink:0, transition:'all 0.15s' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight: active ? 700 : 500, color: active ? '#111827' : '#374151', marginBottom:'2px' }}>{m.label}</div>
                  <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{m.sub}</div>
                </div>
                {active && (
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#111827', background:'#F3F4F6', padding:'2px 9px', borderRadius:'6px' }}>선택됨</div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── 집행 한도 */}
        {(role === 'staff' || role === 'admin' || role === 'manager') && (
          <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', marginBottom:'12px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding:'16px 16px 0' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.6px', textTransform:'uppercase' }}>집행 한도</div>
            </div>
            {[
              { label:'월 한도',  sub:'매월 초기화',    val:monthlyLimit, set:setMonthlyLim },
              { label:'1회 한도', sub:'건당 최대 금액',  val:singleLimit,  set:setSingleLim  },
            ].map((f, i, arr) => (
              <div key={f.label} style={{ padding:'14px 16px', borderTop:'1px solid #F0F1F3', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                <div>
                  <div style={{ fontSize:'13px', color:'#374151', fontWeight:500 }}>{f.label}</div>
                  <div style={{ fontSize:'10px', color:'#9CA3AF', marginTop:'1px' }}>{f.sub}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder="제한 없음"
                    style={{ width:'110px', fontSize:'15px', fontWeight:700, color:'#111827', background:'transparent', border:'none', outline:'none', fontFamily:'inherit', textAlign:'right' }}/>
                  <span style={{ fontSize:'12px', color:'#9CA3AF', fontWeight:500, flexShrink:0 }}>원</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 권한 매트릭스 */}
        {ROLE_PERMISSIONS[role] && (() => {
          const perm = ROLE_PERMISSIONS[role]
          const roleInfo = ROLES[role]
          return (
            <div style={{ background:'#fff', borderRadius:'18px', padding:'14px 16px', marginBottom:'12px', border:`1px solid ${roleInfo?.bg || '#EAECF0'}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: roleInfo?.color || '#374151' }}/>
                <span style={{ fontSize:'11px', fontWeight:700, color: roleInfo?.color || '#374151', letterSpacing:'0.5px', textTransform:'uppercase' }}>권한 범위</span>
                <span style={{ fontSize:'10px', color:'#9CA3AF', background:'#F8F9FB', padding:'2px 8px', borderRadius:'6px' }}>{perm.approvalScope}</span>
              </div>
              {/* 가능 권한 */}
              <div style={{ marginBottom:'10px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#059669', marginBottom:'6px' }}>✓ 가능한 권한</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {perm.can.map((item, i) => (
                    <span key={i} style={{ fontSize:'10px', color:'#059669', background:'#F0FDF4', padding:'3px 8px', borderRadius:'6px', border:'1px solid #BBF7D0' }}>{item}</span>
                  ))}
                </div>
              </div>
              {/* 제한 권한 */}
              {perm.cannot.length > 0 && (
                <div>
                  <div style={{ fontSize:'10px', fontWeight:700, color:'#DC2626', marginBottom:'6px' }}>✗ 제한 권한</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                    {perm.cannot.map((item, i) => (
                      <span key={i} style={{ fontSize:'10px', color:'#DC2626', background:'#FEF2F2', padding:'3px 8px', borderRadius:'6px', border:'1px solid #FECACA' }}>{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── 가입일 정보 */}
        <div style={{ background:'#fff', borderRadius:'18px', padding:'14px 16px', marginBottom:'12px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: member.isSuperAdmin || member.viewerExpiry ? '10px' : '0' }}>
            <span style={{ fontSize:'13px', color:'#6B7280' }}>합류일</span>
            <span style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>{member.joinDate}</span>
          </div>
          {member.isSuperAdmin && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'#EDE9FE', borderRadius:'10px' }}>
              <span style={{ fontSize:'14px' }}>👑</span>
              <span style={{ fontSize:'11px', fontWeight:700, color:'#7C3AED' }}>최고관리자 · 모든 권한 보유 · 권한 이전 가능</span>
            </div>
          )}
          {member.viewerExpiry && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#F9FAFB', borderRadius:'10px' }}>
              <span style={{ fontSize:'11px', color:'#9CA3AF' }}>조회 만료일</span>
              <span style={{ fontSize:'11px', fontWeight:700, color:'#374151' }}>{member.viewerExpiry}</span>
            </div>
          )}
          {member.approvalScope && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#E0F2FE', borderRadius:'10px', marginTop:'6px' }}>
              <span style={{ fontSize:'11px', color:'#0369A1' }}>승인 범위</span>
              <span style={{ fontSize:'11px', fontWeight:700, color:'#0369A1' }}>{member.approvalScope}</span>
            </div>
          )}
        </div>

      </div>

      {/* ── 저장 버튼 */}
      <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:'#fff', borderTop:'1px solid #EAECF0', boxShadow:'0 -2px 12px rgba(0,0,0,0.05)' }}>
        <button onClick={() => onSave({ ...member, role, dept, position, approvalMode, monthlyLimit: monthlyLimit ? Number(monthlyLimit) : null, singleLimit: singleLimit ? Number(singleLimit) : null })}
          style={{ width:'100%', height:'50px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          저장
        </button>
      </div>

      {/* ── 퇴사 confirm */}
      {showResign && (
        <div onClick={() => setShowResign(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:'390px', background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 36px' }}>
            <div style={{ width:'36px', height:'4px', background:'#E5E7EB', borderRadius:'2px', margin:'0 auto 20px' }} />
            <div style={{ fontSize:'16px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>{member.name} 퇴사 처리</div>
            <div style={{ fontSize:'12px', color:'#6B7280', lineHeight:1.7, marginBottom:'18px' }}>
              퇴사 처리 즉시 아래 항목이 실행됩니다.
            </div>
            <div style={{ background:'#FEF2F2', borderRadius:'12px', padding:'14px 16px', marginBottom:'20px' }}>
              {['로그인 즉시 차단', '법인카드 즉시 정지', '승인 권한 제거', '자금 요청 제한'].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 0', fontSize:'12px', color:'#B91C1C' }}>
                  <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#EF4444', flexShrink:0 }} />
                  {item}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowResign(false)}
                style={{ flex:1, height:'46px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                취소
              </button>
              <button onClick={() => onResign(member.id)}
                style={{ flex:1, height:'46px', background:'#EF4444', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                퇴사 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 3. 기업 설정
// ═══════════════════════════════════════════════════════════
function CompanySettingsView({ onBack }) {
  const theme = getAccountTheme()
  const [twoFactor, setTwoFactor] = useState(true)

  const sections = [
    {
      label:'기업 정보',
      icon:'🏢',
      items:[
        { label:'회사명',     value:'㈜주다컴퍼니',           arrow:true },
        { label:'사업자번호', value:'123-45-67890',           arrow:true },
        { label:'업종',       value:'소프트웨어 개발',         arrow:true },
        { label:'담당자',     value:'이대표 · 010-1234-5678', arrow:true },
      ],
    },
    {
      label:'법인 계좌',
      icon:'🏦',
      items:[
        { label:'연결 계좌', value:'신한은행 110-XXX-123456',    arrow:true  },
        { label:'잔액',      value:fmt(128500000)+'원',          arrow:false },
      ],
    },
    {
      label:'API 연동',
      icon:'🔗',
      items:[
        { label:'API 키',      value:'sk-juda-*****abc',      arrow:true },
        { label:'Webhook URL', value:'미설정',                 arrow:true },
        { label:'세무사 연동', value:'kim@samil.com 연동중',   arrow:true },
      ],
    },
  ]

  return (
    <>
      <Header onBack={onBack} title="기업 설정" sub="회사정보 · 계좌 · API" />
      <div style={{ padding:'16px 16px 36px' }}>
        {sections.map(sec => (
          <div key={sec.label} style={{ marginBottom:'16px' }}>
            <SectionTitle label={sec.label} />
            <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:'16px', overflow:'hidden', border:`1px solid ${COLORS.borderSoft}` }}>
              {sec.items.map((item, i, arr) => (
                <div key={item.label} style={{ padding:'14px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor: item.arrow ? 'pointer' : 'default' }}>
                  <span style={{ fontSize:'13px', color:COLORS.t3 }}>{item.label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1 }}>{item.value}</span>
                    {item.arrow && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t5} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 보안 설정 */}
        <SectionTitle label="보안 설정" />
        <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:'16px', overflow:'hidden', border:`1px solid ${COLORS.borderSoft}` }}>
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${COLORS.borderSoft}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>2차 인증 (OTP)</div>
              <div style={{ fontSize:'10px', color:COLORS.t4 }}>로그인 시 추가 인증 요구</div>
            </div>
            <Toggle on={twoFactor} onChange={() => setTwoFactor(!twoFactor)} brand={theme.brand} />
          </div>
          <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>감사 로그 조회</div>
              <div style={{ fontSize:'10px', color:COLORS.t4 }}>전체 활동 이력 확인</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t5} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 4. 보안 및 감사 (리디자인)
// ═══════════════════════════════════════════════════════════
function SecurityView({ onBack, bizRole }) {
  const [tab,             setTab]             = useState('activity')
  const [activeDisp,      setActiveDisp]      = useState('all')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const unsub = subscribeLog(() => forceUpdate(n => n + 1))
    return unsub
  }, [])

  // activityLogStore에서 표시용 로그 가져오기
  const displayLogs  = getDisplayLogs({ displayCategory: activeDisp, limit: 50 })
  const anomalyLogs  = getAnomalyLogs({ limit: 10 })

  const DEMO_DEVICES = [
    { name:'iPhone 15 Pro',     os:'iOS 17',     last:'방금',     trusted:true  },
    { name:'MacBook Pro',       os:'macOS 14',   last:'1시간 전', trusted:true  },
    { name:'Chrome on Windows', os:'Windows 11', last:'3일 전',   trusted:false },
  ]

  const TABS = [
    { id:'activity', label:'활동 로그' },
    { id:'device',   label:'디바이스'  },
    { id:'anomaly',  label:'이상탐지'  },
  ]

  const DeviceIcon = ({ name }) => {
    if (name.includes('iPhone')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
    )
    if (name.includes('Mac')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    )
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    )
  }

  return (
    <>
      <Header onBack={onBack} title="보안 및 감사" sub="활동로그 · 디바이스 · 이상탐지" />
      <div style={{ background:'#F8F9FB', minHeight:'100%', paddingBottom:'36px', position:'relative' }}>

        {/* ── 이상 탐지 배너 */}
        <div style={{ padding:'16px 16px 0' }}>
          <div style={{ background:'#fff', border:'1px solid #FCCFCF', borderRadius:'14px', padding:'13px 14px', display:'flex', alignItems:'center', gap:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#FEE9E9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>이상 접근 탐지됨</div>
              <div style={{ fontSize:'11px', color:'#9CA3AF' }}>해외 IP 로그인 시도 — 2026.05.07</div>
            </div>
            <button onClick={() => setTab('anomaly')}
              style={{ padding:'6px 13px', background:'#111827', color:'#fff', border:'none', borderRadius:'8px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              조치
            </button>
          </div>
        </div>

        {/* ── 탭 */}
        <div style={{ display:'flex', background:'#EAECF0', borderRadius:'10px', padding:'3px', gap:'2px', margin:'14px 16px 0' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:'9px 4px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', border:'none', fontSize:'12px', fontWeight:700, transition:'all 0.15s', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#111827' : '#9CA3AF', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'16px' }}>

          {/* ── 활동 로그 탭 */}
          {tab === 'activity' && (
            <>
              {/* 상단 바: N건 + 필터 버튼 */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <span style={{ fontSize:'15px', fontWeight:700, color:'#111827', paddingLeft:'4px' }}>
                  {displayLogs.length}건
                </span>
                <button onClick={() => setShowFilterSheet(true)}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px',
                    background:'#fff', border:'1px solid #EAECF0', borderRadius:'20px',
                    fontSize:'12px', fontWeight:600, color:'#374151',
                    cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                  필터
                  {activeDisp !== 'all' && (
                    <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#111827', display:'inline-block', marginLeft:'2px' }} />
                  )}
                </button>
              </div>

              {/* 로그 목록 */}
              {displayLogs.length === 0 ? (
                <div style={{ padding:'40px 0', textAlign:'center', color:'#9CA3AF', fontSize:'13px' }}>
                  해당 카테고리 로그가 없습니다.
                </div>
              ) : (
                <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  {displayLogs.map((log, i, arr) => {
                    const style = ACTION_LABEL[log.action] || { label: log.action, bg:'#F3F4F6', color:'#6B7280' }
                    const catCfg = Object.values(DISPLAY_CATEGORY).find(c => c.actions.includes(log.action))
                    return (
                      <div key={log.id} style={{ padding:'13px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'5px' }}>
                          {catCfg && <span style={{ fontSize:'12px' }}>{catCfg.emoji}</span>}
                          <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 9px', borderRadius:'6px',
                            background: style.bg, color: style.color, whiteSpace:'nowrap', flexShrink:0 }}>
                            {style.label}
                          </span>
                          <span style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginLeft:'2px' }}>{log.actor}</span>
                        </div>
                        <div style={{ fontSize:'12px', color:'#374151', marginBottom:'4px', lineHeight:1.5 }}>{log.target}</div>
                        <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{log.displayAt}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 전체 로그 내보내기 */}
              <div style={{ marginTop:'12px', padding:'12px 14px', background:'#F8F9FB', borderRadius:'12px',
                border:'1px solid #EAECF0', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'14px' }}>📁</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'1px' }}>전체 감사 로그</div>
                  <div style={{ fontSize:'10px', color:'#9CA3AF' }}>12개 카테고리 · PG사 제출용 · 5년 보관</div>
                </div>
                <button style={{ padding:'6px 12px', background:'#111827', color:'#fff', border:'none',
                  borderRadius:'8px', fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  내보내기
                </button>
              </div>

              {/* 필터 바텀시트 */}
              {showFilterSheet && (
                <div style={{ position:'absolute', inset:0, zIndex:200, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                  {/* 딤 배경 */}
                  <div onClick={() => setShowFilterSheet(false)}
                    style={{ flex:1, background:'rgba(0,0,0,0.4)' }} />
                  {/* 시트 */}
                  <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'16px 20px 40px' }}>
                    {/* 핸들 */}
                    <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:'#E5E7EB', margin:'0 auto 20px' }} />
                    <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'16px' }}>카테고리 필터</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {[{ key:'all', label:'전체', emoji:'📋', desc:'모든 활동 로그' },
                        ...Object.entries(DISPLAY_CATEGORY).map(([k,v]) => ({ key:k, label:v.label, emoji:v.emoji, desc: getDisplayLogs({ displayCategory:k, limit:999 }).length + '건' }))
                      ].map(chip => {
                        const active = activeDisp === chip.key
                        return (
                          <button key={chip.key}
                            onClick={() => { setActiveDisp(chip.key); setShowFilterSheet(false) }}
                            style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px',
                              borderRadius:'14px', border: active ? 'none' : '1px solid #EAECF0',
                              background: active ? '#111827' : '#fff',
                              cursor:'pointer', fontFamily:'inherit',
                              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <span style={{ fontSize:'20px' }}>{chip.emoji}</span>
                            <div style={{ flex:1, textAlign:'left' }}>
                              <div style={{ fontSize:'13px', fontWeight:700, color: active ? '#fff' : '#111827' }}>{chip.label}</div>
                              <div style={{ fontSize:'11px', color: active ? 'rgba(255,255,255,0.6)' : '#9CA3AF', marginTop:'1px' }}>{chip.desc}</div>
                            </div>
                            {active && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── 디바이스 탭 */}
          {tab === 'device' && (
            <>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>등록 디바이스</div>
              <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:'12px' }}>
                {DEMO_DEVICES.map((d, i, arr) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'13px', padding:'14px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none' }}>
                    <div style={{ width:'42px', height:'42px', borderRadius:'12px', background: d.trusted ? '#E6F6EF' : '#F3F4F6', color: d.trusted ? '#0D7750' : '#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <DeviceIcon name={d.name} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'3px' }}>{d.name}</div>
                      <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{d.os} · {d.last}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                      <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 9px', borderRadius:'6px', background: d.trusted ? '#E6F6EF' : '#FEF3E0', color: d.trusted ? '#0D7750' : '#92590A' }}>
                        {d.trusted ? '신뢰됨' : '미신뢰'}
                      </span>
                      {!d.trusted && (
                        <button style={{ fontSize:'10px', padding:'3px 10px', background:'#FEE9E9', color:'#C0392B', border:'none', borderRadius:'6px', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
                          차단
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* [권한] 모든 디바이스 강제 로그아웃: 최고관리자 전용 */}
              {bizRole === 'master' ? (
                <button style={{ width:'100%', height:'46px', background:'#fff', color:'#C0392B', border:'1px solid #FCCFCF', borderRadius:'13px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  모든 디바이스 강제 로그아웃
                </button>
              ) : (
                <div style={{ width:'100%', height:'46px', background:'#F9FAFB', color:'#9CA3AF', border:'1px solid #EAECF0', borderRadius:'13px', fontSize:'13px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  🔒 모든 디바이스 강제 로그아웃 (최고관리자 전용)
                </div>
              )}
            </>
          )}

          {/* ── 이상탐지 탭 */}
          {tab === 'anomaly' && (
            <>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>이상 접근 탐지</div>

              {/* 탐지 상세 */}
              <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #FCCFCF', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:'14px' }}>
                <div style={{ padding:'14px 16px', borderBottom:'1px solid #F0F1F3', display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'#FEE9E9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>해외 IP 로그인 시도</div>
                    <div style={{ fontSize:'11px', color:'#9CA3AF' }}>2026.05.07 17:00 · 자동 차단 완료</div>
                  </div>
                </div>
                {[
                  { label:'IP 주소',   value:'123.45.67.89' },
                  { label:'위치',      value:'미국 캘리포니아' },
                  { label:'실패 횟수', value:'3회' },
                  { label:'대상 계정', value:'이대표 (ceo@company.com)' },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none' }}>
                    <span style={{ fontSize:'12px', color:'#9CA3AF' }}>{row.label}</span>
                    <span style={{ fontSize:'12px', fontWeight:600, color:'#111827' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ padding:'14px 16px', display:'flex', gap:'8px' }}>
                  {/* [권한] IP 영구 차단: 최고관리자 전용 */}
                  {bizRole === 'master' ? (
                    <button style={{ flex:1, height:'42px', background:'#111827', color:'#fff', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      IP 영구 차단
                    </button>
                  ) : (
                    <div style={{ flex:1, height:'42px', background:'#F3F4F6', color:'#9CA3AF', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'4px' }}>
                      🔒 IP 차단
                    </div>
                  )}
                  <button style={{ flex:1, height:'42px', background:'#F3F4F6', color:'#6B7280', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    무시
                  </button>
                </div>
              </div>

              {/* 최근 접근 IP */}
              <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>최근 접근 IP</div>
              <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:'14px' }}>
                {[
                  { ip:'192.168.1.1',  location:'서울, 한국',      time:'방금',     safe:true  },
                  { ip:'192.168.1.10', location:'서울, 한국',       time:'1시간 전', safe:true  },
                  { ip:'123.45.67.89', location:'캘리포니아, 미국', time:'2일 전',   safe:false },
                ].map((rec, i, arr) => (
                  <div key={i} style={{ padding:'13px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#111827' }}>{rec.ip}</div>
                      <div style={{ fontSize:'10px', color:'#9CA3AF', marginTop:'2px' }}>{rec.location} · {rec.time}</div>
                    </div>
                    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 9px', borderRadius:'6px', background: rec.safe ? '#E6F6EF' : '#FEE9E9', color: rec.safe ? '#0D7750' : '#C0392B' }}>
                      {rec.safe ? '정상' : '차단됨'}
                    </span>
                  </div>
                ))}
              </div>

              {/* 시스템 이상 로그 (activityLogStore) */}
              {anomalyLogs.length > 0 && (
                <>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>시스템 보안 로그</div>
                  <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    {anomalyLogs.map((log, i, arr) => (
                      <div key={log.id} style={{ padding:'13px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                          <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 9px', borderRadius:'6px', background:'#FEE9E9', color:'#C0392B', whiteSpace:'nowrap' }}>
                            보안 감지
                          </span>
                          <span style={{ fontSize:'11px', fontWeight:700, color:'#374151' }}>{log.actor}</span>
                        </div>
                        <div style={{ fontSize:'12px', color:'#374151', marginBottom:'3px' }}>{log.target}</div>
                        <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{log.displayAt}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 직원 초대
// ═══════════════════════════════════════════════════════════
function InviteView({ onBack }) {
  const [method, setMethod] = useState('phone')
  const [input, setInput]   = useState('')
  const [role, setRole]     = useState('staff')
  const [dept, setDept]     = useState('')
  const [sent, setSent]     = useState(false)

  const ROLE_STYLE = {
    admin:      { label:'관리자',     color:'#1D4ED8', bg:'#EEF2FF', desc:'실무 운영 · 구성원 관리 가능' },
    accounting: { label:'재무담당자', color:'#0D7750', bg:'#E6F6EF', desc:'자금·증빙·세금·카드 실무 관리' },
    manager:    { label:'승인자',     color:'#0369A1', bg:'#E0F2FE', desc:'지정 범위 내 집행 승인 권한' },
    staff:      { label:'일반구성원', color:'#374151', bg:'#F3F4F6', desc:'집행 요청 · 증빙 · 소명 처리' },
    viewer:     { label:'조회전용',   color:'#6B7280', bg:'#F9FAFB', desc:'보고서 · 증빙 열람만 가능' },
  }

  const canSend = method === 'link' || input.trim()

  if (sent) return (
    <>
      <Header onBack={onBack} title="초대 완료" />
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'64px 24px', gap:'10px', textAlign:'center' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'#E6F6EF', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'8px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0D7750" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontSize:'18px', fontWeight:700, color:'#111827' }}>초대를 보냈어요</div>
        <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7 }}>상대방이 수락하면<br/>구성원 목록에 자동으로 추가됩니다.</div>
        <button onClick={onBack} style={{ marginTop:'24px', padding:'12px 36px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>확인</button>
      </div>
    </>
  )

  const METHODS = [
    { id:'phone', label:'전화번호', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
    { id:'email', label:'이메일',   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> },
    { id:'link',  label:'링크 공유', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
  ]

  return (
    <>
      <Header onBack={onBack} title="직원 초대" />
      <div style={{ padding:'16px 16px 100px', background:'#F8F9FB', minHeight:'100%' }}>

        <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>초대 방식</div>
        <div style={{ display:'flex', gap:'7px', marginBottom:'14px' }}>
          {METHODS.map(m => {
            const active = method === m.id
            return (
              <button key={m.id} onClick={() => { setMethod(m.id); setInput('') }}
                style={{ flex:1, height:'60px', background: active ? '#111827' : '#fff', color: active ? '#fff' : '#9CA3AF', border: active ? 'none' : '1px solid #EAECF0', borderRadius:'14px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', transition:'all 0.15s', boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                {m.icon}
                {m.label}
              </button>
            )
          })}
        </div>

        <div style={{ marginBottom:'20px' }}>
          {method !== 'link'
            ? <input
                type={method === 'email' ? 'email' : 'tel'}
                inputMode={method === 'phone' ? 'numeric' : undefined}
                value={input}
                onChange={e => {
                  if (method === 'phone') {
                    // 010-XXXX-XXXX 자동 포맷
                    const d = e.target.value.replace(/\D/g, '').slice(0, 11)
                    const f = d.length <= 3 ? d
                      : d.length <= 7 ? `${d.slice(0,3)}-${d.slice(3)}`
                      : `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`
                    setInput(f)
                  } else {
                    setInput(e.target.value)
                  }
                }}
                placeholder={method === 'phone' ? '010-0000-0000' : 'email@company.com'}
                style={{ width:'100%', height:'50px', background:'#fff', border:`1.5px solid ${input ? '#111827' : '#EAECF0'}`, borderRadius:'13px', padding:'0 16px', fontSize:'15px', color:'#111827', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}/>
            : <div style={{ background:'#fff', borderRadius:'13px', padding:'13px 16px', display:'flex', alignItems:'center', gap:'10px', border:'1px solid #EAECF0', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ flex:1, fontSize:'12px', color:'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>https://judapay.com/invite/abc123</div>
                <button style={{ padding:'6px 13px', background:'#111827', color:'#fff', border:'none', borderRadius:'8px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>복사</button>
              </div>
          }
        </div>

        <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>역할 선택</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
          {Object.entries(ROLE_STYLE).map(([key, cfg]) => (
            <button key={key} onClick={() => setRole(key)}
              style={{ width:'100%', padding:'13px 16px', background: role === key ? '#111827' : '#fff', color: role === key ? '#fff' : '#374151', border: role === key ? 'none' : '1px solid #EAECF0', borderRadius:'13px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow: role === key ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)', transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'12px', fontWeight:700, padding:'3px 10px', borderRadius:'7px', background: role === key ? 'rgba(255,255,255,0.2)' : cfg.bg, color: role === key ? '#fff' : cfg.color }}>{cfg.label}</span>
                <span style={{ fontSize:'12px', color: role === key ? 'rgba(255,255,255,0.75)' : '#9CA3AF' }}>{cfg.desc}</span>
              </div>
              {role === key && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>

        <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>부서 (선택)</div>
        <input value={dept} onChange={e => setDept(e.target.value)} placeholder="예: 개발팀, 마케팅팀"
          style={{ width:'100%', height:'50px', background:'#fff', border:`1.5px solid ${dept ? '#111827' : '#EAECF0'}`, borderRadius:'13px', padding:'0 16px', fontSize:'15px', color:'#111827', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:'28px' }}/>

        <button onClick={() => canSend && setSent(true)} disabled={!canSend}
          style={{ width:'100%', height:'54px', background: canSend ? '#111827' : '#E5E7EB', color: canSend ? '#fff' : '#9CA3AF', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor: canSend ? 'pointer' : 'not-allowed', fontFamily:'inherit', boxShadow: canSend ? '0 2px 10px rgba(0,0,0,0.18)' : 'none', transition:'all 0.15s' }}>
          초대 보내기
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 5. 승인 설정
// ═══════════════════════════════════════════════════════════
function ApprovalSettingsView({ onBack, members }) {
  const theme = getAccountTheme()
  const [tab, setTab]         = useState(0)
  const [cfg, setCfg]         = useState(INIT_APPROVAL_CONFIG)
  const [saved, setSaved]     = useState(false)
  const scrollRef = useScrollRestore()

  const TABS = ['승인 흐름', '승인자 배정', '조건 설정']

  function updateCfg(patch) { setCfg(c => ({ ...c, ...patch })) }
  function toggleCond(id)   { setCfg(c => ({ ...c, stage2Conditions: { ...c.stage2Conditions, [id]: !c.stage2Conditions[id] } })) }
  function toggleApprover(stage, memberId) {
    setCfg(c => {
      const cur = c.approvers[stage] || []
      const next = cur.includes(memberId) ? cur.filter(x => x !== memberId) : [...cur, memberId]
      return { ...c, approvers: { ...c.approvers, [stage]: next } }
    })
  }

  const pendingCount = DEMO_APPROVAL_QUEUE.filter(q => ['pending','stage1_done','waiting_next','additional_requested','resubmitted'].includes(q.stage)).length

  // ── 탭 0: 승인 흐름
  const FlowTab = () => {
    const MODE_OPTS = [
      { id:'none',      label:'승인 없음',       sub:'바로 집행 가능',                 color:'#6B7280' },
      { id:'single',    label:'1단계 승인',       sub:'관리자 또는 대표 1명 승인',      color:'#2563EB' },
      { id:'threshold', label:'금액 기반 자동',   sub:'금액에 따라 단계 자동 결정',     color:'#059669' },
    ]
    const STAGE_COLOR = ['#2563EB','#7C3AED','#059669']
    const STAGE_LABEL = ['1차 승인','2차 승인','최종 승인','집행']

    return (
      <div style={{ padding:'14px 16px 100px' }}>
        {/* 흐름 시각화 */}
        <div style={{ background:'#fff', borderRadius:'18px', padding:'18px 16px', marginBottom:'14px', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'14px' }}>승인 파이프라인</div>
          <div style={{ display:'flex', alignItems:'center', gap:'0' }}>
            {STAGE_LABEL.map((lbl, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STAGE_LABEL.length-1 ? '1 1 auto' : 'none' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background: i===3 ? '#F0FDF4' : STAGE_COLOR[i]+'22', border:`2px solid ${i===3 ? '#059669' : STAGE_COLOR[i]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>
                    {i===0?'1️⃣':i===1?'2️⃣':i===2?'✅':'🚀'}
                  </div>
                  <div style={{ fontSize:'9px', fontWeight:700, color: i===3 ? '#059669' : STAGE_COLOR[i], whiteSpace:'nowrap' }}>{lbl}</div>
                  {i===1 && (
                    <div style={{ fontSize:'8px', color:'#9CA3AF', whiteSpace:'nowrap' }}>조건 시</div>
                  )}
                </div>
                {i < STAGE_LABEL.length-1 && (
                  <div style={{ flex:1, height:'2px', background: i===1 ? 'repeating-linear-gradient(90deg,#C084FC 0,#C084FC 4px,transparent 4px,transparent 8px)' : `linear-gradient(90deg,${STAGE_COLOR[i]},${i===2?'#059669':STAGE_COLOR[i+1]||'#059669'})`, margin:'0 4px', marginBottom:'18px' }}/>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop:'10px', padding:'8px 12px', background:'#F8F9FB', borderRadius:'10px', fontSize:'10px', color:'#6B7280', lineHeight:1.6 }}>
            요청 → 1차 승인 → <span style={{ color:'#7C3AED', fontWeight:700 }}>2차(조건)</span> → 최종 승인 → 집행
          </div>
        </div>

        {/* 승인 모드 선택 */}
        <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>승인 방식</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'14px' }}>
          {MODE_OPTS.map(opt => {
            const active = cfg.mode === opt.id
            return (
              <button key={opt.id} onClick={() => updateCfg({ mode: opt.id })}
                style={{ width:'100%', padding:'13px 16px', background: active ? '#111827' : '#fff', border: active ? 'none' : '1px solid #EAECF0', borderRadius:'13px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)', transition:'all 0.15s' }}>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color: active ? '#fff' : '#111827', marginBottom:'2px' }}>{opt.label}</div>
                  <div style={{ fontSize:'10px', color: active ? 'rgba(255,255,255,0.6)' : '#9CA3AF' }}>{opt.sub}</div>
                </div>
                {active && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            )
          })}
        </div>

        {/* 금액 임계값 */}
        {cfg.mode === 'threshold' && (
          <>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>금액 기준 (원)</div>
            <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:'14px' }}>
              {[
                { key:'stage1', label:'1차 승인 기준', sub:'이상 시 1차 승인 필요', color:'#2563EB' },
                { key:'stage2', label:'2차 승인 기준', sub:'이상 시 2차 승인 필요', color:'#7C3AED' },
                { key:'final',  label:'대표 최종 기준', sub:'이상 시 대표 최종 승인', color:'#059669' },
              ].map((row, i, arr) => (
                <div key={row.key} style={{ padding:'14px 16px', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>
                      <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background:row.color, marginRight:'6px' }}/>
                      {row.label}
                    </div>
                    <div style={{ fontSize:'10px', color:'#9CA3AF', marginLeft:'14px' }}>{fmt(cfg.thresholds[row.key])}원 {row.sub}</div>
                  </div>
                  <input type="number" value={cfg.thresholds[row.key]}
                    onChange={e => updateCfg({ thresholds: { ...cfg.thresholds, [row.key]: Number(e.target.value) } })}
                    style={{ width:'100px', fontSize:'14px', fontWeight:700, color:'#111827', background:'#F8F9FB', border:'1.5px solid #E5E7EB', borderRadius:'10px', padding:'7px 10px', outline:'none', fontFamily:'inherit', textAlign:'right' }}/>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 승인대기센터 바로가기 배너 */}
        <div style={{ background:'linear-gradient(135deg,#EDE9FE,#DBEAFE)', borderRadius:'16px', padding:'16px', border:'1px solid #C4B5FD', display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(124,58,237,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#4C1D95', marginBottom:'3px' }}>
              승인 대기 <span style={{ color:'#7C3AED' }}>{pendingCount}건</span>
            </div>
            <div style={{ fontSize:'11px', color:'#6D28D9', lineHeight:1.5 }}>실제 승인·반려는 <span style={{ fontWeight:700 }}>승인대기센터</span>에서 처리하세요</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    )
  }

  // ── 탭 1: 승인자 배정
  const ApproversTab = () => {
    const STAGE_DEFS = [
      { key:'stage1', label:'1차 승인자', sub:'요청 1차 검토·승인', color:'#2563EB', bg:'#DBEAFE', roles:['manager','admin'] },
      { key:'stage2', label:'2차 승인자', sub:'조건 충족 시 2차 검토', color:'#7C3AED', bg:'#EDE9FE', roles:['admin','master'] },
      { key:'final',  label:'최종 승인자', sub:'대표·최종 결재권자', color:'#059669', bg:'#D1FAE5', roles:['master'] },
    ]
    const ROLE_LABEL = { master:'최고관리자', admin:'관리자', manager:'승인자', staff:'일반구성원', accounting:'재무담당자', viewer:'조회전용' }

    return (
      <div style={{ padding:'14px 16px 100px' }}>
        {STAGE_DEFS.map((sd, si) => (
          <div key={sd.key} style={{ marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'9px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:sd.color }}/>
              <span style={{ fontSize:'11px', fontWeight:700, color:sd.color, letterSpacing:'0.5px', textTransform:'uppercase' }}>{sd.label}</span>
              <span style={{ fontSize:'10px', color:'#9CA3AF' }}>{sd.sub}</span>
            </div>
            <div style={{ background:'#fff', borderRadius:'16px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              {members.filter(m => m.status === 'active' && sd.roles.includes(m.role)).map((m, i, arr) => {
                const selected = (cfg.approvers[sd.key] || []).includes(m.id)
                return (
                  <button key={m.id} onClick={() => toggleApprover(sd.key, m.id)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', background: selected ? sd.bg+'88' : 'transparent', border:'none', borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:sd.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color:sd.color, flexShrink:0 }}>
                      {m.name[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{m.name}</div>
                      <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{ROLE_LABEL[m.role]} · {m.dept}</div>
                    </div>
                    <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${selected ? sd.color : '#D1D5DB'}`, background: selected ? sd.color : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                      {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </button>
                )
              })}
              {members.filter(m => m.status === 'active' && sd.roles.includes(m.role)).length === 0 && (
                <div style={{ padding:'20px', textAlign:'center', fontSize:'12px', color:'#9CA3AF' }}>해당 권한 구성원이 없습니다</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── 탭 2: 조건 설정
  const ConditionsTab = () => (
    <div style={{ padding:'14px 16px 100px' }}>
      {/* 2차 승인 on/off */}
      <div style={{ background:'#fff', borderRadius:'16px', padding:'14px 16px', marginBottom:'14px', border:`1px solid ${cfg.stage2Enabled ? '#C4B5FD' : '#EAECF0'}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'3px' }}>2차 승인 사용</div>
          <div style={{ fontSize:'11px', color:'#9CA3AF' }}>조건 충족 시 2차 검토 단계 추가</div>
        </div>
        <Toggle on={cfg.stage2Enabled} onChange={() => updateCfg({ stage2Enabled: !cfg.stage2Enabled })} brand="#7C3AED"/>
      </div>

      {cfg.stage2Enabled && (
        <>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'9px' }}>2차 승인 발동 조건</div>
          <div style={{ background:'#fff', borderRadius:'18px', overflow:'hidden', border:'1px solid #EAECF0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            {STAGE2_CONDITIONS.map((cond, i) => {
              const on = !!cfg.stage2Conditions[cond.id]
              return (
                <div key={cond.id} style={{ padding:'13px 16px', borderBottom: i < STAGE2_CONDITIONS.length-1 ? '1px solid #F0F1F3' : 'none', display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'10px', background: on ? '#F3EEFF' : '#F8F9FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0, transition:'background 0.2s' }}>{cond.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>{cond.label}</div>
                    <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{cond.sub}</div>
                  </div>
                  <Toggle on={on} onChange={() => toggleCond(cond.id)} brand="#7C3AED"/>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop:'12px', padding:'12px 14px', background:'#F3EEFF', borderRadius:'12px', fontSize:'10px', color:'#6D28D9', lineHeight:1.7 }}>
            활성화된 조건 중 <span style={{ fontWeight:700 }}>하나라도 해당</span>되면 2차 승인 단계가 자동으로 추가됩니다.
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      <Header onBack={onBack} title="승인 설정" sub="승인 흐름 · 승인자 배정 · 조건"/>

      {/* 탭 */}
      <div style={{ background:'#fff', borderBottom:'1px solid #EAECF0', display:'flex', flexShrink:0 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ flex:1, height:'44px', background:'transparent', border:'none', borderBottom: tab===i ? `2.5px solid ${theme.brand}` : '2.5px solid transparent', color: tab===i ? theme.brandDark : '#9CA3AF', fontSize:'12px', fontWeight: tab===i ? 700 : 500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
            {t}
          </button>
        ))}
      </div>

      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background:'#F8F9FB' }}>
        {tab === 0 && <FlowTab/>}
        {tab === 1 && <ApproversTab/>}
        {tab === 2 && <ConditionsTab/>}
      </div>

      {/* 저장 버튼 */}
      <div style={{ padding:'12px 16px 24px', background:'#fff', borderTop:'1px solid #EAECF0', flexShrink:0 }}>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
          style={{ width:'100%', height:'50px', background: saved ? '#059669' : '#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background 0.3s' }}>
          {saved ? '✓ 저장됨' : '설정 저장'}
        </button>
      </div>


    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 권한 없음 화면
// ═══════════════════════════════════════════════════════════
function AccessDeniedView() {
  const navigate = useNavigate()
  const bizRole  = sessionStorage.getItem('bizRole') || 'viewer'
  const roleInfo = ROLES[bizRole] || ROLES.viewer
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'32px 24px', background:'#F8F9FB', textAlign:'center' }}>
      <div style={{ width:'72px', height:'72px', borderRadius:'22px', background:'#FEE9E9', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px', fontSize:'32px' }}>
        🔒
      </div>
      <div style={{ fontSize:'18px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>접근 권한이 없습니다</div>
      <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7, marginBottom:'20px' }}>
        관리자 화면은 <b>최고관리자</b>와 <b>관리자</b>만<br/>접근할 수 있습니다.
      </div>
      <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'8px 18px', borderRadius:'20px', background:roleInfo.bg, color:roleInfo.color, fontSize:'12px', fontWeight:700, marginBottom:'32px' }}>
        <span>{roleInfo.icon}</span>
        <span>내 권한: {roleInfo.label}</span>
      </div>
      <button onClick={() => navigate(-1)}
        style={{ width:'100%', maxWidth:'280px', height:'48px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        이전 화면으로
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
export default function AdminManagementBiz() {
  const [view, setView]       = useState('main')
  const [members, setMembers] = useState(DEMO_MEMBERS)
  const scrollRef = useScrollRestore()

  // ── 권한 체크 ─────────────────────────────────────────────
  // 관리자 화면은 최고관리자(master)와 관리자(admin)만 접근 가능
  // accounting / manager / staff / viewer → 화면 진입 차단
  const bizRole = sessionStorage.getItem('bizRole') || 'viewer'
  const ADMIN_SCREEN_ALLOWED = ['master', 'admin']
  if (!ADMIN_SCREEN_ALLOWED.includes(bizRole)) {
    return <PhoneShell><AccessDeniedView /></PhoneShell>
  }

  const renderView = () => {
    switch (view) {
      case 'members': return <MembersView members={members} setMembers={setMembers} onBack={() => setView('main')} onInvite={() => setView('invite')} bizRole={bizRole} />
      case 'company': return <CompanySettingsView onBack={() => setView('main')} bizRole={bizRole} />
      case 'security':return <SecurityView onBack={() => setView('main')} bizRole={bizRole} />
      case 'invite':  return <InviteView   onBack={() => setView('members')} />
      case 'approval':return <ApprovalSettingsView onBack={() => setView('main')} members={members} />
      default:        return <MainHub members={members} onNav={v => setView(v)} bizRole={bizRole} />
    }
  }

  return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto', background: '#F4F6FB' }}>
        {renderView()}
      </div>
    </PhoneShell>
  )
}
