import {
  ChatContainer,
  MessageGroup,
  Message,
  MessageList,
  MessageInput,
  TypingIndicator
} from '@chatscope/chat-ui-kit-react'
import {
  useChat,
  ChatMessage,
  MessageContentType,
  MessageDirection,
  MessageStatus,
  TextContent
} from '@chatscope/use-chat'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { nanoid } from 'nanoid'
import DOMPurify from 'dompurify'
import { Markdown } from '../Markdown'
import { CopyButton } from './CopyButton'

import { Agent } from '../../types'
import { chatService } from '../../services/ChatServiceInstance';
import { ChatServiceEventType } from '../../services/ChatService'

export type ChatProps = {
  agent: Agent
  conversationId: string | null
}

const userId = 'Me'

const Chat = ({ agent, conversationId }: ChatProps) => {
  const {
    currentMessages,
    conversations,
    activeConversation,
    setActiveConversation,
    sendMessage,
    setCurrentUser,
    getConversation
  } = useChat()

  const messageInputRef = useRef<HTMLInputElement>(null)
  const messageListRef = useRef<any>(null)

  const currentMessageRef = useRef<string | undefined>()
  const [streamingMessage, setStreamingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filteredConversations = useMemo(
    () => conversations.filter((c) => c.data?.agentId === agent.id),
    [conversations, agent.id]
  )

  const initializedRef = useRef(false)

  useEffect(() => {
    initializedRef.current = false
  }, [agent.id])

  useEffect(() => {
    if (!initializedRef.current && filteredConversations.length > 0) {
      setActiveConversation(filteredConversations[0].id)
      initializedRef.current = true
    }
  }, [filteredConversations, setActiveConversation])

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId)
    }
  }, [conversationId, setActiveConversation])

  useEffect(() => {
    if (activeConversation) {
      chatService.setAgentForConversation(activeConversation.id, agent)
    }
  }, [activeConversation, agent])

  useEffect(() => {
    messageListRef.current?.scrollToBottom?.()
  }, [currentMessages, activeConversation])

  useEffect(() => {
    const handleTyping = (event: any) => {
      if (event.isTyping) {
        setStreamingMessage((prev) => prev + event.content)
      } else {
        setStreamingMessage('')
      }
    }

    chatService.on(ChatServiceEventType.UserTyping, handleTyping)
    return () => {
      chatService.off(ChatServiceEventType.UserTyping, handleTyping)
    }
  }, [])

  const handleChange = (text: string) => {
    currentMessageRef.current = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData('text')
    handleChange(`${currentMessageRef.current || ''}${pastedText}`)

    if (messageInputRef.current) {
      const editableElement = document.querySelector('.cs-message-input__content-editor')
      if (editableElement) {
        editableElement.innerHTML = currentMessageRef.current || ''
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        editableElement.dispatchEvent(inputEvent)
        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(editableElement)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }

  const handleSend = async (text: string) => {
    setStreamingMessage('')
    currentMessageRef.current = undefined

    const message = new ChatMessage({
      id: nanoid(),
      content: text as unknown as TextContent,
      contentType: MessageContentType.TextHtml,
      senderId: userId,
      direction: MessageDirection.Outgoing,
      status: MessageStatus.Sent,
      data: { agentId: agent.id } // attach agentId for routing
    })

    sendMessage({
      message,
      conversationId: activeConversation!.id,
      senderId: userId
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

  return (
    <ChatContainer
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        paddingBottom: '40px'
      }}
    >
      <MessageList typingIndicator={getTypingIndicator()} ref={messageListRef} style={{ flex: 1, overflowY: 'auto' }}>
        {activeConversation &&
          currentMessages.map((g) => (
            <MessageGroup key={g.id} direction={g.direction}>
              <MessageGroup.Messages>
                {g.messages.map((m: ChatMessage<MessageContentType>) => (
                  <Message
                    key={m.id}
                    model={{
                      type: m.senderId !== userId ? 'custom' : 'html',
                      payload: m.content,
                      direction: m.direction,
                      position: 'normal'
                    }}
                  >
                    {m.senderId !== userId && (
                      <Message.CustomContent>
                        <Markdown>{String(m.content)}</Markdown>
                        <CopyButton content={String(m.content)} />
                      </Message.CustomContent>
                    )}
                  </Message>
                ))}
              </MessageGroup.Messages>
            </MessageGroup>
          ))}
        <Message
          hidden={!streamingMessage}
          model={{
            type: 'custom',
            direction: 'incoming',
            position: 'last'
          }}
        >
          <Message.CustomContent>
            <Markdown>{streamingMessage}</Markdown>
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
        ref={messageInputRef}
        onChange={handleChange}
        onPaste={handlePaste}
        onSend={handleSend}
        disabled={!activeConversation}
        attachButton={false}
        placeholder="Type here..."
      />
    </ChatContainer>
  )
}

export default Chat