import tap from "tap"
import path from "path"
import { createCatalog, createWorkflow } from "../dist/muto.mjs"
import { fileURLToPath } from "url"

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test("create catalog", async (t) => {
    const source = path.join(dirname, "example", "543.csv")

    const catalog = await createCatalog(source, {
        name: "albums",
        output: "json",
        destination: "./beep.json"
    })

    console.log(catalog)

    const query = `select distinct arrivale_dd, beep as boop from albums where year_of_pub < 2010`

    catalog.parseSql(query)

    t.ok(catalog)
    t.end()
})
