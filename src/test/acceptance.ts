// Inputs of the browser acceptance scenarios (D-12): scenarios.json is copied from the
// orchestrator's reports/acceptance/*.json so tests run from a clean clone of this repo.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { InputFile } from '../engine'
import scenarios from './acceptance/scenarios.json'

const ROOT = join(import.meta.dirname, '../../')

interface ScenarioFile {
  name: string
  from?: string
  text?: string
  replace?: [string, string][]
}

/** Files of an acceptance scenario, built as the browser run uploaded them. */
export function scenarioFiles(id: string): InputFile[] {
  const scenario = scenarios.find((s) => s.id === id)
  if (!scenario) throw new Error(`Scenario ${id} not found`)
  return (scenario.files as ScenarioFile[]).map((f) => {
    let text = f.text ?? readFileSync(join(ROOT, f.from!), 'utf8')
    for (const [from, to] of f.replace ?? []) {
      if (!text.includes(from)) throw new Error(`${id}/${f.name}: replace target not found: ${from}`)
      text = text.replace(from, to)
    }
    return { name: f.name, text }
  })
}
