import { useMemo, useState, useEffect } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { Agent, QAEntry } from '../../../types';
import { KnowledgeBaseClientRenderer } from '../../../services/KBClientRenderer';
import { useNavigate } from 'react-router-dom';

type AgentTrainingProps = {
  agent: Agent;
};

const MAX_TEXT_PREVIEW_LENGTH = 200;

const AgentTraining = ({ agent }: AgentTrainingProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QAEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');

  const navigate = useNavigate();

  const kb = useMemo(() => {
    try {
      const client = new KnowledgeBaseClientRenderer(agent);
      return client;
    } catch (err: any) {
      console.error('❌ Failed to initialize KB client:', err);
      setError(err.message);
      return null;
    }
  }, [agent]);

  useEffect(() => {
    if (!kb) {
      console.warn('⚠️ KB not ready on initial mount');
      return;
    }
    handleSearch();
  }, [kb]);

  const handleSearch = async () => {
    if (!kb) {
      console.warn('⚠️ KB client not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = query ? await kb.search(query) : await kb.getRecent();
      setResults(data);
    } catch (err: any) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddText = async () => {
    if (!kb) {
      console.warn('⚠️ KB client not initialized');
      return;
    }

    if (!newText.trim()) {
      setError('Please enter some text.');
      return;
    }

    try {
      setLoading(true);
      await kb.insertText(newText.trim());
      setNewText('');
      setShowAddForm(false);
      setError(null);
      await handleSearch();
    } catch (err: any) {
      console.error('❌ Insert error:', err);
      setError(err.message || 'Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  const truncate = (text: string | undefined, length: number) => {
    if (!text) return '';
    return text.length <= length ? text : text.slice(0, length).trim() + '...';
  };

  return (
    <div style={{ paddingRight: '1rem', paddingBottom: '2rem' }}>
      <Form
        className="mb-3 d-flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <Form.Control
          type="text"
          placeholder="Search or ask a question"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit">Ask</Button>
      </Form>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-muted">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading...
        </div>
      ) : (
        <>
          <h5>{query ? 'Search Results' : 'Recent Entries'}</h5>
          {results.length === 0 ? (
            <p>No entries found.</p>
          ) : (
            <div>
              {results.map((qa, i) => {
                if (!qa || !qa.text) {
                  console.warn('⚠️ Skipping invalid QA entry', i, qa);
                  return null;
                }

                return (
                  <div key={qa.id} className="mb-4 pb-2 border-bottom">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/agents/${agent.id}/training/${qa.id}`);
                      }}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      {truncate(qa.text, MAX_TEXT_PREVIEW_LENGTH)}
                    </a>
                    <div className="text-muted small mt-1 d-flex justify-content-between">
                      <div>
                        Created: {new Date(qa.createdAt).toLocaleString()}
                        {qa.score !== undefined && <> · Score: {qa.score.toFixed(3)}</>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!showAddForm && (
            <div className="mt-3">
              <Button
                variant="link"
                onClick={() => {
                  setShowAddForm(true);
                  setNewText(query);
                }}
              >
                Can’t find what you’re looking for? Add a new entry
              </Button>
            </div>
          )}

          {showAddForm && (
            <Form className="mt-3">
              <Form.Group className="mb-2">
                <Form.Label>New Entry</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter the full content"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleAddText}>
                Submit Entry
              </Button>{' '}
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </Form>
          )}
        </>
      )}
    </div>
  );
};

export default AgentTraining;
