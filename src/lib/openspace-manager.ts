import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

// OpenSpace 配置
const OPENSPACE_PATH = "/Users/theembersguo/workspace/ai/OpenSpace";
const DASHBOARD_PORT = 7788;
const FRONTEND_PORT = 5173;

// Dashboard 状态类型
export interface DashboardStatus {
  running: boolean;
  dashboardUrl?: string;
  frontendUrl?: string;
  dashboardPid?: number;
  frontendPid?: number;
  error?: string;
}

interface ManagedProcess {
  process: ChildProcess;
  logs: string[];
}

// 使用 globalThis 缓存单例实例
const globalForOpenSpaceManager = globalThis as unknown as {
  openSpaceManager: OpenSpaceManager | undefined;
};

class OpenSpaceManager {
  private dashboardProcess: ManagedProcess | null = null;
  private frontendProcess: ManagedProcess | null = null;
  private logs: string[] = [];

  constructor() {
    // 检查虚拟环境
    const venvPython = path.join(OPENSPACE_PATH, ".venv", "bin", "python");
    if (!fs.existsSync(venvPython)) {
      console.warn(`[OpenSpace] 警告: 虚拟环境不存在于 ${venvPython}`);
    } else {
      console.log(`[OpenSpace] 虚拟环境检测成功: ${venvPython}`);
    }
  }

  /**
   * 获取 Python 虚拟环境中的 python 路径
   */
  private getVenvPython(): string {
    return path.join(OPENSPACE_PATH, ".venv", "bin", "python");
  }

  /**
   * 获取虚拟环境中的 npm 路径
   */
  private getVenvNpm(): string {
    return path.join(OPENSPACE_PATH, ".venv", "bin", "npm");
  }

  /**
   * 添加日志
   */
  private appendLog(content: string): void {
    const log = `[${new Date().toISOString()}] ${content}`;
    this.logs.push(log);
    // 保持日志不超过 500 条
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    console.log(`[OpenSpace] ${content}`);
  }

  /**
   * 获取日志
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * 启动 Dashboard
   */
  async startDashboard(): Promise<DashboardStatus> {
    // 如果已经在运行，返回当前状态
    if (this.isRunning()) {
      return this.getStatus();
    }

    this.appendLog("正在启动 OpenSpace Dashboard...");

    try {
      // 启动后端 API
      await this.startBackend();
      
      // 等待后端启动
      await this.delay(2000);
      
      // 启动前端
      await this.startFrontend();

      this.appendLog(`Dashboard 启动完成!`);
      this.appendLog(`后端: http://localhost:${DASHBOARD_PORT}`);
      this.appendLog(`前端: http://localhost:${FRONTEND_PORT}`);

      return this.getStatus();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.appendLog(`启动失败: ${errorMsg}`);
      return {
        running: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 获取 openspace-dashboard CLI 路径
   */
  private getVenvDashboardCmd(): string {
    return path.join(OPENSPACE_PATH, ".venv", "bin", "openspace-dashboard");
  }

  /**
   * 启动后端 API
   */
  private async startBackend(): Promise<void> {
    const dashboardCmd = this.getVenvDashboardCmd();
    
    if (!fs.existsSync(dashboardCmd)) {
      throw new Error(`openspace-dashboard CLI 不存在: ${dashboardCmd}\n请确保 OpenSpace 已安装: cd ${OPENSPACE_PATH} && pip install -e .`);
    }

    return new Promise((resolve, reject) => {
      // 使用 openspace-dashboard CLI
      const childProcess = spawn(dashboardCmd, ["--port", String(DASHBOARD_PORT)], {
        cwd: OPENSPACE_PATH,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });

      const pid = childProcess.pid;
      this.appendLog(`后端进程 PID: ${pid}`);

      if (!pid) {
        reject(new Error("后端进程启动失败: 无法获取 PID"));
        return;
      }

      this.dashboardProcess = {
        process: childProcess,
        logs: [],
      };

      // 收集输出
      childProcess.stdout?.on("data", (data: Buffer) => {
        const content = data.toString();
        this.dashboardProcess!.logs.push(content);
        this.appendLog(`[Backend] ${content.trim()}`);
      });

      childProcess.stderr?.on("data", (data: Buffer) => {
        const content = data.toString();
        if (content.trim()) {
          this.dashboardProcess!.logs.push(`[ERROR] ${content}`);
          this.appendLog(`[Backend Error] ${content.trim()}`);
        }
      });

      childProcess.on("close", (code) => {
        this.appendLog(`后端进程退出，代码: ${code}`);
        this.dashboardProcess = null;
      });

      childProcess.on("error", (err) => {
        this.appendLog(`后端进程错误: ${err.message}`);
        this.dashboardProcess = null;
      });

      // 假设进程启动成功
      resolve();
    });
  }

  /**
   * 启动前端
   */
  private async startFrontend(): Promise<void> {
    const frontendPath = path.join(OPENSPACE_PATH, "frontend");
    
    // 检查 frontend 目录是否存在
    if (!fs.existsSync(frontendPath)) {
      throw new Error(`Frontend 目录不存在: ${frontendPath}`);
    }

    // 检查 node_modules 是否存在
    const nodeModules = path.join(frontendPath, "node_modules");
    if (!fs.existsSync(nodeModules)) {
      this.appendLog("Frontend 依赖未安装，提示用户运行: cd frontend && npm install");
    }

    return new Promise((resolve, reject) => {
      const childProcess = spawn("npm", ["run", "dev", "--", "--port", String(FRONTEND_PORT)], {
        cwd: frontendPath,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
        shell: true,
      });

      const pid = childProcess.pid;
      this.appendLog(`前端进程 PID: ${pid}`);

      if (!pid) {
        reject(new Error("前端进程启动失败: 无法获取 PID"));
        return;
      }

      this.frontendProcess = {
        process: childProcess,
        logs: [],
      };

      // 收集输出
      childProcess.stdout?.on("data", (data: Buffer) => {
        const content = data.toString();
        this.frontendProcess!.logs.push(content);
        this.appendLog(`[Frontend] ${content.trim()}`);
      });

      childProcess.stderr?.on("data", (data: Buffer) => {
        const content = data.toString();
        if (content.trim()) {
          this.frontendProcess!.logs.push(`[ERROR] ${content}`);
          this.appendLog(`[Frontend Error] ${content.trim()}`);
        }
      });

      childProcess.on("close", (code) => {
        this.appendLog(`前端进程退出，代码: ${code}`);
        this.frontendProcess = null;
      });

      childProcess.on("error", (err) => {
        this.appendLog(`前端进程错误: ${err.message}`);
        this.frontendProcess = null;
      });

      // 假设进程启动成功
      resolve();
    });
  }

  /**
   * 停止 Dashboard
   */
  async stopDashboard(): Promise<void> {
    this.appendLog("正在停止 Dashboard...");

    // 停止前端
    if (this.frontendProcess?.process) {
      try {
        const pid = this.frontendProcess.process.pid;
        this.appendLog(`停止前端进程 PID: ${pid}`);
        this.frontendProcess.process.kill("SIGTERM");
        await this.delay(1000);
        if (this.isProcessAlive(pid)) {
          this.frontendProcess.process.kill("SIGKILL");
        }
      } catch (err) {
        this.appendLog(`停止前端进程失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.frontendProcess = null;

    // 停止后端
    if (this.dashboardProcess?.process) {
      try {
        const pid = this.dashboardProcess.process.pid;
        this.appendLog(`停止后端进程 PID: ${pid}`);
        this.dashboardProcess.process.kill("SIGTERM");
        await this.delay(1000);
        if (this.isProcessAlive(pid)) {
          this.dashboardProcess.process.kill("SIGKILL");
        }
      } catch (err) {
        this.appendLog(`停止后端进程失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.dashboardProcess = null;

    this.appendLog("Dashboard 已停止");
  }

  /**
   * 检查 Dashboard 是否在运行
   */
  isRunning(): boolean {
    const backendAlive = this.dashboardProcess 
      ? this.isProcessAlive(this.dashboardProcess.process.pid) 
      : false;
    const frontendAlive = this.frontendProcess 
      ? this.isProcessAlive(this.frontendProcess.process.pid) 
      : false;
    return backendAlive || frontendAlive;
  }

  /**
   * 获取 Dashboard 状态
   */
  getStatus(): DashboardStatus {
    const backendAlive = this.dashboardProcess 
      ? this.isProcessAlive(this.dashboardProcess.process.pid) 
      : false;
    const frontendAlive = this.frontendProcess 
      ? this.isProcessAlive(this.frontendProcess.process.pid) 
      : false;

    return {
      running: backendAlive || frontendAlive,
      dashboardUrl: backendAlive ? `http://localhost:${DASHBOARD_PORT}` : undefined,
      frontendUrl: frontendAlive ? `http://localhost:${FRONTEND_PORT}` : undefined,
      dashboardPid: this.dashboardProcess?.process.pid,
      frontendPid: this.frontendProcess?.process.pid,
    };
  }

  /**
   * 检查进程是否存活
   */
  private isProcessAlive(pid: number | undefined): boolean {
    if (!pid) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行命令并返回结果
   */
  private execCommand(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, { stdio: "pipe" });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => { stdout += data.toString(); });
      child.stderr?.on("data", (data) => { stderr += data.toString(); });
      child.on("close", (code) => {
        resolve({ code: code ?? 0, stdout, stderr });
      });
      child.on("error", () => {
        resolve({ code: 1, stdout: "", stderr: "Command execution failed" });
      });
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export const openSpaceManager =
  globalForOpenSpaceManager.openSpaceManager ?? new OpenSpaceManager();

// 在开发环境下保存到 globalThis
if (process.env.NODE_ENV !== "production") {
  globalForOpenSpaceManager.openSpaceManager = openSpaceManager;
}
