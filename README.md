# textlint-plugin-typst-prose

`textlint-plugin-typst` が返す AST から、本文校正の対象にしない Typst の命令を `Comment` ノードへ変換する薄いラッパーである。

`#import`、`#show`、`#set`、ラベル、脚注、図表描画用の関数呼び出しを sentence-length などの対象から外す。

