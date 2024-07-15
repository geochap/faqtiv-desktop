import {
  ChatEvent,
  ChatEventHandler,
  ChatEventType,
  ChatMessage,
  IChatService,
  IStorage,
  MessageContentType,
  MessageDirection,
  MessageEvent,
  SendMessageServiceParams,
  SendTypingServiceParams,
  UpdateState,
  UserTypingEvent
} from '@chatscope/use-chat'

type EventHandlers = {
  onMessage: ChatEventHandler<ChatEventType.Message, ChatEvent<ChatEventType.Message>>
  onConnectionStateChanged: ChatEventHandler<
    ChatEventType.ConnectionStateChanged,
    ChatEvent<ChatEventType.ConnectionStateChanged>
  >
  onUserConnected: ChatEventHandler<
    ChatEventType.UserConnected,
    ChatEvent<ChatEventType.UserConnected>
  >
  onUserDisconnected: ChatEventHandler<
    ChatEventType.UserDisconnected,
    ChatEvent<ChatEventType.UserDisconnected>
  >
  onUserPresenceChanged: ChatEventHandler<
    ChatEventType.UserPresenceChanged,
    ChatEvent<ChatEventType.UserPresenceChanged>
  >
  onUserTyping: ChatEventHandler<ChatEventType.UserTyping, ChatEvent<ChatEventType.UserTyping>>
  [key: string]: any
}

export class ChatService implements IChatService {
  storage?: IStorage
  updateState: UpdateState

  eventHandlers: EventHandlers = {
    onMessage: () => {},
    onConnectionStateChanged: () => {},
    onUserConnected: () => {},
    onUserDisconnected: () => {},
    onUserPresenceChanged: () => {},
    onUserTyping: () => {}
  }

  constructor(storage: IStorage, update: UpdateState) {
    this.storage = storage
    this.updateState = update

    window.addEventListener('chat-protocol', (evt: Event) => {
      const event = evt as CustomEvent

      const {
        detail: { type },
        detail
      } = event

      if (type === 'message') {
        const message = detail.message as ChatMessage<MessageContentType.TextHtml>

        message.direction = MessageDirection.Incoming
        const { conversationId } = detail
        if (this.eventHandlers.onMessage && detail.sender !== this) {
          this.eventHandlers.onMessage(new MessageEvent({ message, conversationId }))
        }
      } else if (type === 'typing') {
        const { isTyping, conversationId, content } = detail

        this.eventHandlers.onUserTyping(
          new UserTypingEvent({
            userId: 'assistant',
            isTyping,
            conversationId,
            content
          })
        )
      }
    })
  }

  sendMessage({ message, conversationId }: SendMessageServiceParams) {
    const messageEvent = new CustomEvent('chat-protocol', {
      detail: {
        type: 'message',
        message,
        conversationId,
        sender: this
      }
    })

    window.dispatchEvent(messageEvent)

    return message
  }

  sendTyping({ isTyping, content, conversationId, userId }: SendTypingServiceParams) {
    const typingEvent = new CustomEvent('chat-protocol', {
      detail: {
        type: 'typing',
        isTyping,
        content,
        conversationId,
        userId,
        sender: this
      }
    })

    window.dispatchEvent(typingEvent)
  }

  on<T extends ChatEventType, H extends ChatEvent<T>>(
    evtType: T,
    evtHandler: ChatEventHandler<T, H>
  ) {
    const key = `on${evtType.charAt(0).toUpperCase()}${evtType.substring(1)}`

    if (key in this.eventHandlers) {
      this.eventHandlers[key] = evtHandler
    }
  }

  off<T extends ChatEventType>(evtType: T) {
    const key = `on${evtType.charAt(0).toUpperCase()}${evtType.substring(1)}`
    if (key in this.eventHandlers) {
      this.eventHandlers[key] = () => {}
    }
  }
}
