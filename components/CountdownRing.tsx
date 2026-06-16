"use client";

interface Props {
  /** Progreso 0..1 (1 = lleno / recién emitido, 0 = expirado). */
  progress: number;
  size?: number;
  children?: React.ReactNode;
}

export default function CountdownRing({ progress, size = 320, children }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  const color = progress > 0.33 ? "#2ecc71" : progress > 0.15 ? "#f1c40f" : "#e74c3c";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.4s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
