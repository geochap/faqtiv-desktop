import { useContext } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { AppContext } from '../../hooks/appHook';
import Sidebar from '../Layout/Sidebar';

const AgentsPage = () => {
  const { agents } = useContext(AppContext);
  const { agentId } = useParams();

  const validAgent = agents.find((a) => a.id === agentId);

  // If no agent is selected, redirect to first available
  if (!agentId && agents.length > 0) {
    return <Navigate to={`/agents/${agents[0].id}/chat`} replace />;
  }

  // If agentId is present but invalid, show error
  if (agentId && !validAgent) {
    return <div className="text-danger p-3">Agent not found</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar
        agents={agents}
        selectedAgentId={agentId || null}
        onSelectAgent={(id) => {}} // handled by navigation now
        activeSection={null}       // no longer used
        onSelectSection={() => {}} // no longer used
      />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default AgentsPage;
