#!/usr/bin/env bash

set -euo pipefail

systemctl restart game-api
systemctl restart game-frontend
