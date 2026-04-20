/**
 * 风险表面（bg-red / border-red 等）及其子树内：仅允许 red / slate / 白色系。
 * 禁止 clearstrata 主色与品牌色、软绿背景及任意 emerald/green/teal。
 *
 * @type {import('eslint').ESLint.Plugin}
 */
const plugin = {
  meta: { name: 'clearstrata-risk-surface', version: '1.0.0' },
  rules: {
    'no-brand-in-risk-surface': {
      meta: {
        type: 'problem',
        docs: {
          description:
            '红色风险容器内不得使用品牌绿或 Tailwind 绿系；仅 red / slate / 白。',
        },
        messages: {
          forbidden:
            '风险区域（红底/红框等）内请仅使用 red、slate 与白色系；不得使用 clearstrata-ui-primary、clearstrata-brand-*、clearstrata-ui-soft*、clearstrata-hero。（emerald/green/teal 见全项目规则 no-tailwind-green-family）',
        },
        schema: [],
      },
      create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();

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
         * @param {string} s
         */
        function isRiskSurfaceClass(s) {
          if (!s) return false;
          return (
            /\bbg-red-/.test(s) ||
            /\bborder-red-/.test(s) ||
            /\bring-red-/.test(s) ||
            /\boutline-red-/.test(s) ||
            /\bfrom-red-/.test(s) ||
            /\bto-red-/.test(s) ||
            /\bvia-red-/.test(s) ||
            /\bdivide-red-/.test(s)
          );
        }

        /**
         * @param {string} s
         */
        /** 绿系由 `clearstrata-palette/no-tailwind-green-family` 全项目拦截；此处只拦品牌/clearstrata token。 */
        function hasForbiddenInRiskZone(s) {
          if (!s) return false;
          if (/\bclearstrata-ui-primary(Hover|Active)?\b/.test(s)) return true;
          if (/\bclearstrata-brand-/.test(s)) return true;
          if (/\bclearstrata-ui-soft(Border|Text)?\b/.test(s)) return true;
          if (/\bbg-clearstrata-hero\b|\bclearstrata-hero\b/.test(s)) return true;
          return false;
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

        /**
         * @param {import('estree').JSXOpeningElement} node
         */
        function openingHasRiskSurface(node) {
          const fr = getClassNameFragmentsFromOpening(node);
          return fr.some(isRiskSurfaceClass);
        }

        /**
         * 外层 JSXOpeningElement 不在子节点的 parent 链上，需沿 JSXElement 祖先检查 openingElement。
         *
         * @param {import('estree').JSXOpeningElement} node
         */
        function ancestorHasRiskSurface(node) {
          const ancestors = sourceCode.getAncestors(node);
          return ancestors.some(
            (a) =>
              a.type === 'JSXElement' &&
              a.openingElement &&
              openingHasRiskSurface(a.openingElement),
          );
        }

        return {
          JSXOpeningElement(node) {
            const attr = getClassNameAttr(node);
            if (!attr || !attr.value) return;

            const fragments = getClassNameFragmentsFromOpening(node);
            if (fragments.length === 0) return;

            const insideRisk = ancestorHasRiskSurface(node);

            for (const frag of fragments) {
              if (!hasForbiddenInRiskZone(frag)) continue;
              const selfRisk = isRiskSurfaceClass(frag);
              if (insideRisk || selfRisk) {
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
