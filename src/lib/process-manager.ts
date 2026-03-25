import { spawn, ChildProcess } from "child_process";
import type { AgentInstance, AgentLog } from "./types";
import { findNanobotBinary } from "./nanobot";
import { getAgents, getAgent, updateAgentStatus } from "./store";

const MAX_LOG_LINES = 1000;

interface ManagedProcess {
  process: ChildProcess;
  logs: AgentLog[];
  subscribers: Set<(log: AgentLog) => void>;
}

// 使用 globalThis 缓存单例实例，避免 Next.js 热重载导致单例重建
const globalForProcessManager = globalThis as unknown as {
  processManager: ProcessManager | undefined;
};

class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();

  /**
   * 启动 gateway 进程
   */
  async startGateway(agent: AgentInstance): Promise<number> {
    // 如果进程已存在，先停止
    if (this.processes.has(agent.id)) {
      await this.stopGateway(agent.id);
    }

    const nanobotPath = await findNanobotBinary();

    const childProcess = spawn(
      nanobotPath,
      ["gateway", "--config", agent.configPath, "--port", String(agent.port)],
      {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        cwd: agent.workspacePath,
      }
    );

    const pid = childProcess.pid;
    if (!pid) {
      throw new Error("Failed to start gateway process: no PID returned");
    }

    const managedProcess: ManagedProcess = {
      process: childProcess,
      logs: [],
      subscribers: new Set(),
    };

    this.processes.set(agent.id, managedProcess);

    // 监听 stdout
    childProcess.stdout?.on("data", (data: Buffer) => {
      this.appendLog(agent.id, "stdout", data.toString());
    });

    // 监听 stderr
    childProcess.stderr?.on("data", (data: Buffer) => {
      this.appendLog(agent.id, "stderr", data.toString());
    });

    // 监听进程关闭
    childProcess.on("close", (code) => {
      this.appendLog(
        agent.id,
        "stderr",
        `Process exited with code ${code}`
      );
      this.processes.delete(agent.id);
      // 更新存储中的状态
      updateAgentStatus(agent.id, code === 0 ? "stopped" : "error");
    });

    // 监听进程错误
    childProcess.on("error", (err) => {
      this.appendLog(agent.id, "stderr", `Process error: ${err.message}`);
      this.processes.delete(agent.id);
      updateAgentStatus(agent.id, "error");
    });

    // 更新存储中的状态
    updateAgentStatus(agent.id, "running", pid);

    return pid;
  }

  /**
   * 停止 gateway 进程
   * 先尝试 SIGTERM，3秒后若仍存活则 SIGKILL
   */
  async stopGateway(agentId: string): Promise<void> {
    const managed = this.processes.get(agentId);
    if (!managed) {
      // 进程不在管理中，直接更新状态
      updateAgentStatus(agentId, "stopped");
      return;
    }

    const { process: childProcess } = managed;

    return new Promise<void>((resolve) => {
      let killed = false;

      const onClose = () => {
        killed = true;
        this.processes.delete(agentId);
        updateAgentStatus(agentId, "stopped");
        resolve();
      };

      childProcess.once("close", onClose);

      // 先发送 SIGTERM
      childProcess.kill("SIGTERM");

      // 3秒后检查是否还存活
      setTimeout(() => {
        if (!killed && this.isProcessAlive(childProcess.pid)) {
          childProcess.kill("SIGKILL");
        }
      }, 3000);

      // 设置最大等待时间（5秒）
      setTimeout(() => {
        if (!killed) {
          childProcess.removeListener("close", onClose);
          this.processes.delete(agentId);
          updateAgentStatus(agentId, "stopped");
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * 检查进程是否存活
   * 优先检查内存中的进程，如果没有则检查存储中记录的 PID
   */
  isRunning(agentId: string): boolean {
    // 1. 先检查内存中管理的进程
    const managed = this.processes.get(agentId);
    if (managed) {
      return this.isProcessAlive(managed.process.pid);
    }

    // 2. 内存中没有，检查存储中记录的 PID
    const agent = getAgent(agentId);
    if (agent && agent.pid) {
      return this.isProcessAlive(agent.pid);
    }

    return false;
  }

  /**
   * 检查 PID 对应的进程是否存活
   */
  private isProcessAlive(pid: number | undefined): boolean {
    if (!pid) {
      return false;
    }

    try {
      // kill(pid, 0) 不会杀死进程，只是检查进程是否存在
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取进程的日志缓冲区
   */
  getLogBuffer(agentId: string): AgentLog[] {
    const managed = this.processes.get(agentId);
    if (!managed) {
      return [];
    }
    return [...managed.logs];
  }

  /**
   * 订阅进程日志
   * 返回取消订阅的函数
   */
  subscribeToLogs(
    agentId: string,
    callback: (log: AgentLog) => void
  ): () => void {
    const managed = this.processes.get(agentId);
    if (!managed) {
      // 进程不存在，返回空的取消订阅函数
      return () => {};
    }

    managed.subscribers.add(callback);

    return () => {
      managed.subscribers.delete(callback);
    };
  }

  /**
   * 添加日志条目
   */
  private appendLog(
    agentId: string,
    stream: "stdout" | "stderr",
    content: string
  ): void {
    const managed = this.processes.get(agentId);
    if (!managed) {
      return;
    }

    const log: AgentLog = {
      timestamp: new Date().toISOString(),
      stream,
      content,
    };

    managed.logs.push(log);

    // 保持日志缓冲区不超过最大行数
    if (managed.logs.length > MAX_LOG_LINES) {
      managed.logs.shift();
    }

    // 通知所有订阅者
    for (const subscriber of managed.subscribers) {
      try {
        subscriber(log);
      } catch {
        // 忽略订阅者回调中的错误
      }
    }
  }

  /**
   * 同步所有 agent 状态
   * 检查存储中标记为 running 的 agent，验证 PID 是否还存活
   */
  syncAllStatuses(): void {
    const agents = getAgents();

    for (const agent of agents) {
      if (agent.status === "running" && agent.pid) {
        const isAlive = this.isProcessAlive(agent.pid);
        if (!isAlive) {
          // 进程不存活，更新状态为 stopped
          updateAgentStatus(agent.id, "stopped");
        }
      }
    }
  }
}

// 导出单例实例
export const processManager =
  globalForProcessManager.processManager ?? new ProcessManager();

// 在开发环境下保存到 globalThis
if (process.env.NODE_ENV !== "production") {
  globalForProcessManager.processManager = processManager;
}

// 导出类型供外部使用
export type { ManagedProcess };
