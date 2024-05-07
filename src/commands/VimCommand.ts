import {
  DeleteParametersCommand,
  PutParameterCommand,
} from '@aws-sdk/client-ssm'
import { Console, Effect, Record } from 'effect'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import yesno from 'yesno'
import child_process from 'node:child_process'
import { SSM } from '../ssm/SSM'
import type { CatCommandOutput } from './CatCommand'
import type { Command } from './Command'
import { CommandError } from './CommandError'

export class VimCommand
  implements
    Command<{
      affected: number
    }>
{
  public output: {
    affected: number
  } = {
    affected: 0,
  }

  constructor(private cat: Command<CatCommandOutput>) {}

  public get render() {
    const self = this

    return Effect.gen(function* () {
      return `Saved: ${self.output.affected}`
    })
  }

  private openVim = (content: string) =>
    Effect.promise(async () => {
      const tempFilePath = path.join(
        os.tmpdir(),
        `envs-${new Date().toISOString()}.txt`,
      )

      fs.writeFileSync(tempFilePath, content)

      child_process.spawnSync('vim', [tempFilePath], {
        stdio: 'inherit',
      })

      const results = fs.readFileSync(tempFilePath, 'utf-8').toString()

      fs.unlinkSync(tempFilePath)

      return results
    })

  private envsToRecord(env: string) {
    const lines = env.split('\n')
    const records: Record<string, string> = {}

    for (const line of lines) {
      const [name, value] = line.split('=')
      if (!name) continue

      records[name] = value || ''
    }

    return records
  }

  private deleteParams(names: string[]) {
    return Effect.gen(function* () {
      if (names.length === 0) return

      const client = yield* SSM.value
      const command = new DeleteParametersCommand({
        Names: names,
      })

      yield* Effect.tryPromise({
        try: () => client.send(command),
        catch: (e) => new CommandError(e as Error),
      })
    })
  }

  private putParam(
    name: string,
    value: string,
    type: 'String' | 'SecureString',
  ) {
    return Effect.gen(function* () {
      const client = yield* SSM.value
      const command = new PutParameterCommand({
        Name: name,
        Value: value,
        Type: type,
        Overwrite: true,
      })

      yield* Effect.tryPromise({
        try: () => client.send(command),
        catch: (e) => new CommandError(e as Error),
      })
    })
  }

  public get run() {
    const self = this

    return Effect.gen(function* () {
      yield* self.cat.run
      const envs = yield* self.cat.render

      const prev = self.envsToRecord(envs)
      const updatedStr = yield* self.openVim(envs)
      const updated = self.envsToRecord(updatedStr)

      const delParamNames = Object.keys(prev).filter((name) => {
        if (name.startsWith('sec:')) {
          return (
            updated[name] === undefined &&
            updated[name.replace('sec:', '')] === undefined
          )
        }

        return (
          updated[name] === undefined && updated[`sec:${name}`] === undefined
        )
      })

      const newAndUpdateNames = Object.keys(updated).filter(
        (name) => !delParamNames.includes(name) && updated[name] !== prev[name],
      )

      const effects: Array<Effect.Effect<void, CommandError, SSM>> = []

      effects.push(self.deleteParams(delParamNames.map(name => name.replace('sec:', ''))))

      for (const name of newAndUpdateNames) {
        const type = name.startsWith('sec:')
          ? ('SecureString' as const)
          : ('String' as const)

        effects.push(
          self.putParam(name.replace('sec:', ''), updated[name], type),
        )
      }

      yield* Console.log('Original ---')
      yield* Console.log(envs)
      yield* Console.log('Updated ---\n')
      yield* Console.log(updatedStr)

      const ok = yield* Effect.promise(() => {
        return yesno({
          question: 'Do you want to apply these changes? (y/n)',
          yesValues: ['y'],
          noValues: ['n'],
        })
      })

      if (!ok) {
        return
      }

      yield* Effect.all(effects, {
        concurrency: 'unbounded',
      })
      self.output.affected = delParamNames.length + newAndUpdateNames.length
    })
  }
}
