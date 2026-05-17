import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import DarkHeader from '../../components/DarkHeader'
import {
  getRecipientsByMenu,
  getAllRecipients,
  getRecipientByPhone,
  addRecipient,
  MENU_TO_ROLE,
  MENU_ALLOWS_MULTI,
  ROLES,
} from '../../shared/recipientsData'
import { useScrollRestore } from '../../hooks/useScrollRestore'

// ─────────────────────────────────────────────────────────
// 메뉴별 다음 화면 매핑 (선택 후 어느 화면으로?)
// ─────────────────────────────────────────────────────────
const MENU_NEXT_PATH = {
  freelance:    '/execute/business/freelance',
  bonus:        '/execute/business/bonus',
  condolence:   '/execute/business/condolence',
  otherIncome:  '/execute/business/other-income',
  lend:         '/execute/business/lend',
  support:      '/execute/business/support',
  realestate:   '/execute/personal/realestate',
  marketing:    '/execute/business/freelance',
  vendorLoan:   '/execute/business/vendor-loan',
  vendorInvest: '/execute/business/vendor-invest',
  salary:       '/execute/business/operations/salary/register',
}

// 템플릿 치환
function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// ─────────────────────────────────────────────────────────
// 받는 사람 카드
// ─────────────────────────────────────────────────────────
function RecipientCard({ recipient, selected, onClick, multi, currentRole, t, theme }) {
  const isAlsoOtherRole = recipient.roles.length > 1
  const otherRole = recipient.roles.find(r => r !== currentRole)

  return (
    <button
      onClick={onClick}
      style={{
        width:'100%', padding:'12px 14px',
        background: selected ? `${theme.brand}10` : COLORS.bgCard,
        border: selected ? `1.5px solid ${theme.brand}` : `1px solid ${COLORS.borderSoft}`,
        borderRadius: RADIUS.lg,
        cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        display:'flex', alignItems:'center', gap:'12px',
      }}>
      {/* 다중 선택 시 체크박스 */}
      {multi && (
        <div style={{
          width:'22px', height:'22px',
          borderRadius:'6px',
          background: selected ? theme.brand : 'transparent',
          border: selected ? 'none' : `2px solid ${COLORS.t5}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          {selected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      )}

      {/* 아바타 */}
      <div style={{
        width:'40px', height:'40px',
        borderRadius: recipient.isBusiness ? '11px' : '50%',
        background: recipient.avatarBg || '#F2EFE9',
        color: recipient.avatarFg || '#555550',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: recipient.isBusiness ? '13px' : '15px',
        fontWeight:700, flexShrink:0,
      }}>
        {recipient.initial}
      </div>

      {/* 본문 */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
          <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {recipient.name}
          </span>
          {!recipient.verified && (
            <span style={{
              padding:'1px 5px',
              background:'#FFFBEB', color:'#854F0B',
              border:'1px solid #F7D98A',
              borderRadius:'4px', fontSize:'9px', fontWeight:700, flexShrink:0,
            }}>
              {t('selectRecipB.card.unverified')}
            </span>
          )}
          {isAlsoOtherRole && otherRole && (
            <span style={{
              padding:'1px 5px',
              background: COLORS.bgMuted, color: COLORS.t3,
              borderRadius:'4px', fontSize:'9px', fontWeight:700, flexShrink:0,
            }}>
              {fill(t('selectRecipB.card.alsoRole'), { role: ROLES[otherRole]?.label || otherRole })}
            </span>
          )}
        </div>
        <div style={{ fontSize:'11px', color: COLORS.t4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {/* role 별 부가 정보 */}
          {recipient.employeeInfo && fill(t('selectRecipB.card.dept'), {
            dept: recipient.employeeInfo.department,
            position: recipient.employeeInfo.position,
          })}
          {!recipient.employeeInfo && recipient.freelancerInfo &&
            fill(t('selectRecipB.card.field'), { field: recipient.freelancerInfo.field })}
          {!recipient.employeeInfo && !recipient.freelancerInfo && recipient.isBusiness &&
            `${recipient.bizNumber} · ${recipient.industry || ''}`}
          {!recipient.employeeInfo && !recipient.freelancerInfo && !recipient.isBusiness &&
            (recipient.field || recipient.phone)}
        </div>
      </div>

      {!multi && (
        <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// 새로 추가 바텀시트
// ─────────────────────────────────────────────────────────
function AddNewSheet({ onClose, onSubmit, t, theme }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return
    // 중복 검사
    const existing = getRecipientByPhone(phone)
    if (existing) {
      setError(t('selectRecipB.addModal.duplicate'))
      setTimeout(() => onSubmit(existing, true), 1200)
      return
    }
    onSubmit({ name: name.trim(), phone: phone.trim() }, false)
  }

  const valid = name.trim().length >= 1 && phone.trim().length >= 9 && !error

  return (
    <div
      onClick={onClose}
      style={{
        position:'absolute', inset:0,
        background:'rgba(0,0,0,0.55)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        zIndex:1000,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.bgCard,
          borderTopLeftRadius:'18px',
          borderTopRightRadius:'18px',
          padding:'20px 20px 28px',
          width:'100%',
          boxShadow: SHADOWS.card,
        }}>
        {/* 핸들 바 */}
        <div style={{
          width:'36px', height:'4px',
          background: COLORS.borderSoft,
          borderRadius:'2px',
          margin:'0 auto 14px',
        }}/>

        <div style={{ fontSize:'17px', fontWeight:700, color: COLORS.t1, marginBottom:'6px' }}>
          {t('selectRecipB.addModal.title')}
        </div>
        <div style={{ fontSize:'12px', color: COLORS.t4, lineHeight:1.55, marginBottom:'18px' }}>
          {t('selectRecipB.addModal.body')}
        </div>

        <input
          type="text"
          placeholder={t('selectRecipB.addModal.namePh')}
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          style={{
            width:'100%', height:'46px',
            padding:'0 14px',
            border:`1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            fontSize:'14px', fontFamily:'inherit',
            marginBottom:'10px',
            outline:'none',
          }}
        />
        <input
          type="tel"
          placeholder={t('selectRecipB.addModal.phonePh')}
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError('') }}
          style={{
            width:'100%', height:'46px',
            padding:'0 14px',
            border:`1px solid ${error ? COLORS.warning : COLORS.border}`,
            borderRadius: RADIUS.md,
            fontSize:'14px', fontFamily:'inherit',
            marginBottom: error ? '6px' : '18px',
            outline:'none',
          }}
        />
        {error && (
          <div style={{ fontSize:'11px', color:'#854F0B', marginBottom:'14px' }}>
            {error}
          </div>
        )}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose}
            style={{
              flex:1, height:'48px',
              background: COLORS.bgMuted, color: COLORS.t2,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'14px', fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            {t('selectRecipB.addModal.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!valid}
            style={{
              flex:1, height:'48px',
              background: valid ? theme.brand : COLORS.bgMuted,
              color: valid ? '#fff' : COLORS.t5,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'14px', fontWeight:700,
              cursor: valid ? 'pointer' : 'not-allowed',
              fontFamily:'inherit',
            }}>
            {t('selectRecipB.addModal.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────
export default function SelectRecipientBusiness() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const theme = getAccountTheme()
  const t = useT()
  const scrollRef = useScrollRestore()

  const menuId = searchParams.get('menu') || 'freelance'
  const isMulti = !!MENU_ALLOWS_MULTI[menuId]
  const currentRole = MENU_TO_ROLE[menuId]

  const [tab, setTab] = useState('recommended')   // 'recommended' | 'all'
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [showAddSheet, setShowAddSheet] = useState(false)

  // 화면 타이틀
  const titleKey = `selectRecipB.title.${menuId}`
  const titleDefault = t('selectRecipB.title.default')
  const title = (() => {
    const v = t(titleKey)
    return v === titleKey ? titleDefault : v
  })()

  // 리스트 (탭 + 검색 적용)
  const list = useMemo(() => {
    let pool = tab === 'recommended' ? getRecipientsByMenu(menuId) : getAllRecipients()
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      pool = pool.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.bizNumber || '').includes(q) ||
        (r.employeeInfo?.department || '').toLowerCase().includes(q) ||
        (r.employeeInfo?.position || '').toLowerCase().includes(q) ||
        (r.freelancerInfo?.field || '').toLowerCase().includes(q) ||
        (r.industry || '').toLowerCase().includes(q)
      )
    }
    return pool
  }, [tab, menuId, query])

  // 선택 핸들링
  const toggleSelect = (recipient) => {
    if (isMulti) {
      setSelectedIds(prev =>
        prev.includes(recipient.id)
          ? prev.filter(x => x !== recipient.id)
          : [...prev, recipient.id]
      )
    } else {
      // 단일 선택 — 즉시 다음 화면
      goNext([recipient])
    }
  }

  // 다음 화면으로
  const goNext = (recipients) => {
    const nextPath = MENU_NEXT_PATH[menuId] || '/home-business'
    if (isMulti) {
      navigate(nextPath, { state: { recipients } })
    } else {
      navigate(nextPath, { state: { recipient: recipients[0] } })
    }
  }

  const handleNext = () => {
    if (selectedIds.length === 0) return
    const recipients = selectedIds
      .map(id => list.find(r => r.id === id) || getAllRecipients().find(r => r.id === id))
      .filter(Boolean)
    goNext(recipients)
  }

  // 새로 추가
  const handleAddSubmit = (data, isExisting) => {
    setShowAddSheet(false)
    if (isExisting) {
      // 기존 사람 — 자동 선택 후 진행
      if (isMulti) {
        setSelectedIds(prev => prev.includes(data.id) ? prev : [...prev, data.id])
      } else {
        goNext([data])
      }
    } else {
      // 새로 추가
      const newOne = addRecipient({
        name: data.name,
        phone: data.phone,
        fromMenu: menuId,
      })
      if (isMulti) {
        setSelectedIds(prev => [...prev, newOne.id])
      } else {
        goNext([newOne])
      }
    }
  }

  // 다음 버튼 라벨
  const nextLabel = isMulti
    ? (selectedIds.length === 0
        ? t('selectRecipB.btn.nextEmpty')
        : fill(t('selectRecipB.btn.nextMulti'), { count: selectedIds.length }))
    : t('selectRecipB.btn.next')

  const nextEnabled = !isMulti || selectedIds.length > 0

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'hidden', background: COLORS.bg }}>

        <DarkHeader
          smallTitle={t('selectRecipB.smallTitle')}
          bigTitle={title}
          sub={isMulti ? t('selectRecipB.sub.multi') : t('selectRecipB.sub.single')}
          onBack={() => navigate(-1)}
          headerGrad={theme.headerGrad}
          exitTo="/home-business"
        />

        {/* 탭 */}
        <div style={{
          display:'flex', gap:'0',
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.bgCard,
        }}>
          {[
            { id:'recommended', label: t('selectRecipB.tab.recommended') },
            { id:'all',         label: t('selectRecipB.tab.all') },
          ].map(it => (
            <button key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                flex:1, height:'44px',
                background:'transparent', border:'none',
                fontSize:'13px', fontWeight: tab === it.id ? 700 : 500,
                color: tab === it.id ? theme.brandDark : COLORS.t4,
                cursor:'pointer', fontFamily:'inherit',
                borderBottom: tab === it.id ? `2px solid ${theme.brandDark}` : '2px solid transparent',
              }}>
              {it.label}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div style={{ padding:'12px 16px 8px', background: COLORS.bgCard }}>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              placeholder={t('selectRecipB.search.ph')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width:'100%', height:'40px',
                padding:'0 14px 0 38px',
                background: COLORS.bgMuted,
                border:'none',
                borderRadius: RADIUS.md,
                fontSize:'13px', fontFamily:'inherit',
                outline:'none',
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round"
              style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        {/* 리스트 */}
        <div ref={scrollRef} style={{
          flex:1, overflowY:'auto',
          padding:'8px 16px 12px',
          display:'flex', flexDirection:'column', gap:'8px',
        }}>
          {list.length === 0 ? (
            <div style={{
              padding:'60px 20px', textAlign:'center',
              fontSize:'13px', color: COLORS.t4, lineHeight:1.6,
            }}>
              {query
                ? t('selectRecipB.empty.search')
                : t('selectRecipB.empty.recommended')}
            </div>
          ) : (
            list.map(r => (
              <RecipientCard
                key={r.id}
                recipient={r}
                selected={selectedIds.includes(r.id)}
                onClick={() => toggleSelect(r)}
                multi={isMulti}
                currentRole={currentRole}
                t={t}
                theme={theme}
              />
            ))
          )}

          {/* + 새로 추가 (점선 테두리) */}
          <button
            onClick={() => setShowAddSheet(true)}
            style={{
              width:'100%', padding:'14px',
              background:'transparent',
              border: `1.5px dashed ${COLORS.t5}`,
              borderRadius: RADIUS.lg,
              cursor:'pointer', fontFamily:'inherit',
              fontSize:'13px', fontWeight:600, color: theme.brandDark,
              marginTop:'4px',
            }}>
            {t('selectRecipB.addNew')}
          </button>
        </div>

        {/* 다중 선택 — 하단 sticky 버튼 */}
        {isMulti && (
          <div style={{
            padding:'12px 16px 24px',
            borderTop: `1px solid ${COLORS.borderSoft}`,
            background: COLORS.bgCard,
          }}>
            <button onClick={handleNext} disabled={!nextEnabled}
              style={{
                width:'100%', height:'52px',
                background: nextEnabled ? theme.brandDark : COLORS.bgMuted,
                color: nextEnabled ? '#fff' : COLORS.t5,
                border:'none', borderRadius: RADIUS.md,
                fontSize:'15px', fontWeight:700,
                cursor: nextEnabled ? 'pointer' : 'not-allowed',
                fontFamily:'inherit',
                boxShadow: nextEnabled ? SHADOWS.card : 'none',
              }}>
              {nextLabel}
            </button>
          </div>
        )}
      </div>

      {showAddSheet && (
        <AddNewSheet
          onClose={() => setShowAddSheet(false)}
          onSubmit={handleAddSubmit}
          t={t}
          theme={theme}
        />
      )}
    </PhoneShell>
  )
}
