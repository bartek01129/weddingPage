import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			colors: {
				'primary-bg': '#F3F0E7',
				'accent-green': '#3A4B40',
				'info-green': '#253B2D',
				'accent-gold': '#C5A059',
				'text-main': '#3A4B40',
				'light-gray': '#EFEAE3',
				cream: '#FBF9F4',
			},
			fontFamily: {
				serif: ['Playfair Display', 'serif'],
				sans: ['Montserrat', 'sans-serif'],
				lato: ['Lato', 'sans-serif'],
			},
			fontSize: {
				xs: ['12px', '16px'],
				sm: ['14px', '20px'],
				base: ['16px', '24px'],
				lg: ['18px', '28px'],
				xl: ['20px', '28px'],
				'2xl': ['24px', '32px'],
				'3xl': ['30px', '36px'],
				'4xl': ['36px', '40px'],
				'5xl': ['48px', '48px'],
				'6xl': ['60px', '64px'],
			},
			boxShadow: {
				soft: '0 10px 30px rgba(58, 75, 64, 0.08)',
				softer: '0 4px 15px rgba(58, 75, 64, 0.06)',
				elegant: '0 15px 40px rgba(58, 75, 64, 0.12)',
				card: '0 1px 2px rgba(58, 75, 64, 0.05), 0 20px 50px -12px rgba(58, 75, 64, 0.14)',
			},
			letterSpacing: {
				elegant: '0.25em',
				wider2: '0.35em',
			},
			spacing: {
				18: '4.5rem',
				22: '5.5rem',
			},
			borderRadius: {
				xl: '16px',
				'2xl': '24px',
				'3xl': '32px',
			},
			animation: {
				float: 'float 6s ease-in-out infinite',
				'fade-in': 'fadeIn 1s ease-in',
			},
			keyframes: {
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-20px)' },
				},
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
			},
		},
	},
	plugins: [forms],
};
