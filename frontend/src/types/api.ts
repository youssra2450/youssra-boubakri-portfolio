/**
 * API contract types — mirror of the backend Pydantic schemas (see docs/SPEC.md §2.4).
 * JSON is snake_case end to end.
 */

export type ISODateTime = string;
/** Calendar date formatted as YYYY-MM-DD. */
export type ISODate = string;

export interface Language {
  name: string;
  level: string;
}

export interface SnapshotCard {
  title: string;
  items: string[];
}

export interface Capability {
  key: string;
  title: string;
  description: string;
  tools: string[];
}

export interface Profile {
  full_name: string;
  headline: string;
  tagline: string;
  summary: string;
  about_who: string;
  about_what: string;
  about_build: string;
  location: string;
  mobility: string;
  email: string;
  /** Not displayed when null (the public contact channels are email, LinkedIn and GitHub). */
  phone: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  photo_url: string;
  target_roles: string[];
  languages: Language[];
  interests: string[];
  snapshot: SnapshotCard[];
  capabilities: Capability[];
  /** True only when the backend can forward contact-form messages by email (EMAIL_PROVIDER configured). */
  contact_form_enabled: boolean;
  updated_at: ISODateTime;
}

export type EducationStatus = "completed" | "in_progress";

export interface Education {
  id: number;
  degree: string;
  degree_original: string | null;
  institution: string;
  location: string | null;
  start_year: number;
  end_year: number | null;
  status: EducationStatus;
  description: string | null;
  display_order: number;
}

export interface Experience {
  id: number;
  organization: string;
  location: string | null;
  employment_type: string;
  role: string | null;
  start_date: ISODate;
  end_date: ISODate | null;
  project_title: string | null;
  description: string | null;
  highlights: string[];
  technologies: string[];
  display_order: number;
}

export type Proficiency = "advanced" | "proficient" | "familiar";

export interface Skill {
  id: number;
  category_id: number;
  name: string;
  proficiency: Proficiency | null;
  is_core: boolean;
  display_order: number;
}

export interface SkillCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  skills: Skill[];
}

export interface ArchitectureStep {
  step: string;
  description: string;
}

/** Filter taxonomy used by the Projects section (canonical display order). */
export const PROJECT_DOMAINS = ["Data Science", "AI/ML", "NLP", "LLM", "Computer Vision", "Optimization"] as const;

/** Visual identity keys for project covers; unknown/null values fall back to a neutral cover. */
export type ProjectVisual = "multi-agent" | "biometric" | "vision" | "medical" | "document" | "uav";

export interface ProjectSummary {
  id: number;
  slug: string;
  title: string;
  title_original: string | null;
  category: string;
  /** Filter categories — values from PROJECT_DOMAINS. */
  domains: string[];
  /** Key technical concepts shown as small chips. */
  concepts: string[];
  visual: ProjectVisual | string | null;
  context: string | null;
  /** e.g. "2025–2026"; null when the period is unknown (hidden in the UI). */
  period_label: string | null;
  start_year: number | null;
  end_year: number | null;
  summary: string;
  technologies: string[];
  features: string[];
  github_url: string | null;
  demo_url: string | null;
  featured: boolean;
  display_order: number;
}

export interface ProjectDetail extends ProjectSummary {
  problem: string | null;
  solution: string | null;
  architecture: ArchitectureStep[];
  implementation: string[];
  results: string[];
  lessons_learned: string[];
  updated_at: ISODateTime;
}

export interface Portfolio {
  profile: Profile;
  education: Education[];
  experience: Experience[];
  skills: SkillCategory[];
  projects: ProjectSummary[];
}

export interface HealthStatus {
  status: "healthy" | "degraded";
  service: string;
  version: string;
  database: "connected" | "unavailable";
  timestamp: ISODateTime;
}

export interface ContactCreate {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot — must stay empty. */
  website?: string;
  /** Milliseconds elapsed since the form was displayed (anti-bot timing check). */
  elapsed_ms?: number;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  detail: string;
  code: string;
  errors?: ApiFieldError[];
}
