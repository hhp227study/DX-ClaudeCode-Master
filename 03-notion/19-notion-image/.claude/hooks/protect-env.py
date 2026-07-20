#!/usr/bin/env python3
"""PreToolUse hook: .env 파일 접근(읽기/수정/삭제) 차단. .env.example은 허용."""
import json
import os
import re
import sys

ENV_FILE = re.compile(r"\.env(\.[\w.-]+)?$")
# 경로 토큰으로 등장하는 .env / .env.* 만 매칭 (process.env 같은 코드 참조는 제외)
ENV_IN_COMMAND = re.compile(r"(^|[\s/'\"=:])\.env(\.[\w.-]+)?(?=$|[\s'\";|&)>])")


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }, ensure_ascii=False))
    sys.exit(0)


data = json.load(sys.stdin)
tool = data.get("tool_name", "")
tool_input = data.get("tool_input", {}) or {}

if tool in ("Read", "Edit", "Write"):
    path = tool_input.get("file_path", "") or ""
    base = os.path.basename(path)
    if base != ".env.example" and ENV_FILE.fullmatch(base):
        deny(f".env 파일 접근이 훅으로 차단되었습니다: {path} (.env.example만 허용)")
elif tool == "Bash":
    cmd = tool_input.get("command", "") or ""
    stripped = cmd.replace(".env.example", "")
    if ENV_IN_COMMAND.search(stripped):
        deny(".env 파일을 참조하는 Bash 명령이 훅으로 차단되었습니다 "
             f"(.env.example만 허용): {cmd[:120]}")

sys.exit(0)
