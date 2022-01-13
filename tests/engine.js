import tap from "tap"
import fs from "fs/promises"
import path from "path"
import {createWorkflow} from "../dist/muto.js"

tap.test("init with queue", async (t) => {
    const workflow = createWorkflow("my_etl");
    const files = await fs.readdir("./tests/fixtures/");

    for (const file of files) {
        if (!file.endsWith(".csv")) {
            return;
        }
        const d = await workflow.add(process.cwd() + "/tests/fixtures/" + file, {
            delimiter: ",",
        })
        console.log("added file " + d.source);
        console.log(workflow)

    }
    //
    // const d = await workflow.add(process.cwd() + "/tests/fixtures/albums.csv", {
    //     delimiter: ",",
    // })

    t.end();
});
