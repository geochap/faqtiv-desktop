import React from 'react';
import './AgentMessage.css'; // Optional: import a CSS file for styling

interface AgentMessageProps {
  msg: string;
}

const AgentMessage: React.FC<AgentMessageProps> = ({ msg }) => {
  return (
    <div className="agent-message">
      {msg}
    </div>
  );
};

export default AgentMessage;
