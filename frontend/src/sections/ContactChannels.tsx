import { ArrowUpRight, Check, Copy, Mail, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { GitHubIcon, LinkedInIcon } from "@/components/ui/BrandIcons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { copyToClipboard } from "@/lib/clipboard";
import { trackSpotlight } from "@/lib/motion";
import { displayUrl, mailtoHref, safeHref } from "@/lib/url";
import type { Profile } from "@/types/api";

interface Channel {
  key: "email" | "linkedin" | "github";
  label: string;
  /** Text shown for the channel (address or shortened URL). */
  value: string;
  href: string;
  external: boolean;
  description: string;
  action: string;
  icon: ReactNode;
}

/** Public channels (docs/SPEC.md §3.6): email, LinkedIn, GitHub — each hidden when empty. */
function buildChannels(profile: Profile): Channel[] {
  const channels: Channel[] = [];
  const email = profile.email.trim();
  const linkedin = safeHref(profile.linkedin_url);
  const github = safeHref(profile.github_url);

  if (email) {
    channels.push({
      key: "email",
      label: "Email",
      value: email,
      href: mailtoHref(email),
      external: false,
      description: "The most direct way to reach me about a role, an internship or a data project.",
      action: "Send an email",
      icon: <Mail aria-hidden="true" />,
    });
  }
  if (linkedin) {
    channels.push({
      key: "linkedin",
      label: "LinkedIn",
      value: displayUrl(linkedin),
      href: linkedin,
      external: true,
      description: "Professional profile, academic background and experience.",
      action: "View profile",
      icon: <LinkedInIcon />,
    });
  }
  if (github) {
    channels.push({
      key: "github",
      label: "GitHub",
      value: displayUrl(github),
      href: github,
      external: true,
      description: "Source code of my projects — pipelines, models and applications.",
      action: "View repositories",
      icon: <GitHubIcon />,
    });
  }
  return channels;
}

const GRID_COLUMNS: Record<number, string> = {
  1: "md:max-w-xl",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

interface ContactChannelsProps {
  profile: Profile;
  /** `grid`: large cards side by side (no form). `stack`: compact rows beside the form. */
  layout: "grid" | "stack";
  className?: string;
}

export function ContactChannels({ profile, layout, className }: ContactChannelsProps) {
  const channels = buildChannels(profile);
  if (channels.length === 0) return null;

  if (layout === "stack") {
    return (
      <ul aria-label="Contact channels" className={cn("space-y-3", className)}>
        {channels.map((channel) => (
          <ChannelRow key={channel.key} channel={channel} />
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label="Contact channels" className={cn("grid gap-5", GRID_COLUMNS[channels.length], className)}>
      {channels.map((channel, index) => (
        <Reveal as="li" key={channel.key} delay={index * 90} className="min-w-0">
          {channel.key === "email" ? <EmailCard channel={channel} /> : <LinkCard channel={channel} />}
        </Reveal>
      ))}
    </ul>
  );
}

/** Email: the primary channel — light-blue highlighted card with "Send an email" + copy. */
function EmailCard({ channel }: { channel: Channel }) {
  return (
    <article
      aria-labelledby="contact-email-title"
      onPointerMove={trackSpotlight}
      className="spotlight flex h-full flex-col overflow-hidden rounded-card border border-accent/25 bg-linear-to-br from-accent-tint via-white to-white p-6 shadow-lift transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 md:p-7"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.45),transparent)]"
      />
      <div className="flex items-start justify-between gap-3">
        <ChannelIcon tone="accent">{channel.icon}</ChannelIcon>
        <span className="rounded-full border border-accent/20 bg-white/80 px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.12em] text-accent-strong uppercase">
          Direct
        </span>
      </div>
      <h3 id="contact-email-title" className="mt-8 text-lg font-bold">
        {channel.label}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{channel.description}</p>
      <p className="mt-5 font-mono text-[14px] break-all text-ink select-all">{channel.value}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-7">
        <ButtonLink href={channel.href} size="sm" leadingIcon={<Mail aria-hidden="true" />}>
          {channel.action}
        </ButtonLink>
        <CopyEmailButton email={channel.value} />
      </div>
    </article>
  );
}

/** LinkedIn / GitHub: external profile cards. */
function LinkCard({ channel }: { channel: Channel }) {
  const titleId = `contact-${channel.key}-title`;
  return (
    <article
      aria-labelledby={titleId}
      onPointerMove={trackSpotlight}
      className="spotlight flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-soft transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-lift md:p-7"
    >
      <ChannelIcon tone="light">{channel.icon}</ChannelIcon>
      <h3 id={titleId} className="mt-8 text-lg font-bold">
        {channel.label}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{channel.description}</p>
      <p className="mt-5 truncate font-mono text-[13px] text-ink" title={channel.value}>
        {channel.value}
      </p>
      <div className="mt-auto pt-7">
        <ButtonLink
          href={channel.href}
          external
          variant="secondary"
          size="sm"
          trailingIcon={<ArrowUpRight aria-hidden="true" />}
        >
          {channel.action}{" "}
          <span className="sr-only">on {channel.label} (opens in a new tab)</span>
        </ButtonLink>
      </div>
    </article>
  );
}

/** Compact row used next to the contact form. */
function ChannelRow({ channel }: { channel: Channel }) {
  return (
    <li className="flex items-center gap-4 rounded-card border border-line bg-white p-3 pr-3 shadow-soft transition-[border-color,box-shadow] duration-300 hover:border-accent/25 hover:shadow-lift">
      <ChannelIcon tone="light" size="sm">
        {channel.icon}
      </ChannelIcon>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-slate-600 uppercase">{channel.label}</p>
        <a
          href={channel.href}
          {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="block truncate rounded-sm font-medium text-ink transition-colors hover:text-accent-strong"
        >
          {channel.value}
          {channel.external && (
            <>
              {" "}
              <span className="sr-only">(opens in a new tab)</span>
            </>
          )}
        </a>
      </div>
      {channel.key === "email" ? (
        <CopyEmailButton email={channel.value} compact />
      ) : (
        <ArrowUpRight aria-hidden="true" className="mr-2 size-4 shrink-0 text-slate-400" />
      )}
    </li>
  );
}

function ChannelIcon({ tone, size = "md", children }: { tone: "light" | "accent"; size?: "sm" | "md"; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        size === "md" ? "size-12 [&_svg]:size-5" : "size-11 [&_svg]:size-[18px]",
        tone === "accent"
          ? "bg-accent text-white shadow-accent"
          : "border border-accent/15 bg-accent-tint text-accent-strong",
      )}
    >
      {children}
    </span>
  );
}

type CopyStatus = "idle" | "copied" | "failed";

const COPY_FEEDBACK_MS = 2400;

interface CopyEmailButtonProps {
  email: string;
  /** Icon-only button (the address is already visible next to it). */
  compact?: boolean;
}

/** Copies the address and confirms it visually and to screen readers, then resets. */
function CopyEmailButton({ email, compact = false }: CopyEmailButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function handleCopy(): Promise<void> {
    setStatus((await copyToClipboard(email)) ? "copied" : "failed");
  }

  const label = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy";
  const icon =
    status === "copied" ? (
      <Check aria-hidden="true" />
    ) : status === "failed" ? (
      <TriangleAlert aria-hidden="true" />
    ) : (
      <Copy aria-hidden="true" />
    );

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void handleCopy()}
        leadingIcon={icon}
        className={cn(compact && "size-10! rounded-full! px-0!", status === "copied" && "text-success-strong!")}
        title={compact ? "Copy email address" : undefined}
      >
        {compact ? <span className="sr-only">Copy email address</span> : label}
      </Button>
      <span role="status" className="sr-only">
        {status === "copied" && `Email address ${email} copied to the clipboard.`}
        {status === "failed" && "The email address could not be copied. Please select it and copy it manually."}
      </span>
    </>
  );
}
