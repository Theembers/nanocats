"""Analytics API routes."""

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException

from nanocats.db import get_db
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/tokens", response_model=dict)
async def get_token_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    agent_id: str | None = None,
    model: str | None = None,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = await get_db()
    records = await db.query_tokens(
        start_date=start_date,
        end_date=end_date,
        agent_id=agent_id,
        model=model,
    )

    total_input = sum(r.get("input_tokens", 0) for r in records)
    total_output = sum(r.get("output_tokens", 0) for r in records)
    total_cache = sum(r.get("cache_hit", 0) for r in records)

    by_date = defaultdict(lambda: {"input": 0, "output": 0, "cache": 0})
    by_model = defaultdict(lambda: {"input": 0, "output": 0, "cache": 0, "provider": ""})
    by_agent = defaultdict(int)

    for r in records:
        date = r.get("timestamp", "")[:10]
        by_date[date]["input"] += r.get("input_tokens", 0)
        by_date[date]["output"] += r.get("output_tokens", 0)
        by_date[date]["cache"] += r.get("cache_hit", 0)

        model_name = r.get("model", "")
        by_model[model_name]["input"] += r.get("input_tokens", 0)
        by_model[model_name]["output"] += r.get("output_tokens", 0)
        by_model[model_name]["cache"] += r.get("cache_hit", 0)
        by_model[model_name]["provider"] = r.get("provider", "")

        by_agent[r.get("agent_id", "")] += r.get("total_tokens", 0)

    date_list = [
        {
            "date": d,
            "input_tokens": int(v["input"]),
            "output_tokens": int(v["output"]),
            "total_tokens": int(v["input"]) + int(v["output"]),
            "cache_hit": int(v["cache"]),
        }
        for d, v in sorted(by_date.items())
    ]
    model_list = [
        {
            "model": m,
            "provider": v["provider"],
            "input_tokens": int(v["input"]),
            "output_tokens": int(v["output"]),
            "total_tokens": int(v["input"]) + int(v["output"]),
            "cache_hit": int(v["cache"]),
        }
        for m, v in by_model.items()
    ]
    agent_list = [
        {"agent_id": a, "total_tokens": t} for a, t in sorted(by_agent.items(), key=lambda x: -x[1])
    ]

    total_tokens = total_input + total_output
    for a in agent_list:
        a["percentage"] = (
            round(a["total_tokens"] / total_tokens * 100, 1) if total_tokens > 0 else 0
        )

    return {
        "summary": {
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_tokens,
            "total_cache_hit": total_cache,
        },
        "by_date": date_list,
        "by_model": model_list,
        "by_agent": agent_list,
    }
