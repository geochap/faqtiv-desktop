import { useState, FormEvent } from 'react'
import { Button, Form, Modal, Alert } from 'react-bootstrap'
import { Agent } from '../../types'

type AddAgentModalProps = {
  show: boolean
  handleClose: () => void
  handleAddAgent: (agent: Agent) => Promise<void>
}

const AddAgentModal = ({ show, handleClose, handleAddAgent }: AddAgentModalProps) => {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [isChanged, setIsChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL')
      return
    }
    try {
      await handleAddAgent({ id: Date.now().toString(), name, url })
      setName('')
      setUrl('')
      setIsChanged(false)
      handleClose()
    } catch (err) {
      setError(err as string)
    }
  }

  const handleChange = (setter: (value: string) => void, value: string) => {
    setter(value)
    setIsChanged(value.length > 0 && name.length > 0 && url.length > 0)
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleCancel = () => {
    setError(null)
    setName('')
    setUrl('')
    setIsChanged(false)
    handleClose()
  }

  return (
    <Modal show={show} onHide={handleCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Add Agent</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="agentName" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => handleChange(setName, e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="agentUrl" className="mb-3">
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="text"
              value={url}
              onChange={(e) => handleChange(setUrl, e.target.value)}
            />
          </Form.Group>
          <div className="mt-5" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={handleCancel} className="me-2">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!isChanged}>
              Add Agent
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}

export default AddAgentModal
