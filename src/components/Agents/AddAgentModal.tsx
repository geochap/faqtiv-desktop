import { useState, useEffect, FormEvent } from 'react'
import { Button, Form, Modal, Alert } from 'react-bootstrap'
import { Agent } from '../../types'

type AddAgentModalProps = {
  show: boolean
  handleClose: () => void
  handleAddAgent: (agent: Agent) => Promise<void>
}

const AddAgentModal = ({ show, handleClose, handleAddAgent }: AddAgentModalProps) => {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [isChanged, setIsChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleSelectDirReply = (_event: any, response: { path?: string; error?: string }) => {
      if (response.path) {
        setPath(response.path)
        setIsChanged(true)
      } else if (response.error) {
        setError(response.error)
      }
    }

    window.ipcRenderer.on('select-faqtiv-agent-dir-reply', handleSelectDirReply)

    return () => {
      window.ipcRenderer.removeAllListeners('select-faqtiv-agent-dir-reply')
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await handleAddAgent({ id: Date.now().toString(), name, path, tasks: [], instructions: '' })
      setName('')
      setPath('')
      setIsChanged(false)
      handleClose()
    } catch (err) {
      setError(err as string)
    }
  }

  const handleChange = (setter: (value: string) => void, value: string) => {
    setter(value)
    setIsChanged(value.length > 0 && name.length > 0 && path.length > 0)
  }

  const handleSelectDir = () => {
    window.ipcRenderer.send('select-faqtiv-agent-dir')
  }

  const handleCancel = () => {
    setError(null)
    setName('')
    setPath('')
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
          <Form.Group controlId="agentPath" className="mb-3">
            <Form.Label>Path</Form.Label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Form.Control type="text" value={path} disabled style={{ marginRight: '10px' }} />
              <Button variant="secondary" onClick={handleSelectDir} style={{ maxWidth: '80px' }}>
                Select
              </Button>
            </div>
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
