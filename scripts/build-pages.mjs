import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

function parseGitHubRepository(remoteUrl) {
  const trimmed = remoteUrl.trim()
  const match = trimmed.match(/github\.com[:/](.+?)(?:\.git)?$/i)

  return match?.[1] ?? null
}

function resolveRepository() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY
  }

  try {
    const remoteUrl = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      encoding: 'utf8'
    })
    const repository = parseGitHubRepository(remoteUrl)

    if (repository) {
      return repository
    }
  } catch {
    // Fall through to a local-only fallback for repos without a GitHub remote.
  }

  return `local/${basename(process.cwd())}`
}

function runNodeScript(scriptPath, args, env) {
  execFileSync(process.execPath, [scriptPath, ...args], {
    env,
    stdio: 'inherit'
  })
}

const repository = resolveRepository()
const repositoryName = repository.split('/').at(-1) ?? basename(process.cwd())
const env = {
  ...process.env,
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: repository,
  VITE_PUBLIC_BASE_PATH: process.env.VITE_PUBLIC_BASE_PATH ?? `/${repositoryName}/`
}

runNodeScript('node_modules/typescript/bin/tsc', ['-b'], env)
runNodeScript('node_modules/vite/bin/vite.js', ['build'], env)

console.log(`GitHub Pages build complete for ${repository} (${env.VITE_PUBLIC_BASE_PATH})`)
