import { GetParametersCommand } from '@aws-sdk/client-ssm'
import { Effect, Ref } from 'effect'
import { SSM } from '../ssm/SSM'
import type { Command } from './Command'
import { CommandError } from './CommandError'
import type { ListCommandOutput } from './ListCommand'

export type CatCommandOutput = Array<{
  name: string
  value: string
  type: string
}>

export class CatCommand implements Command<CatCommandOutput> {
  public output = [] as CatCommandOutput

  constructor(private list: Command<ListCommandOutput>) {}

  public get render() {
    const self = this

    return Effect.gen(function* () {
      const output: string[] = []
      for (const { name, value, type } of self.output) {
        output.push(`${type === 'SecureString' ? 'sec:' : ''}${name}=${value}`)
      }

      return output.join('\n')
    })
  }

  public get run() {
    const self = this

    return Effect.gen(function* () {
      yield* self.list.run
      const list = self.list.output
      const client = yield* SSM.value
      const ref = yield* Ref.make<CatCommandOutput>([])

      const names = list.map((p) => p.name)

      const effects: Array<Effect.Effect<void, CommandError>> = []

      for (let i = 0; i < names.length; i += 10) {
        effects.push(
          Effect.gen(function* () {
            const command = new GetParametersCommand({
              Names: names.slice(i, i + 10),
              WithDecryption: true,
            })

            const result = yield* Effect.tryPromise({
              try: () => client.send(command),
              catch: (e) => new CommandError(e as Error),
            })

            const output: CatCommandOutput = []

            for (const parameter of result.Parameters ?? []) {
              output.push({
                name: parameter.Name!,
                value: parameter.Value!,
                type: parameter.Type!,
              })
            }

            yield* Ref.update(ref, (o) => [...o, ...output])
          }),
        )
      }

      yield* Effect.all(effects, {
        concurrency: 'unbounded',
      })

      self.output = yield* Ref.get(ref)
    })
  }
}
