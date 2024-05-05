export class CommandError {
  public readonly _tag = 'CommandError'

  constructor(public cause: Error) {}
}
