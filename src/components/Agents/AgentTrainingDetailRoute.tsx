import { useParams } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../../hooks/appHook';
import AgentTrainingDetail from './AgentTrainingDetail';

const AgentTrainingDetailRoute = () => {
  const { agentId } = useParams();
  const { agents } = useContext(AppContext);

  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return <div className="text-muted">Loading agent...</div>;
  }

  return <AgentTrainingDetail agent={agent} />;
};

export default AgentTrainingDetailRoute;
