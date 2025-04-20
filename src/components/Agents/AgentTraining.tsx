import { useMemo, useState, useEffect } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { Agent } from '../../types';
import { KnowledgeBaseClientRenderer } from '../../services/KnowledgeBaseClientRenderer';
import { QAEntry } from '../../types';
import { useNavigate } from 'react-router-dom';

type AgentTrainingProps = {
  agent: Agent;
};

const MAX_ANSWER_PREVIEW_LENGTH = 200;

const AgentTraining = ({ agent }: AgentTrainingProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QAEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const navigate = useNavigate();

  const kb = useMemo(() => {
    try {
      return new KnowledgeBaseClientRenderer(agent);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [agent]);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    if (!kb) return;
    setLoading(true);
    setError(null);

    try {
      const data = query ? await kb.search(query) : await kb.getRecent();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQA = async () => {
    if (!kb) return;
    if (!newQuestion || !newAnswer) {
      setError('Please enter both a question and answer.');
      return;
    }

    try {
      setLoading(true);
      await kb.insertQA(newQuestion, newAnswer);
      setNewQuestion('');
      setNewAnswer('');
      setShowAddForm(false);
      setError(null);
      await handleSearch();
    } catch (err: any) {
      setError(err.message || 'Failed to add Q&A');
    } finally {
      setLoading(false);
    }
  };

  const truncate = (text: string, length: number) =>
    text.length <= length ? text : text.slice(0, length).trim() + '...';

  return (
    <div
      style={{
        paddingRight: '1rem',
        paddingBottom: '2rem',
      }}
    >
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
            <p>No Q&A entries found.</p>
          ) : (
            <div>
              {results.map((qa) => (
                <div key={qa.id} className="mb-4 pb-2 border-bottom">

                  <div>
                    <strong>Q:</strong>{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/agents/${agent.id}/training/${qa.id}`);
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      {qa.question}
                    </a>
                  </div>
                  <div className="mt-2">
                    <strong>A:</strong> {truncate(qa.answer, MAX_ANSWER_PREVIEW_LENGTH)}
                  </div>
                  <div className="text-muted small mt-1 d-flex justify-content-between">
                    <div>
                      Created: {new Date(qa.createdAt).toLocaleString()}
                      {qa.score !== undefined && <> · Score: {qa.score.toFixed(3)}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showAddForm && (
            <div className="mt-3">
              <Button
                variant="link"
                onClick={() => {
                  setShowAddForm(true);
                  setNewQuestion(query);
                }}
              >
                Can’t find what you’re looking for? Add a new Q&A
              </Button>
            </div>
          )}

          {showAddForm && (
            <Form className="mt-3">
              <Form.Group className="mb-2">
                <Form.Label>Question</Form.Label>
                <Form.Control
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter a new question"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Answer</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Enter the answer"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleAddQA}>
                Submit Q&A
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
