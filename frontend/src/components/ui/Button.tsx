import { LoaderCircle } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type To } from "react-router";

import { buttonClasses, type ButtonStyleProps } from "@/components/ui/buttonStyles";

interface IconSlots {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}

export interface ButtonProps
  extends ButtonStyleProps,
    IconSlots,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  tone,
  className,
  loading = false,
  leadingIcon,
  trailingIcon,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, tone, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">;

/** Internal route (react-router) or plain URL; `external` opens a new tab with rel="noopener noreferrer". */
type LinkTarget = { to: To; href?: never; external?: never } | { href: string; to?: never; external?: boolean };

export type ButtonLinkProps = ButtonStyleProps & IconSlots & AnchorProps & LinkTarget;

function withSafeRel(rel: string | undefined): string {
  const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
  tokens.add("noopener");
  tokens.add("noreferrer");
  return [...tokens].join(" ");
}

/** A link styled as a button. */
export function ButtonLink(props: ButtonLinkProps) {
  const { variant, size, tone, className, leadingIcon, trailingIcon, children, ...rest } = props;
  const classes = buttonClasses({ variant, size, tone, className });
  const content = (
    <>
      {leadingIcon}
      {children}
      {trailingIcon}
    </>
  );

  if (rest.to !== undefined) {
    const { to, external: _external, href: _href, ...anchor } = rest;
    return (
      <Link to={to} className={classes} {...anchor}>
        {content}
      </Link>
    );
  }

  const { href, external, target, rel, to: _to, ...anchor } = rest;
  const newTab = external || target === "_blank";
  return (
    <a
      href={href}
      className={classes}
      target={newTab ? "_blank" : target}
      rel={newTab ? withSafeRel(rel) : rel}
      {...anchor}
    >
      {content}
    </a>
  );
}
