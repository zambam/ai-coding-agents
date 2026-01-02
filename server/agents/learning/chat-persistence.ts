import * as fs from "fs";
import * as path from "path";
import type { ConversationEntry, SessionStats } from "./observer-config";

export interface ChatPersistenceConfig {
  saveIntervalMs: number;
  chatFilePath: string;
  maxEntriesInFile: number;
  ttlMs: number;
  enabled: boolean;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: ChatPersistenceConfig = {
  saveIntervalMs: 5000,
  chatFilePath: "/tmp/ml-chat-history.json",
  maxEntriesInFile: 500,
  ttlMs: ONE_DAY_MS,
  enabled: true,
};

export interface PersistedChatData {
  lastUpdated: string;
  sessionId: string;
  sessionStats: SessionStats;
  entries: ConversationEntry[];
}

export class ChatPersistenceService {
  private config: ChatPersistenceConfig;
  private saveInterval: NodeJS.Timeout | null = null;
  private sessionId: string;
  private entries: ConversationEntry[] = [];
  private stats: SessionStats;
  private dirty: boolean = false;

  constructor(config: Partial<ChatPersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.stats = {
      totalInteractions: 0,
      conversations: 0,
      toolExecutions: 0,
      fileOperations: 0,
      errors: 0,
      agentInvocations: 0,
      sessionStartTime: new Date(),
      lastActivityTime: new Date(),
    };
    
    this.loadExisting();
  }

  private loadExisting(): void {
    try {
      if (fs.existsSync(this.config.chatFilePath)) {
        const content = fs.readFileSync(this.config.chatFilePath, "utf-8");
        const data = JSON.parse(content) as PersistedChatData;
        
        if (data.entries && Array.isArray(data.entries)) {
          const now = Date.now();
          const validEntries = data.entries
            .map(e => ({
              ...e,
              timestamp: new Date(e.timestamp),
            }))
            .filter(e => now - e.timestamp.getTime() < this.config.ttlMs);
          
          const expiredCount = data.entries.length - validEntries.length;
          this.entries = validEntries;
          
          console.log(`[ChatPersistence] Loaded ${validEntries.length} entries (${expiredCount} expired, TTL: ${this.config.ttlMs / 3600000}h)`);
        }
      }
    } catch (error) {
      console.warn("[ChatPersistence] Could not load existing chat history:", error);
    }
  }

  private pruneExpiredEntries(): void {
    const now = Date.now();
    const before = this.entries.length;
    this.entries = this.entries.filter(e => now - e.timestamp.getTime() < this.config.ttlMs);
    const pruned = before - this.entries.length;
    if (pruned > 0) {
      console.log(`[ChatPersistence] Pruned ${pruned} expired entries`);
      this.dirty = true;
    }
  }

  start(): void {
    if (!this.config.enabled) {
      console.log("[ChatPersistence] Disabled, not starting");
      return;
    }

    if (this.saveInterval) {
      return;
    }

    this.saveInterval = setInterval(() => {
      this.pruneExpiredEntries();
      this.saveToFile();
    }, this.config.saveIntervalMs);

    console.log(`[ChatPersistence] Started - saving every ${this.config.saveIntervalMs}ms to ${this.config.chatFilePath}`);
  }

  stop(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      this.saveToFile();
      console.log("[ChatPersistence] Stopped");
    }
  }

  addEntry(entry: ConversationEntry): void {
    this.entries.push(entry);
    this.stats.totalInteractions++;
    this.stats.lastActivityTime = new Date();
    
    switch (entry.type) {
      case "conversation":
        this.stats.conversations++;
        break;
      case "tool_execution":
      case "command_execution":
        this.stats.toolExecutions++;
        break;
      case "file_read":
      case "file_write":
        this.stats.fileOperations++;
        break;
      case "error":
        this.stats.errors++;
        break;
      case "agent_invoke":
        this.stats.agentInvocations++;
        break;
    }

    if (this.entries.length > this.config.maxEntriesInFile) {
      this.entries = this.entries.slice(-this.config.maxEntriesInFile);
    }

    this.dirty = true;
  }

  recordUserMessage(content: string): void {
    this.addEntry({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      type: "conversation",
      role: "user",
      content: content.slice(0, 5000),
    });
  }

  recordAssistantMessage(content: string): void {
    this.addEntry({
      id: `asst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      type: "conversation",
      role: "assistant",
      content: content.slice(0, 5000),
    });
  }

  recordToolCall(toolName: string, success: boolean, latencyMs?: number): void {
    this.addEntry({
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      type: "tool_execution",
      role: "tool",
      content: `Tool: ${toolName}`,
      metadata: { toolName, success, latencyMs },
    });
  }

  recordError(errorCode: string, message: string): void {
    this.addEntry({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      type: "error",
      role: "system",
      content: message.slice(0, 2000),
      metadata: { errorCode, success: false },
    });
  }

  private saveToFile(): void {
    if (!this.dirty && this.entries.length === 0) {
      return;
    }

    try {
      const dir = path.dirname(this.config.chatFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: PersistedChatData = {
        lastUpdated: new Date().toISOString(),
        sessionId: this.sessionId,
        sessionStats: this.stats,
        entries: this.entries,
      };

      fs.writeFileSync(
        this.config.chatFilePath,
        JSON.stringify(data, null, 2),
        "utf-8"
      );

      this.dirty = false;
    } catch (error) {
      console.error("[ChatPersistence] Failed to save:", error);
    }
  }

  getStats(): SessionStats {
    return { ...this.stats };
  }

  getEntries(): ConversationEntry[] {
    return [...this.entries];
  }

  getRecentEntries(limit: number = 50): ConversationEntry[] {
    return this.entries.slice(-limit);
  }

  forceSave(): void {
    this.dirty = true;
    this.saveToFile();
  }

  migrateEntries(entries: ConversationEntry[]): number {
    const now = Date.now();
    let migrated = 0;
    
    for (const entry of entries) {
      const timestamp = new Date(entry.timestamp);
      if (now - timestamp.getTime() < this.config.ttlMs) {
        const exists = this.entries.some(e => e.id === entry.id);
        if (!exists) {
          this.entries.push({ ...entry, timestamp });
          migrated++;
        }
      }
    }
    
    if (migrated > 0) {
      this.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (this.entries.length > this.config.maxEntriesInFile) {
        this.entries = this.entries.slice(-this.config.maxEntriesInFile);
      }
      this.dirty = true;
      console.log(`[ChatPersistence] Migrated ${migrated} entries`);
    }
    
    return migrated;
  }
}

let globalChatPersistence: ChatPersistenceService | null = null;

export function initializeChatPersistence(
  config?: Partial<ChatPersistenceConfig>
): ChatPersistenceService {
  if (globalChatPersistence) {
    globalChatPersistence.stop();
  }
  globalChatPersistence = new ChatPersistenceService(config);
  globalChatPersistence.start();
  return globalChatPersistence;
}

export function getChatPersistence(): ChatPersistenceService | null {
  return globalChatPersistence;
}

export { DEFAULT_CONFIG as DEFAULT_CHAT_PERSISTENCE_CONFIG };
