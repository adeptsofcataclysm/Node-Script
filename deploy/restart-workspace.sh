#!/usr/bin/env bash
# Restart workspace services after a deploy. Intended to run as root.
#
# One-time on the server:
#   sudo install -m 755 -o root -g root deploy/restart-workspace.sh /usr/local/bin/restart-workspace.sh
#
# Sudoers for the CI/deploy user (use visudo), allow only this script, no password:
#   deploy ALL=(ALL) NOPASSWD: /usr/local/bin/restart-workspace.sh
#
# GitHub Actions secret DEPLOY_COMMAND:
#   sudo /usr/local/bin/restart-workspace.sh
#
# If you change systemd unit files under /etc/systemd/system/, run once on the server:
#   sudo systemctl daemon-reload

set -euo pipefail

systemctl restart game-api
systemctl reload game-frontend
