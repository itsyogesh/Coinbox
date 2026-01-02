import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-base" },
    md: { icon: 32, text: "text-xl" },
    lg: { icon: 48, text: "text-3xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Coin with Arrow Logo */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Coin circle with gradient */}
        <defs>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="arrowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
        </defs>

        {/* Main coin body */}
        <circle
          cx="22"
          cy="26"
          r="18"
          stroke="url(#coinGradient)"
          strokeWidth="3"
          fill="none"
        />

        {/* Inner coin detail */}
        <circle
          cx="22"
          cy="26"
          r="12"
          stroke="url(#coinGradient)"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />

        {/* Arrow pointing up-right */}
        <path
          d="M28 8L40 8L40 20"
          stroke="url(#arrowGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M40 8L24 24"
          stroke="url(#arrowGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {showText && (
        <span className={cn("font-heading font-semibold tracking-tight text-foreground", text)}>
          coinbox
        </span>
      )}
    </div>
  );
}

// Simplified icon-only version for app icon/favicon
export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="coinGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="arrowGradientIcon" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>

      <circle
        cx="22"
        cy="26"
        r="18"
        stroke="url(#coinGradientIcon)"
        strokeWidth="3"
        fill="none"
      />

      <circle
        cx="22"
        cy="26"
        r="12"
        stroke="url(#coinGradientIcon)"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />

      <path
        d="M28 8L40 8L40 20"
        stroke="url(#arrowGradientIcon)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M40 8L24 24"
        stroke="url(#arrowGradientIcon)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
