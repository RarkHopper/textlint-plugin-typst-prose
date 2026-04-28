/**
 * textlint-plugin-typst のラッパープラグイン。
 *
 * textlint-plugin-typst が生成する AST を後処理し、
 * 散文でないノードを Comment ノードに変換する。
 */

const originalPlugin = require("textlint-plugin-typst");

const OriginalProcessor =
  originalPlugin.Processor || originalPlugin.default?.Processor || originalPlugin;

const SUPPRESSED_FUNCS = ["footnote", "bibliography"];
const SUPPRESSED_DIRECTIVES = [
  "Marked::ShowRule",
  "Marked::SetRule",
  "Marked::LetBinding",
  "Marked::ModuleImport",
];

function toComment(node, value) {
  return {
    type: "Comment",
    value: value ?? node.raw ?? "",
    raw: node.raw ?? "",
    range: node.range,
    loc: node.loc,
  };
}

function isHashNode(node) {
  if (!node) return false;
  return (
    node.type === 'Fn::(Hash: "#")' ||
    node.type === "Fn::(Hash: &quot;#&quot;)" ||
    node.type === "Kw::Hash"
  );
}

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

function walkAST(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node.children)) {
    applySuppression(node.children);
  }
}

class PatchedTypstProcessor {
  constructor(config) {
    this._original = new OriginalProcessor(config);
  }

  availableExtensions() {
    return this._original.availableExtensions();
  }

  processor(ext) {
    const originalProcessor = this._original.processor(ext);
    return {
      async preProcess(text, filePath) {
        const ast = await originalProcessor.preProcess(text, filePath);
        walkAST(ast);
        return ast;
      },
      postProcess(messages, filePath) {
        return originalProcessor.postProcess(messages, filePath);
      },
    };
  }
}

module.exports = { Processor: PatchedTypstProcessor };

