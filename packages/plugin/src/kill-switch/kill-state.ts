export interface KillStateData {
  killed: boolean;
  reason?: string;
  killedAt?: Date;
}

class KillStateManager {
  private states = new Map<string, KillStateData>();
  private globalState: KillStateData = { killed: false };

  // Per-agent kill state
  isKilled(agentId?: string): boolean {
    if (agentId) {
      return this.states.get(agentId)?.killed || false;
    }
    return this.globalState.killed;
  }

  getReason(agentId?: string): string | undefined {
    if (agentId) {
      return this.states.get(agentId)?.reason;
    }
    return this.globalState.reason;
  }

  setKilled(reason: string, agentId?: string) {
    const state: KillStateData = { killed: true, reason, killedAt: new Date() };
    if (agentId) {
      this.states.set(agentId, state);
    } else {
      // Global kill — affects all agents
      this.globalState = state;
    }
  }

  clearKilled(agentId?: string) {
    if (agentId) {
      this.states.delete(agentId);
    } else {
      this.globalState = { killed: false };
    }
  }

  getState(agentId?: string): Readonly<KillStateData> {
    if (agentId) {
      return { ...(this.states.get(agentId) || { killed: false }) };
    }
    return { ...this.globalState };
  }
}

// Singleton manager (handles all agents)
export const killState = new KillStateManager();
