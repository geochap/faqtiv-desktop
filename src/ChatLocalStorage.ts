import {
  ChatMessage,
  Conversation,
  Participant,
  Presence,
  MessageContentType,
  TypingUsersList,
  TypingUser,
  IStorage,
  ChatState,
  ConversationId,
  GroupedMessages,
  UserId,
  User,
  MessageGroup
} from '@chatscope/use-chat'

export type MessageIdGenerator = (message: ChatMessage<MessageContentType>) => string
export type GroupIdGenerator = () => string

export interface ChatLocalStorageParams {
  groupIdGenerator: GroupIdGenerator
  messageIdGenerator?: MessageIdGenerator
}

export interface ILocalStorage<ConversationData = any, UserData = any>
  extends IStorage<ConversationData, UserData> {
  addTypingUser: (conversationId: ConversationId, typingUser: TypingUser) => void
}

export class ChatLocalStorage<ConversationData = any> implements ILocalStorage<ConversationData> {
  private readonly _groupIdGenerator: GroupIdGenerator
  private readonly _messageIdGenerator?: MessageIdGenerator

  public get groupIdGenerator() {
    return this._groupIdGenerator
  }

  public get messageIdGenerator() {
    return this._messageIdGenerator
  }

  constructor({ groupIdGenerator, messageIdGenerator }: ChatLocalStorageParams) {
    this._groupIdGenerator = groupIdGenerator
    this._messageIdGenerator = messageIdGenerator
    this.loadInitialState()
  }

  private getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }

  private setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  }

  private get currentUser(): User | undefined {
    const user = this.getItem<User>('currentUser')
    return user ? new User(user) : undefined
  }

  private set currentUser(user: User | undefined) {
    this.setItem('currentUser', user)
  }

  private get users(): Array<User> {
    const users = this.getItem<Array<User>>('users')
    return users ? users.map((user) => new User(user)) : []
  }

  private set users(users: Array<User>) {
    this.setItem('users', users)
  }

  private get conversations(): Array<Conversation<ConversationData>> {
    const conversations = this.getItem<Array<Conversation<ConversationData>>>('conversations')
    return conversations
      ? conversations.map(
          (conversation) =>
            new Conversation({
              ...conversation,
              typingUsers: new TypingUsersList({
                items: conversation.typingUsers.items.map(
                  (typingUser) => new TypingUser(typingUser)
                )
              })
            })
        )
      : []
  }

  private set conversations(conversations: Array<Conversation<ConversationData>>) {
    this.setItem('conversations', conversations)
  }

  private get activeConversationId(): ConversationId | undefined {
    return this.getItem<ConversationId>('activeConversationId') || undefined
  }

  private set activeConversationId(conversationId: ConversationId | undefined) {
    this.setItem('activeConversationId', conversationId)
  }

  private get messages(): GroupedMessages {
    const messages = this.getItem<GroupedMessages>('messages')
    if (!messages) return {}

    const deserializedMessages: GroupedMessages = {}
    for (const conversationId in messages) {
      deserializedMessages[conversationId] = messages[conversationId].map((group) => {
        const messageGroup = new MessageGroup(group)
        messageGroup.messages = group.messages.map((message) => new ChatMessage(message))
        return messageGroup
      })
    }
    return deserializedMessages
  }

  private set messages(messages: GroupedMessages) {
    this.setItem('messages', messages)
  }

  private get currentMessage(): string {
    return this.getItem<string>('currentMessage') || ''
  }

  private set currentMessage(message: string) {
    this.setItem('currentMessage', message)
  }

  private loadInitialState(): void {
    const currentUser = this.getItem<User>('currentUser')
    const users = this.getItem<Array<User>>('users')
    const conversations = this.getItem<Array<Conversation<ConversationData>>>('conversations')
    const activeConversationId = this.getItem<ConversationId>('activeConversationId')
    const messages = this.getItem<GroupedMessages>('messages')
    const currentMessage = this.getItem<string>('currentMessage')

    if (currentUser) this.currentUser = new User(currentUser)
    if (users) this.users = users.map((user) => new User(user))
    if (conversations)
      this.conversations = conversations.map(
        (conversation) =>
          new Conversation({
            ...conversation,
            typingUsers: new TypingUsersList({
              items: conversation.typingUsers.items.map((typingUser) => new TypingUser(typingUser))
            })
          })
      )
    if (activeConversationId) this.activeConversationId = activeConversationId
    if (messages) this.messages = this.deserializeMessages(messages)
    if (currentMessage) this.currentMessage = currentMessage
  }

  private deserializeMessages(messages: GroupedMessages): GroupedMessages {
    const deserializedMessages: GroupedMessages = {}
    for (const conversationId in messages) {
      deserializedMessages[conversationId] = messages[conversationId].map((group) => {
        const messageGroup = new MessageGroup(group)
        messageGroup.messages = group.messages.map((message) => new ChatMessage(message))
        return messageGroup
      })
    }
    return deserializedMessages
  }

  private getMessageWithId(
    message: ChatMessage<MessageContentType>,
    generateId: boolean
  ): ChatMessage<MessageContentType> {
    if (generateId) {
      if (!this.messageIdGenerator) {
        throw 'Id generator is not defined'
      } else {
        return { ...message, id: this.messageIdGenerator(message) }
      }
    } else {
      return message
    }
  }

  userExists(userId: UserId): boolean {
    return this.users.findIndex((u) => u.id === userId) !== -1
  }

  setCurrentUser(user: User): void {
    this.currentUser = user
    this.setItem('currentUser', user)
  }

  addUser(user: User): boolean {
    const notExists = !this.userExists(user.id)
    if (notExists) {
      this.users = this.users.concat(user)
      this.setItem('users', this.users)
    }
    return notExists
  }

  addTypingUser(conversationId: ConversationId, typingUser: TypingUser): void {
    const [conversation, idx] = this.getConversation(conversationId)
    if (conversation) {
      if (typingUser.isTyping) {
        conversation.addTypingUser(typingUser)
      } else {
        conversation.removeTypingUser(typingUser.userId)
      }
      this.replaceConversation(conversation, idx as number)
    }
  }

  removeUser(userId: UserId): boolean {
    const idx = this.users.findIndex((u) => u.id === userId)
    if (idx !== -1) {
      this.users = this.users.slice(0, idx).concat(this.users.slice(idx + 1))
      this.setItem('users', this.users)
      return true
    }
    return false
  }

  getUser(userId: UserId): [User, number] | [undefined, undefined] {
    const idx = this.users.findIndex((u) => u.id === userId)
    if (idx !== -1) {
      return [this.users[idx], idx]
    }
    return [undefined, undefined]
  }

  conversationExists(conversationId: ConversationId): boolean {
    return this.conversations.findIndex((c) => c.id === conversationId) !== -1
  }

  getConversation(
    conversationId: ConversationId
  ): [Conversation<ConversationData>, number] | [undefined, undefined] {
    const idx = this.conversations.findIndex((c) => c.id === conversationId)
    if (idx !== -1) {
      return [this.conversations[idx], idx]
    }
    return [undefined, undefined]
  }

  addConversation(conversation: Conversation<ConversationData>): boolean {
    const notExists = !this.conversationExists(conversation.id)
    if (notExists) {
      this.conversations = this.conversations.concat(conversation)
      this.setItem('conversations', this.conversations)
    }
    return notExists
  }

  setUnread(conversationId: ConversationId, count: number): void {
    const [conversation] = this.getConversation(conversationId)
    if (conversation) {
      conversation.unreadCounter = count
      this.updateConversation(conversation)
    }
  }

  removeConversation(conversationId: ConversationId, removeMessages = true): boolean {
    const idx = this.conversations.findIndex((c) => c.id === conversationId)
    if (idx !== -1) {
      this.conversations = this.conversations
        .slice(0, idx)
        .concat(this.conversations.slice(idx + 1))
      this.setItem('conversations', this.conversations)

      if (removeMessages) {
        const messages = this.messages
        delete messages[conversationId]
        this.messages = messages
        this.setItem('messages', this.messages)
      }
      return true
    }
    return false
  }

  updateConversation(conversation: Conversation<ConversationData>) {
    const [con, idx] = this.getConversation(conversation.id)
    if (con) {
      this.replaceConversation(conversation, idx as number)
    }
  }

  private replaceConversation(conversation: Conversation<ConversationData>, idx: number) {
    this.conversations = this.conversations
      .slice(0, idx)
      .concat(
        new Conversation({
          id: conversation.id,
          participants: conversation.participants,
          typingUsers: new TypingUsersList({
            items: conversation.typingUsers.items.map((typingUser) => new TypingUser(typingUser))
          }),
          unreadCounter: conversation.unreadCounter,
          draft: conversation.draft,
          description: conversation.description,
          readonly: conversation.readonly,
          data: conversation.data
        })
      )
      .concat(this.conversations.slice(idx + 1))
    this.setItem('conversations', this.conversations)
  }

  private replaceUser(user: User, idx: number) {
    this.users = this.users
      .slice(0, idx)
      .concat(user)
      .concat(this.users.slice(idx + 1))
    this.setItem('users', this.users)
  }

  addParticipant(conversationId: ConversationId, participant: Participant): boolean {
    const [conversation, idx] = this.getConversation(conversationId)
    if (conversation) {
      if (conversation.addParticipant(participant)) {
        this.replaceConversation(conversation, idx as number)
      }
    }
    return false
  }

  removeParticipant(conversationId: ConversationId, participantId: UserId): boolean {
    const [conversation, idx] = this.getConversation(conversationId)
    if (conversation) {
      conversation.removeParticipant(participantId)
      this.replaceConversation(conversation, idx as number)
      return true
    }
    return false
  }

  addMessage(
    message: ChatMessage<MessageContentType>,
    conversationId: ConversationId,
    generateId = false
  ): ChatMessage<MessageContentType> {
    const messages = this.messages
    if (conversationId in messages) {
      const groups = messages[conversationId]
      const lastGroup = groups[groups.length - 1]
      if (lastGroup.senderId === message.senderId) {
        const newMessage = this.getMessageWithId(message, generateId)
        lastGroup.addMessage(newMessage)
        this.messages = messages
        this.setItem('messages', this.messages)
        return newMessage
      }
    }
    const group = new MessageGroup({
      id: this.groupIdGenerator(),
      senderId: message.senderId,
      direction: message.direction
    })
    const newMessage = this.getMessageWithId(message, generateId)
    group.addMessage(newMessage)
    messages[conversationId] =
      conversationId in messages ? messages[conversationId].concat(group) : [group]
    this.messages = messages
    this.setItem('messages', this.messages)
    return newMessage
  }

  updateMessage(message: ChatMessage<MessageContentType>): void {
    const messages = this.messages
    for (const conversationId in messages) {
      const groups = messages[conversationId]
      const l = groups.length
      for (let i = 0; i < l; i++) {
        const group = groups[i]
        const [currentMessage, idx] = group.getMessage(message.id)
        if (currentMessage) {
          group.replaceMessage(message, idx as number)
        }
      }
    }
    this.messages = messages
    this.setItem('messages', this.messages)
  }

  setPresence(userId: UserId, presence: Presence): void {
    const [user, idx] = this.getUser(userId)
    if (user) {
      user.presence = presence
      this.replaceUser(user, idx as number)
    }
  }

  setDraft(draft: string): void {
    if (this.activeConversationId) {
      const [activeConversation, idx] = this.getConversation(this.activeConversationId)
      if (activeConversation) {
        activeConversation.draft = draft
        this.replaceConversation(activeConversation, idx as number)
      }
    }
  }

  clearState(): void {
    localStorage.clear()
  }

  getState(): ChatState {
    return {
      currentUser: this.currentUser,
      users: this.users,
      conversations: this.conversations,
      activeConversation: this.activeConversationId
        ? this.conversations.find((c) => c.id === this.activeConversationId)
        : undefined,
      currentMessages:
        this.activeConversationId && this.activeConversationId in this.messages
          ? this.messages[this.activeConversationId]
          : [],
      messages: this.messages,
      currentMessage: this.currentMessage
    }
  }

  resetState(): void {
    this.currentUser = undefined
    this.users = []
    this.conversations = []
    this.activeConversationId = undefined
    this.messages = {}
    this.setItem('users', this.users)
    this.setItem('conversations', this.conversations)
    this.setItem('activeConversationId', this.activeConversationId)
    this.setItem('messages', this.messages)
  }

  setActiveConversation(conversationId?: ConversationId, resetUnreadCounter = true): void {
    this.activeConversationId = conversationId
    this.setItem('activeConversationId', conversationId)
    if (resetUnreadCounter && conversationId) {
      const [conversation, idx] = this.getConversation(conversationId)
      if (conversation) {
        conversation.unreadCounter = 0
        this.replaceConversation(conversation, idx as number)
      }
    }
  }

  setCurrentMessage(message: string) {
    this.currentMessage = message
    this.setItem('currentMessage', message)
  }

  removeMessagesFromConversation(conversationId: ConversationId) {
    const messages = this.messages
    delete messages[conversationId]
    this.messages = messages
    this.setItem('messages', this.messages)
  }
}
