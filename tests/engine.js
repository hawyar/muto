const tap = require("tap");
const fs = require("fs/promises");
const path = require("path");
const {createWorkflow} = require("../dist/index");

tap.test("init workflow", async (t) => {
    const workflow = createWorkflow("my_etl");
    const files = await fs.readdir(path.join(__dirname, "/fixtures"));

    for (const file of files) {
        if (!file.endsWith(".csv")) {
            return;
        }
        const d = await workflow.add(__dirname + "/fixtures/" + file, {
            delimiter: ",",
        })
        console.log("added file " + d.source);
    }
    console.log("hey")
    t.end();
});

