const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";
const CHOICES_NUM = process.env.CHOICES_NUM || "4";
const QUESTIONS_NUM = process.env.QUESTIONS_NUM || "20";

export const handler = async (event: any = {}): Promise<any> => {
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    const response = await db.scan(params).promise();
    console.log(JSON.stringify(response));
    return { statusCode: 200, body: JSON.stringify(response.Item) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
