export interface DebateRequest {
  prompt: string;
  builder_model?: string;
  critic_model?: string;
  max_rounds: number;
  temperature: number;
  max_tokens: number;
  top_p: number;
  builder_system_prompt?: string;
  critic_system_prompt?: string;
  convergence_keyword: string;
  // Judge
  judge_model?: string;
  judge_mode: "off" | "post_debate" | "per_round";
  judge_system_prompt?: string;
  judge_scoring_scale: string;
}

export interface DebateEvent {
  type:
    | "builder_start"
    | "builder_chunk"
    | "builder_end"
    | "critic_start"
    | "critic_chunk"
    | "critic_end"
    | "judge_start"
    | "judge_chunk"
    | "judge_end"
    | "converged"
    | "max_rounds_reached"
    | "stopped"
    | "error";
  round?: number;
  content?: string;
  converged?: boolean;
  final_solution?: string;
  score?: string;
  mode?: string;
}

export interface DebateMessage {
  role: "builder" | "critic";
  round: number;
  content: string;
}

export type DebateStatus =
  | "idle"
  | "running"
  | "converged"
  | "stopped"
  | "error";

export interface BedrockModel {
  model_id: string;
  model_name: string;
  provider: string;
}

export type Provider = "bedrock" | "ollama";
export type JudgeMode = "off" | "post_debate" | "per_round";
export type DiffStyle = "unified" | "split";
export type HighlightTheme = "auto" | "github-dark" | "github-light" | "one-dark-pro" | "dracula" | "nord" | "min-light" | "min-dark";

export interface Settings {
  // Models tab
  builderProvider: Provider;
  criticProvider: Provider;
  sameProvider: boolean;
  builderModel: string;
  criticModel: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  // Judge
  judgeMode: JudgeMode;
  judgeProvider: Provider;
  judgeModel: string;
  judgeScoringScale: string;
  // Prompts tab
  builderSystemPrompt: string;
  criticSystemPrompt: string;
  convergenceKeyword: string;
  judgeSystemPrompt: string;
  // Debate tab
  maxRounds: number;
  autoScroll: boolean;
  exportFormat: "markdown" | "json" | "both";
  autoSaveDebates: boolean;
  maxSavedDebates: number;
  saveIncomplete: boolean;
  showDiffButtons: boolean;
  diffStyle: DiffStyle;
  diffContextLines: number;
  // Appearance tab
  fontSize: number;
  layoutDirection: "horizontal" | "vertical";
  customBg: string;
  customFg: string;
  useCustomTheme: boolean;
  syntaxHighlighting: boolean;
  highlightTheme: HighlightTheme;
  showLineNumbers: boolean;
}

export interface DebatePreset {
  name: string;
  settings: Settings;
}

export interface Defaults {
  builder_system_prompt: string;
  critic_system_prompt: string;
  judge_system_prompt: string;
  convergence_keyword: string;
  max_tokens: number;
  top_p: number;
  temperature: number;
  max_rounds: number;
}

export interface SavedDebate {
  id: string;
  prompt: string;
  builderRounds: { round: number; content: string; converged: boolean }[];
  criticRounds: { round: number; content: string; converged: boolean }[];
  judgeRounds: { round: number; content: string; score?: string }[];
  finalSolution: string | null;
  status: DebateStatus;
  settings: Partial<Settings>;
  timestamp: number;
}
