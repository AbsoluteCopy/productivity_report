#!/bin/bash
# Ensures the app always runs on the Node version pinned in .nvmrc (22),
# regardless of what "node" resolves to in the shell/PATH that started PM2.
cd "$(dirname "$0")"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    nvm use 22 > /dev/null 2>&1 || nvm install 22 > /dev/null 2>&1
fi

exec node server.js
