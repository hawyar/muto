## muto

> Run ad-hoc SQL queries on CSV and JSON data

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

![Tests](https://github.com/hawyar/muto/actions/workflows/test.yml/badge.svg)

## Usage

**Note**: This package is not on npm yet. For now clone the repo and build it.

```bash
git clone https://github.com/hawyar/muto.git
```

Install dependencies and build muto
```bash
cd muto && npm i && npm run build
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