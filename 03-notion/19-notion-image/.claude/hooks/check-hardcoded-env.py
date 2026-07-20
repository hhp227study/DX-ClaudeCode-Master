#!/usr/bin/env python3
"""Stop hook: 소스에서 하드코딩된 환경설정 값을 검사하고, 발견 시 .env.example 작성을 지시."""
import json
import os
import re
import sys

data = json.load(sys.stdin)
if data.get("stop_hook_active"):
    # 이 훅의 block 때문에 이어서 작업한 뒤의 stop은 통과시켜 무한 루프를 방지
    sys.exit(0)

project = os.environ.get("CLAUDE_PROJECT_DIR", ".")
SCAN_DIRS = ("app", "components", "lib")
EXTS = (".js", ".jsx", ".ts", ".tsx")

PATTERNS = [
    ("JWT/Supabase 키", re.compile(r"eyJ[A-Za-z0-9_-]{20,}")),
    ("API 키", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("Supabase URL", re.compile(r"https://[a-z0-9-]+\.supabase\.co")),
    ("시크릿/키 할당", re.compile(
        r"(?i)[\w.]*(api[_-]?key|secret|token|password|anon[_-]?key)\w*"
        r"\s*[:=]\s*[\"'][^\"']{8,}[\"']")),
    ("URL 할당", re.compile(
        r"(?i)\b\w*(url|endpoint)\w*\s*[:=]\s*[\"']https?://[^\"']+[\"']")),
]

findings = []
for d in SCAN_DIRS:
    for root, dirs, files in os.walk(os.path.join(project, d)):
        dirs[:] = [x for x in dirs if x not in ("node_modules", ".next")]
        for fn in files:
            if not fn.endswith(EXTS):
                continue
            path = os.path.join(root, fn)
            try:
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    lines = fh.read().splitlines()
            except OSError:
                continue
            for i, line in enumerate(lines, 1):
                if "process.env" in line:
                    continue
                for label, pat in PATTERNS:
                    m = pat.search(line)
                    if m:
                        snippet = m.group(0)
                        if len(snippet) > 40:
                            snippet = snippet[:40] + "…"
                        rel = os.path.relpath(path, project)
                        findings.append(f"- {rel}:{i} [{label}] {snippet}")
                        break

if findings:
    reason = (
        "하드코딩된 환경설정 값이 발견되었습니다:\n"
        + "\n".join(findings[:20])
        + "\n\n이 값들을 환경변수로 분리하세요. .env.example에 각 키 이름과 "
          "플레이스홀더 값(실제 값 금지)을 작성/갱신하고, 코드는 process.env.* 를 "
          "참조하도록 수정하세요. 실제 값은 사용자가 직접 .env.local에 넣어야 합니다 "
          "(.env 파일 접근은 훅으로 차단되어 있습니다)."
    )
    print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))

sys.exit(0)
