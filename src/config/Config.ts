import ConfigParser from 'configparser'
import { Context, Effect, Either, Layer } from 'effect'
import os from 'node:os'
import path from 'node:path'
import { Arg, ArgsError } from './Arg'
import { Credentials } from './Credentials'

export class NoAWSCredentialsError {
  public readonly _tag = 'NoAWSCredentialsError'
}

export class Config extends Context.Tag('Config')<
  Config,
  {
    load: Effect.Effect<
      void,
      NoAWSCredentialsError | ArgsError,
      Credentials | Arg
    >
  }
>() {
  static load = Effect.flatMap(Config, (c) => c.load)

  static Live = Layer.effect(
    Config,
    Effect.gen(function* () {
      return {
        load: Effect.gen(function* () {
          const args = yield* Arg.value

          const awsCredsPath = path.join(os.homedir(), '.aws', 'credentials')
          const configParser = new ConfigParser()

          let accessKeyId: string | undefined,
            secretAccessKey: string | undefined

          if (
            args.forceEnv ||
            Either.isLeft(
              yield* Effect.either(
                Effect.try(() => configParser.read(awsCredsPath)),
              ),
            )
          ) {
            accessKeyId = process.env.AWS_ACCESS_KEY_ID
            secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
          } else {
            const profile = args.profile || 'default'
            accessKeyId = configParser.get(profile, 'aws_access_key_id')
            secretAccessKey = configParser.get(profile, 'aws_secret_access_key')
          }

          if (accessKeyId === undefined || secretAccessKey === undefined) {
            yield* Effect.fail(new NoAWSCredentialsError())
          }

          yield* Credentials.set({
            accessKeyId: accessKeyId!,
            secretAccessKey: secretAccessKey!,
          })
        }),
      }
    }),
  )
}
