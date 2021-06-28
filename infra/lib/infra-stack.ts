import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as iam from "@aws-cdk/aws-iam";
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import { Seeder } from 'aws-cdk-dynamodb-seeder';
import * as route53 from '@aws-cdk/aws-route53'
import * as route53Targets from '@aws-cdk/aws-route53-targets'
import * as certManager from '@aws-cdk/aws-certificatemanager'

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
      readCapacity: 1,
      writeCapacity: 1
    });

    new Seeder(this, "dynamoTableSeeder", {
        table: dynamoTable,
        setup: require("./dynamoTableSeederUp.json"),
        teardown: require("./dynamoTableSeederTearDown.json"),
        refreshOnUpdate: true  // runs setup and teardown on every update, default false
    });

    const getQuestionLambda = new lambda.Function(this, "getQuestionFunction", {
      code: new lambda.AssetCode("lib/lambda"),
      handler: "get_question.handler",
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        CHOICES_NUM: "4",
        QUESTIONS_NUM: "20",
      },
    });

    // dynamodb読み取り権限をLambdaに付与
    dynamoTable.grantReadData(getQuestionLambda);

    const api = new apigateway.RestApi(this, "AWSQuizeApi", {
      restApiName: "AWS Quize Service",
    });

    const questions = api.root.addResource("questions");
    const getItemIntegration = new apigateway.LambdaIntegration(getQuestionLambda);
    questions.addMethod("GET", getItemIntegration);
    addCorsOptions(questions);

    const bucket = new s3.Bucket(this, 'Bucket', {
      websiteErrorDocument: 'index.html',
      websiteIndexDocument: 'index.html',
    });

    // Create OriginAccessIdentity
    const oai = new cloudfront.OriginAccessIdentity(this, "my-oai");

    // Create Policy and attach to bucket
    const myBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject"],
      principals: [
        new iam.CanonicalUserPrincipal(
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
      resources: [bucket.bucketArn + "/*"],
    });

    bucket.addToResourcePolicy(myBucketPolicy);

    // 使用する Route 53 ホストゾーンの定義
    const rootDomain = 'tomohiko.io'
    const deployDomain = `aws-icon-quiz.${rootDomain}`

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: `${rootDomain}.`,
    })

    // TLS証明書を作る
    const cert = new certManager.DnsValidatedCertificate(this, 'Certificate', {
      domainName: rootDomain,
      subjectAlternativeNames: [`*.${rootDomain}`],
      hostedZone,
      region: 'us-east-1',
    })

    // Create CloudFront WebDistribution
    const websiteDistribution = new cloudfront.CloudFrontWebDistribution(this, "WebsiteDistribution", {
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(cert, {
        aliases: [deployDomain],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1,
        sslMethod: cloudfront.SSLMethod.SNI,
      }),
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: oai,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responsePagePath: "/index.html",
          responseCode: 200,
          errorCachingMinTtl: 0,
        },
        {
          errorCode: 404,
          responsePagePath: "/index.html",
          responseCode: 200,
          errorCachingMinTtl: 0,
        },
      ],
      defaultRootObject: "index.html"
    });
    // Route 53 でレコードを追加
    const propsForRoute53Records = {
      zone: hostedZone,
      recordName: deployDomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(websiteDistribution)
      ),
    }

    new route53.ARecord(this, 'AliasRecord', propsForRoute53Records)

    new s3deploy.BucketDeployment(this, 'WebsiteDeploy', {
      sources: [
        s3deploy.Source.asset('./assets'),
      ],
      destinationBucket: bucket,
      distribution: websiteDistribution,
      distributionPaths: ['/*'],
    });
  }
}

export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Credentials":
                  "'false'",
              "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Credentials": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
  );
}
