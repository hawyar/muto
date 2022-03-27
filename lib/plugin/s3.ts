import { fromIni } from '@aws-sdk/credential-providers'
import {
  S3Client,
  S3ClientConfig
} from '@aws-sdk/client-s3'

export const credentials = (profile: string): any => {
  return fromIni({
    profile: profile,
    mfaCodeProvider: async (mfaSerial) => {
      return mfaSerial
    }
  })
}

export function s3Client (config: S3ClientConfig): S3Client {
  return s3Client({
    credentials: credentials('default'),
    region: 'us-east-2'
  })
}
// async fileExists (key: string): Promise<boolean> {
//   const client = s3Client({
//     credentials: credentials('default'),
//     region: 'us-east-2'
//   })

//   const command = new HeadObjectCommand({
//     Bucket: this.bucket,
//     Key: key
//   })

//   const result = await client.send(command)

//   console.log(result)

//   if (result.$metadata.httpStatusCode !== undefined && result.$metadata.httpStatusCode !== 200) {
//     return false
//   }

//   return true
// }

export function parseS3Uri (
  uri: string,
  options: {
    file: boolean
  }
): {
    data: {
      bucket: string
      key: string
      file: string
    }
    err: string
  } {
  const opt = {
    file: options.file ? options.file : false
  }

  if (!uri.startsWith('s3://') || uri.split(':/')[0] !== 's3') {
    throw new Error(`invalid-s3-uri: ${uri}`)
  }

  let err = ''
  const result = {
    bucket: '',
    key: '',
    file: ''
  }

  const src = uri.split(':/')[1]
  const [bucket, ...keys] = src.split('/').splice(1)

  result.bucket = bucket
  result.key = keys.join('/')

  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      const last = k.split('.').length
      if (opt.file && last === 1) { err = `uri should be a given, given: ${uri}` }

      if (!opt.file && last === 1) return

      if (!opt.file && last > 1) {
        err = `Invalid S3 uri, ${uri} should not end with a file name`
        return
      }

      if (!opt.file && k.split('.')[1] !== '' && last > 1) { err = `${uri} should not be a file endpoint: ${k}` }

      if (last > 1 && k.split('.')[1] !== '') result.file = k
    }
  })
  return {
    data: result,
    err: err
  }
}
