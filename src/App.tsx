import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

import { Container } from 'react-bootstrap';
import { Routes, Route, Navigate } from 'react-router-dom';
import avatar from './assets/react.svg';

import useAppHook, { AppContext } from './hooks/appHook';
import NavigationListener from './components/Layout/NavigationListener';

import AgentsPage from './components/Agents/AgentsPage';
import AgentChatView from './components/Agents/AgentChatView';
import AgentConfigView from './components/Agents/AgentConfigView';
import AgentTrainView from './components/Agents/KB/AgentTrainView';
import AgentTaskView from './components/Agents/Tasks/AgentTaskView';
import AgentTrainingDetailRoute from './components/Agents/KB/AgentTrainingDetailRoute';
import AgentTaskDetailRoute from './components/Agents/Tasks/AgentTaskDetailRoute';

import { chatService, chatStorage } from './services/ChatServiceInstance';

import {
  ChatProvider,
  Presence,
  User,
  UserStatus
} from '@chatscope/use-chat';

import { AutoDraft } from '@chatscope/use-chat/dist/enums/AutoDraft';

// Chat setup

const user = new User({
  id: 'Me',
  username: 'Me',
  presence: new Presence({ status: UserStatus.Available }),
  avatar
});

const assistantUser = new User({
  id: 'assistant',
  username: 'assistant',
  presence: new Presence({ status: UserStatus.Available }),
  avatar
});

chatStorage.addUser(user);
chatStorage.addUser(assistantUser);

function App() {
  const provider = useAppHook();

  return (
    <AppContext.Provider value={provider}>
      <ChatProvider
        storage={chatStorage}
        serviceFactory={() => chatService}
        config={{
          typingThrottleTime: 250,
          typingDebounceTime: 900,
          debounceTyping: true,
          autoDraft: AutoDraft.Save | AutoDraft.Restore
        }}
      >
        <NavigationListener />
        <Container fluid className="p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/agents" replace />} />

            {/* Sidebar layout with nested views */}
            <Route path="/agents" element={<AgentsPage />}>
              <Route path=":agentId/chat" element={<AgentChatView />} />
              <Route path=":agentId/config" element={<AgentConfigView />} />
              <Route path=":agentId/train" element={<AgentTrainView />} />
              <Route path=":agentId/tasks" element={<AgentTaskView />} />
              <Route path=":agentId/tasks/:taskId" element={<AgentTaskDetailRoute />} />              
              <Route path=":agentId/training/:entryId" element={<AgentTrainingDetailRoute />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Container>
      </ChatProvider>
    </AppContext.Provider>
  );
}

export default App;
