export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 앱 배경
        'app-bg': '#F4F6FB',
        // 히어로 그라데이션
        'hero-from': '#1A1240',
        'hero-to': '#2D1F6E',
        // 브랜드
        'brand': '#5B4FE8',
        'brand-purple': '#9333EA',
        // 시맨틱
        'success': '#10B981',
        'warn': '#F59E0B',
        'danger': '#EF4444',
        // 텍스트
        't1': '#1A1A2E',
        't2': '#4A4A6A',
        't3': '#8A8AAA',
        't4': '#BABADA',
        // 카드/서피스
        'card': '#FFFFFF',
        'card2': '#F0F2FA',
        'border': '#E4E6F0',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '10': '10px', '12': '12px', '14': '14px', '16': '16px', '20': '20px',
      },
      backgroundImage: {
        'hero': 'linear-gradient(160deg, #1A1240 0%, #2D1F6E 60%, #3D2090 100%)',
        'brand-grad': 'linear-gradient(135deg, #5B4FE8, #9333EA)',
      }
    },
  },
  plugins: [],
}
