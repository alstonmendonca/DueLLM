import { SavedDebate } from "@/lib/types";

const STORAGE_KEY = "duellm-history";

export interface DebateStorage {
  save(debate: SavedDebate): void;
  getAll(): SavedDebate[];
  getById(id: string): SavedDebate | null;
  remove(id: string): void;
  clear(): void;
  search(query: string): SavedDebate[];
}

export class LocalDebateStorage implements DebateStorage {
  private maxItems: number;

  constructor(maxItems: number = 50) {
    this.maxItems = maxItems;
  }

  private readDebates(): SavedDebate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to read debates from localStorage:", error);
      return [];
    }
  }

  private writeDebates(debates: SavedDebate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(debates));
    } catch (error) {
      console.error("Failed to write debates to localStorage:", error);
    }
  }

  save(debate: SavedDebate): void {
    const debates = this.readDebates();

    // Prepend new debate (newest first)
    const updated = [debate, ...debates];

    // Auto-prune if over maxItems
    const pruned = updated.slice(0, this.maxItems);

    this.writeDebates(pruned);
  }

  getAll(): SavedDebate[] {
    return this.readDebates();
  }

  getById(id: string): SavedDebate | null {
    const debates = this.readDebates();
    return debates.find((d) => d.id === id) || null;
  }

  remove(id: string): void {
    const debates = this.readDebates();
    const filtered = debates.filter((d) => d.id !== id);
    this.writeDebates(filtered);
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear debates from localStorage:", error);
    }
  }

  search(query: string): SavedDebate[] {
    if (!query.trim()) {
      return this.getAll();
    }

    const debates = this.readDebates();
    const lowerQuery = query.toLowerCase();

    return debates.filter((debate) =>
      debate.prompt.toLowerCase().includes(lowerQuery)
    );
  }
}
