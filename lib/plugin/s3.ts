import { fromIni } from '@aws-sdk/credential-providers'
import {
  S3Client,
  S3ClientConfig,
  HeadObjectCommand
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
  return new S3Client(config)
}

export class S3 {
  client: S3Client
  bucket: string

  constructor (S3Client: S3Client, bucket: string) {
    this.client = S3Client
    this.bucket = bucket
  }

  // check if a file exists in the bucket
  async fileExists (key: string): Promise<boolean> {
    const client = s3Client({
      credentials: credentials('default'),
      region: 'us-east-2'
    })

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    })

    const result = await client.send(command)

    console.log(result)

    if (result.$metadata.httpStatusCode !== undefined && result.$metadata.httpStatusCode !== 200) {
      return false
    }

    return true
  }

  parseS3Uri (
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
}

// async function uploadToS3 (): Promise<string> {
//   const source = this.options.source
//   const destination = this.options.destination

//   if (source === '') {
//     throw new Error('source not definded')
//   }

//   if (destination === '') {
//     throw new Error('destination not definded')
//   }

//   const fStream = fs.createReadStream(source)

//   if (!fStream.readable) {
//     throw new Error(
//       'failed-to-read-source: Make sure the provided file is readable'
//     )
//   }

//   const size = await this.fileSize()

//   if (size > 100 * 1024 * 1024) {
//     // TODO: init multipart upload
//     console.warn(`file size ${size} is larger`)
//   }

//   const { data: uri, err } = parseS3Uri(destination, {
//     file: true
//   })

//   if (err.toString().startsWith('invalid-s3-uri')) {
//     throw new Error(`failed-to-parse-s3-uri: ${err}`)
//   }

//   if (uri.file === '') {
//     uri.file = path.basename(source)
//     console.warn('Destination filename not provided. Using source source basename' + uri.file)
//   }

//   console.log(`uploading ${source} to ${destination}`)

//   const s3 = s3Client({
//     region: 'us-east-2'
//   })

//   const res = await s3
//     .send(
//       new PutObjectCommand({
//         Bucket: uri.bucket,
//         Key: uri.key + uri.file,
//         Body: fStream
//       })
//     )
//     .catch((err) => {
//       /* eslint-disable @typescript-eslint/restrict-template-expressions */
//       throw new Error(`failed-upload-s3: Error while uploading to S3: ${err}`)
//     })
//     .finally(() => {
//       fStream.close()
//     })

//   if (res.$metadata.httpStatusCode !== undefined && res.$metadata.httpStatusCode !== 200) {
//     throw new Error(`failed-upload-s3: Error while uploading to S3: ${res.$metadata.httpStatusCode}`)
//   }

//   if (res.$metadata.requestId === undefined) {
//     throw new Error('failed-upload-s3')
//   }

//   return res.$metadata.requestId
// }

//   async initMultipartUpload (bucket: string, key: string): Promise<string> {
//     const client = s3Client({
//       credentials: credentials('default'),
//       region: 'us-east-2'
//     })

//     const command = new CreateMultipartUploadCommand({
//       Bucket: bucket,
//       ContentEncoding: 'utf8',
//       ContentType: 'text/csv',
//       Key: key
//     })

//     const result = await client.send(command)

//     if (result.UploadId === undefined || result.$metadata.httpStatusCode !== 200) {
//       throw new Error('failed-multipart-upload')
//     }

//     if (result.UploadId === undefined) {
//       throw new Error('failed-multipart-upload')
//     }

//     return result.UploadId
//   }
