import type { ApiFieldError } from "@/types/api";

/** Length limits of `ContactCreate` (docs/SPEC.md §2.4) — mirrored from the backend schema. */
export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { min: 3, max: 254 },
  subject: { min: 3, max: 150 },
  message: { min: 20, max: 5000 },
} as const;

export const CONTACT_FIELDS = ["name", "email", "subject", "message"] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

const FIELD_LABELS: Record<ContactField, string> = {
  name: "Name",
  email: "Email",
  subject: "Subject",
  message: "Message",
};

/** Pragmatic email check (the server performs the authoritative validation). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isContactField(value: string): value is ContactField {
  return (CONTACT_FIELDS as readonly string[]).includes(value);
}

/** Validate one field; returns an error message or `undefined`. Values are validated trimmed. */
export function validateContactField(field: ContactField, rawValue: string): string | undefined {
  const value = rawValue.trim();
  const { min, max } = CONTACT_LIMITS[field];
  const label = FIELD_LABELS[field];

  if (!value) return `${label} is required.`;
  if (field === "email") {
    if (value.length > max) return `Email must be at most ${max} characters.`;
    return EMAIL_PATTERN.test(value) ? undefined : "Please enter a valid email address.";
  }
  if (value.length < min) return `${label} must be at least ${min} characters.`;
  if (value.length > max) return `${label} must be at most ${max} characters.`;
  return undefined;
}

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of CONTACT_FIELDS) {
    const error = validateContactField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

export function trimContactValues(values: ContactValues): ContactValues {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
  };
}

/**
 * Map server-side validation errors (`422 {errors: [{field, message}]}`) onto form fields.
 * Field paths such as "body.email" are reduced to their last segment.
 */
export function mapServerFieldErrors(errors: readonly ApiFieldError[]): ContactErrors {
  const mapped: ContactErrors = {};
  for (const { field, message } of errors) {
    const name = field.split(".").pop() ?? field;
    if (isContactField(name) && !mapped[name]) mapped[name] = message;
  }
  return mapped;
}
