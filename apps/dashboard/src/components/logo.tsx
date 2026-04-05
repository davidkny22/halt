export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="12 10 56 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", position: "relative", top: "2px" }}
    >
      <path
        d="M20 55 C20 30, 35 15, 40 15"
        stroke="var(--color-coral)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M60 55 C60 30, 45 15, 40 15"
        stroke="var(--color-coral)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="40" cy="42" r="5" fill="var(--color-coral)" />
      <path
        d="M25 55 Q40 65, 55 55"
        stroke="var(--color-coral)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
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
        Halt
      </span>
    </div>
  );
}
