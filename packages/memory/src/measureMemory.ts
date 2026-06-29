import { measureMemory } from '@lvce-editor/measure-memory'
import { instantiations, instantiationsPath } from './config.ts'

const main = async () => {
  await measureMemory({
    instantiations,
    instantiationsPath,
  })
}

main()
