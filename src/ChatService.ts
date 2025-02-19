import {
  ChatEvent,
  ChatEventHandler,
  ChatEventType,
  ChatMessage,
  MessageEvent,
  MessageContent,
  IChatService,
  IStorage,
  MessageContentType,
  MessageDirection,
  MessageStatus,
  SendMessageServiceParams,
  SendTypingServiceParams,
  TypingUser,
  UpdateState,
  UserTypingEvent,
  Conversation
} from '@chatscope/use-chat'
import { ILocalStorage } from './ChatLocalStorage'
import { Agent } from './types'
import { nanoid } from 'nanoid'
import DOMPurify from 'dompurify'

const cleanText = (text: string) => {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

export type ChatServiceEventType = ChatEventType | 'error'

export const ChatServiceEventType = {
  ...ChatEventType,
  Error: 'error' as const
}
export type ChatServiceErrorEvent = {
  message: string
  details?: unknown
}

interface ChatCompletionMessageToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

export class ChatService implements IChatService {
  storage?: ILocalStorage
  updateState: UpdateState
  agents?: Array<Agent>

  eventHandlers: { [key: string]: Array<ChatEventHandler<any, any>> } = {}

  constructor(storage: IStorage, update: UpdateState) {
    this.storage = storage as ILocalStorage
    this.updateState = update
  }

  private triggerEvent<T extends ChatServiceEventType, H extends ChatEvent<T>>(
    evtType: T,
    event: H
  ) {
    const key = `on${evtType.charAt(0).toUpperCase()}${evtType.substring(1)}`

    if (this.eventHandlers[key]) {
      this.eventHandlers[key].forEach((handler: any) => handler(event))
    }
  }

  addTyping(conversationId: string, agentId: string, isTyping: boolean, content: string) {
    if (this.storage) {
      const typingUser = new TypingUser({
        userId: agentId,
        isTyping,
        content
      })
      this.storage.addTypingUser(conversationId, typingUser)
      this.triggerEvent(
        ChatEventType.UserTyping,
        new UserTypingEvent({
          conversationId,
          userId: agentId,
          isTyping,
          content
        })
      )
    }
  }

  setAgents(agents: Array<Agent>) {
    this.agents = agents
  }

  agentStartTyping(conversationId: string, agentId: string, content: string) {
    this.addTyping(conversationId, agentId, true, content)
  }

  agentStopTyping(conversationId: string, agentId: string) {
    this.addTyping(conversationId, agentId, false, '')
  }

  getConversation(conversationId: string) {
    if (!this.storage) throw new Error('Storage not found')

    const conversationData = this.storage?.getConversation(conversationId)
    if (conversationData) return conversationData[0]

    return undefined
  }

  updateConversation(conversation: Conversation, message: string) {
    if (!this.storage) throw new Error('Storage not found')

    conversation.description = cleanText(message)
    this.storage.updateConversation(conversation)
  }

  private async streamCompletion(
    agent: Agent,
    conversationHistory: ChatMessage<MessageContentType.TextPlain>[],
    onDelta: (delta: {
      content: string
      role: string
      tool_calls?: ChatCompletionMessageToolCall[]
    }) => void
  ): Promise<string> {
    const messages = conversationHistory.map((msg) => {
      const content = msg.content

      if (msg.direction === MessageDirection.Outgoing) {
        return {
          role: 'user',
          content: String(msg.content)
        }
      }

      try {
        const parsedContent = JSON.parse(String(content))
        if (parsedContent.tool_calls) {
          return {
            role: 'assistant',
            content: '',
            tool_calls: parsedContent.tool_calls
          }
        } else if (parsedContent.role === 'tool') {
          return {
            role: 'tool',
            content: parsedContent.content,
            tool_call_id: parsedContent.tool_call_id,
            name: parsedContent.name
          }
        }
      } catch (error) {
        return {
          role: 'assistant',
          content: content
        }
      }

      return {
        role: 'assistant',
        content: content
      }
    })

    try {
      const response = await fetch(`${agent.url.replace(/\/+$/, '')}/completions`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify({
          messages,
          include_tool_messages: agent.includeToolMessages,
          max_tokens: agent.maxTokens,
          temperature: agent.temperature
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      let result = ''
      let buffer: string = '' // Buffer to accumulate incoming chunks

      if (reader) {
        let reading = true
        while (reading) {
          const { done, value } = await reader.read()
          if (done) {
            reading = false
            break
          }

          // Decode the current chunk and add it to the buffer
          buffer += new TextDecoder().decode(value)

          // Split buffer on newline characters to process complete messages
          const lines = buffer.split('\n')

          // Keep the last part of the buffer (incomplete chunk) for the next iteration
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              let data
              try {
                data = JSON.parse(line.slice(6))
              } catch (ex) {
                console.log(line)
                throw ex
              }
              if (data.choices && data.choices[0].finish_reason === 'stop') {
                reading = false
                break
              }
              if (data.choices && data.choices[0].finish_reason === 'error') {
                throw new Error(data.error.message)
              }
              if (data.choices && data.choices[0].delta) {
                if (data.choices[0].delta.role === 'assistant') {
                  result += data.choices[0].delta.content
                }
                onDelta(data.choices[0].delta)
              }
            }
          }
        }
      }

      return result
    } catch (error) {
      this.triggerEvent(ChatServiceEventType.Error, {
        type: ChatServiceEventType.Error,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error
      })
      throw error
    }
  }

  async sendMessage({ message, conversationId }: SendMessageServiceParams) {
    const conversation = this.getConversation(conversationId)
    if (!conversation) throw new Error('Conversation not found')

    const agent = this.agents?.find((agent) => agent.id === conversation.data.agentId)
    if (!agent) throw new Error('Agent not found')

    const chatMessage = message as ChatMessage<MessageContentType.TextHtml>
    chatMessage.direction = MessageDirection.Outgoing

    try {
      this.agentStartTyping(conversationId, agent.id, '')

      // Get the conversation history
      const conversationHistory = this.storage?.getMessages(conversationId) || []

      const agentResponse = await this.streamCompletion(agent, conversationHistory, (delta) => {
        if ((delta.role === 'assistant' && delta.tool_calls) || delta.role === 'tool') {
          // Assistant message with tool calls
          const toolMessage = new ChatMessage({
            id: nanoid(),
            senderId: agent.id,
            direction: MessageDirection.Incoming,
            status: MessageStatus.Sent,
            contentType: MessageContentType.TextPlain,
            content: JSON.stringify(delta) as unknown as MessageContent<MessageContentType>,
            createdTime: new Date()
          })
          this.storage?.addMessage(toolMessage, conversationId, false)
        } else {
          this.agentStartTyping(conversationId, agent.id, delta.content)
        }
      })

      this.agentStopTyping(conversationId, agent.id)
      this.updateConversation(conversation, String(chatMessage.content))

      const agentMessage = {
        direction: MessageDirection.Incoming,
        id: nanoid(),
        senderId: agent.id,
        status: MessageStatus.Sent,
        content: agentResponse as unknown as MessageContent<MessageContentType>,
        contentType: MessageContentType.TextPlain,
        createdTime: new Date()
      }
      this.triggerEvent(
        ChatEventType.Message,
        new MessageEvent({ message: agentMessage, conversationId })
      )
    } catch (error) {
      console.error('Error in sendMessage:', error)
    } finally {
      this.agentStopTyping(conversationId, agent.id)
    }
  }

  sendTyping({ isTyping, content, conversationId, userId }: SendTypingServiceParams) {
    this.addTyping(conversationId, userId, isTyping, content)
  }

  on<T extends ChatEventType, H extends ChatEvent<T>>(
    evtType: T,
    evtHandler: ChatEventHandler<T, H>
  ) {
    const key = `on${evtType.charAt(0).toUpperCase()}${evtType.substring(1)}`

    if (!this.eventHandlers[key]) {
      this.eventHandlers[key] = []
    }
    this.eventHandlers[key].push(evtHandler)
  }

  off<T extends ChatEventType, H extends ChatEvent<T>>(
    evtType: T,
    evtHandler?: ChatEventHandler<T, H>
  ) {
    const key = `on${evtType.charAt(0).toUpperCase()}${evtType.substring(1)}`

    if (evtHandler) {
      this.eventHandlers[key] = this.eventHandlers[key].filter(
        (handler: any) => handler !== evtHandler
      )
    } else {
      this.eventHandlers[key] = []
    }
  }
}
