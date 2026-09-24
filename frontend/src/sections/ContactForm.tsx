import { CircleAlert, CircleCheck, Send } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  mapServerFieldErrors,
  trimContactValues,
  validateContact,
  validateContactField,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from "@/lib/contactValidation";
import { mailtoHref } from "@/lib/url";
import { ApiError } from "@/services/api";
import { submitContact } from "@/services/contact";

const EMPTY_VALUES: ContactValues = { name: "", email: "", subject: "", message: "" };

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

interface ContactFormProps {
  /** Fallback address mentioned in error messages (from the profile). */
  email: string | null;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      const minutes = error.retryAfter ? Math.max(1, Math.ceil(error.retryAfter / 60)) : null;
      return minutes
        ? `You have sent several messages recently. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
        : "You have sent several messages recently. Please try again a little later.";
    }
    if (error.status === 422) return "Some fields need your attention — please check the highlighted fields.";
    if (error.status === 503 || error.code === "contact_unavailable") {
      return "Messages can't be sent through this form at the moment.";
    }
    if (error.isNetworkError) return "The message could not be sent: the server is unreachable. Please check your connection.";
  }
  return "Something went wrong while sending your message. Please try again in a moment.";
}

/**
 * Contact form: client-side validation mirroring the backend limits, hidden honeypot,
 * `elapsed_ms` measured from display, per-field server errors (422), rate limit (429),
 * form disabled server-side (503 `contact_unavailable`) — always with the email fallback.
 */
export function ContactForm({ email }: ContactFormProps) {
  const idPrefix = useId();
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const displayedAt = useRef(0);
  const fields = useRef<Partial<Record<ContactField, FieldElement | null>>>({});

  useEffect(() => {
    displayedAt.current = performance.now();
  }, []);

  const fieldId = (field: ContactField | "website") => `${idPrefix}-${field}`;

  function focusFirstInvalid(found: ContactErrors): void {
    const first = CONTACT_FIELDS.find((field) => found[field]);
    if (first) fields.current[first]?.focus();
  }

  function handleChange(field: ContactField, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    // Once a field shows an error, re-validate it live so the message clears as soon as it is fixed.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validateContactField(field, value) }));
  }

  function handleBlur(field: ContactField): void {
    if (!values[field]) return;
    setErrors((current) => ({ ...current, [field]: validateContactField(field, values[field]) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (state.kind === "submitting") return;

    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setState({ kind: "idle" });
      focusFirstInvalid(found);
      return;
    }

    setState({ kind: "submitting" });
    try {
      await submitContact({
        ...trimContactValues(values),
        website: honeypot,
        elapsed_ms: Math.round(performance.now() - displayedAt.current),
      });
      setValues(EMPTY_VALUES);
      setErrors({});
      setState({ kind: "success" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const serverErrors = mapServerFieldErrors(error.errors);
        setErrors(serverErrors);
        focusFirstInvalid(serverErrors);
      }
      setState({ kind: "error", message: describeError(error) });
    }
  }

  function startOver(): void {
    displayedAt.current = performance.now();
    setState({ kind: "idle" });
  }

  if (state.kind === "success") {
    return (
      <div role="status" className="flex flex-col items-start py-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-tint text-accent-strong">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <h3 tabIndex={-1} ref={(node) => node?.focus()} className="mt-6 text-2xl font-bold outline-none">
          Message sent
        </h3>
        <p className="mt-2 text-lg text-slate-600">Thank you for reaching out. I will reply to you shortly.</p>
        <Button variant="secondary" className="mt-8" onClick={startOver}>
          Send another message
        </Button>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form noValidate onSubmit={handleSubmit} aria-describedby={`${idPrefix}-hint`} className="relative">
      <p id={`${idPrefix}-hint`} className="text-sm text-slate-600">
        All fields are required.
      </p>

      {state.kind === "error" && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-[10px] border border-danger/25 bg-danger/[0.06] p-4 text-sm text-ink"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-danger" />
          <p>
            {state.message}
            {email && (
              <>
                {" "}
                You can also write to{" "}
                <a href={mailtoHref(email)} className="font-medium text-accent-strong underline underline-offset-4">
                  {email}
                </a>
                .
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field id={fieldId("name")} label="Name" error={errors.name}>
          {(describedBy) => (
            <input
              ref={(node) => {
                fields.current.name = node;
              }}
              id={fieldId("name")}
              name="name"
              type="text"
              autoComplete="name"
              maxLength={CONTACT_LIMITS.name.max}
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              onBlur={() => handleBlur("name")}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy}
              className={inputClasses(Boolean(errors.name))}
            />
          )}
        </Field>
        <Field id={fieldId("email")} label="Email" error={errors.email}>
          {(describedBy) => (
            <input
              ref={(node) => {
                fields.current.email = node;
              }}
              id={fieldId("email")}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={CONTACT_LIMITS.email.max}
              value={values.email}
              onChange={(event) => handleChange("email", event.target.value)}
              onBlur={() => handleBlur("email")}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy}
              className={inputClasses(Boolean(errors.email))}
            />
          )}
        </Field>
      </div>

      <Field id={fieldId("subject")} label="Subject" error={errors.subject} className="mt-5">
        {(describedBy) => (
          <input
            ref={(node) => {
              fields.current.subject = node;
            }}
            id={fieldId("subject")}
            name="subject"
            type="text"
            maxLength={CONTACT_LIMITS.subject.max}
            value={values.subject}
            onChange={(event) => handleChange("subject", event.target.value)}
            onBlur={() => handleBlur("subject")}
            aria-invalid={errors.subject ? true : undefined}
            aria-describedby={describedBy}
            className={inputClasses(Boolean(errors.subject))}
          />
        )}
      </Field>

      <Field
        id={fieldId("message")}
        label="Message"
        error={errors.message}
        className="mt-5"
        hint={`${values.message.trim().length} / ${CONTACT_LIMITS.message.max} · min. ${CONTACT_LIMITS.message.min} characters`}
      >
        {(describedBy) => (
          <textarea
            ref={(node) => {
              fields.current.message = node;
            }}
            id={fieldId("message")}
            name="message"
            rows={6}
            maxLength={CONTACT_LIMITS.message.max}
            value={values.message}
            onChange={(event) => handleChange("message", event.target.value)}
            onBlur={() => handleBlur("message")}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy}
            className={cn(inputClasses(Boolean(errors.message)), "h-auto min-h-40 resize-y py-3 leading-relaxed")}
          />
        )}
      </Field>

      {/* Honeypot: invisible to people and assistive tech; bots that fill it are silently dropped by the API. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={fieldId("website")}>Website</label>
        <input
          id={fieldId("website")}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="mt-8 flex sm:justify-end">
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          trailingIcon={<Send aria-hidden="true" />}
          className="w-full sm:w-auto"
        >
          {submitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

function inputClasses(invalid: boolean): string {
  return cn(
    "block h-12 w-full rounded-[10px] border bg-white px-4 text-[15px] text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)]",
    "transition-[border-color,box-shadow] duration-200 focus:ring-4 focus:outline-none",
    invalid
      ? "border-danger/70 focus:border-danger focus:ring-danger/15"
      : "border-line hover:border-accent/35 focus:border-accent focus:ring-accent/15",
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Receives the ids for `aria-describedby`. */
  children: (describedBy: string | undefined) => ReactNode;
}

function Field({ id, label, error, hint, className, children }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {hint && (
          <span id={hintId} className="font-mono text-[11px] text-slate-600">
            {hint}
          </span>
        )}
      </div>
      {children(describedBy)}
      {error && (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
