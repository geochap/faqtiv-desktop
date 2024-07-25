import { useCallback, useContext, useEffect, useState } from 'react'

import {
  MainContainer,
  Sidebar,
  ConversationList,
  Conversation,
  ChatContainer,
  MessageGroup,
  Message,
  MessageList,
  MessageInput,
  Avatar,
  TypingIndicator
} from '@chatscope/chat-ui-kit-react'

import {
  useChat,
  ChatMessage,
  MessageContentType,
  MessageDirection,
  MessageStatus,
  Conversation as StorageConversation,
  Participant,
  ConversationRole,
  TypingUsersList,
  IStorage
} from '@chatscope/use-chat'
import { MessageContent, TextContent, User } from '@chatscope/use-chat'
import { Button } from 'react-bootstrap'
import { PenBox, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import { AIAssistant, AIAssistantResponse, createAssistant } from '../../ai/aiAssistant'
import { AppContext } from '../../hooks/appHook'
import { Markdown } from '../Markdown'
import { CopyButton } from './CopyButton'
import FileDownloadButton from './FileDownloadButton'

type ChatProps = {
  user: User
  assistantUser: User
  storage: IStorage
}

const XML_RX = /<!--\[if.*?\]>.*?<!--\[endif\]-->/gis
const HTML_RX =
  /<(?!img|table|\/table|thead|\/thead|tbody|\/tbody|tr|\/tr|td|\/td|th|\/th|br|\/br).*?>/gi
const WHITESPACE_RX = /\s+/g

export const Chat = ({ user, assistantUser, storage }: ChatProps) => {
  const {
    currentMessages,
    conversations,
    activeConversation,
    currentMessage,
    setActiveConversation,
    sendMessage,
    setCurrentMessage,
    setCurrentUser,
    addConversation,
    removeConversation
  } = useChat()
  const { agents, openaiConfig, getToolSchemas, callAssistantTool } = useContext(AppContext)
  const [showSideBar] = useState(true)
  const [assistantResponseIsLoading, setAssistantResponseIsLoading] = useState(false)
  const [assistant, setAssistant] = useState<AIAssistant>()
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentUser(user)
  }, [user, openaiConfig, setCurrentUser])

  const handleChange = (value: string) => {
    const cleanValue = value
      .replace(XML_RX, '')
      .replace(HTML_RX, '')
      .replace(WHITESPACE_RX, ' ')
      .trim()

    setCurrentMessage(cleanValue)
  }

  const getAssistantInstance = async (id?: string, threadId?: string): Promise<AIAssistant> => {
    return await createAssistant({
      id,
      threadId,
      tools: getToolSchemas(),
      agents,
      openaiApiKey: openaiConfig!.apiKey,
      openaiModel: openaiConfig?.model
    })
  }

  const handleSend = async (text: string) => {
    activeConversation?.addParticipant(
      new Participant({
        id: assistantUser.id,
        role: new ConversationRole([])
      })
    )

    const message = new ChatMessage({
      id: nanoid(),
      content: text as unknown as MessageContent<TextContent>,
      contentType: MessageContentType.TextHtml,
      senderId: user.id,
      direction: MessageDirection.Outgoing,
      status: MessageStatus.Sent
    })
    sendMessage({
      message,
      conversationId: activeConversation!.id,
      senderId: user.id
    })

    setError(null)
    setAssistantResponseIsLoading(true)

    let assistantInstance: AIAssistant | undefined = assistant
    if (!assistantInstance) {
      assistantInstance = await getAssistantInstance(
        activeConversation?.data.assistantId,
        activeConversation?.data.threadId
      )
      setAssistant(assistantInstance)
    }

    setCurrentAssistantMessage('')
    try {
      const assistantResponse: AIAssistantResponse = await assistantInstance.addUserMessage(
        text,
        (delta) => {
          setCurrentAssistantMessage((prev) => (prev += delta))
        },
        callAssistantTool
      )
      setAssistantResponseIsLoading(false)
      if (activeConversation) {
        activeConversation.data = {
          threadId: assistantResponse.threadId,
          assistantId: assistantResponse.assistantId
        }
        activeConversation.description = text
        storage.updateConversation(activeConversation)
      }

      if (!assistantResponse.aborted) {
        const messageId = nanoid()
        const assistantChatMessage = new ChatMessage({
          id: messageId,
          content: { content: assistantResponse },
          contentType: MessageContentType.TextMarkdown,
          senderId: assistantUser.id,
          direction: MessageDirection.Incoming,
          status: MessageStatus.Sent
        })
        sendMessage({
          message: assistantChatMessage,
          conversationId: activeConversation!.id,
          senderId: assistantUser.id
        })
      }
      setCurrentAssistantMessage(null)
    } catch (e: any) {
      setError(e.message)
      setAssistantResponseIsLoading(false)
      setCurrentAssistantMessage(null)
    }
  }

  const cancelRequest = useCallback(() => {
    if (assistant) assistant.cancelCurrentRun()
    setAssistantResponseIsLoading(false)
    setCurrentAssistantMessage(null)
  }, [assistant, setAssistantResponseIsLoading, setCurrentAssistantMessage])

  const getTypingIndicator = useCallback(() => {
    const cancelButton = (
      <button
        style={{
          padding: 0,
          margin: 0,
          color: 'rgba(94, 93, 107, 0.5)',
          marginTop: '-5px'
        }}
        onClick={cancelRequest}
        className="btn"
      >
        cancel
      </button>
    )

    if (assistantResponseIsLoading) {
      return <TypingIndicator content={cancelButton} />
    }
    return undefined
  }, [assistantResponseIsLoading, cancelRequest])

  const handleNewConversation = () => {
    const newConversation = new StorageConversation({
      id: nanoid(),
      participants: [
        new Participant({
          id: user.id,
          role: new ConversationRole([])
        })
      ],
      unreadCounter: 0,
      typingUsers: new TypingUsersList({ items: [] }),
      draft: '',
      description: 'New chat',
      data: {
        assistantId: undefined,
        threadId: undefined
      }
    })

    addConversation(newConversation)
    setActiveConversation(newConversation.id)
    setAssistant(undefined)
    setError(null)
  }

  const handleDeleteConversation = async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId)
    const assistantInstance = await getAssistantInstance(
      conversation?.data.assistantId,
      conversation?.data.threadId
    )
    if (conversationId === activeConversation?.id) {
      setError(null)
      setAssistant(undefined)
      setError(null)
      setAssistantResponseIsLoading(false)
      //todo: check if there's an ongoing request to cancel
    }

    await assistantInstance.destroy()
    removeConversation(conversationId, true)
  }

  return (
    <MainContainer responsive style={{ position: 'relative' }}>
      <Sidebar position="left" scrollable style={{ maxWidth: '250px' }} hidden={!showSideBar}>
        <Button
          onClick={handleNewConversation}
          className="btn btn-secondary"
          style={{
            margin: '0.5em',
            textAlign: 'center',
            borderRadius: '.7em',
            padding: '0.4em 0.8em'
          }}
        >
          <PenBox size={20} />
          <span style={{ marginLeft: '0.5em' }}>New chat</span>
        </Button>
        <ConversationList>
          {conversations.map((c) => {
            return (
              <Conversation
                key={c.id}
                name={c.description}
                active={activeConversation?.id === c.id}
                unreadCnt={c.unreadCounter}
                onClick={() => setActiveConversation(c.id)}
                style={{
                  padding: '0.5em 1.5em',
                  borderRadius: '1em',
                  margin: '0 0.4em 0.2em 0.4em'
                }}
              >
                {/**todo: fix this hack with a proper conversation content class */}
                <Avatar
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '5px',
                    margin: 0,
                    width: '0',
                    height: '0'
                  }}
                >
                  <button
                    className="btn cs-conversation__delete-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDeleteConversation(c.id)
                    }}
                  >
                    <X size={14}></X>
                  </button>
                </Avatar>
              </Conversation>
            )
          })}
        </ConversationList>
      </Sidebar>

      <ChatContainer>
        <MessageList typingIndicator={getTypingIndicator()}>
          {activeConversation &&
            currentMessages.map((g) => (
              <MessageGroup key={g.id} direction={g.direction}>
                <MessageGroup.Messages>
                  {g.messages.map((m: ChatMessage<MessageContentType>) => {
                    if (m.senderId === 'assistant') {
                      //@ts-expect-error todo: define MessageContent custom type
                      const { response, data } = m.content.content

                      return (
                        <Message
                          key={m.id}
                          model={{
                            type: 'custom',
                            direction: m.direction,
                            position: 'normal'
                          }}
                        >
                          <Message.CustomContent>
                            <Markdown>{String(response)}</Markdown>
                            {data.files?.length > 0 && (
                              <div className="cs-message-files">
                                {data.files.map(
                                  (f: AIAssistantResponse['data']['files'][0], index: number) => (
                                    <div key={index}>
                                      <FileDownloadButton
                                        name={f.name}
                                        path={f.path}
                                        mimeType={f.mimeType}
                                      />
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            <CopyButton content={String(response)} />
                          </Message.CustomContent>
                        </Message>
                      )
                    }
                    return (
                      <Message
                        key={m.id}
                        model={{
                          type: 'html',
                          payload: m.content,
                          direction: m.direction,
                          position: 'normal'
                        }}
                      />
                    )
                  })}
                </MessageGroup.Messages>
              </MessageGroup>
            ))}
          <Message
            hidden={!currentAssistantMessage}
            model={{
              type: 'custom',
              direction: 'incoming',
              position: 'last'
            }}
          >
            <Message.CustomContent>
              <Markdown>{String(currentAssistantMessage)}</Markdown>
            </Message.CustomContent>
          </Message>
          <Message
            hidden={!error}
            model={{
              type: 'custom',
              direction: 'incoming',
              position: 'last'
            }}
            className="cs-error-message"
          >
            <Message.CustomContent>
              <div className="cs-error-message-content">
                {error}
                <button onClick={() => setError(null)} className="btn">
                  <X size={15} />
                </button>
              </div>
            </Message.CustomContent>
          </Message>
        </MessageList>
        <MessageInput
          value={currentMessage}
          onChange={handleChange}
          onSend={handleSend}
          disabled={!activeConversation}
          attachButton={false}
          placeholder="Type here..."
        />
      </ChatContainer>
    </MainContainer>
  )
}
