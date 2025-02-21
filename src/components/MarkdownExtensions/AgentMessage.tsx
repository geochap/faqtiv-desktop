import React from 'react'
import './AgentMessage.css'

interface AgentMessageProps {
  msg: string
}

const AgentMessage: React.FC<AgentMessageProps> = ({ msg }) => {
  return <div className="agent-message">{msg}</div>
}

export default AgentMessage
