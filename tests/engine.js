import tap from "tap"
import path from "path"
import {createDataset} from "../dist/muto.js";
import {createReadStream} from "fs"

tap.test("dataset", async (t) => {
    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = createDataset(source, {
        delimiter: ",",
    })

    t.test("get column header", async (t) => {
        const columns = await dataset.getColumnHeader().catch(t.fail)
        const wanted = `id,artist_id,album_title,genre,year_of_pub,num_of_tracks,num_of_sales,rolling_stone_critic,mtv_critic,music_maniac_critic`
        t.same(columns, wanted.split(","))
        t.end()
    })

    t.test("preview first couple of rows", async (t) => {
        const prev = await dataset.preview().catch(t.fail) // by default it pulls 10 rows
        // TODO: pull 10 rows from the dataset
        // t.same(prev, wanted)
        t.ok(prev)
        t.end()
    })

    t.test("correct connector", async (t) => {
        const conn = dataset.determineConnector()
        t.same(conn.readable, createReadStream(source).readable)
        t.end()
    })

    t.test("row count", async (t) => {
        const source = path.join(process.cwd(), "tests", "fixtures", "543.csv")

        const dataset = createDataset(source, {
            delimiter: ",",
        })

        const rows = await dataset.rowCount()
        const wanted = 10691

        t.same(rows, wanted)
        t.end()
    })

    t.test("row count", async (t) => {
        const source = path.join(process.cwd(), "tests", "fixtures", "543.csv")

        const dataset = createDataset(source, {
            delimiter: ",",
            destination: "s3://muto-test/543.csv", // output will be streamed to s3
            outputFormat: "json", // json format
            keepColumns: ['icd_pcs_hcf_grouperscpt', 'pcs_dscription'] // output will only have those colummns
        })

        t.end()
    })
});
