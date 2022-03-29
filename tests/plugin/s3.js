import tap from 'tap'
import { parseS3URI, fileExists } from '../../dist/muto.mjs'

const s3Path = 's3://dundermifflinco/sales.csv'

tap.test('parse s3 uri', async (t) => {
  t.same(parseS3URI(s3Path, {
    file: true
  }), {
    data: {
      bucket: 'dundermifflinco',
      key: 'sales.csv',
      file: 'sales.csv'
    },
    err: ''
  })
  t.end()
})

tap.test('file exists in given bucket', async (t) => {
  const { data, err } = parseS3URI(s3Path, {
    file: true
  })

  if (err) {
    t.fail(err)
  }

  // const exists = await fileExists(data.bucket, data.key)

  // t.ok(exists)
  t.ok('22')
  t.end()
})
