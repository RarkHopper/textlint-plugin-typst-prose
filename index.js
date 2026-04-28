/**
 * textlint-plugin-typst のラッパープラグイン。
 *
 * textlint-plugin-typst が生成する AST を後処理し、
 * 散文でないノードを Comment ノードに変換する。
 */

const originalPlugin = require("textlint-plugin-typst");
const { walkAST } = require("./lib/suppress");

const OriginalProcessor =
  originalPlugin.Processor || originalPlugin.default?.Processor || originalPlugin;

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
