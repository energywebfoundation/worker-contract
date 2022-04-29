const { SlonikMigrator } = require('@slonik/migrator');
const { createPool } = require('slonik');
const { getConnectionOptions } = require('./connection');
const { join } = require('path');

const connectionOptions = getConnectionOptions();

const slonik = createPool(connectionOptions.uri);

const migrator = new SlonikMigrator({
  migrationsPath: join(__dirname, 'migrations'),
  migrationTableName: 'migration',
  slonik,
});

migrator.runAsCLI();