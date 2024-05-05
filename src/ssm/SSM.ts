import { SSMClient } from '@aws-sdk/client-ssm'
import { Context, Effect, Layer, Ref } from 'effect'
import { Arg } from '../config/Arg'
import { Credentials } from '../config/Credentials'

export class SSM extends Context.Tag('SSM')<
  SSM,
  {
    make: Effect.Effect<void, never, Arg | Credentials>
    value: Effect.Effect<SSMClient>
  }
>() {
  public static make = Effect.flatMap(SSM, (c) => c.make)
  public static value = Effect.flatMap(SSM, (c) => c.value)

  public static Live = Layer.effect(
    SSM,
    Effect.gen(function* () {
      const ref = yield* Ref.make<SSMClient | null>(null)

      return {
        make: Effect.gen(function* () {
          const args = yield* Arg.value
          const credentials = yield* Credentials.value

          const client = new SSMClient({
            region: args.region,
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
            },
          })

          yield* Ref.set(ref, client)
        }),
        value: Effect.map(Ref.get(ref), (c) => c!),
      }
    }),
  )
}
