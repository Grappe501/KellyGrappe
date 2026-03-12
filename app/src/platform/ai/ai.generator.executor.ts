import { spawn } from "child_process"
import path from "path"
import fs from "fs"

export type GeneratorResult = {
  ok: boolean
  output: string
}

function projectRoot(): string {
  return process.cwd()
}

function resolveGeneratorPath(): string {

  const root = projectRoot()

  const generator = path.join(
    root,
    "tools",
    "platform_generator.py"
  )

  if (!fs.existsSync(generator)) {
    throw new Error(
      `Platform generator not found: ${generator}`
    )
  }

  return generator
}

function runCommand(
  command: string,
  args: string[]
): Promise<GeneratorResult> {

  return new Promise((resolve) => {

    const child = spawn(command, args, {
      cwd: projectRoot(),
      shell: false
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    child.on("close", (code) => {

      if (code !== 0) {
        resolve({
          ok: false,
          output: stderr || `Generator exited with code ${code}`
        })
        return
      }

      resolve({
        ok: true,
        output: stdout || "Generator completed successfully."
      })

    })

  })

}

export async function runPlatformGenerator(
  type: string,
  name: string,
  arg?: string
): Promise<GeneratorResult> {

  try {

    const generatorPath = resolveGeneratorPath()

    const args = [
      generatorPath,
      type,
      name
    ]

    if (arg) {
      args.push(arg)
    }

    const result = await runCommand(
      "python",
      args
    )

    return result

  } catch (error) {

    return {
      ok: false,
      output:
        error instanceof Error
          ? error.message
          : "Unknown generator error"
    }

  }

}
