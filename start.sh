#!/usr/bin/env bash
# Required by the orchestrator's hardcoded `bash start.sh` invocation.
# Nothing to start — this repo only ships static files. The fastcomments
# worker serves the contents of dist/ via express.static mounts.
exit 0
