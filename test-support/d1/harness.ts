import { execFileSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const harnessFilePath = fileURLToPath(import.meta.url)
const isDirectExecution = Boolean(
  process.argv[1] && path.resolve(process.argv[1]) === harnessFilePath,
)
const projectRoot = path.resolve(path.dirname(harnessFilePath), "../..")
const stateName =
  process.env.D1_TEST_STATE ?? (isDirectExecution ? "manual" : `process-${String(process.pid)}`)
const persistDirectory = path.join(projectRoot, ".tmp", "phase-03-d1", stateName)
const schemaFile = path.join(
  projectRoot,
  "test-support",
  "d1",
  "candidate",
  "0001_disposable_harness.sql",
)
const fixtureFile = path.join(projectRoot, "test-support", "d1", "fixtures", "synthetic.sql")
const resetFile = path.join(projectRoot, "test-support", "d1", "reset.sql")
const wranglerExecutable = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js")
const wranglerConfig = path.join(projectRoot, "wrangler.d1-harness.jsonc")

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

export function teardownCandidateDatabase(): void {
  if (existsSync(persistDirectory)) {
    rmSync(persistDirectory, { recursive: true, force: true })
  }
}

export function setupCandidateDatabase(): void {
  teardownCandidateDatabase()
  executeFile(schemaFile)
}

export function resetCandidateDatabase(): void {
  if (existsSync(persistDirectory)) {
    executeFile(resetFile)
  }
  executeFile(schemaFile)
}

export function loadSyntheticFixtures(): void {
  executeFile(fixtureFile)
}

export function queryCandidateDatabase<T = Record<string, unknown>>(sql: string): T[] {
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

function runFromCommandLine(): void {
  const action = process.argv[2]

  switch (action) {
    case "setup":
      setupCandidateDatabase()
      break
    case "reset":
      resetCandidateDatabase()
      break
    case "seed":
      loadSyntheticFixtures()
      break
    case "teardown":
      teardownCandidateDatabase()
      break
    case "validate":
      setupCandidateDatabase()
      try {
        loadSyntheticFixtures()
        console.info(
          JSON.stringify(
            queryCandidateDatabase("SELECT key, value FROM harness_meta ORDER BY key;"),
          ),
        )
      } finally {
        teardownCandidateDatabase()
      }
      break
    default:
      throw new Error("Use: setup | reset | seed | teardown | validate")
  }
}

if (isDirectExecution) {
  runFromCommandLine()
}
