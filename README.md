```js
import { query } from "muto";

await query('select * from "s3://superbucket/stats.csv" to "./result.json"')
```

or use the CLI

```bash
muto query 'select * from "s3://superbucket/stats.csv" to "./result.json"'
```
