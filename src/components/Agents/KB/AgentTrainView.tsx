import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../../hooks/appHook';
import AgentTraining from './AgentTraining';

const AgentTrainView = () => {
  const { agentId } = useParams();
  const { agents } = useContext(AppContext);

  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return <div className="text-muted">Loading agent...</div>;
  }

  return (
    <div
      style={{
        padding: '2rem',
        margin: '0 auto',
        flex: 1,
        overflowY: 'auto',
        maxHeight: '100%'
      }}
    >
      <h3 className="mb-4">Agent Knowledge Base</h3>
      <AgentTraining agent={agent} />
    </div>
  );
};

export default AgentTrainView;
