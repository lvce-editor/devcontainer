export class ExitEvent extends Event {
  data: any
  constructor(data) {
    super('exit')
    this.data = data
  }
}
