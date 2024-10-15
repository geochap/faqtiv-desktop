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
  const [includeToolMessages, setIncludeToolMessages] = useState(agent.includeToolMessages ?? false)
  const [maxTokens, setMaxTokens] = useState<number | undefined>(agent.maxTokens)
  const [temperature, setTemperature] = useState<number | undefined>(agent.temperature)

  useEffect(() => {
    setName(agent.name)
    setUrl(agent.url)
    setIncludeToolMessages(agent.includeToolMessages ?? false)
    setMaxTokens(agent.maxTokens)
    setTemperature(agent.temperature)
    setIsChanged(false)
  }, [agent])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await onUpdateAgent({
        ...agent,
        name,
        url,
        includeToolMessages,
        maxTokens,
        temperature
      })
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

  const handleChange = (setter: (value: any) => void, value: any, originalValue: any) => {
    setter(value)
    setIsChanged(
      value !== originalValue ||
        name !== agent.name ||
        url !== agent.url ||
        includeToolMessages !== agent.includeToolMessages ||
        maxTokens !== agent.maxTokens ||
        temperature !== agent.temperature
    )
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
        <Form.Group controlId="agentIncludeToolMessages" className="mb-3">
          <Form.Check
            type="switch"
            label="Include tool messages"
            checked={includeToolMessages}
            onChange={(e) =>
              handleChange(setIncludeToolMessages, e.target.checked, agent.includeToolMessages)
            }
          />
        </Form.Group>
        <Form.Group controlId="agentMaxTokens" className="mb-3">
          <Form.Label>Max Tokens</Form.Label>
          <Form.Control
            type="number"
            value={maxTokens ?? ''}
            placeholder="Model default"
            onChange={(e) =>
              handleChange(
                setMaxTokens,
                e.target.value === '' ? undefined : parseInt(e.target.value),
                agent.maxTokens
              )
            }
          />
        </Form.Group>
        <Form.Group controlId="agentTemperature" className="mb-3">
          <Form.Label>Temperature</Form.Label>
          <Form.Control
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={temperature ?? ''}
            placeholder="Model default"
            onChange={(e) =>
              handleChange(
                setTemperature,
                e.target.value === '' ? undefined : parseFloat(e.target.value),
                agent.temperature
              )
            }
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
