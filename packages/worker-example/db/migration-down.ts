import { db, migrator} from './migrator';

export const down = async () => {
  const { results, error } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was reverted successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
};
