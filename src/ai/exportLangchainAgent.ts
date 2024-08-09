import { Agent } from '../types'

async function getExportAgentInfo({ agentId }: { agentId: string }) {
  return new Promise((resolve, reject) => {
    window.ipcRenderer.send('get-agent-export-info', agentId)
    window.ipcRenderer.once('get-agent-export-info-reply', (_event, response) => {
      if (response.error) {
        console.error('Failed to get agent export info:', response.error)
        reject(response.error)
      } else {
        resolve(JSON.parse(response))
      }
    })
  })
}

function langchainAgentTemplate(agentsInfo: any[]) {
  return `import os
from typing import List, Dict, Union, Any, Optional
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_openai import ChatOpenAI
import argparse
${agentsInfo.map((agent) => agent.imports).join('\n')}

${agentsInfo.map((agent) => agent.libs).join('\n')}

${agentsInfo.map((agent) => agent.tools).join('\n')}

tool_functions = [
${agentsInfo.map((agent) => agent.toolNames.map((toolName: string) => `${toolName}`).join(',\n')).join('\n')}
]

promptText = """
You are a technical assistant that answers questions using the available tools:
${agentsInfo.map((agent) => agent.toolSignatures).join('\n')}

${agentsInfo.map((agent) => agent.instructions).join('\n\n')}
"""

promptText = promptText.replace("{", "{{").replace("}", "}}") # escape curly braces to avoid template errors

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", promptText),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
)

# Read the API key and model from environment variables
api_key = os.getenv('OPENAI_API_KEY')
model = os.getenv('OPENAI_MODEL')

# Initialize OpenAI LLM
llm = ChatOpenAI(model=model)

# Define the agent
agent = create_tool_calling_agent(llm, tool_functions, prompt)

# Create the agent executor
agent_executor = AgentExecutor(agent=agent, tools=tool_functions)

# Set up command-line argument parsing
parser = argparse.ArgumentParser(description="Ask a question to the bank agent.")
parser.add_argument('question', type=str, help='The question to ask the agent')
args = parser.parse_args()

# Execute the question
result = agent_executor.invoke({"input": args.question})
print(result['output'])
`
}

export async function exportLangchainAgent(agents: Agent[]) {
  const agentsInfo = await Promise.all(
    agents.map(async (agent) => await getExportAgentInfo({ agentId: agent.id }))
  )
  const result = langchainAgentTemplate(agentsInfo)
  console.log(result)

  return result
}
