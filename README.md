# muto

> Run ad-hoc SQL query on CSV and JSON

![Tests](https://github.com/hawyar/muto/actions/workflows/test.yml/badge.svg)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Usage

```bash

npm i muto
```

```javascript
import { query } from "muto";

await query("select * from albums", {
  source: "/path/to/file.csv",
  destination: "./result.json",
});
```

or use the CLI

```
muto query "SELECT * FROM sales" -s ./path/to/sales.csv -d path/to/result.json
```
