import { useState, useEffect, FormEvent } from 'react';
import { Button, Form, Modal, Alert, InputGroup } from 'react-bootstrap';
import { Agent } from '../../types';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

type AgentDetailsProps = {
  agent: Agent;
  onUpdateAgent: (a: Agent) => Promise<void>;
  onDeleteAgent: (id: string) => Promise<void>;
};

const AgentDetails = ({ agent, onUpdateAgent, onDeleteAgent }: AgentDetailsProps) => {
  const [form, setForm] = useState({
    name: agent.name,
    url: agent.url,
    includeToolMessages: agent.includeToolMessages ?? false,
    maxTokens: agent.maxTokens,
    temperature: agent.temperature,
    vectorDbUrl: agent.vectorDbUrl ?? '',
    knowledgeBaseName: agent.knowledgeBaseName ?? '',
    taskIndexName: agent.taskIndexName ?? '', // ✅ NEW
    openAiApiKey: agent.openAiApiKey ?? ''
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    setForm({
      name: agent.name,
      url: agent.url,
      includeToolMessages: agent.includeToolMessages ?? false,
      maxTokens: agent.maxTokens,
      temperature: agent.temperature,
      vectorDbUrl: agent.vectorDbUrl ?? '',
      knowledgeBaseName: agent.knowledgeBaseName ?? '',
      taskIndexName: agent.taskIndexName ?? '', // ✅ NEW
      openAiApiKey: agent.openAiApiKey ?? ''
    });
    setIsChanged(false);
    setError(null);
  }, [agent.id]);

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      const changed =
        next.name !== agent.name ||
        next.url !== agent.url ||
        next.includeToolMessages !== (agent.includeToolMessages ?? false) ||
        next.maxTokens !== agent.maxTokens ||
        next.temperature !== agent.temperature ||
        next.vectorDbUrl !== (agent.vectorDbUrl ?? '') ||
        next.knowledgeBaseName !== (agent.knowledgeBaseName ?? '') ||
        next.taskIndexName !== (agent.taskIndexName ?? '') || // ✅ NEW
        next.openAiApiKey !== (agent.openAiApiKey ?? '');

      setIsChanged(changed);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onUpdateAgent({ ...agent, ...form });
      setIsChanged(false);
    } catch (err) {
      setError(err as string);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await onDeleteAgent(agent.id);
      setShowModal(false);
    } catch (err) {
      setError(err as string);
    }
  };

  return (
    <div>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="agentName">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentUrl">
          <Form.Label>URL</Form.Label>
          <Form.Control
            type="text"
            value={form.url}
            onChange={(e) => handleChange('url', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentVectorDbUrl">
          <Form.Label>Vector DB URL</Form.Label>
          <Form.Control
            type="text"
            placeholder="Optional"
            value={form.vectorDbUrl}
            onChange={(e) => handleChange('vectorDbUrl', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentKnowledgeBaseName">
          <Form.Label>Knowledge Base Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Optional"
            value={form.knowledgeBaseName}
            onChange={(e) => handleChange('knowledgeBaseName', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentTaskIndexName">
          <Form.Label>Task Index Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Optional"
            value={form.taskIndexName}
            onChange={(e) => handleChange('taskIndexName', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentOpenAiApiKey">
          <Form.Label>OpenAI API Key</Form.Label>
          <InputGroup>
            <Form.Control
              type={showApiKey ? 'text' : 'password'}
              placeholder="Optional — override default key"
              value={form.openAiApiKey}
              onChange={(e) => handleChange('openAiApiKey', e.target.value)}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowApiKey((prev) => !prev)}
              title={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <EyeSlash /> : <Eye />}
            </Button>
          </InputGroup>
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentIncludeToolMessages">
          <Form.Check
            type="switch"
            label="Include tool messages"
            checked={form.includeToolMessages}
            onChange={(e) => handleChange('includeToolMessages', e.target.checked)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentMaxTokens">
          <Form.Label>Max Tokens</Form.Label>
          <Form.Control
            type="number"
            value={form.maxTokens ?? ''}
            placeholder="Model default"
            onChange={(e) =>
              handleChange('maxTokens', e.target.value === '' ? undefined : parseInt(e.target.value))
            }
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="agentTemperature">
          <Form.Label>Temperature</Form.Label>
          <Form.Control
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={form.temperature ?? ''}
            placeholder="Model default"
            onChange={(e) =>
              handleChange('temperature', e.target.value === '' ? undefined : parseFloat(e.target.value))
            }
          />
        </Form.Group>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        <div className="mt-4 d-flex justify-content-end">
          <Button variant="danger" className="me-2" onClick={() => setShowModal(true)}>
            Delete Agent
          </Button>
          <Button variant="primary" type="submit" disabled={!isChanged}>
            Update Agent
          </Button>
        </div>
      </Form>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this agent?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AgentDetails;
