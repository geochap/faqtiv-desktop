import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/appHook';
import AgentDetails from './AgentDetails';

const AgentConfigView = () => {
  const { agentId } = useParams();
  const { agents, updateAgent, deleteAgent } = useContext(AppContext);
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) return <div className="text-danger">Agent not found</div>;

  return (
<div
  style={{
    padding: '2rem',
    margin: '0 auto',
    height: '100%',
    overflowY: 'auto',
  }}
>
      <h3 className="mb-4">Configure Agent</h3>
      <AgentDetails
        agent={agent}
        onUpdateAgent={updateAgent}
        onDeleteAgent={deleteAgent}
      />
    </div>
  );
};

export default AgentConfigView;
