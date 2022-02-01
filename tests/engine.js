import tap from "tap"
import path from "path"
import {createDataset, createWorkflow} from "../dist/muto.js";


tap.test("dataset", async (t) => {
    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = createDataset(source, {
        name: "albums",
        destination: "s3://hwyr-cms/testme/albums.csv",
        output: "json",
    })
    t.same(dataset.source, source)
})

tap.test("workflow", async (t) => {
    const w = createWorkflow("untitled_work")

    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = createDataset(source, {
        name: "albums",
        destination: "s3://hwyr-cms/testme/albums.csv",
        output: "json",
    })

    await w.add(dataset).catch(console.error)
    // language=SQL format=false
    await w.query(`select album_title, genre from albums order by id`)

    t.ok(w)
})
