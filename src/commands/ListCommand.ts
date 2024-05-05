import { DescribeParametersCommand } from '@aws-sdk/client-ssm'
import { Effect } from 'effect'
import { Arg } from '../config/Arg'
import { SSM } from '../ssm/SSM'
import type { Command } from './Command'
import { CommandError } from './CommandError'

export type ListCommandOutput = Array<{
  name: string
  type: string
}>

export class ListCommand implements Command<ListCommandOutput> {
  public output = [] as ListCommandOutput

  public get render() {
    const self = this

    return Effect.gen(function* () {
      const output: string[] = []
      for (const { name, type } of self.output) {
        output.push(`${type.padEnd(20, ' ')} ${name}`)
      }

      return output.join('\n')
    })
  }

  public get run() {
    const self = this

    return Effect.gen(function* () {
      const client = yield* SSM.value
      const args = yield* Arg.value

      const command = new DescribeParametersCommand({
        MaxResults: args.maxResults,
        ParameterFilters:
          args.prefix.length > 0
            ? [
                {
                  Key: 'Name',
                  Option: 'BeginsWith',
                  Values: [args.prefix],
                },
              ]
            : undefined,
      })

      const result = yield* Effect.tryPromise({
        try: () => client.send(command),
        catch: (e) => new CommandError(e as Error),
      })

      for (const parameter of result.Parameters ?? []) {
        self.output.push({
          name: parameter.Name!,
          type: parameter.Type!,
        })
      }
    })
  }
}
