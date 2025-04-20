import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/appHook';
import { useChat } from '@chatscope/use-chat';
import Chat from '../Chat/Chat';

const AgentChatView = () => {
  const { agentId } = useParams();
  const { agents } = useContext(AppContext);
  const { activeConversation } = useChat();

  const agent = agents.find((a) => a.id === agentId);
  const conversationId = activeConversation?.id;

  if (!agent) {
    return <div className="text-danger">Agent not found</div>;
  }

  if (!conversationId) {
    return <div className="text-muted">No conversation selected</div>;
  }

  return <Chat agent={agent} conversationId={conversationId} />;
};

export default AgentChatView;
