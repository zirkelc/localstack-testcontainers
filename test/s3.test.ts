import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
  waitUntilBucketExists,
} from "@aws-sdk/client-s3";
import { LocalstackContainer } from "@testcontainers/localstack";
import { beforeAll, expect, test } from "vitest";

const localstack = await new LocalstackContainer("localstack/localstack:3").start();

const region = "eu-central-1";
const bucket = "middy-store-s3";

const config: S3ClientConfig = {
  region,
  forcePathStyle: true, // If you want to use virtual host addressing of buckets, you can remove `forcePathStyle: true`.
  endpoint: localstack.getConnectionUri(),
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
};

const client = new S3Client(config);

beforeAll(async () => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await waitUntilBucketExists({ client: client, maxWaitTime: 300 }, { Bucket: bucket });
  }
});

test("put object", async () => {
  const key = "key";
  const body = "body";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
    }),
  );

  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  expect(result.Body).toBeDefined();
  expect(await result.Body?.transformToString()).toEqual(body);
});
