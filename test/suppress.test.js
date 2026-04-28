const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isFuncCall,
  isHashNode,
  toComment,
  walkAST,
} = require("../lib/suppress");

test("test_ハッシュを表すノードを判定できる", () => {
  // Arrange
  const hashNode = { type: 'Fn::(Hash: "#")' };
  const proseNode = { type: "Str", value: "本文" };

  // Act
  const hashResult = isHashNode(hashNode);
  const proseResult = isHashNode(proseNode);
  const missingResult = isHashNode(undefined);

  // Assert
  assert.equal(hashResult, true);
  assert.equal(proseResult, false);
  assert.equal(missingResult, false);
});

test("test_指定したTypst関数呼び出しを判定できる", () => {
  // Arrange
  const node = {
    type: "Marked::FuncCall",
    children: [{ type: 'Fn::(Ident: "footnote")' }],
  };

  // Act
  const matched = isFuncCall(node, ["footnote"]);
  const unmatched = isFuncCall(node, ["bibliography"]);

  // Assert
  assert.equal(matched, true);
  assert.equal(unmatched, false);
});

test("test_位置情報を保ったCommentノードを作れる", () => {
  // Arrange
  const loc = { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } };
  const node = {
    type: "Marked::Label",
    raw: "@fig:test",
    range: [0, 9],
    loc,
  };

  // Act
  const comment = toComment(node);

  // Assert
  assert.deepEqual(comment, {
    type: "Comment",
    value: "@fig:test",
    raw: "@fig:test",
    range: [0, 9],
    loc,
  });
});

test("test_脚注呼び出しと直前のハッシュをCommentノードに変換する", () => {
  // Arrange
  const ast = {
    type: "Document",
    children: [
      { type: 'Fn::(Hash: "#")', raw: "#" },
      {
        type: "Marked::FuncCall",
        raw: "#footnote[脚注]",
        children: [{ type: 'Fn::(Ident: "footnote")' }],
      },
      { type: "Str", value: "本文" },
    ],
  };

  // Act
  walkAST(ast);

  // Assert
  assert.equal(ast.children[0].type, "Comment");
  assert.equal(ast.children[1].type, "Comment");
  assert.deepEqual(ast.children[2], { type: "Str", value: "本文" });
});

test("test_命令と直前のハッシュをCommentノードに変換する", () => {
  // Arrange
  const ast = {
    type: "Document",
    children: [
      { type: "Kw::Hash", raw: "#" },
      { type: "Marked::ModuleImport", raw: '#import "template.typ": *' },
      { type: "Str", value: "本文" },
    ],
  };

  // Act
  walkAST(ast);

  // Assert
  assert.equal(ast.children[0].type, "Comment");
  assert.equal(ast.children[1].type, "Comment");
  assert.deepEqual(ast.children[2], { type: "Str", value: "本文" });
});

test("test_入れ子のラベルをCommentノードに変換する", () => {
  // Arrange
  const ast = {
    type: "Document",
    children: [
      {
        type: "Paragraph",
        children: [
          { type: "Str", value: "図を示す。" },
          { type: "Marked::Label", raw: "@fig:overview" },
        ],
      },
    ],
  };

  // Act
  walkAST(ast);

  // Assert
  assert.deepEqual(ast.children[0].children[0], {
    type: "Str",
    value: "図を示す。",
  });
  assert.equal(ast.children[0].children[1].type, "Comment");
});
