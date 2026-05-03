import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";

const GEONAMES_BASE = process.env.GEONAMES_BASE_URL ?? "https://download.geonames.org/export/dump";
const GEONAMES_FALLBACK_BASE = process.env.GEONAMES_FALLBACK_BASE_URL ?? "http://download.geonames.org/export/dump";
const CITY_ZIP = process.env.GEONAMES_CITY_ZIP ?? "cities15000.zip";
const MIN_POPULATION = Number(process.env.GEONAMES_MIN_POPULATION ?? 50_000);
const BATCH_SIZE = 1000;

type CityRow = {
  id: number;
  name: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  name_ru: string | null;
  name_kk: string | null;
};

async function download(url: string, target: string) {
  const args = [
    "-L",
    "--fail",
    "--retry",
    "0",
    "--retry-delay",
    "3",
    "--connect-timeout",
    "10",
    "--output",
    target,
    url,
  ];
  try {
    await runCommand("/usr/bin/curl", args);
  } catch (error) {
    if (!url.startsWith(GEONAMES_BASE)) throw error;
    await runCommand("/usr/bin/curl", [...args.slice(0, -1), url.replace(GEONAMES_BASE, GEONAMES_FALLBACK_BASE)]);
  }
}

function unzipLines(zipPath: string, entryName: string) {
  const child = spawn("/usr/bin/unzip", ["-p", zipPath, entryName], { stdio: ["ignore", "pipe", "inherit"] });
  const lines = readline.createInterface({ input: child.stdout });
  return { child, lines };
}

async function parseCities(zipPath: string) {
  const entryName = CITY_ZIP.replace(/\.zip$/, ".txt");
  const rows = new Map<number, CityRow>();
  const { child, lines } = unzipLines(zipPath, entryName);

  for await (const line of lines) {
    const cols = String(line).split("\t");
    const id = Number(cols[0]);
    const name = cols[1] ?? "";
    const latitude = Number(cols[4]);
    const longitude = Number(cols[5]);
    const countryCode = cols[8] ?? "";
    const population = Number(cols[14] ?? 0);
    if (!id || !name || !countryCode || population <= MIN_POPULATION) continue;
    rows.set(id, {
      id,
      name,
      country_code: countryCode,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      population: Number.isFinite(population) ? population : null,
      name_ru: null,
      name_kk: null,
    });
  }

  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`unzip exited with ${code}`)));
    child.on("error", reject);
  });

  return rows;
}

async function applyAlternateNames(zipPath: string, cities: Map<number, CityRow>) {
  const { child, lines } = unzipLines(zipPath, "alternateNamesV2.txt");

  for await (const line of lines) {
    const cols = String(line).split("\t");
    const city = cities.get(Number(cols[1]));
    if (!city) continue;
    const lang = cols[2];
    const name = cols[3];
    const preferred = cols[4] === "1";
    if (!name) continue;
    if (lang === "ru" && (!city.name_ru || preferred)) city.name_ru = name;
    if (lang === "kk" && (!city.name_kk || preferred)) city.name_kk = name;
  }

  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`unzip exited with ${code}`)));
    child.on("error", reject);
  });
}

async function upsertCities(rows: CityRow[]) {
  const seedEnv = readSeedEnv();
  if (!seedEnv) {
    await upsertCitiesViaCli(rows);
    return;
  }

  const { supabaseUrl, serviceRoleKey } = seedEnv;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const response = await fetch(`${supabaseUrl}/rest/v1/cities?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error(`Failed to upsert batch ${i / BATCH_SIZE + 1}: ${response.status} ${await response.text()}`);
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} cities`);
  }
}

function readSeedEnv() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

function sqlForBatch(batch: CityRow[]) {
  const payload = JSON.stringify(batch).replaceAll("$json$", "$ json $");
  return `
insert into public.cities (id, name, country_code, latitude, longitude, population, name_ru, name_kk)
select id, name, country_code, latitude, longitude, population, name_ru, name_kk
from jsonb_to_recordset($json$${payload}$json$::jsonb) as x(
  id integer,
  name text,
  country_code text,
  latitude double precision,
  longitude double precision,
  population integer,
  name_ru text,
  name_kk text
)
on conflict (id) do update set
  name = excluded.name,
  country_code = excluded.country_code,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  population = excluded.population,
  name_ru = excluded.name_ru,
  name_kk = excluded.name_kk;
`;
}

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`)));
    child.on("error", reject);
  });
}

async function upsertCitiesViaCli(rows: CityRow[]) {
  const command = process.env.npm_execpath ?? "pnpm";
  const workdir = path.resolve("infra");
  const dir = await mkdtemp(path.join(tmpdir(), "aleo-city-sql-"));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const sqlPath = path.join(dir, `cities-${i / BATCH_SIZE + 1}.sql`);
    await writeFile(sqlPath, sqlForBatch(batch));
    await runCommand(command, ["dlx", "supabase@latest", "db", "query", "--linked", "--file", sqlPath, "--workdir", workdir]);
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} cities`);
  }
}

export async function seedCities() {
  const dir = await mkdtemp(path.join(tmpdir(), "aleo-geonames-"));
  const cityZip = path.join(dir, CITY_ZIP);
  const alternateZip = path.join(dir, "alternateNamesV2.zip");

  console.log(`Downloading ${CITY_ZIP}`);
  await download(`${GEONAMES_BASE}/${CITY_ZIP}`, cityZip);
  console.log("Parsing cities");
  const cities = await parseCities(cityZip);

  console.log("Downloading alternateNamesV2.zip");
  await download(`${GEONAMES_BASE}/alternateNamesV2.zip`, alternateZip);
  console.log("Applying ru/kk alternate names");
  await applyAlternateNames(alternateZip, cities);

  const rows = [...cities.values()].sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  console.log(`Upserting ${rows.length} cities`);
  await upsertCities(rows);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCities().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
