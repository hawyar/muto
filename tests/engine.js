import tap from "tap"
import path from "path"
import {createDataset, createWorkflow} from "../dist/muto.js";

tap.test("new dataset, columns and preview", async (t) => {
    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = createDataset(source, {
        delimiter: ",",
    })

    await dataset.preview(10)
    const cols = await dataset.columns()

    const wanted = `id,artist_id,album_title,genre,year_of_pub,num_of_tracks,num_of_sales,rolling_stone_critic,mtv_critic,music_maniac_critic`

    t.same(dataset.source, source)
    t.same(cols, wanted.split(","))
});

tap.test("new dataset, columns and stream preview", async (t) => {
    const source = path.join(process.cwd(), "tests", "fixtures", "albums.csv")

    const dataset = createDataset(source, {
        delimiter: ",",
    })

    const streamTo = path.join(process.cwd(), "tests", "fixtures", "preview-streamed.csv")
    await dataset.preview(100, streamTo)
    const cols = await dataset.columns()

    const wanted = `id,artist_id,album_title,genre,year_of_pub,num_of_tracks,num_of_sales,rolling_stone_critic,mtv_critic,music_maniac_critic`

    t.same(dataset.source, source)
    t.same(cols, wanted.split(","))
});


tap.test("count rows", async (t) => {

    const wanted = 10691
    const source = path.join(process.cwd(), "tests", "fixtures", "543.csv")

    const dataset = createDataset(source, {
        delimiter: ",",
    })

    const rows = await dataset.rowsCount()
    t.same(rows, wanted)
});


tap.test("new workflow", async (t) => {
    const work = createWorkflow("my_etl");
    t.same(work.name, "my_etl")
    t.end();
});

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

