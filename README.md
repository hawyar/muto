## muto

> Run ad-hoc SQL queries on CSV and JSON data

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

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
  output: 'json'
})

workflow.query(`select * from albums`)
```