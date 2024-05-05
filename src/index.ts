import { BunRuntime } from '@effect/platform-bun'
import { Console, Effect, Layer } from 'effect'
import { CatCommand } from './commands/CatCommand'
import type { Command } from './commands/Command'
import { ListCommand } from './commands/ListCommand'
import { VimCommand } from './commands/VimCommand'
import { Arg } from './config/Arg'
import { Config } from './config/Config'
import { Credentials } from './config/Credentials'
import { SSM } from './ssm/SSM'

const program = Effect.gen(function* () {
  yield* Arg.load
  yield* Config.load
  yield* SSM.make

  const args = yield* Arg.value

  let command: Command<unknown>

  switch (args.command) {
    case 'cat':
      command = new CatCommand(new ListCommand())
      break
    case 'vim':
      command = new VimCommand(new CatCommand(new ListCommand()))
      break
    case 'ls':
    default:
      command = new ListCommand()
      break
  }

  yield* command.run
  yield* Console.log(yield* command.render)
}).pipe(
  Effect.catchTag('NoAWSCredentialsError', () =>
    Console.error('No AWS credentials found'),
  ),
  Effect.catchTag('ArgsError', (e) => Console.error(e.cause.message)),
  Effect.catchTag('CommandError', (e) => Console.error(e.cause.message)),
)

const layer = Layer.mergeAll(Arg.Live, Credentials.Live, Config.Live, SSM.Live)

BunRuntime.runMain(Effect.provide(program, layer))
