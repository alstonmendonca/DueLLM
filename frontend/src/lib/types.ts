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
}

export interface DebateEvent {
  type:
    | "builder_start"
    | "builder_chunk"
    | "builder_end"
    | "critic_start"
    | "critic_chunk"
    | "critic_end"
    | "converged"
    | "max_rounds_reached"
    | "stopped"
    | "error";
  round?: number;
  content?: string;
  converged?: boolean;
  final_solution?: string;
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
  // Prompts tab
  builderSystemPrompt: string;
  criticSystemPrompt: string;
  convergenceKeyword: string;
  // Debate tab
  maxRounds: number;
  autoScroll: boolean;
  exportFormat: "markdown" | "json" | "both";
  // Appearance tab
  fontSize: number;
  layoutDirection: "horizontal" | "vertical";
  customBg: string;
  customFg: string;
  useCustomTheme: boolean;
}

export interface DebatePreset {
  name: string;
  settings: Settings;
}

export interface Defaults {
  builder_system_prompt: string;
  critic_system_prompt: string;
  convergence_keyword: string;
  max_tokens: number;
  top_p: number;
  temperature: number;
  max_rounds: number;
}
