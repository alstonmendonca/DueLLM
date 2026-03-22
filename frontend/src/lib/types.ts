export interface DebateRequest {
  prompt: string;
  builder_model?: string;
  critic_model?: string;
  max_rounds: number;
  temperature: number;
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

export interface Settings {
  builderModel: string;
  criticModel: string;
  maxRounds: number;
  temperature: number;
}
