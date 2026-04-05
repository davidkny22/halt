export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="halt-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB199" />
          <stop offset="50%" stopColor="#FF6B4A" />
          <stop offset="100%" stopColor="#CC3311" />
        </linearGradient>
      </defs>
      <path
        d="M 28,28 L 28,120 Q 28,140 42,140 L 75,140 L 140,42 L 140,28 Q 140,28 120,28 Z"
        fill="url(#halt-logo-grad)"
      />
      <path
        d="M 82,148 L 148,52 L 148,130 Q 148,148 130,148 Z"
        fill="#FF6B4A"
        opacity="0.5"
      />
    </svg>
  );
}

export function LogoFull({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      <span
        className="font-bold"
        style={{
          fontSize: size * 0.7,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        halt
      </span>
    </div>
  );
}
