## muto

> Run ad-hoc SQL queries on CSV data

![Tests](https://github.com/hawyar/muto/actions/workflows/test.yml/badge.svg)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Usage

```bash
npm i muto
```

```javascript
import { query } from "muto";

await query("select * from albums", {
  name: "albums",
  input: "csv",
  source: "/path/to/file.csv",
  output: "json",
  destination: "./result.json",
});
```

or install it globally

```bash
npm i muto -g
```

then use the CLI

```
muto query "SELECT * FROM albums" -s ./path/to/albums.csv -d s3://my_bucket/output.json
```
