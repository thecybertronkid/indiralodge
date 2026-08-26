import { ensureDefaultAdminAccount } from '../lib/seed';

async function main() {
  console.log('Seeding Indira Lodge PMS database...');
  await ensureDefaultAdminAccount();
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
