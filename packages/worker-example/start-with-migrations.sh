#!/bin/bash

set- e

echo "Running migrations"

node ./packages/example/dist/db/migrate.js up

echo "Migrations finished, starting app."

exec node ./packages/example/dist/src/main.js
