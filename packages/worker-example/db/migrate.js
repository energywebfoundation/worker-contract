try {
  require('ts-node').register();
} catch {}

const { config } = require('dotenv');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

config({ path: join(__dirname, '..', '.env') });

const { up } = require('./migration-up');
const { down } = require('./migration-down');

(async () => {
  const command = process.argv[2];

  if (!command) {
    console.log('Available commands: up, down, create <name>');
    process.exit(1);
  }

  if (command === 'up') {
    await up();
  } else if (command === 'down') {
    await down();
  } else if (command === 'create') {
    const name = process.argv[3];
    const date = new Date()
      .toISOString()
      .replaceAll(':', '.') // compatibility
      .replaceAll(/\.[0-9]+Z/g, ''); // truncate miliseconds

    const fileName = `${date}.${name}.ts`;
    const fileContent = readFileSync(join(__dirname, 'create.template.ts'));

    writeFileSync(join(__dirname, 'migrations', fileName), fileContent);
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }
})();
