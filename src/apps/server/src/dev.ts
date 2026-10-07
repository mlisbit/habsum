import './utils/load-local-env.js';
import getDatabasePathArgument from './utils/get-database-path-argument.js';

const databasePath = getDatabasePathArgument();
if (databasePath) process.env.HABSUM_DB_PATH = databasePath;

await import('./index.js');
