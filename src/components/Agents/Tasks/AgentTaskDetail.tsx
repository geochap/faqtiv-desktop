import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { TaskClientRenderer } from '../../../services/TaskClientRenderer';
import { Agent, TaskEntry } from '../../../types';
import ReactMarkdown from 'react-markdown';

type AgentTaskDetailProps = {
  agent: Agent;
};

const AgentTaskDetail = ({ agent }: AgentTaskDetailProps) => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [entry, setEntry] = useState<TaskEntry | null>(null);
  const [expectedResultInstructions, setExpectedResultInstructions] = useState('');
  const [codeInstructions, setCodeInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const client = useMemo(() => {
    try {
      return new TaskClientRenderer(agent);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [agent]);

  useEffect(() => {
    const load = async () => {
      if (!client || !taskId) return;
      setLoading(true);
      setError(null);

      try {
        const data = await client.getById(taskId);
        if (!data) {
          setError('Task not found');
        } else {
          setEntry(data);
          setExpectedResultInstructions(data.expectedResultInstructions || '');
          setCodeInstructions(data.codeInstructions || '');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [client, taskId]);

  const handleSave = async () => {
    if (!client || !taskId) return;

    try {
      setSaving(true);
      await client.updateTask(taskId, {
        expectedResultInstructions,
        codeInstructions
      });
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client || !taskId) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await client.deleteTask(taskId);
      navigate(`/agents/${agent.id}/tasks`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="text-muted">
        <Spinner animation="border" size="sm" className="me-2" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" onClose={() => setError(null)} dismissible>
        {error}
      </Alert>
    );
  }

  if (!entry) {
    return <p>Task not found.</p>;
  }

  return (
    <div style={{ padding: '2rem', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <h3>Task Detail</h3>

      <p><strong>Description:</strong></p>
      <div className="p-2 border rounded bg-light mb-3">
        <ReactMarkdown>{entry.description}</ReactMarkdown>
      </div>

      <p><strong>Original Question:</strong></p>
      <div className="p-2 border rounded bg-light mb-3">
        <ReactMarkdown>{entry.originalQuestion || ''}</ReactMarkdown>
      </div>

      <p><strong>Code:</strong></p>
      <div className="p-3 border rounded bg-light mb-3">
        <pre><code>{entry.code || ''}</code></pre>
      </div>

      <p><strong>Docs Used:</strong></p>
      <div className="p-2 border rounded bg-light mb-3">
        <ReactMarkdown>{entry.docs || ''}</ReactMarkdown>
      </div>

      {editMode ? (
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Expected Result Instructions</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={expectedResultInstructions}
              onChange={(e) => setExpectedResultInstructions(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Code Instructions</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={codeInstructions}
              onChange={(e) => setCodeInstructions(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex gap-3 mt-4">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Form>
      ) : (
        <>
          <p><strong>Expected Result Instructions:</strong></p>
          <div className="p-2 border rounded bg-light mb-3">
            <ReactMarkdown>{expectedResultInstructions}</ReactMarkdown>
          </div>

          <p><strong>Code Instructions:</strong></p>
          <div className="p-2 border rounded bg-light mb-3">
            <ReactMarkdown>{codeInstructions}</ReactMarkdown>
          </div>

          <div className="d-flex gap-3 mt-4">
            <Button variant="primary" onClick={() => setEditMode(true)}>
              Edit Instructions
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentTaskDetail;
