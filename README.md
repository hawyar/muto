## muto

> Run ad-hoc SQL queries on CSV JSON

![Tests](https://github.com/hawyar/muto/actions/workflows/test.yml/badge.svg)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

**Note**: not uploaded to the the npm registry yet

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

or install it globally

```bash
npm i muto -g
```

then use the CLI

```
muto query "SELECT * FROM sales" -s ./path/to/sales.csv -d path/to/result.json
```
