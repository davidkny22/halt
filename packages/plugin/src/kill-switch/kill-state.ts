export interface KillStateData {
  killed: boolean;
  reason?: string;
  killedAt?: Date;
}

class KillState {
  private state: KillStateData = { killed: false };

  isKilled(): boolean {
    return this.state.killed;
  }

  getReason(): string | undefined {
    return this.state.reason;
  }

  setKilled(reason: string) {
    this.state = {
      killed: true,
      reason,
      killedAt: new Date(),
    };
  }

  clearKilled() {
    this.state = { killed: false };
  }

  getState(): Readonly<KillStateData> {
    return { ...this.state };
  }
}

// Singleton
export const killState = new KillState();
