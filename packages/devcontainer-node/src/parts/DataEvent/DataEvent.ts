export class DataEvent extends Event {
  data: any
  constructor(data) {
    super('data')
    this.data = data
  }
}
