import { createCatalog, CatalogOptions } from './catalog'
export { parseQuery } from './parser'

export async function query (query: string, opt: CatalogOptions): Promise<void> {
  const catalog = await createCatalog(opt)

  console.log(JSON.stringify(catalog, null, 2))
}
