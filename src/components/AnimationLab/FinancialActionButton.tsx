import type { ReactNode } from "react";

type FinancialActionButtonProps = {
  href: string;
  icon: string;
  variant: "light" | "watch";
  children: ReactNode;
  target?: "_blank";
};

export function FinancialActionButton({
  href,
  icon,
  variant,
  children,
  target,
}: FinancialActionButtonProps) {
  const variantClass = variant === "watch" ? "btn--watch" : "btn--light btn--download";

  return (
    <a
      className={`btn ${variantClass} s-financial2__cta`}
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}
