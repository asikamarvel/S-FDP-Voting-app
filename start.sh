#!/usr/bin/env bash
set -e
cd backend
# Test with minimal app first
uvicorn app.main_minimal:app --host 0.0.0.0 --port ${PORT:-8000}