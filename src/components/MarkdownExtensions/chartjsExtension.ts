import { Node } from 'unist'
import { visit } from 'unist-util-visit'

interface Parent extends Node {
  children: Node[]
}

interface CodeNode extends Node {
  type: 'code'
  lang?: string
  value: string
}

interface JsxNode extends Node {
  type: 'html'
  value: string
}

function transformToHtmlNode(codeNode: CodeNode): JsxNode {
  return {
    type: 'html',
    value: `<ChartJS>${codeNode.value}</ChartJS>` // Safely handles multi-line JSON
  }
}

/**
 * remarkChartjs plugin:
 *  - Finds all code blocks with `lang="chartjs"`.
 *  - Replaces them with a JSX node: `<ChartJS>...</ChartJS>`.
 */
export default function remarkChartjs() {
  return (tree: Node) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return

      const codeNode = node as CodeNode
      if (codeNode.lang === 'chartjs') {
        (parent as Parent).children[index] = transformToHtmlNode(codeNode)
      }
    })
  }
}
