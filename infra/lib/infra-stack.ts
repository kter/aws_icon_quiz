import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const dynamoTable = new dynamodb.Table(this, "dynamodb", {
      partitionKey: {
        name: "serviceNameHash",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey:{ 
        name: "serviceName",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const getItemLambda = new lambda.Function(this, "getQuestionFunction", {
      code: new lambda.AssetCode("lib/lambda"),
      handler: "get_question.handler",
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: "serviceNameHash",
      },
    });

    // dynamodb読み取り権限をLambdaに付与
    dynamoTable.grantReadData(getItemLambda);

    const api = new RestApi(this, "itemsApi", {
      restApiName: "Items Service",
    });
  }
}
