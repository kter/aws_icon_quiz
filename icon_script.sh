#!/bin/bash

# 使い方
# 1. Icon Setをダウンロード
# 2. mkdir /tmp/test
# 3. find . -name "*_64.png"  -exec cp {} /tmp/test/ \;
# 4. open /tmp/testしてサービス名だけに一括名前変換する（拡張子も取り除く
# 5. mkdir /tmp/test3
# 6. このスクリプトを実行
# 7. 成果物にこのスクリプトも含まれるのでそれは削除する

for file in *
do
  cp -v "$file" /tmp/test3/`echo -n  "$file" | md5`.png
done
