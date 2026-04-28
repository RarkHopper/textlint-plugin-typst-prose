# textlint-plugin-typst-prose

A prose-oriented wrapper for textlint-plugin-typst.

`textlint-plugin-typst-prose` は、`textlint-plugin-typst` が生成した AST を後処理し、本文校正の対象にしたくない Typst の命令を `Comment` ノードへ変換する textlint プラグインです。

## 目的

Typst 文書では、本文の中に `#set`、`#show`、`#import`、ラベル、脚注、参考文献、図表用の関数呼び出しなどが混在します。

これらは Typst 文書としては正しい記述ですが、`sentence-length` などの本文校正ルールから見ると、本文ではない文字列まで校正対象になることがあります。

このプラグインは、Typst 文書全体を解析するためのものではなく、Typst 文書を textlint で本文校正しやすくするための薄いラッパーです。

## インストール

```sh
npm install --save-dev textlint textlint-plugin-typst-prose
```

## 使い方

`.textlintrc` に追加します。

```json
{
  "plugins": {
    "typst-prose": true
  },
  "rules": {
    "sentence-length": true
  }
}
```

## 変換されるノード

現在、次の Typst 要素を `Comment` ノードへ変換します。

- ラベル
- `#footnote(...)`
- `#bibliography(...)`
- `#show`
- `#set`
- `#let`
- `#import`

## 変換例

たとえば、次の Typst 文書があるとします。

```typst
#import "@preview/tablex:0.0.8": tablex
#set text(lang: "ja")

これは本文です。#footnote[脚注の本文です。]

@fig:overview
```

このプラグインは Typst のソースコードを変更しません。textlint が参照する AST 上で、本文ではないノードだけを `Comment` ノードへ置き換えます。

従来の `textlint-plugin-typst` の AST をそのまま使うと、本文校正ルールが Typst の命令や脚注まで本文として扱い、次のような指摘が出ることがあります。

```text
error  Line 1: 文が長すぎます。
  #import "@preview/tablex:0.0.8": tablex

error  Line 4: 文が長すぎます。
  #footnote[脚注の本文です。]
```

このプラグインを通すと、textlint が参照する AST は次のように変換されます。

```js
[
  { type: "Comment", raw: "#" },
  { type: "Comment", raw: '#import "@preview/tablex:0.0.8": tablex' },
  { type: "Comment", raw: "#" },
  { type: "Comment", raw: '#set text(lang: "ja")' },
  { type: "Str", value: "これは本文です。" },
  { type: "Comment", raw: "#" },
  { type: "Comment", raw: "#footnote[脚注の本文です。]" },
  { type: "Comment", raw: "@fig:overview" }
]
```

この結果、`sentence-length` などの本文校正ルールは `これは本文です。` のような本文だけを対象にしやすくなります。

## なぜ Comment ノードにするのか

textlint の多くの本文校正ルールは、`Comment` ノードを本文として扱いません。

このプラグインは Typst のソースコードを書き換えません。`textlint-plugin-typst` が生成した AST だけを後処理します。

## 注意

このプラグインは Typst の構文解析器ではありません。Typst の AST 生成は `textlint-plugin-typst` に委譲しています。

また、Typst のユーザー定義関数をすべて自動で判定するものではありません。
