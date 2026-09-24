import { apiFetch } from "@/services/api";
import { CONTACT_PATH } from "@/services/portfolio";
import type { ContactCreate, ContactResponse } from "@/types/api";

/** POST /api/contact — resolves with the confirmation body, throws `ApiError` (422 / 429 / network…). */
export function submitContact(payload: ContactCreate, signal?: AbortSignal): Promise<ContactResponse> {
  return apiFetch<ContactResponse>(CONTACT_PATH, { method: "POST", body: payload, signal });
}
