#!/usr/bin/env bash
# Restart workspace services after a deploy. Intended to run as root.
#
# One-time on the server:
#   sudo install -m 755 -o root -g root deploy/restart-workspace.sh /usr/local/bin/restart-workspace.sh
#
# Sudo: GitHub Actions is non-interactive, so the SSH user (same as secret DEPLOY_USER) must
# be allowed to run *exactly* this path without a password. Create a file, e.g. with visudo:
#   /etc/sudoers.d/99-restart-workspace
#   ----
#   replace USERNAME with your deploy/SSH user (e.g. adept, deploy, github)
#   USERNAME ALL=(root) NOPASSWD: /usr/local/bin/restart-workspace.sh
#   ----
#   sudo chmod 440 /etc/sudoers.d/99-restart-workspace
#
# Verify as the deploy/SSH user (must succeed, exit 0, no password prompt):
#   sudo -n /usr/local/bin/restart-workspace.sh
#
# If you see "a password is required" from CI, the rule does not match: wrong user, path, or typo.
# If you see TTY / requiretty issues, /etc/ssh/ssh_config or the workflow uses -tt; also try
#   Defaults!USERNAME !requiretty
# in a sudoers drop-in (use visudo).
#
# GitHub Actions secret DEPLOY_COMMAND:
#   sudo /usr/local/bin/restart-workspace.sh
#
# If you change systemd unit files under /etc/systemd/system/, run once on the server:
#   sudo systemctl daemon-reload

set -euo pipefail

systemctl restart game-api
systemctl restart game-frontend
