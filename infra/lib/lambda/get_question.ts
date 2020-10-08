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
        console.log(db.Items[0]);
        // const question_items: Array<string> = pickAnswers(shuffled_items);
        // const answer_items: Array<string> = shuffled_items.slice(1);
        for (let i = 0; i < parseInt(QUESTIONS_NUM); i++) {
          // 全サービスリスト
          let shuffled_items: Array<quizeItem> = shuffle(db.Items);
          // 質問作成 (シャッフルした配列の0番目)
          let question_item: quizeItem = shuffled_items[0];
          // 回答リスト作成 (シャッフルした配列の1番目からCHOICES_NUM番目)
          let answer_items: Array<string> = [];
          for (let j = 1; i < parseInt(CHOICES_NUM); j++) {
            answer_items.push(shuffled_items[j]['serviceName']);
          }
          response_array.push(
            {
              'question': question_item['serviceNameHash'],
              'answer': answer_items,
            }
          );
        }


        
        return { statusCode: 200, body: JSON.stringify(db.Items) };
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
