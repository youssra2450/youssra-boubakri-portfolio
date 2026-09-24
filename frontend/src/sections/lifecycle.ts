import {
  Boxes,
  BrainCircuit,
  Database,
  Import,
  LayoutDashboard,
  ScanSearch,
  Server,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface LifecycleStage {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /**
   * Example tools for the stage. Only those that also appear in her portfolio
   * (skills, capability tools or project stacks) are displayed — see `stageTools`.
   */
  candidateTools: readonly string[];
}

/** Generic end-to-end data / AI lifecycle (static UI content, docs/SPEC.md §3.3). */
export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  {
    key: "sources",
    title: "Data Sources",
    description: "Databases, spreadsheets, documents and images — where raw data originates.",
    icon: Boxes,
    candidateTools: ["MySQL", "Oracle", "SQL Server", "Advanced Excel"],
  },
  {
    key: "collection",
    title: "Data Collection",
    description: "Extracting and ingesting data, in batches or as streams.",
    icon: Import,
    candidateTools: ["Python", "SQL", "Spark Streaming"],
  },
  {
    key: "processing",
    title: "ETL / Processing",
    description: "Cleaning, transforming and preparing data for downstream use.",
    icon: Workflow,
    candidateTools: ["Python", "Pandas", "NumPy", "Apache Spark"],
  },
  {
    key: "storage",
    title: "Data Storage",
    description: "Relational and distributed stores that keep data reliable and queryable.",
    icon: Database,
    candidateTools: ["MySQL", "Oracle", "Cassandra", "Hadoop"],
  },
  {
    key: "analysis",
    title: "Data Analysis",
    description: "Exploring, querying and testing hypotheses to surface patterns.",
    icon: ScanSearch,
    candidateTools: ["SQL", "Pandas", "Matplotlib", "Seaborn"],
  },
  {
    key: "ml",
    title: "Machine Learning / AI",
    description: "Training and evaluating models — classical ML, deep learning, NLP and vision.",
    icon: BrainCircuit,
    candidateTools: ["Scikit-learn", "XGBoost", "TensorFlow", "PyTorch", "HuggingFace"],
  },
  {
    key: "api",
    title: "API / Backend",
    description: "Serving models and data to other systems through APIs.",
    icon: Server,
    candidateTools: ["FastAPI", "Flask"],
  },
  {
    key: "apps",
    title: "Dashboard / Application",
    description: "Dashboards and applications that put insights in front of decision-makers.",
    icon: LayoutDashboard,
    candidateTools: ["Power BI", "Tableau", "Streamlit", "React"],
  },
];

/** Candidate tools of a stage that are actually part of her stack (case-insensitive match). */
export function stageTools(stage: LifecycleStage, knownTechnologies: ReadonlySet<string>): string[] {
  return stage.candidateTools.filter((tool) => knownTechnologies.has(tool.toLowerCase()));
}
