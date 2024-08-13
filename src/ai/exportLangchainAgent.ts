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
import requests
import argparse
from typing import List, Dict, Union, Any, Optional
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_openai import ChatOpenAI

# Agent lib and tools dependencies
${agentsInfo.map((agent) => agent.imports).join('\n')}

# Agent libs
${agentsInfo.map((agent) => agent.libs).join('\n')}

# Agent tools
${agentsInfo.map((agent) => agent.tools).join('\n')}

tool_functions = [
${agentsInfo.map((agent) => agent.toolNames.map((toolName: string) => `${toolName}`).join(',\n')).join('\n')}
]

promptText = """
You are a technical assistant that answers questions using the available tools.

The following schemas and guidelines are your main reference for using the tools, they indicate the arguments, return types and descriptions.

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


# http agent
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    user_input = data["input"]
    chat_history = data.get("chat_history", [])
    streaming_handler = HttpStreamingHandler()

    async def generate_response():
        task = asyncio.create_task(
            agent_executor.ainvoke(
                {
                    "input": user_input,
                    "chat_history": chat_history
                },
                {"callbacks": [streaming_handler]}
            )
        )
        
        async for chunk in streaming_handler.get_tokens():
            yield chunk

        await task

    return StreamingResponse(generate_response(), media_type="text/plain")

class HttpStreamingHandler(StreamingStdOutCallbackHandler):
    def __init__(self):
        self.queue = asyncio.Queue()
        super().__init__()
    
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        await self.queue.put(token.encode('utf-8'))

    async def get_tokens(self):
        while True:
            try:
                yield await self.queue.get()
            except asyncio.CancelledError:
                break


# Cli agent
class CliStreamingHandler(StreamingStdOutCallbackHandler):
    def __init__(self):
        self.text = ""
        super().__init__()

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.text += token
        print(token, end="", flush=True)

def cliAgent():
    print("Welcome, please type your request. Type 'exit' to quit.")
    chat_history = []
    streaming_handler = CliStreamingHandler()

    while True:
        user_input = input("\\nYou: ")
        
        if user_input.lower() == 'exit':
            print("Goodbye!")
            break

        print("\\nAgent: ", end="", flush=True)
        result = agent_executor.invoke(
            {
                "input": user_input,
                "chat_history": chat_history
            },
            {"callbacks": [streaming_handler]}
        )
        print()  # Add a newline after the streamed response

        # Update chat history with correct message types
        chat_history.append({"role": "user", "content": user_input})
        chat_history.append({"role": "assistant", "content": streaming_handler.text})

        # Reset the streaming handler text
        streaming_handler.text = ""


if __name__ == "__main__":    
    parser = argparse.ArgumentParser(description="FAQtiv Agent CLI/HTTP Server")
    parser.add_argument("--http", action="store_true", help="Run as HTTP server")
    args = parser.parse_args()

    if args.http:
        import uvicorn
        print("Starting HTTP server...")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    else:
        cliAgent()
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
