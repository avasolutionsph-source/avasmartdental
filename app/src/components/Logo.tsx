import { Link } from "react-router-dom";

type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-8 sm:h-9",
  md: "h-9 sm:h-10",
  lg: "h-12 sm:h-14",
};

export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: Size;
}) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center ${className}`}
      aria-label="Ava Smart Dental"
    >
      <img
        src="/logo-with-name.png"
        alt="Ava Smart Dental"
        className={`${sizeClass[size]} w-auto select-none`}
        draggable={false}
      />
    </Link>
  );
}
