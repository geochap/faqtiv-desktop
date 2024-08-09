import { AgentTask } from '../types'

class AssistantTool {
  schema: Record<string, any> = {}
  name = ''
  description = ''
  agentId: string | undefined = ''
  returns = ''
  requiredParams: string[] = []

  //@ts-expect-error expected
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async _getCallParams(params: any): { agentId: string; taskName: string; params: any[] } {
    throw Error('Not implemented')
  }

  getOpenAISchema() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description + '\n\nReturns: ' + JSON.stringify(this.returns, null, 2),
        parameters: {
          type: 'object',
          properties: { ...this.schema },
          required: this.requiredParams
        }
      }
    }
  }
}

export type AssistantTools = {
  [name: string]: AssistantTool
}

// Function to generate tools based on the agent tasks object
function generateTools(agentId: string, tasks: any[]): AssistantTools {
  const tools: AssistantTools = {}

  tasks.forEach((task: any) => {
    const { name, description, schema, returns, requiredParams } = task
    const taskName = agentId + '_' + task.name

    // Dynamically create the tool class
    tools[taskName] = new (class extends AssistantTool {
      schema = schema

      requiredParams = requiredParams

      name = taskName

      description = description

      returns = returns

      agentId = agentId

      _getCallParams(params: any) {
        console.log(`Called ${task.name} with input ${JSON.stringify(params)}`)
        return {
          agentId,
          taskName: name,
          params
        }
      }
    })()
  })

  return tools
}

class RunAdHocTaskTool extends AssistantTool {
  schema = {
    description: {
      type: 'string',
      description: 'Description of the new task'
    },
    agentId: {
      type: 'string',
      description: 'Id of the agent to create and run the task'
    }
  }
  name = 'run-ad-hoc-task'
  description = 'A tool for an agent to run custom tasks'
  returns = 'any'
  requiredParams = ['taskName', 'description', 'agentId']
}

export const appTools: AssistantTools = {
  'run-ad-hoc-task': new RunAdHocTaskTool()
}

export function generateToolsFromAgentTasks(agentId: string, tasks: AgentTask[]) {
  const tools: AssistantTools = generateTools(agentId, tasks)
  return tools
}
