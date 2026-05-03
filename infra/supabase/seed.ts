import { seedCities } from "./seed/seed-cities";

async function main() {
  await seedCities();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
