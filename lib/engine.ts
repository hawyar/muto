import { createCatalog, CatalogOptions } from './catalog'
export { parseQuery } from './parser'

export async function query (query: string, opt: CatalogOptions): Promise<void> {
  const result = await createCatalog(query, opt)
  console.log(result)
}
