import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import {
  ChatMessage,
  ChatProvider,
  IStorage,
  MessageContentType,
  Presence,
  UpdateState,
  User,
  UserStatus
} from '@chatscope/use-chat'
import { Chat } from './components/Chat/Chat'
import { nanoid } from 'nanoid'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import avatar from './assets/react.svg'
import { AutoDraft } from '@chatscope/use-chat/dist/enums/AutoDraft'
import useAppHook, { AppContext } from './hooks/appHook'
import { ChatService } from './ChatService'
import { ChatLocalStorage } from './ChatLocalStorage'
import Agents from './components/Agents/Agents'
import { ExportModal } from './components/ExportModal/ExportModal'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const messageIdGenerator = (_message: ChatMessage<MessageContentType>) => nanoid()
const groupIdGenerator = () => nanoid()
const storage = new ChatLocalStorage({ groupIdGenerator, messageIdGenerator })

const serviceFactory = (storage: IStorage, updateState: UpdateState) => {
  return new ChatService(storage, updateState)
}

const user = new User({
  id: 'Me',
  presence: new Presence({ status: UserStatus.Available, description: '' }),
  firstName: '',
  lastName: '',
  username: 'Me',
  email: '',
  avatar,
  bio: ''
})
const assistantUser = new User({
  id: 'assistant',
  presence: new Presence({ status: UserStatus.Available, description: '' }),
  firstName: '',
  lastName: '',
  username: 'assistant',
  email: '',
  avatar,
  bio: ''
})
storage.addUser(user)
storage.addUser(assistantUser)

function App() {
  const provider = useAppHook()

  return (
    <AppContext.Provider value={provider}>
      {provider.activePage === 'Home' && (
        <div className="overflow-hidden w-100 h-100">
          <ChatProvider
            serviceFactory={serviceFactory}
            storage={storage}
            config={{
              typingThrottleTime: 250,
              typingDebounceTime: 900,
              debounceTyping: true,
              autoDraft: AutoDraft.Save | AutoDraft.Restore
            }}
          >
            <Chat user={user} assistantUser={assistantUser} storage={storage} />
          </ChatProvider>
        </div>
      )}
      {provider.activePage === 'Agents' && <Agents />}
      <ExportModal />
    </AppContext.Provider>
  )
}

export default App
