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

const XML_REGULAR = /(.*(?:endif-->))|([ ]?<[^>]*>[ ]?)|(&nbsp;)|([^}]*})/g
const HTML_REGULAR =
  /<(?!img|table|\/table|thead|\/thead|tbody|\/tbody|tr|\/tr|td|\/td|th|\/th|br|\/br).*?>/gi
const CLEANUP_WHITESPACE = /\s+/g

const cleanText = (text: string) => {
  let cleanValue = text.replace(XML_REGULAR, '')
  cleanValue = cleanValue.replace(HTML_REGULAR, '')

  return cleanValue.replace(CLEANUP_WHITESPACE, ' ').trim()
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

  private triggerEvent<T extends ChatEventType, H extends ChatEvent<T>>(evtType: T, event: H) {
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
    agentUrl: string,
    prompt: string,
    onDelta: (delta: string) => void
  ): Promise<string> {
    const response = await fetch(`${agentUrl.replace(/\/+$/, '')}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    let result = ''

    if (reader) {
      let reading = true
      while (reading) {
        const { done, value } = await reader.read()
        if (done) {
          reading = false
          break
        }
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.choices && data.choices[0].finish_reason === 'stop') {
              reading = false
              break
            }
            if (data.choices && data.choices[0].delta.content) {
              result += data.choices[0].delta.content
              onDelta(data.choices[0].delta.content)
            }
          }
        }
      }
    }

    return result
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

      const agentResponse = await this.streamCompletion(
        agent.url,
        String(chatMessage.content),
        (delta) => {
          this.agentStartTyping(conversationId, agent.id, delta)
        }
      )

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
