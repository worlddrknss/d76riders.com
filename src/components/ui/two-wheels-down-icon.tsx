// The biker "two wheels down" salute — index + middle fingers pointed low at the
// ground. Passing riders give it to mean "keep both wheels down, ride safe." It's
// our reaction gesture, so this is a hand-authored mark rather than a stock emoji.
//
// `filled` fills the hand silhouette (the reaction is active); otherwise it renders
// as a lucide-style outline. Sizing/colour come from `className` (currentColor).

export function TwoWheelsDownIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* back of the hand + curled knuckles */}
      <path d="M6.3 10.6V8a2.35 2.35 0 0 1 4.7 0" />
      <path d="M11 8V7.1a2.35 2.35 0 0 1 4.7 0v3.4" />
      {/* thumb tucked across */}
      <path d="M15.7 9.4c1-.9 2.6-.7 3 .7.2 1-.3 1.9-1.2 2.5" />
      {/* index + middle fingers pointed down at the road */}
      <path d="M8 10.6 6.9 19.6" />
      <path d="M13.1 10.9 13.9 20.6" />
    </svg>
  );
}
