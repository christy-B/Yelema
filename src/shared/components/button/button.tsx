import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
  size?: "small" | "medium" | "large";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "medium",
  leadingIcon,
  trailingIcon,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = `button button--${variant} button--${size} ${className}`.trim();
  return (
    <button type={type} className={classes} {...props}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
