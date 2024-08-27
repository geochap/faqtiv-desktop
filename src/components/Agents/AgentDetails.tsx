import { useState, useEffect, FormEvent } from 'react'
import { Button, Form, Container, Modal, Alert } from 'react-bootstrap'
import { Agent } from '../../types'

type AgentDetailsProps = {
  agent: Agent
  onUpdateAgent: (a: Agent) => Promise<void>
  onDeleteAgent: (id: string) => Promise<void>
}

const AgentDetails = ({ agent, onUpdateAgent, onDeleteAgent }: AgentDetailsProps) => {
  const [name, setName] = useState(agent.name)
  const [url, setUrl] = useState(agent.url)
  const [showModal, setShowModal] = useState(false)
  const [isChanged, setIsChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(agent.name)
    setUrl(agent.url)
    setIsChanged(false)
  }, [agent])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await onUpdateAgent({ ...agent, name, url })
      setIsChanged(false)
    } catch (err) {
      setError(err as string)
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await onDeleteAgent(agent.id)
      setShowModal(false)
    } catch (err) {
      setError(err as string)
    }
  }

  const handleShowModal = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setError(null)
    setShowModal(false)
  }

  const handleChange = (setter: (value: string) => void, value: string, originalValue: string) => {
    setter(value)
    setIsChanged(value !== originalValue || name !== agent.name || url !== agent.url)
  }

  return (
    <Container style={{ padding: '20px' }}>
      <h2>{agent.name}</h2>
      <h3 className="mt-5 mb-4">Configuration</h3>
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="agentName" className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => handleChange(setName, e.target.value, agent.name)}
          />
        </Form.Group>
        <Form.Group controlId="agentUrl" className="mb-3">
          <Form.Label>URL</Form.Label>
          <Form.Control
            type="text"
            value={url}
            onChange={(e) => handleChange(setUrl, e.target.value, agent.url)}
          />
        </Form.Group>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        <div className="mt-4" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="danger" className="me-2" onClick={handleShowModal}>
            Delete Agent
          </Button>
          <Button variant="primary" type="submit" disabled={!isChanged}>
            Update Agent
          </Button>
        </div>
      </Form>
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          Are you sure you want to delete this agent?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default AgentDetails
