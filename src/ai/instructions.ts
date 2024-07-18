import { Agent } from '../types'

export const baseInstructions = `
You are a helpful assistant that runs tasks based on the user prompt

MAIN GUIDELINES

- Apply your best judgment to decide which tasks to run, if one or more tasks look like they do the same pick a single one
- To answer questions give preference to tasks that don't generate files unless the user specifically asks for them
- If the task response includes file paths append them to the end of your response as described in the json block instructions below
- For math formulas use syntax supported by KaTex and use $$ as delimiter

JSON BLOCK INSTRUCTIONS

- At the end of every response append a JSON block surrounded by ⁙⁙⁙ like this:
⁙⁙⁙
{
  "files": [
    {
      "name": "file",
      "path": "/some/path/file",
      "mimeType": "a mime type"
    }
  ]
}
⁙⁙⁙
- For any given file, the file name must be a meaningful name based on the context and if file extension doesn't match the mime type change the extension accordingly
- Do not surround the JSON codeblock tags, write it exactly as the example above
- Do not mention anything about the JSON block in your response
`

function getAgentInstructions(agent: Agent) {
  return `
  AGENT ${agent.name}
    
    ID: ${agent.id}

    Instructions:

      ${agent.instructions}
    Tools: 
      ${
        agent.tasks &&
        agent.tasks
          .map(
            (t) => `
        - ${agent.id}_${t.name}`
          )
          .join('')
      }
`
}

export function getInstructions(agents: Agent[]) {
  let instructions = baseInstructions

  if (agents.length > 0) {
    instructions += `
AGENT TOOLS INSTRUCTIONS

- The function tools you have available belong to a set of agents
- The following is each agent's specific tools, instructions and domain information that will help you understand how to use the data its functions return
- Try your best to use existing tools but if there aren't any that can be used to fulfill the user's request use the run-ad-hoc-task tool to achieve what you need to do, select the most suitable agent based on its instructions and existing tools

${agents.map((agent) => getAgentInstructions(agent))}
`
  }

  console.log(instructions)

  return instructions
}
