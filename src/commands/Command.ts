import type { Effect } from 'effect'
import type { Arg } from '../config/Arg'
import type { SSM } from '../ssm/SSM'
import type { CommandError } from './CommandError'

export interface Command<O> {
  output: O

  run: Effect.Effect<void, CommandError, Arg | SSM>
  render: Effect.Effect<string>
}
