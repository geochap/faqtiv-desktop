import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { KnowledgeBaseClientRenderer } from '../../../services/KBClientRenderer';
import { Agent, QAEntry } from '../../../types';
import ReactMarkdown from 'react-markdown';

type AgentTrainingDetailProps = {
  agent: Agent;
};

const AgentTrainingDetail = ({ agent }: AgentTrainingDetailProps) => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();

  const [entry, setEntry] = useState<QAEntry | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const kb = useMemo(() => {
    try {
      return new KnowledgeBaseClientRenderer(agent);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [agent]);

  useEffect(() => {
    const load = async () => {
      if (!kb || !entryId) return;

      setLoading(true);
      setError(null);
      try {
        const data = await kb.getById(entryId);
        if (!data) {
          setError('Entry not found');
        } else {
          setEntry(data);
          setText(data.text);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [kb, entryId]);

  const handleSave = async () => {
    if (!kb || !entryId) return;

    try {
      setSaving(true);
      await kb.updateText(entryId, text);
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!kb || !entryId) return;

    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await kb.delete(entryId);
      navigate(`/agents/${agent.id}/train`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry');
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
    return <p>Entry not found.</p>;
  }

  return (
    <div
      style={{
        padding: '2rem',
        margin: '0 auto',
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <h3>Knowledge Entry Detail</h3>

      {editMode ? (
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Text</Form.Label>
            <Form.Control
              as="textarea"
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
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
          <p><strong>Text:</strong></p>
          <div className="p-3 border rounded bg-light">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>

          <div className="d-flex gap-3 mt-4">
            <Button variant="primary" onClick={() => setEditMode(true)}>
              Edit
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

export default AgentTrainingDetail;
