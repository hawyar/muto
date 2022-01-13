import tap from "tap"
import fs from "fs/promises"
import path from "path"
import {createWorkflow} from "../dist/muto.js"
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

tap.test("init workflow", async (t) => {
    const workflow = createWorkflow("my_etl");

    // await workflow.add(process.cwd() + "/tests/fixtures/" + "/albums.csv", {
    //     delimiter: ",",
    // })


    workflow.queue.push({
        file: process.cwd() + "/tests/fixtures/" + "/sample.csv",
        options: {
            delimiter: ",",
        }
    });

    t.end();
});

