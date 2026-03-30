#!/usr/bin/env python3
"""
nanocat-api - nanocats-manager API 调用包装器
用于通过 nanobot exec 安全策略访问内部 API

用法:
  python3 nanocat-api.py <port> <command> [args...]

示例:
  python3 nanocat-api.py 3000 list-agents
  python3 nanocat-api.py 3000 restart-agent bro
  python3 nanocat-api.py 3000 agent-status justin

端口说明:
  nanocat-manager 默认端口可能是 18789, 18790, 3000, 3001 等
  通过 nanocat-manager 的 UI 可以确认实际端口
"""
import sys
import json
import requests

DEFAULT_PORT = 3000  # nanocats-manager 默认端口

def get(port, path):
    r = requests.get(f'http://127.0.0.1:{port}/api/{path}', timeout=10)
    return r.json()

def post(port, path, data=None):
    r = requests.post(f'http://127.0.0.1:{port}/api/{path}', json=data, timeout=10)
    return r.json()

def put(port, path, data=None):
    r = requests.put(f'http://127.0.0.1:{port}/api/{path}', json=data, timeout=10)
    return r.json()

def delete(port, path):
    r = requests.delete(f'http://127.0.0.1:{port}/api/{path}', timeout=10)
    return r.json()

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    # 第一个参数是端口
    try:
        port = int(sys.argv[1])
        cmd = sys.argv[2] if len(sys.argv) > 2 else None
        args = sys.argv[3:] if len(sys.argv) > 3 else []
    except ValueError:
        # 如果第一个参数不是数字，使用默认端口
        port = DEFAULT_PORT
        cmd = sys.argv[1]
        args = sys.argv[2:] if len(sys.argv) > 2 else []
    
    if not cmd:
        print(__doc__)
        sys.exit(1)
    
    # Agent 管理命令
    if cmd == 'list-agents':
        result = get(port, 'agents')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'agent-status':
        if not args: print("Usage: agent-status <name>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'start-agent':
        if not args: print("Usage: start-agent <name>"); sys.exit(1)
        result = post(port, f'agents/{args[0]}/start')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'stop-agent':
        if not args: print("Usage: stop-agent <name>"); sys.exit(1)
        result = post(port, f'agents/{args[0]}/stop')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'restart-agent':
        if not args: print("Usage: restart-agent <name>"); sys.exit(1)
        name = args[0]
        print(f"Stopping {name}...")
        stop_result = post(port, f'agents/{name}/stop')
        print(f"Stop: {stop_result}")
        print(f"Starting {name}...")
        start_result = post(port, f'agents/{name}/start')
        print(f"Start: {start_result}")
    
    # 配置
    elif cmd == 'get-config':
        if not args: print("Usage: get-config <name>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}/config')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'update-config':
        if len(args) < 2: print("Usage: update-config <name> '<json>'"); sys.exit(1)
        content = args[1].replace("\\n", "\n")
        result = put(port, f'agents/{args[0]}/config', {'content': content})
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 环境变量
    elif cmd == 'get-env':
        if not args: print("Usage: get-env <name>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}/env')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'update-env':
        if len(args) < 2: print("Usage: update-env <name> '<content>'"); sys.exit(1)
        result = put(port, f'agents/{args[0]}/env', {'content': args[1]})
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Workspace
    elif cmd == 'list-workspace':
        if not args: print("Usage: list-workspace <name>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}/workspace')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'get-workspace':
        if len(args) < 2: print("Usage: get-workspace <name> <file>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}/workspace/{args[1]}')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'update-workspace':
        if len(args) < 3: print("Usage: update-workspace <name> <file> '<content>'"); sys.exit(1)
        result = put(port, f'agents/{args[0]}/workspace/{args[1]}', {'content': args[2]})
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Skills
    elif cmd == 'list-skills':
        if not args: print("Usage: list-skills <name>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}/skills')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'update-skills':
        if len(args) < 2: print("Usage: update-skills <name> '<json>'"); sys.exit(1)
        result = put(port, f'agents/{args[0]}/skills', {'skills': json.loads(args[1])})
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 日志
    elif cmd == 'logs':
        if not args: print("Usage: logs <name>"); sys.exit(1)
        result = get(port, f'agents/{args[0]}/logs')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 共享配置
    elif cmd == 'shared-config':
        subcmd = args[0] if args else 'skills'
        if subcmd == 'skills':
            result = get(port, 'shared-config/skills')
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif subcmd == 'mcp':
            result = get(port, 'shared-config/mcp')
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif subcmd == 'members':
            result = get(port, 'shared-config/members')
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif subcmd == 'apply':
            result = post(port, 'shared-config/apply')
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"Unknown shared-config subcommand: {subcmd}")
            print("Available: skills, mcp, members, apply")
    
    # Teams
    elif cmd == 'list-teams':
        result = get(port, 'teams')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'team-board':
        if not args: print("Usage: team-board <team-name>"); sys.exit(1)
        result = get(port, f'teams/{args[0]}/board')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'team-tasks':
        if not args: print("Usage: team-tasks <team-name>"); sys.exit(1)
        result = get(port, f'teams/{args[0]}/tasks')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'team-agents':
        if not args: print("Usage: team-agents <team-name>"); sys.exit(1)
        result = get(port, f'teams/{args[0]}/agents')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 版本
    elif cmd == 'version':
        result = get(port, 'nanobot/version')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == 'check-update':
        result = get(port, 'nanobot/update')
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)

if __name__ == '__main__':
    main()
