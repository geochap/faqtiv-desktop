import { useState } from 'react';
import AgentDetails from '../Agents/AgentDetails';
import AgentTraining from '../Agents/AgentTraining';
import { Agent } from '../../types';

import Chat from '../Chat/Chat';
import { Settings } from 'lucide-react';
import { Dropdown } from 'react-bootstrap';

type Props = {
  agent: Agent;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  onUpdateAgent: (agent: Agent) => Promise<void>;
  onDeleteAgent: (id: string) => Promise<void>;
};

const AgentDetailsView = ({
  agent,
  activeConversationId,
  setActiveConversationId,
  onUpdateAgent,
  onDeleteAgent
}: Props) => {
  const [mode, setMode] = useState<'chat' | 'config' | 'train'>('chat');

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #ddd'
        }}
      >
        <h5 className="m-0">
          {mode === 'chat' ? 'Chat' : mode === 'config' ? 'Configuration' : 'Training'}
        </h5>
        <Dropdown align="end">
          <Dropdown.Toggle variant="link" id="dropdown-settings" style={{ padding: 0 }}>
            <Settings role="button" size={20} title="Agent Settings" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setMode('config')}>Configure</Dropdown.Item>
            <Dropdown.Item onClick={() => setMode('train')}>Training</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={() => setMode('chat')}>Back to Chat</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Main view */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {mode === 'config' && (
          <div style={{ padding: '1rem' }}>
            <AgentDetails
              agent={agent}
              onUpdateAgent={onUpdateAgent}
              onDeleteAgent={onDeleteAgent}
            />
          </div>
        )}

        {mode === 'train' && (
          <div style={{ padding: '1rem' }}>
            <AgentTraining agent={agent} />
          </div>
        )}

        {mode === 'chat' && (
            <Chat agentId={agent.id} conversationId={activeConversationId} />
        )}
      </div>
    </div>
  );
};

export default AgentDetailsView;
