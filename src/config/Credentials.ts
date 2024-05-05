import { Context, Effect, Layer, Ref } from 'effect'

type AWSCredentials = {
  accessKeyId: string
  secretAccessKey: string
}

export class Credentials extends Context.Tag('Credentials')<
  Credentials,
  {
    set: (v: AWSCredentials) => Effect.Effect<void>
    value: Effect.Effect<AWSCredentials>
  }
>() {
  public static Live = Layer.effect(
    Credentials,
    Effect.gen(function* () {
      const ref = yield* Ref.make<AWSCredentials | null>(null)

      return {
        set: (v) => Ref.update(ref, () => v),
        value: Effect.map(Ref.get(ref), (c) => c!),
      }
    }),
  )

  public static value = Effect.flatMap(Credentials, (c) => c.value)
  public static set = (v: AWSCredentials) =>
    Effect.flatMap(Credentials, (c) => c.set(v))
}
