const SUPPRESSED_FUNCS = ["footnote", "bibliography"];
const SUPPRESSED_DIRECTIVES = [
  "Marked::ShowRule",
  "Marked::SetRule",
  "Marked::LetBinding",
  "Marked::ModuleImport",
];

/**
 * textlint-plugin-typst が返す AST ノード。
 *
 * @typedef {object} TypstNode
 * @property {string} type ノード種別。
 * @property {string} [value] ノードが持つ文字列。
 * @property {string} [raw] 元の Typst ソース文字列。
 * @property {TypstNode[]} [children] 子ノード。
 * @property {[number, number]} [range] ソース上の開始位置と終了位置。
 * @property {object} [loc] ソース上の行番号と列番号。
 */

/**
 * @typedef {TypstNode | null | undefined} MaybeTypstNode
 */

/**
 * textlint の処理対象から外すため、元の位置情報を保った Comment ノードを作る。
 *
 * @param {TypstNode} node 変換元の AST ノード。
 * @param {string} [value] Comment ノードへ入れる文字列。省略時は node.raw を使う。
 * @returns {TypstNode} Comment ノード。
 */
function toComment(node, value) {
  return {
    type: "Comment",
    value: value ?? node.raw ?? "",
    raw: node.raw ?? "",
    range: node.range,
    loc: node.loc,
  };
}

/**
 * Typst の `#` を表すノードかどうかを判定する。
 *
 * @param {MaybeTypstNode} node AST ノード。
 * @returns {boolean} `#` を表すノードなら true。
 */
function isHashNode(node) {
  return node
    ? node.type === 'Fn::(Hash: "#")' ||
        node.type === "Fn::(Hash: &quot;#&quot;)" ||
        node.type === "Kw::Hash"
    : false;
}

/**
 * 指定した関数名の Typst 関数呼び出しかどうかを判定する。
 *
 * @param {MaybeTypstNode} node AST ノード。
 * @param {string[]} names 抑制対象の関数名。
 * @returns {boolean} 指定した関数呼び出しなら true。
 */
function isFuncCall(node, names) {
  if (!node || node.type !== "Marked::FuncCall") return false;
  if (!Array.isArray(node.children)) return false;

  return node.children.some((child) => {
    return names.some((name) => {
      return (
        child.type === `Fn::(Ident: "${name}")` ||
        (child.type && child.type.includes("Ident") && child.value === name)
      );
    });
  });
}

const RULES = [
  {
    match: (node) => node.type === "Marked::Label",
  },
  {
    match: (node) => isFuncCall(node, SUPPRESSED_FUNCS),
    shouldSuppressPrev: isHashNode,
  },
  {
    match: (node) => SUPPRESSED_DIRECTIVES.includes(node.type),
    shouldSuppressPrev: isHashNode,
  },
];

/**
 * 子ノード配列を走査し、本文校正から外すノードを Comment ノードへ置き換える。
 *
 * @param {TypstNode[]} children AST の children 配列。対象ノードはこの配列上で置き換える。
 * @returns {void}
 */
function applySuppression(children) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    const matched = RULES.some((rule) => {
      if (!rule.match(child)) return false;

      if (i > 0 && rule.shouldSuppressPrev?.(children[i - 1])) {
        children[i - 1] = toComment(children[i - 1]);
      }
      children[i] = toComment(child);
      return true;
    });

    if (!matched) {
      walkAST(child);
    }
  }
}

/**
 * AST を再帰的に走査し、本文校正から外す Typst ノードを Comment ノードへ置き換える。
 *
 * @param {MaybeTypstNode} node AST ノード。
 * @returns {void}
 */
function walkAST(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node.children)) {
    applySuppression(node.children);
  }
}

module.exports = {
  applySuppression,
  isFuncCall,
  isHashNode,
  toComment,
  walkAST,
};
