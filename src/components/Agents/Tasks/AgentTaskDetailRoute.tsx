import { useParams } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../../../hooks/appHook';
import AgentTaskDetail from './AgentTaskDetail';

const AgentTaskDetailRoute = () => {
  const { agentId } = useParams();
  const { agents, isInit } = useContext(AppContext);

  console.log('agentId from params:', agentId);
  console.log('agents:', agents);

  if (!isInit) return <div className="text-muted">Initializing...</div>;
  if (!agentId) return <div className="text-danger">No agentId in route</div>;

  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return <div className="text-danger">Agent not found</div>;

  return <AgentTaskDetail agent={agent} />;
};

export default AgentTaskDetailRoute;
