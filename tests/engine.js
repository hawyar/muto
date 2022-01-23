import tap from "tap"
import path from "path"
import {createDataset} from "../dist/muto.js";
import {createReadStream} from "fs";

tap.test("dataset", async (t) => {
    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = createDataset(source, {
        delimiter: ",",
    })

    t.test("get column header", async (t) => {
        const columns = await dataset.columns().catch(t.fail)
        const wanted = `id,artist_id,album_title,genre,year_of_pub,num_of_tracks,num_of_sales,rolling_stone_critic,mtv_critic,music_maniac_critic`
        t.same(columns, wanted.split(","))
        t.end()
    })


    t.test("preview first couple of rows", async (t) => {
        const prev = await dataset.preview().catch(t.fail)
        // TODO: pull 10 rows from the dataset
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
});

// tap.test("count rows", async (t) => {
//
//     const wanted = 10691
//     const source = path.join(process.cwd(), "tests", "fixtures", "543.csv")
//
//     const dataset = createDataset(source, {
//         delimiter: ",",
//     })
//
//     const rows = await dataset.rowCount()
//     t.same(rows, wanted)
// });

// tap.test("send to s3", async (t) => {
//     const source = path.join(process.cwd(), "tests", "fixtures", "543.csv")
//
//     const dataset = createDataset(source, {
//         delimiter: ",",
//         destination: "s3://hwyr-cms/toS3/",
//     })
//
//     const put = await dataset.sendToS3()
//     console.log(put)
//     t.pass(put)
// });


// tap.test("new workflow", async (t) => {
//     const work = createWorkflow("my_etl");
//     t.same(work.name, "my_etl")
//     t.end();
// });

// tap.test("add dataset", async (t) => {
//     const work = createWorkflow("my_etl")
//     const files = await fs.readdir((path.join(process.cwd(), "tests", "fixtures")));
//
//     for (const file of files) {
//         if (!file.endsWith(".csv")) {
//             return;
//         }
//         const dataset = await work.add(path.join(process.cwd(), "tests", "fixtures", file), {
//             delimiter: ",",
//             outputFormat: "json",
//             destination: "./tests/fixtures/output.json",
//             // omitColumns: ["album_title"]
//         })
//         console.log(`Added ${dataset}`);
//     }
//     t.end();
// });

// tap.test("run query in new child process", async (t) => {
//     const work = createWorkflow("my_etl");
//
//     const res = await work.run([`--icsv`, `--ojson`, `head`, `-n`, `1`, `${process.cwd()}/tests/fixtures/sample.csv`]);
//
//     console.log(JSON.parse(res.stdout)[0]['CAGR_Avg_Spnd_Per_Dsg_Unt_15_19'])
//
//     t.end();
// });

