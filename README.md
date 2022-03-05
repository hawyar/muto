## muto

> Run ad-hoc SQL queries on CSV and JSON data

![Tests](https://github.com/hawyar/muto/actions/workflows/test.yml/badge.svg)

### usage

Install package
```bash
npm i muto
```

```javascript
const { createWorkflow } = require("muto")

const source = path.join(dirname, 'example', 'albums.csv')

  const workflow = await createWorkflow("path/to/file.csv", {
    name: 'albums',
    output: 'json',
    destination: './beep.json'
  })
  
  workflow.query(`select distinct arrivale_dd, beep as boop from ${catalog.name} where year_of_pub < 2010`)

  t.ok(catalog)
```