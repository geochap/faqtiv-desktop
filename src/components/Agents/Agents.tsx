import { useContext, useState } from 'react'
import { Button, Alert } from 'react-bootstrap'
import { AppContext } from '../../hooks/appHook'
import { Agent } from '../../types'
import { User } from 'lucide-react'
import AgentDetails from './AgentDetails'
import AddAgentModal from './AddAgentModal'

const Agents = () => {
  const { agents, updateAgent, deleteAgent, addAgent } = useContext(AppContext)
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectAgent = (index: number) => {
    setSelectedAgentIndex(index)
  }

  const handleUpdateAgent = async (updatedAgent: Agent) => {
    try {
      await updateAgent(updatedAgent)
    } catch (err) {
      setError(err as string)
    }
  }

  const handleDeleteAgent = async (id: string) => {
    await deleteAgent(id)
    setSelectedAgentIndex(agents.length > 1 ? 0 : -1)
  }

  const handleAddAgent = async (newAgent: Agent) => {
    await addAgent(newAgent)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div
        style={{
          width: '250px',
          borderRight: '1px solid #ddd',
          padding: '10px',
          backgroundColor: '#f8f9fa'
        }}
      >
        <Button
          onClick={() => setShowAddModal(true)}
          className="btn btn-secondary"
          style={{
            width: '100%',
            marginBottom: '1em',
            textAlign: 'center',
            borderRadius: '.7em',
            padding: '0.4em 0.8em'
          }}
        >
          <User className="me-1" style={{ verticalAlign: 'sub' }} size={20} />
          <span>Add agent</span>
        </Button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {agents.map((agent, index) => (
            <li
              key={index}
              style={{
                fontWeight: 'bold',
                width: '100%',
                padding: '0.5em 1.5em',
                borderRadius: '1em',
                margin: '0 0 0.2em',
                cursor: 'pointer',
                backgroundColor: selectedAgentIndex === index ? '#007bff' : 'transparent',
                color: selectedAgentIndex === index ? '#fff' : '#000'
              }}
              onClick={() => handleSelectAgent(index)}
            >
              {agent.name}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1, padding: '20px', overflowY: 'scroll', height: '100vh' }}>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        {agents.length > 0 && selectedAgentIndex !== -1 && (
          <AgentDetails
            agent={agents[selectedAgentIndex]}
            onUpdateAgent={handleUpdateAgent}
            onDeleteAgent={handleDeleteAgent}
          />
        )}
      </div>
      <AddAgentModal
        show={showAddModal}
        handleClose={() => setShowAddModal(false)}
        handleAddAgent={handleAddAgent}
      />
    </div>
  )
}

export default Agents
