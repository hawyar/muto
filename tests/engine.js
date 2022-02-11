import tap from "tap"
import path from "path"
import {createCatalog, createWorkflow} from "../dist/muto.js"

// tap.test("create catalaog", async (t) => {
//     const source = path.join(process.cwd(), "tests", "example", "albums.csv")

//     const dataset = await createCatalog(source, {
//         name: "albums",
//         destination: "s3://hwyr-cms/testme/albums.csv",
//         output: "json"
//     })

//     t.same(dataset.vfile.data.source, source)
//     t.end()
// })

tap.test("create workflow", async (t) => {
    const w = createWorkflow("untitled_work")

    const source = path.join(process.cwd(), "tests", "example", "albums.csv")

    const catalog = await createCatalog(source, {
        name: "albums",
        destination: "s3://hwyr-cms/testme/albums.csv",
        output: "json"
    })

    w.add(catalog)
    // add more catalogs

    // language=SQL format=false
    await w.query(`select * from albums where artist = "The Beatles" limit 12`)

    t.ok(w)
    t.end()
})
