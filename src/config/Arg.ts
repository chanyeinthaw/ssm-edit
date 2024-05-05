import { Argument, program } from 'commander'
import { Context, Effect, Layer, Ref } from 'effect'

type Args = {
  forceEnv: boolean
  profile: string
  prefix: string
  command: 'ls' | 'cat' | 'vim'
  maxResults: number
  region: string
}

export class ArgsError {
  public readonly _tag = 'ArgsError'

  constructor(public cause: Error) {}
}

export class Arg extends Context.Tag('Arg')<
  Arg,
  {
    load: Effect.Effect<void, ArgsError>
    value: Effect.Effect<Args>
  }
>() {
  static load = Effect.flatMap(Arg, (c) => c.load)
  static value = Effect.flatMap(Arg, (c) => c.value)

  static Live = Layer.effect(
    Arg,
    Effect.gen(function* () {
      const ref = yield* Ref.make<Args>({
        forceEnv: false,
        prefix: '',
        profile: 'default',
        command: 'ls',
        maxResults: 10,
        region: '',
      })

      return {
        load: Effect.gen(function* () {
          program
            .option('-e, --use-env', 'Use environment variables')
            .option('-m, --max-results <max-result>', 'Max results')
            .option('-f, --prefix <prefix>', 'Prefix filter')
            .option('-p, --profile <profile>', 'AWS Profile')
            .requiredOption('-r, --region <region>', 'AWS Region')
            .addArgument(
              new Argument('<command>', 'Command to run')
                .choices(['ls', 'cat', 'vim'])
                .argOptional()
                .default('ls'),
            )
            .exitOverride(() => {
              process.exit(0)
            })

          yield* Effect.try({
            try: () => program.parse(process.argv),
            catch: (e) => new ArgsError(e as Error),
          })

          const args = program.opts()
          const command = program.args[0]

          yield* Ref.update(ref, () => ({
            region: args.region,
            maxResults: parseInt(args.maxResults || '10'),
            prefix: args.prefix || '',
            forceEnv: args.useEnv || false,
            profile: args.profile || 'default',
            command: (command || 'ls') as any,
          }))
        }),
        value: Ref.get(ref),
      }
    }),
  )
}
