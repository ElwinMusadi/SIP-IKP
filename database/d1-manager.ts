import { execFileSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const managerFilePath = fileURLToPath(import.meta.url)
const isDirectExecution = Boolean(
  process.argv[1] && path.resolve(process.argv[1]) === managerFilePath,
)
const projectRoot = path.resolve(path.dirname(managerFilePath), "..")
const stateName =
  process.env.D1_PROD_STATE ?? (isDirectExecution ? "local-dev" : `test-${String(process.pid)}`)
const persistDirectory = path.join(projectRoot, ".wrangler", "state", "v3", "d1", stateName)

const migrationFile = path.join(
  projectRoot,
  "database",
  "migrations",
  "0001_initial_production_schema.sql",
)
const seedFile = path.join(projectRoot, "database", "seeds", "0001_initial_seed.sql")
const wranglerExecutable = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js")
const wranglerConfig = path.join(projectRoot, "wrangler.jsonc")

function runWrangler(arguments_: readonly string[]): string {
  return execFileSync(process.execPath, [wranglerExecutable, ...arguments_], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      NO_COLOR: "1",
    },
    windowsHide: true,
  })
}

function executeFile(filePath: string): void {
  runWrangler([
    "d1",
    "execute",
    "DB",
    "--local",
    "--config",
    wranglerConfig,
    "--persist-to",
    persistDirectory,
    "--file",
    filePath,
    "--yes",
  ])
}

export function teardownProductionDatabase(): void {
  if (existsSync(persistDirectory)) {
    rmSync(persistDirectory, { recursive: true, force: true })
  }
}

export function applyProductionMigrations(): void {
  executeFile(migrationFile)
}

export function seedProductionDatabase(): void {
  executeFile(seedFile)
}

export function resetProductionDatabase(): void {
  teardownProductionDatabase()
  applyProductionMigrations()
  seedProductionDatabase()
}

export function queryProductionDatabase<T = Record<string, unknown>>(sql: string): T[] {
  const output = runWrangler([
    "d1",
    "execute",
    "DB",
    "--local",
    "--config",
    wranglerConfig,
    "--persist-to",
    persistDirectory,
    "--command",
    sql,
    "--json",
  ])
  const parsed = JSON.parse(output) as Array<{ results?: T[] }>
  return parsed.flatMap((entry) => entry.results ?? [])
}

export function validateProductionDatabase(): boolean {
  const foreignKeyCheck = queryProductionDatabase("PRAGMA foreign_key_check;")
  if (foreignKeyCheck.length > 0) {
    throw new Error(`Foreign key check failed: ${JSON.stringify(foreignKeyCheck)}`)
  }

  const userCount = queryProductionDatabase<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users WHERE is_active = 1;",
  )
  if (!userCount[0] || userCount[0].count < 4) {
    throw new Error("Validation failed: minimum 4 active seed users required.")
  }

  const roomCount = queryProductionDatabase<{ count: number }>(
    "SELECT COUNT(*) AS count FROM master_operating_rooms WHERE is_active = 1;",
  )
  if (!roomCount[0] || roomCount[0].count < 10) {
    throw new Error("Validation failed: operating rooms not seeded.")
  }

  return true
}

function runFromCommandLine(): void {
  const action = process.argv[2]

  switch (action) {
    case "migrate":
      applyProductionMigrations()
      console.info("Production migrations applied successfully.")
      break
    case "seed":
      seedProductionDatabase()
      console.info("Synthetic development seed loaded successfully.")
      break
    case "reset":
      resetProductionDatabase()
      console.info("Local database reset and re-seeded successfully.")
      break
    case "validate":
      validateProductionDatabase()
      console.info("Local production database validation passed.")
      break
    case "teardown":
      teardownProductionDatabase()
      console.info("Local database teardown completed.")
      break
    default:
      throw new Error("Use: migrate | seed | reset | validate | teardown")
  }
}

if (isDirectExecution) {
  runFromCommandLine()
}
