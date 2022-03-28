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

or install it globally and use the CLI

```bash
npm i muto -g
```

then use it like

```
muto query "SELECT * FROM albums" --source ./path/to/albums.csv -destination s3://my_bucket/output.json
```
