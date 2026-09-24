import { Mail } from "lucide-react";
import type { ReactNode } from "react";

import { GitHubIcon, LinkedInIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/cn";
import { mailtoHref, safeHref } from "@/lib/url";

export type SocialKey = "email" | "github" | "linkedin";

const ALL_CHANNELS: readonly SocialKey[] = ["email", "github", "linkedin"];

interface SocialLinksProps {
  email: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  /** Kept for backward compatibility; links are always rendered for light surfaces. */
  tone?: "light" | "dark";
  /** Which channels to render (default: all three, each hidden when empty). */
  channels?: readonly SocialKey[];
  size?: "sm" | "md";
  className?: string;
}

interface SocialLink {
  key: SocialKey;
  label: string;
  href: string;
  icon: ReactNode;
  external: boolean;
}

/** Round icon links: email, GitHub, LinkedIn — each only when set. */
export function SocialLinks({
  email,
  githubUrl,
  linkedinUrl,
  channels = ALL_CHANNELS,
  size = "md",
  className,
}: SocialLinksProps) {
  const github = safeHref(githubUrl);
  const linkedin = safeHref(linkedinUrl);
  const address = email.trim();
  const links: SocialLink[] = [
    ...(address ? [{ key: "email" as const, label: `Email ${address}`, href: mailtoHref(address), icon: <Mail />, external: false }] : []),
    ...(github ? [{ key: "github" as const, label: "GitHub profile", href: github, icon: <GitHubIcon />, external: true }] : []),
    ...(linkedin
      ? [{ key: "linkedin" as const, label: "LinkedIn profile", href: linkedin, icon: <LinkedInIcon />, external: true }]
      : []),
  ].filter((link) => channels.includes(link.key));

  if (links.length === 0) return null;

  return (
    <ul className={cn("flex items-center", size === "sm" ? "gap-1.5" : "gap-2.5", className)}>
      {links.map((link) => (
        <li key={link.key}>
          <a
            href={link.href}
            aria-label={link.label}
            title={link.label}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(
              "flex items-center justify-center rounded-full border border-line bg-white text-slate-600 shadow-[0_1px_2px_rgb(19_34_63/0.05)]",
              "transition-[translate,border-color,color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/35 hover:text-accent-strong hover:shadow-soft",
              size === "sm" ? "size-9 [&_svg]:size-4" : "size-11 [&_svg]:size-[18px]",
            )}
          >
            {link.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}
