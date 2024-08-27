import { useCallback, useContext, useEffect, useRef, useState } from 'react'

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
  ChatEventType
} from '@chatscope/use-chat'
import { MessageContent, TextContent, User } from '@chatscope/use-chat'
import { Button, Modal } from 'react-bootstrap'
import { PenBox, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import { AppContext } from '../../hooks/appHook'
import { Markdown } from '../Markdown'
import { CopyButton } from './CopyButton'
import { ChatService } from '../../ChatService'

type ChatProps = {
  user: User
  chatService: ChatService
}

const XML_RX = /<!--\[if.*?\]>.*?<!--\[endif\]-->/gis
const HTML_RX =
  /<(?!img|table|\/table|thead|\/thead|tbody|\/tbody|tr|\/tr|td|\/td|th|\/th|br|\/br).*?>/gi
const WHITESPACE_RX = /\s+/g

export const Chat = ({ user, chatService }: ChatProps) => {
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
    removeConversation,
    getConversation
  } = useChat()
  const { agents } = useContext(AppContext)
  const [showSideBar] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentAgentMessage = useRef<string | null>(null)
  const currentMessageRef = useRef<string | undefined>()
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const chatServiceRef = useRef(chatService)

  const handleNewConversation = () => {
    setShowAgentModal(true)
  }

  const createNewConversation = (agentId: string) => {
    const newConversation = new StorageConversation({
      id: nanoid(),
      participants: [
        new Participant({
          id: user.id,
          role: new ConversationRole([])
        }),
        new Participant({
          id: agentId,
          role: new ConversationRole([])
        })
      ],
      unreadCounter: 0,
      typingUsers: new TypingUsersList({ items: [] }),
      draft: '',
      description: 'New chat',
      data: {
        agentId
      }
    })

    addConversation(newConversation)
    setActiveConversation(newConversation.id)
    setError(null)
    setShowAgentModal(false)
    setSelectedAgent(null)
  }

  const handleUserTyping = useCallback((event: any) => {
    if (event.isTyping) {
      currentAgentMessage.current += event.content
    } else {
      currentAgentMessage.current = null
    }
  }, [])

  useEffect(() => {
    setCurrentUser(user)

    const service = chatServiceRef.current
    service.on(ChatEventType.UserTyping, handleUserTyping)

    return () => {
      service.off(ChatEventType.UserTyping, handleUserTyping)
    }
  }, [user, setCurrentUser, handleUserTyping])

  useEffect(() => {
    chatServiceRef.current.setAgents(agents)
  }, [agents])

  const handleChange = (value: string) => {
    const cleanValue = value
      .replace(XML_RX, '')
      .replace(HTML_RX, '')
      .replace(WHITESPACE_RX, ' ')
      .trim()

    setCurrentMessage(cleanValue)
  }

  const handleSend = async (text: string) => {
    currentAgentMessage.current = ''
    setCurrentMessage(currentMessageRef.current || '')
    currentMessageRef.current = undefined

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
  }

  const getTypingIndicator = useCallback(() => {
    if (activeConversation) {
      const conversation = getConversation(activeConversation.id)
      if (!conversation) return undefined

      const { typingUsers } = conversation

      if (typingUsers.length > 0) {
        return <TypingIndicator />
      }
    }
    return undefined
  }, [activeConversation, getConversation])

  const handleDeleteConversation = async (conversationId: string) => {
    if (conversationId === activeConversation?.id) setError(null)
    removeConversation(conversationId, true)
  }

  return (
    <>
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
                      if (m.senderId !== user.id) {
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
                              <Markdown>{String(m.content)}</Markdown>
                              <CopyButton content={String(m.content)} />
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
              hidden={!currentAgentMessage.current}
              model={{
                type: 'custom',
                direction: 'incoming',
                position: 'last'
              }}
            >
              <Message.CustomContent>
                <Markdown>{String(currentAgentMessage.current)}</Markdown>
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

        <Modal show={showAgentModal} onHide={() => setShowAgentModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Select an Agent</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {agents.map((agent) => (
              <Button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                variant={selectedAgent === agent.id ? 'primary' : 'outline-primary'}
                className="m-2"
              >
                {agent.name}
              </Button>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAgentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => selectedAgent && createNewConversation(selectedAgent)}
              disabled={!selectedAgent}
            >
              Start Chat
            </Button>
          </Modal.Footer>
        </Modal>
      </MainContainer>
    </>
  )
}
