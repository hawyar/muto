import tap from "tap"
import fs from "fs/promises"
import path from "path"
import {createWorkflow} from "../dist/muto.js"


tap.test("init workflow", async (t) => {
    const work = createWorkflow("my_etl");
    await work.add(process.cwd() + "/tests/fixtures/" + "albums.csv", {
        delimiter: ",",
        headers: true,
        transform: (row) => {
            return {
                id: row.id,
                title: row.title,
                artist: row.artist,
                year: row.year
            }
        },
        columns: ['id', 'title', 'artist', 'year']

    })

    t.end();
});

// tap.test("init with queue", async (t) => {
//     const workflow = createWorkflow("my_etl");
//     const files = await fs.readdir("./tests/fixtures/");
//
//     for (const file of files) {
//         if (!file.endsWith(".csv")) {
//             return;
//         }
//         await workflow.add(process.cwd() + "/tests/fixtures/" + file, {
//             delimiter: ",",
//         });
//     }
//
//
//     //
//     // const d = await workflow.add(process.cwd() + "/tests/fixtures/albums.csv", {
//     //     delimiter: ",",
//     // })
//
//
//     t.end();
// });


