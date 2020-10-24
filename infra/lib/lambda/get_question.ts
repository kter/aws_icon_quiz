const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";
const CHOICES_NUM = process.env.CHOICES_NUM || "4";
const QUESTIONS_NUM = process.env.QUESTIONS_NUM || "20";
interface quizeItem {
  [key: string]: string;
};

export const handler = async (event: any = {}): Promise<any> => {
    const params = {
        TableName: TABLE_NAME,
    };
    let response_array: Array<Object> = [];
    interface quizeItem {
      [key: string]: string;
    };

    try {
        const db = await dynamodb.scan(params).promise();
        for (let i = 0; i < parseInt(QUESTIONS_NUM); i++) {
          // 全サービスリスト
          let shuffled_items: Array<quizeItem> = shuffle(db.Items);
          // 質問作成 (シャッフルした配列の0番目)
          let question_item: quizeItem = shuffled_items[0];
          // 回答リスト作成 (シャッフルした配列の1番目からCHOICES_NUM番目)
          let answer_items: Array<string> = [];
          for (let j = 1; j < parseInt(CHOICES_NUM); j++) {
            // 不正解3問
            answer_items.push(shuffled_items[j]['serviceName']);
          }
          // 正解を仕込む
          answer_items.push(question_item['ServiceName']);
          // 正解と不正解をシャッフル
          answer_items = shuffle(answer_items);
          response_array.push(
            {
              'question': question_item['serviceNameHash'],
              'answer': answer_items,
              'correct': question_item['serviceName']
            }
          );
        }

        return { statusCode: 200, body: JSON.stringify(response_array) };
    } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
    }
};

function shuffle(items: Array<any>): Array<any> {
  for (let i = items.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    let tmp = items[i];
    items[i] = items[r];
    items[r] = tmp;
  }
  return items;
};

function pickAnswers(items: Array<string>): Array<string> {
  let answers: Array<string> = [];
  for (let i = 0; i < parseInt(CHOICES_NUM); i++) {
    answers[i] = items[i];
  }
  return answers;
};
