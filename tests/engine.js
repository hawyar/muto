import tap from "tap"
import path from "path"
import {createCatalog} from "../dist/muto.js";


// tap.test("invalid path", (t) => {
//     t.throws(async () => await createCatalog(path.join(process.cwd(), "t?ests", "fi/xtures", "albums.csv")), Error, "throw on invalid file path")
//     t.end()
// });
//
tap.test("create new dataset", async (t) => {
    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = await createCatalog(source, {
        name: "albums",
        destination: "s3://hwyr-cms/testme/albums.csv",
        output: "json",
    })
    console.log(dataset)
    // t.same(dataset.source, source)
    t.end()
});

// t.test("determine connector", (t) => {
//     const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")
//
//     const dataset = createDataset(source, {
//         name: "albums",
//         destination: "s3://hwyr-cms/testme/albums.csv",
//         output: "json",
//     })
//
//     dataset.determineConnector()
//     t.same(dataset.connector["_readableState"].reading, false)
// })


// t.test("determine loader", (t) => {
//     const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")
//
//     const dataset = createDataset(source, {
//         name: "albums",
//         destination: "s3://hwyr-cms/testme/albums.csv",
//         output: "json",
//     })
//
//     dataset.determineConnector()
//     t.same(dataset.connector["_readableState"].reading, false)
// })


// tap.test("workflow", async (t) => {
//     const w = createWorkflow("untitled_work")
//
//     const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")
//
//     const dataset = createDataset(source, {
//         name: "albums",
//         destination: "s3://hwyr-cms/testme/albums.csv",
//         output: "json",
//     })
//
//     await w.add(dataset).catch(console.error)
//     // language=SQL format=false
//     await w.query(`select album_title, genre from albums order by id`)
//
//     t.ok(w)
// })
