/**
 * 项目代码约束：JSX className 中禁止使用 Tailwind emerald/green/teal 色阶。
 * 仅做字符串片段匹配，不分析 tailwind 依赖或颜色表。
 *
 * @type {import('eslint').ESLint.Plugin}
 */
const FORBIDDEN = /\b(emerald|green|teal)-/;

const plugin = {
  meta: { name: 'clearstrata-palette', version: '1.0.0' },
  rules: {
    'no-tailwind-green-family': {
      meta: {
        type: 'problem',
        docs: {
          description:
            '禁止在 className 中使用 emerald-/green-/teal- Tailwind 工具类；请改用 clearstrata 设计系统 token。',
        },
        messages: {
          forbidden:
            '请使用 clearstrata 设计系统颜色，而不是直接使用 emerald/green/teal Tailwind 色阶。',
        },
        schema: [],
      },
      create(context) {
        /**
         * @param {import('estree').Expression | import('estree').JSXEmptyExpression | null | undefined} expr
         * @param {string[]} out
         */
        function collectClassFragments(expr, out) {
          if (!expr || expr.type === 'JSXEmptyExpression') return;
          switch (expr.type) {
            case 'Literal':
              if (typeof expr.value === 'string') out.push(expr.value);
              return;
            case 'TemplateLiteral':
              for (const q of expr.quasis) {
                const raw = q.value.cooked ?? q.value.raw ?? '';
                if (raw) out.push(raw);
              }
              for (const ex of expr.expressions) collectClassFragments(ex, out);
              return;
            case 'ConditionalExpression':
              collectClassFragments(expr.consequent, out);
              collectClassFragments(expr.alternate, out);
              return;
            case 'LogicalExpression':
              collectClassFragments(expr.left, out);
              collectClassFragments(expr.right, out);
              return;
            case 'BinaryExpression':
              if (expr.operator === '+') {
                collectClassFragments(expr.left, out);
                collectClassFragments(expr.right, out);
              }
              return;
            case 'ArrayExpression':
              for (const el of expr.elements) {
                if (el) collectClassFragments(el, out);
              }
              return;
            case 'ObjectExpression':
              for (const prop of expr.properties) {
                if (prop.type === 'Property' && !prop.computed) {
                  collectClassFragments(prop.value, out);
                }
              }
              return;
            case 'CallExpression':
              if (
                expr.callee.type === 'MemberExpression' &&
                !expr.callee.computed &&
                expr.callee.property.type === 'Identifier' &&
                expr.callee.property.name === 'join' &&
                expr.arguments[0]?.type === 'Literal' &&
                typeof expr.arguments[0].value === 'string'
              ) {
                collectClassFragments(expr.callee.object, out);
              }
              return;
            default:
              return;
          }
        }

        /**
         * @param {import('estree').JSXOpeningElement} node
         */
        function getClassNameAttr(node) {
          return node.attributes.find(
            (a) =>
              a.type === 'JSXAttribute' &&
              a.name.type === 'JSXIdentifier' &&
              (a.name.name === 'className' || a.name.name === 'class'),
          );
        }

        /**
         * @param {import('estree').JSXOpeningElement} node
         * @returns {string[]}
         */
        function getClassNameFragmentsFromOpening(node) {
          const attr = getClassNameAttr(node);
          if (!attr || !attr.value) return [];
          if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
            return [attr.value.value];
          }
          if (attr.value.type === 'JSXExpressionContainer') {
            const fr = [];
            collectClassFragments(attr.value.expression, fr);
            return fr;
          }
          return [];
        }

        return {
          JSXOpeningElement(node) {
            const attr = getClassNameAttr(node);
            if (!attr || !attr.value) return;

            const fragments = getClassNameFragmentsFromOpening(node);
            for (const frag of fragments) {
              if (FORBIDDEN.test(frag)) {
                context.report({ node: attr, messageId: 'forbidden' });
                return;
              }
            }
          },
        };
      },
    },
  },
};

export default plugin;
