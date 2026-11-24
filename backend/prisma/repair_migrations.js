import { db, disconnectPrisma } from '../src/config/prisma.js';
import { ensureSchemaSynchronized } from '../src/config/schemaGuard.js';

console.log('====================================================');
console.log('🔧 InterviewAI Database Migration & P3009 Recovery Tool');
console.log('====================================================');

async function main() {
  try {
    console.log('[1/3] Connecting to PostgreSQL database...');
    await db.$queryRaw`SELECT 1`;
    console.log('[1/3] Connected successfully.');

    console.log('[2/3] Resolving failed migrations in _prisma_migrations and applying safe schema updates...');
    const result = await ensureSchemaSynchronized(db);

    if (result.success) {
      console.log('\n✅ [3/3] SUCCESS: Database schema synchronized successfully!');
      if (result.applied && result.applied.length > 0) {
        console.log(`Applied migrations:`);
        result.applied.forEach((m) => console.log(`  - ${m}`));
      } else {
        console.log('All 8 project migrations are already applied and up to date.');
      }
      console.log('\nTable public.practice_sessions and all required columns are now ready in PostgreSQL.');
      console.log('You can now start the application:');
      console.log('  npm run dev\n');
    } else {
      console.error('\n❌ FAILED to synchronize schema:', result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Unexpected error during migration repair:', err.message);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

main();
