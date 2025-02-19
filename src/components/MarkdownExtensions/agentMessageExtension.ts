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

function transformToJsxNode(codeNode: CodeNode): JsxNode {
  // Escape backticks so we don’t break template literals in raw JSX
  const escaped = codeNode.value.replace(/`/g, '\\`')

  return {
    type: 'html',
    value: `<AgentMessage msg="${escaped}"></AgentMessage>`
  }
}

/**
 * remarkAgentMessage plugin:
 *  - Finds all code blocks with `lang="agent-message"`.
 *  - Replaces them with a JSX node: `<AgentMessage msg="..." />`.
 */
export default function remarkAgentMessage() {
  return (tree: Node) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return

      const codeNode = node as CodeNode
      if (codeNode.lang === 'agent-message') {
        ;(parent as Parent).children[index] = transformToJsxNode(codeNode)
      }
    })
  }
}
