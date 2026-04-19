import fs from "fs";
import path from "path";
import os from "os";
import { MANAGER_DIR } from "./config";

export interface ConfigTemplateParams {
  configPath: string;
  workspacePath: string;
  gatewayPort: number;
  webchatPort: number;
  model: string;
  provider: string;
  apiKey: string;
}

export function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

export function generateConfigFromTemplate(params: ConfigTemplateParams): void {
  const templatePath = path.join(MANAGER_DIR, "config-template.json");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Config template not found at ${templatePath}. Please create config-template.json in ${MANAGER_DIR}`);
  }

  let template = fs.readFileSync(templatePath, "utf-8");

  template = template
    .replace(/\{\{WORKSPACE\}\}/g, params.workspacePath)
    .replace(/\{\{GATEWAY_PORT\}\}/g, String(params.gatewayPort))
    .replace(/\{\{WEBCHAT_PORT\}\}/g, String(params.webchatPort))
    .replace(/\{\{MODEL\}\}/g, params.model)
    .replace(/\{\{PROVIDER\}\}/g, params.provider)
    .replace(/\{\{API_KEY\}\}/g, params.apiKey)
    .replace(/\{\{MCP_MINIMAX_API_KEY\}\}/g, params.apiKey);

  const dir = path.dirname(params.configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(params.workspacePath)) {
    fs.mkdirSync(params.workspacePath, { recursive: true });
  }

  fs.writeFileSync(params.configPath, template, "utf-8");
}
