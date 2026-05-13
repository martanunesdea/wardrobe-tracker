#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/backend"
export FLASK_DEBUG=true
python server.py
