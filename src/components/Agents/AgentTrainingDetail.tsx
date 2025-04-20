import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { KnowledgeBaseClientRenderer } from '../../services/KnowledgeBaseClientRenderer';
import { Agent, QAEntry } from '../../types';

type AgentTrainingDetailProps = {
  agent: Agent;
};

const AgentTrainingDetail = ({ agent }: AgentTrainingDetailProps) => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();

  const [entry, setEntry] = useState<QAEntry | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
          setError('Q&A not found');
        } else {
          setEntry(data);
          setQuestion(data.question);
          setAnswer(data.answer);
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
      await kb.updateQA(entryId, { question, answer });
      navigate(`/agents/${agent.id}/training`);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!kb || !entryId) return;

    if (!confirm('Are you sure you want to delete this Q&A entry?')) return;

    try {
      await kb.deleteQA(entryId);
      navigate(`/agents/${agent.id}/training`);
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
    return <p>Q&A not found.</p>;
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h3>Edit Q&A</h3>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Question</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Answer</Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </Form.Group>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        <div className="d-flex gap-3 mt-4">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AgentTrainingDetail;
