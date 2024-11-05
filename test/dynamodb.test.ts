import {
	CreateTableCommand,
	DynamoDBClient,
	type DynamoDBClientConfig,
	GetItemCommand,
	PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { LocalstackContainer } from "@testcontainers/localstack";
import { beforeAll, expect, test } from "vitest";

const localstack = await new LocalstackContainer(
	"localstack/localstack:3",
).start();

const region = "eu-west-1";
const table = "test";

const config: DynamoDBClientConfig = {
	region,
	endpoint: localstack.getConnectionUri(),
	credentials: {
		accessKeyId: "test",
		secretAccessKey: "test",
	},
};
const client = new DynamoDBClient(config);

beforeAll(async () => {
	await client.send(
		new CreateTableCommand({
			TableName: "test",
			AttributeDefinitions: [
				{ AttributeName: "pk", AttributeType: "S" },
				{ AttributeName: "sk", AttributeType: "S" },
				{ AttributeName: "gsi1pk", AttributeType: "S" },
				{ AttributeName: "gsi1sk", AttributeType: "S" },
			],
			KeySchema: [
				{ AttributeName: "pk", KeyType: "HASH" },
				{ AttributeName: "sk", KeyType: "RANGE" },
			],
			BillingMode: "PAY_PER_REQUEST",
			GlobalSecondaryIndexes: [
				{
					IndexName: "gsi1pk-gsi1sk-index",
					KeySchema: [
						{ AttributeName: "gsi1pk", KeyType: "HASH" },
						{ AttributeName: "gsi1sk", KeyType: "RANGE" },
					],
					Projection: { ProjectionType: "ALL" },
				},
			],
		}),
	);
});

test("put item", async () => {
	const item = {
		pk: "pk",
		sk: "sk",
		gsi1pk: "gsi1pk",
		gsi1sk: "gsi1sk",
	};

	await client.send(
		new PutItemCommand({
			TableName: table,
			Item: marshall(item),
		}),
	);

	const result = await client.send(
		new GetItemCommand({
			TableName: table,
			Key: marshall({ pk: "pk", sk: "sk" }),
		}),
	);

	expect(result.Item).toBeDefined();
	expect(unmarshall(result.Item!)).toEqual(item);
});
