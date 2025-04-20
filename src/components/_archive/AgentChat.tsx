import { useContext, useMemo } from 'react';
import { ChatProvider, Presence, User, UserStatus } from '@chatscope/use-chat';
import { ChatService } from '../../services/ChatService';
import { ChatLocalStorage } from '../../services/ChatLocalStorage';
import { AutoDraft } from '@chatscope/use-chat/dist/enums/AutoDraft';
import { AppContext } from '../../hooks/appHook';
import avatar from '../../assets/react.svg';
import InnerChat from './InnerChat'; // your current main UI logic

const messageIdGenerator = () => nanoid();
const groupIdGenerator = () => nanoid();
const storage = new ChatLocalStorage({ groupIdGenerator, messageIdGenerator });

const user = new User({
  id: 'Me',
  presence: new Presence({ status: UserStatus.Available }),
  username: 'Me',
  avatar
});

const assistantUser = new User({
  id: 'assistant',
  presence: new Presence({ status: UserStatus.Available }),
  username: 'assistant',
  avatar
});

storage.addUser(user);
storage.addUser(assistantUser);

type ChatProps = {
  agentId: string;
  conversationId: string | null;
};

const Chat = ({ agentId, conversationId }: ChatProps) => {
  const { agents } = useContext(AppContext);
  const agent = agents.find((a) => a.id === agentId);

  const chatService = useMemo(() => {
    if (!agent) return null;
    return new ChatService(storage, () => {}, agent);
  }, [agent]);

  if (!agent || !chatService) {
    return <div className="text-danger">Agent not found</div>;
  }

  return (
    <ChatProvider
      storage={storage}
      serviceFactory={() => chatService}
      config={{
        typingThrottleTime: 250,
        typingDebounceTime: 900,
        debounceTyping: true,
        autoDraft: AutoDraft.Save | AutoDraft.Restore
      }}
    >
      <InnerChat agentId={agentId} conversationId={conversationId} />
    </ChatProvider>
  );
};

export default Chat;
