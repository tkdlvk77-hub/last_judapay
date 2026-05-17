# 주다페이 디자인 시스템 가이드

## 핵심 원칙

1. **모든 화면은 `src/design/` 의 토큰과 컴포넌트를 사용한다.**
2. 직접 hex 코드, 그림자, radius 값을 쓰지 않는다.
3. 새로운 디자인 패턴이 필요하면 먼저 `tokens.js` 또는 `components.jsx`에 추가하고, 그걸 import해서 사용한다.

---

## 디자인 톤

### 컬러 시스템
- **브랜드**: 보라/인디고 (`#5B4FE8`)
- **헤더**: 다크 그라데이션 (보라 → 진한 남색)
- **배경**: 연한 라벤더 그레이 (`#F4F6FB`)
- **카드**: 순백 + 부드러운 그림자

### 자금 종류 색상은 유지 (도메인 의미 보존)
- 외주비 = 파랑
- 부동산 = 녹색
- 자금 지원 = 황갈
- 빌려주기/대여금 = 주황
- 용돈선물 = 분홍

→ `FUND_COLORS` 토큰 사용

### 화면 구성 패턴
- 화면 상단 1/3은 다크 그라데이션 헤더
- 헤더 안에 프로필 + 잔액 카드 또는 페이지 타이틀
- 하단은 라이트 배경 + 흰 카드들

### 헤더 영역 원칙 (중요)
**헤더 안의 콘텐츠는 라운드 박스나 글래스 카드로 감싸지 않는다.**
- 헤더 그라데이션 위에 직접 콘텐츠를 배치 (좌우 padding `20px`만)
- 좌측 뒤로가기 화살표는 transparent 배경, 흰 stroke만 (보더/배경 없음)
- 큰 금액·이름·진행률 바·% 배지 등이 그라데이션 위에 자연스럽게 떠 있어야 함
- 글래스 카드(`rgba(255,255,255,0.10)`)는 잔액 카드 등 **명확히 구분이 필요한 단일 정보**만 사용

```jsx
// 좋은 예
<div style={{ background: GRADIENTS.header, paddingTop:'20px', paddingBottom:'24px' }}>
  <div style={{ padding:'4px 16px 18px' }}>
    <button onClick={back}>← 뒤로</button>
  </div>
  <div style={{ padding:'0 20px' }}>
    {/* 콘텐츠가 그라데이션 위에 직접 */}
  </div>
</div>

// 나쁜 예 — 헤더 안에 라운드 박스
<GradientHeader>
  <div style={{ background:'rgba(255,255,255,0.10)', borderRadius:'16px', padding:'18px' }}>
    {/* 콘텐츠 */}
  </div>
</GradientHeader>
```

---

## 컴포넌트 사용 예시

### 1. 기본 화면 골격

```jsx
import { PhoneShell, GradientHeader, PageTitle } from '../design/components'

export default function MyScreen() {
  return (
    <PhoneShell>
      <GradientHeader>
        <PageTitle title="알림" badge={3} />
      </GradientHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        {/* 콘텐츠 */}
      </div>

      <BottomTab />
    </PhoneShell>
  )
}
```

### 2. 잔액 카드 (홈 화면)

```jsx
<GradientHeader>
  <ProfileBadge
    icon={<MyIcon />}
    accent="PERSONAL"
    name="이호형"
    sub="개인 계정"
  />
  <BalanceCard
    label="출금 가능 잔액"
    amount="1,250,000"
    sub="받은 자금 320,000원"
    secondary="+3.2%"
  />
  <div style={{ display:'flex', justifyContent:'space-around', padding:'24px 32px 8px' }}>
    <CircleAction icon={<PlusIcon />} label="충전" onClick={...} />
    <CircleAction icon={<ZapIcon />} label="지급집행" active onClick={...} />
    <CircleAction icon={<CardIcon />} label="카드결제" onClick={...} />
    <CircleAction icon={<ArrowIcon />} label="출금" onClick={...} />
  </div>
</GradientHeader>
```

### 3. 진행률이 있는 카드

```jsx
<Card>
  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
    <div>
      <div style={{ fontWeight:600 }}>박철수 외주비</div>
      <div style={{ fontSize:'11px', color: COLORS.t4 }}>검수 대기 · MCC 제한</div>
    </div>
    <span style={{ fontWeight:600 }}>1,500,000원</span>
  </div>
  <ProgressBar pct={55} showLabel />
</Card>
```

### 4. 자금 종류 배지

```jsx
import { FundBadge, Badge, FUND_COLORS } from '../design/...'

// 미니 배지 (이모지 + 라벨)
<FundBadge type="freelance" />

// 색상 강조 배지
<Badge bg={FUND_COLORS.freelance.bg} color={FUND_COLORS.freelance.main}>
  외주비
</Badge>
```

### 5. 필터 칩 (메시지/알림)

```jsx
<FilterChips
  value={filter}
  onChange={setFilter}
  items={[
    { id: 'all', label: '전체' },
    { id: 'freelance', label: '외주비', count: 3 },
    { id: 'lend', label: '대여금' },
    { id: 'warning', icon: '⚠', label: '주의' },
  ]}
/>
```

### 6. 진행률 그라데이션 자동 선택

```jsx
import { progressGradient } from '../design/tokens'

// 30% → 핑크-주황
// 65% → 빨강
// 100% → 보라
<div style={{ background: progressGradient(pct) }} />
```

---

## 향후 화면 작업 시 체크리스트

- [ ] `import` 문에서 직접 hex 코드를 쓰지 않았는가? (`COLORS.brand` 사용)
- [ ] 새로운 카드 패턴이라면 `Card` 컴포넌트를 사용했는가?
- [ ] 그라데이션 헤더 영역을 사용했는가? (홈/메시지/알림/더보기 4개 화면)
- [ ] 진행률 바가 있다면 `ProgressBar` 컴포넌트를 썼는가?
- [ ] 자금 종류 색상은 `FUND_COLORS` 토큰을 참조했는가?
- [ ] 새로운 패턴이 등장하면 components.jsx에 추가하고 README 업데이트했는가?

---

## 토큰 우선순위

새 디자인 결정이 필요하면 이 순서로 시도:

1. 기존 토큰으로 가능한가? → 그대로 사용
2. 토큰의 변형(예: 다른 사이즈)이 필요한가? → tokens.js에 추가
3. 새 패턴 컴포넌트인가? → components.jsx에 추가, README에 예시 추가
4. 한 화면에서만 쓰는 일회성 스타일인가? → 화면 안에 인라인 OK (단, 컬러는 토큰 사용)
