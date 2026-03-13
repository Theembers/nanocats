---
name: clawhub
description: Search and install agent skills from ClawHub, the public skill registry.
homepage: https://clawhub.ai
metadata: {"nanocats":{"emoji":"🦞"}}
---

# ClawHub

Public skill registry for AI agents. Search by natural language (vector search).

## When to use

Use this skill when the user asks any of:
- "find a skill for …"
- "search for skills"
- "install a skill"
- "what skills are available?"
- "update my skills"

## Search

```bash
npx --yes clawhub@latest search "web scraping" --limit 5
```

## Install

### For Supervisor Agent (Global install, available to all agents)

When the current agent type is supervisor, ask the user:
- "Install globally (all agents can use) or locally (only this agent)?"

If user chooses global install:
```bash
npx --yes clawhub@latest install <slug> --workdir ~/.nanocats/templates
```

If user chooses local install:
```bash
npx --yes clawhub@latest install <slug> --workdir ~/.nanocats/workspaces/{agent_id}
```

### For User/Specialized Agent (Local install only)

When the current agent type is user or specialized, install directly to its own workspace:
```bash
npx --yes clawhub@latest install <slug> --workdir ~/.nanocats/workspaces/{agent_id}
```

Replace `<slug>` with the skill name from search results, and `{agent_id}` with the current agent's ID.

## Update

### Update global skills (Supervisor only)
```bash
npx --yes clawhub@latest update --all --workdir ~/.nanocats/templates
```

### Update current agent's skills
```bash
npx --yes clawhub@latest update --all --workdir ~/.nanocats/workspaces/{agent_id}
```

## List installed

### List global skills
```bash
npx --yes clawhub@latest list --workdir ~/.nanocats/templates
```

### List current agent's skills
```bash
npx --yes clawhub@latest list --workdir ~/.nanocats/workspaces/{agent_id}
```

## Notes

- Requires Node.js (`npx` comes with it).
- No API key needed for search and install.
- Login (`npx --yes clawhub@latest login`) is only required for publishing.
- `--workdir` is critical — without it, skills install to the current directory instead of the nanocats workspace.
- After install, remind the user to start a new session to load the skill.
