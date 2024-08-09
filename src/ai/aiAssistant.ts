import OpenAI from 'openai'
import { AssistantStream } from 'openai/lib/AssistantStream.mjs'
import { getInstructions } from './chatInstructions'
import { Agent } from '../types'
import { Run } from 'openai/resources/beta/threads/index.mjs'

export type AIAssistantResponse = {
  response: string
  data: {
    files: { name: string; path: string; mimeType: string }[]
  }
  runId?: string
  requiredAction?: OpenAI.Beta.Threads.Runs.Run.RequiredAction
  threadId?: string
  assistantId?: string
  aborted?: boolean
}

class CancellationToken {
  isCancelled: boolean
  private listeners: (() => void)[]

  constructor() {
    this.isCancelled = false
    this.listeners = []
  }

  cancel() {
    if (!this.isCancelled) {
      this.isCancelled = true
      this.listeners.forEach((listener) => listener())
    }
  }

  throwIfCancelled() {
    if (this.isCancelled) {
      throw new Error('Operation cancelled')
    }
  }

  onCancel(listener: () => void) {
    if (this.isCancelled) {
      listener()
    } else {
      this.listeners.push(listener)
    }
  }
}

export class AIAssistant {
  id: string | null
  threadId: string | null
  tools: any[]
  instructions?: string
  openaiModel: string
  openaiApiKey: string
  openai: OpenAI
  currentRunId?: string
  cancellationToken?: CancellationToken

  constructor({
    id,
    threadId,
    tools = [],
    agents = [],
    instructions,
    openaiApiKey,
    openaiModel
  }: CreateAssistantParameters) {
    this.id = id || null
    this.threadId = threadId || null
    this.openaiModel = openaiModel || 'gpt-4o'
    this.tools = tools
    this.instructions = instructions
    this.openaiApiKey = openaiApiKey
    this.openai = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true })

    this.instructions = getInstructions(agents)
    if (instructions) {
      this.instructions += '\n' + instructions
    }
  }

  async init() {
    if (!this.id) {
      const { id } = await this.openai.beta.assistants.create({
        instructions: this.instructions,
        model: this.openaiModel,
        name: 'FAQtiv Assistant',
        tools: this.tools
      })
      this.id = id
    }

    if (!this.threadId) {
      const { id } = await this.openai.beta.threads.create()
      this.threadId = id
    }
  }

  async makeOpenAIRequest(path: string, method: string = 'get', body: any = {}) {
    const request = {
      method,
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: undefined
    }
    if (method != 'get') request.body = body

    const response = await fetch(`https://api.openai.com/v1${path}`, request)
    const responseJson = await response.json()

    if (responseJson.error) {
      if (responseJson.error.code == 'invalid_api_key') throw new Error('Invalid OpenAI api key.')

      throw responseJson.error
    }

    return responseJson
  }

  async getThread() {
    const response = await this.makeOpenAIRequest(`/threads/${this.threadId}`)
    return response.data
  }

  async getMessages() {
    const response = await this.makeOpenAIRequest(`/threads/${this.threadId}/messages`)
    return response.data
  }

  async addUserMessage(
    content: string,
    onDelta: (delta: string) => void,
    callTool: (name: string, parameters: Record<string, string>) => any
  ): Promise<AIAssistantResponse> {
    this.cancellationToken = new CancellationToken()
    const token = this.cancellationToken

    const createMessage = async () => {
      try {
        await this.openai.beta.threads.messages.create(this.threadId!, {
          role: 'user',
          content
        })
      } catch (e: any) {
        if (e.message.includes('is active')) {
          // Cancel the active run and try again
          const runs = await this.openai.beta.threads.runs.list(this.threadId!)
          const activeRun = runs.data.find((run) => run.status === 'requires_action')
          if (activeRun) {
            await this.openai.beta.threads.runs.cancel(this.threadId!, activeRun.id)
          }
          await createMessage()
        } else {
          throw e
        }
      }
    }
    await createMessage()

    let requiredAction: OpenAI.Beta.Threads.Runs.Run.RequiredAction | undefined
    let response = ''
    let data: AIAssistantResponse['data'] = { files: [] }
    let runId: string | undefined
    let aborted = false

    try {
      const result = await this._processStream(
        this.openai.beta.threads.runs.stream(this.threadId!, {
          assistant_id: this.id!
        }),
        onDelta,
        token
      )
      this.currentRunId = result.runId
      runId = result.runId
      requiredAction = result.requiredAction
      if (result.response) response += '\n' + result.response
      if (result.data) data = result.data

      do {
        if (this.currentRunId && requiredAction && requiredAction.submit_tool_outputs) {
          const toolResult = await this._processToolCalls(
            this.currentRunId,
            requiredAction.submit_tool_outputs.tool_calls,
            onDelta,
            callTool,
            token
          )
          this.currentRunId = toolResult.runId
          requiredAction = toolResult.requiredAction
          if (toolResult.response) response += '\n' + toolResult.response
          if (toolResult.data) data = { ...data, ...toolResult.data }
        }
      } while (this.currentRunId && requiredAction && requiredAction.submit_tool_outputs)
    } finally {
      if (this.cancellationToken.isCancelled) aborted = true
      this.currentRunId = undefined
      this.cancellationToken = undefined
    }

    return {
      runId,
      threadId: this.threadId!,
      assistantId: this.id!,
      response,
      data,
      aborted
    }
  }

  async addAssistantMessage(content: string) {
    await this.openai.beta.threads.messages.create(this.threadId!, {
      role: 'assistant',
      content
    })
  }

  async _processStream(
    stream: AssistantStream,
    onDelta: (delta: string) => void,
    token?: CancellationToken
  ): Promise<AIAssistantResponse> {
    let runId: string
    let requiredAction: OpenAI.Beta.Threads.Runs.Run.RequiredAction | null
    let textResponseComplete = false // flag to determine if incoming stream is now the code block
    let messageDonePromiseResolve: (data: AIAssistantResponse) => void
    let response = ''
    let cancelling = false

    const messageDonePromise: Promise<AIAssistantResponse> = new Promise((resolve) => {
      messageDonePromiseResolve = resolve
    })

    return new Promise<any>((resolve, reject) => {
      stream
        .on('textDelta', (delta) => {
          if (token && token.isCancelled) return
          if (textResponseComplete) return

          const chunk: string = delta.value!
          const reachingStartOfJsonBlock = chunk.indexOf('⁙') >= 0

          if (reachingStartOfJsonBlock) {
            // send the last chunk of text before the code block starts
            const text = chunk.replaceAll('⁙', '')
            onDelta(text)
            response += text
            textResponseComplete = true
          } else {
            onDelta(chunk)
            response += chunk
          }
        })
        .on('messageDone', (message) => {
          if (token && token.isCancelled) return
          let data = {
            files: []
          }

          try {
            if (message && message.content && message.content.length > 0) {
              //@ts-expect-error types are wrong here
              const { text } = message.content[0]
              const contents = text.value.split('⁙⁙⁙')

              // Text is expected to be markdown followed by json surrounded by ⁙⁙⁙
              if (contents.length > 0 && contents[1]) {
                data = JSON.parse(contents[1].trim())
              }
            }
          } catch (e: any) {
            console.error(`Failed to parse json from message: ${e.message}`)
            //@ts-expect-error types are wrong here
            console.log(message.content[0].text.value)
          }

          messageDonePromiseResolve({ response, data })
        })
        .on('event', async (e) => {
          //@ts-expect-error it can include id
          if (!runId && e.data && e.data.id.includes('run_')) runId = e.data.id

          if (token && token.isCancelled && runId && !cancelling) {
            cancelling = true

            const { id } = e.data as Run
            await this.openai.beta.threads.runs.cancel(this.threadId!, runId || id)
            return resolve({ runId, response, data: { files: [] } })
          }
          if ((!token || !token.isCancelled) && e.event == 'thread.run.requires_action') {
            const { id, required_action } = e.data
            runId = id
            requiredAction = required_action
            messageDonePromiseResolve({ response: '', data: { files: [] } })
          }
        })
        .on('end', async () => {
          if (token && token.isCancelled) return
          // parsing the code block in 'messageDone' event may not be finished  when 'end' event is called
          const { response, data } = await messageDonePromise

          if (requiredAction && requiredAction.type == 'submit_tool_outputs') {
            resolve({
              requiredAction,
              runId,
              response,
              data
            })
          } else {
            resolve({
              response,
              data
            })
          }
        })
        .on('error', (error) => {
          if (token && token.isCancelled) return
          reject(error)
        })
    })
  }

  async _processToolCalls(
    runId: string,
    toolCalls: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall[],
    onDelta: (delta: string) => void,
    callTool: (name: string, parameters: any) => any,
    token?: CancellationToken
  ) {
    const toolCallResults: any[] = []

    for await (const toolCall of toolCalls) {
      // Temporary patch for multi_tool_use.parallel bug: parse the arguments for multi_tool_use.parallel
      if (token) token.throwIfCancelled()
      if (toolCall.function.name === 'multi_tool_use.parallel') {
        const { tool_uses } = JSON.parse(toolCall.function.arguments)

        for (const use of tool_uses) {
          let output

          try {
            const result = await callTool(use.recipient_name, use.parameters)
            output = '\n```json\n' + JSON.stringify(result, null, 2) + '\n```\n'
          } catch (e: any) {
            output = `Tool call failed: ${e.message}`
          }

          toolCallResults.push({
            tool_call_id: toolCall.id,
            output
          })
        }
      } else {
        if (token) token.throwIfCancelled()
        let output

        try {
          const result = await callTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          )
          output = '\n```json\n' + JSON.stringify(result, null, 2) + '\n```\n'
        } catch (e: any) {
          output = `Tool call failed: ${e.message}`
        }

        toolCallResults.push({
          tool_call_id: toolCall.id,
          output
        })
      }
    }

    return new Promise<AIAssistantResponse>((resolve, reject) => {
      const submitToolsStream = this.openai.beta.threads.runs
        .submitToolOutputsStream(this.threadId!, runId, { tool_outputs: toolCallResults })
        .on('connect', () => {
          resolve(this._processStream(submitToolsStream, onDelta, token))
        })
        .on('error', (error) => {
          if (error.message.includes('400')) {
            console.log('Error submitting tool outputs:', error)
            const errorIndexMatch = error.message.match(/tool_outputs\[(\d+)\]/)
            if (errorIndexMatch) {
              const errorIndex = parseInt(errorIndexMatch[1], 10)
              toolCallResults[errorIndex].output = `Error submitting tool outputs: ${error.message}`
            }
            resolve(
              this._processStream(
                this.openai.beta.threads.runs.submitToolOutputsStream(this.threadId!, runId, {
                  tool_outputs: toolCallResults
                }),
                onDelta,
                token
              )
            )
          } else {
            reject(error)
          }
        })
    })
  }

  async destroy() {
    await this.openai.beta.threads.del(this.threadId!)
    await this.openai.beta.assistants.del(this.id!)
  }

  async cancelCurrentRun() {
    if (this.cancellationToken) {
      try {
        this.cancellationToken.cancel()
      } catch (error: any) {
        console.error(`Failed to cancel run ${this.currentRunId}: ${error.message}`)
      }
    } else {
      console.log('No ongoing run to cancel.')
    }
  }
}

type CreateAssistantParameters = {
  id?: string
  threadId?: string
  tools: any[]
  agents: Agent[]
  instructions?: string
  openaiApiKey: string
  openaiModel?: string
}

export const createAssistant = async function (params: CreateAssistantParameters) {
  const assistant = new AIAssistant(params)
  await assistant.init()

  return assistant
}
