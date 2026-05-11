type Props = {
  size?: number
  className?: string
}

export function SpecterLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ghost body — dome top, scalloped bottom */}
      <path
        d="M5 28 L5 12 A11 11 0 0 1 27 12 L27 28 Q23.5 23 20 28 Q16.5 23 13 28 Q9.5 23 6 28 Q5.5 28 5 28 Z"
        fill="#fde047"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Left eye */}
      <circle cx="12" cy="16" r="2" fill="currentColor" />
      {/* Right eye */}
      <circle cx="20" cy="16" r="2" fill="currentColor" />
    </svg>
  )
}
