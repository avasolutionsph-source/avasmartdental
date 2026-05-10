import type { SVGProps } from "react";

/**
 * Receipt icon with a ₱ symbol inside (instead of lucide's default $).
 * Matches the lucide-react stroke style so it composes cleanly with
 * other lucide icons in the same set.
 */
export function PesoReceipt({
  className,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Receipt outline */}
      <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5Z" />
      {/* Peso symbol — uppercase P with two horizontal bars across the stem */}
      <path d="M9 7v10" />
      <path d="M9 7h3.5a2.5 2.5 0 0 1 0 5H9" />
      <path d="M8 10h6" />
      <path d="M8 12.5h6" />
    </svg>
  );
}
