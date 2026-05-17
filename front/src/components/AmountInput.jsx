// 금액 입력 공통 컴포넌트 — 글자 수에 따라 폰트 자동 축소
export default function AmountInput({ amount, onChange, onClear }) {
  const len = amount ? amount.length : 1
  const fontSize = len <= 6 ? 44 : len <= 8 ? 36 : len <= 10 ? 28 : 22

  return (
    <div style={{ position:'relative', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'6px' }}>
      <div style={{ display:'inline-flex', alignItems:'baseline', gap:'3px', transform:'translateX(18px)' }}>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          style={{
            fontSize:`${fontSize}px`,
            fontWeight:'700',
            lineHeight:1,
            color: amount ? '#111' : '#C8C5BE',
            background:'transparent',
            border:'none',
            outline:'none',
            textAlign:'center',
            fontFamily:'inherit',
            width:'200px',
            transition:'font-size 0.15s',
            WebkitAppearance:'none',
            MozAppearance:'textfield',
          }}
        />
        <span style={{
          fontSize: fontSize >= 36 ? '26px' : fontSize >= 28 ? '20px' : '16px',
          fontWeight:'700',
          color: amount ? '#111' : '#C8C5BE',
          lineHeight:1,
          transition:'font-size 0.15s',
        }}>원</span>
      </div>
      {amount > 0 && (
        <button onClick={onClear}
          style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', width:'28px', height:'28px', borderRadius:'50%', background:'#E8E4DC', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9B9990" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}
