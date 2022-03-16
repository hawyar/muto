## muto

> Run ad-hoc SQL queries on CSV data

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

![Tests](https://github.com/hawyar/muto/actions/workflows/test.yml/badge.svg)

## Usage

**Note**: This package is not on npm yet. 

1. Clone the repo and build it

```bash
git clone https://github.com/hawyar/muto.git
```

2. Install dependencies and build muto
```bash
cd muto && npm i && npm run build
```

3. Install muto iin your project
```bash
npm i ./path_to_muto
```

Then you can use it as
```javascript
import { createCatalog, createWorkflow } from "muto"

const catalog = await createCatalog({
  source: path.join(dirname, 'example', 'albums.csv'),
  name: 'albums',
  output: 'json',
  destination: path.join(process.cwd(), 'beep.json')
  })
  
  const workflow = createWorkflow('my_etl')
  workflow.add(catalog)

  await workflow.query('SELECT album_title, num_of_sales FROM albums')
```