/**
 * Spinner — circular loading indicator.
 * size: sm | md | lg
 */
const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

export default function Spinner({ size = "md", className = "" }) {
  return (
    <div
      className={`animate-spin rounded-full border-orange-200 border-t-orange-500 ${sizes[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
