import { useState } from 'react';
import { ListGroup, Collapse, Button, Modal } from 'react-bootstrap';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useChat, Conversation, ConversationRole, Participant } from '@chatscope/use-chat';
import AddAgentModal from '../Agents/AddAgentModal';
import { nanoid } from 'nanoid';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const Sidebar = ({
  agents,
  selectedAgentId,
  onSelectAgent
}) => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    removeConversation,
    addConversation
  } = useChat();

  const [openAgentId, setOpenAgentId] = useState(null);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { agentId } = useParams();

  const handleNewConversation = (agentId) => {
    const newConversation = new Conversation({
      id: nanoid(),
      participants: [new Participant({ id: 'Me', role: ConversationRole.User })],
      data: { agentId },
      description: 'Untitled'
    });
    addConversation(newConversation);
    setActiveConversation(newConversation.id);
    navigate(`/agents/${agentId}/chat`);
  };

  const isSectionActive = (section) => location.pathname.endsWith(`/${section}`);

  return (
    <div style={{ width: '240px' }}>
      <div className="d-flex justify-content-between align-items-center px-3 pt-2 pb-1">
        <h6 className="m-0 text-uppercase text-muted">Agents</h6>
        <Button
          variant="link"
          size="sm"
          className="p-0"
          onClick={() => setShowAddAgentModal(true)}
          title="Add Agent"
        >
          <Plus size={16} />
        </Button>
      </div>

      <ListGroup variant="flush" className="flex-grow-1 overflow-auto px-2">
        {agents.map((agent) => {
          const agentConvos = conversations
            ?.filter((c) => c.data?.agentId === agent.id)
            .slice()
            .reverse();

          const isActive = agent.id === selectedAgentId;

          return (
            <div key={agent.id}>
              <ListGroup.Item
                action
                active={isActive}
                className="d-flex align-items-center justify-content-between"
                onClick={() => {
                  onSelectAgent(agent.id);
                  setOpenAgentId(openAgentId === agent.id ? null : agent.id);
                  if (agentConvos[0]) {
                    setActiveConversation(agentConvos[0].id);
                    navigate(`/agents/${agent.id}/chat`);
                  }
                }}
                style={{ fontSize: '1rem', fontWeight: '500' }}
              >
                <span>{agent.name}</span>
                {openAgentId === agent.id ? (
                  <ChevronDown size={16} className="text-muted" />
                ) : (
                  <ChevronRight size={16} className="text-muted" />
                )}
              </ListGroup.Item>

              {isActive && (
                <Collapse in={openAgentId === agent.id}>
                  <div className="mb-2">
                    <div className="mt-1 ms-3">
                      {['chat', 'config', 'train'].map((section) => (
                        <div key={section}>
                          <div
                            className={`sidebar-link d-flex align-items-center gap-1 ${
                              isSectionActive(section) ? 'fw-bold text-primary' : ''
                            }`}
                            onClick={() => navigate(`/agents/${agent.id}/${section}`)}
                            style={{
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              padding: '2px 0'
                            }}
                          >
                            <ChevronRight size={12} />
                            <span>
                              {section === 'chat'
                                ? 'Chat'
                                : section === 'config'
                                ? 'Configure'
                                : 'Knowledge Base'}
                            </span>
                          </div>

                          {section === 'chat' && isSectionActive('chat') && (
                            <div className="mt-1 ms-4">
                              {agentConvos.map((c) => {
                                const isChatActive = c.id === activeConversation?.id;
                                return (
                                  <div
                                    key={c.id}
                                    className="d-flex justify-content-between align-items-center py-1"
                                    style={{
                                      fontSize: '0.85rem',
                                      fontWeight: isChatActive ? 'bold' : 'normal',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      color: isChatActive ? '#0d6efd' : undefined
                                    }}
                                    title={c.description || 'Untitled'}
                                    onClick={() => {
                                      setActiveConversation(c.id);
                                      navigate(`/agents/${agent.id}/chat`);
                                    }}
                                  >
                                    <div className="flex-grow-1 text-truncate">
                                      {c.description || 'Untitled'}
                                    </div>
                                    <Trash2
                                      size={14}
                                      className="text-danger ms-2 d-none hover-delete flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(c.id);
                                      }}
                                    />
                                  </div>
                                );
                              })}

                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNewConversation(agent.id);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  color: '#0d6efd',
                                  paddingTop: '6px'
                                }}
                              >
                                + New Chat
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Collapse>
              )}
            </div>
          );
        })}
      </ListGroup>

      <AddAgentModal show={showAddAgentModal} handleClose={() => setShowAddAgentModal(false)} />

      <Modal show={!!confirmDeleteId} onHide={() => setConfirmDeleteId(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this conversation?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              removeConversation(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <style>
        {`
          .d-flex:hover .hover-delete {
            display: inline !important;
          }
        `}
      </style>
    </div>
  );
};

export default Sidebar;