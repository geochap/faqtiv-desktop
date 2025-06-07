import { useMemo, useState, useEffect, useContext } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { TaskClientRenderer } from '../../../services/TaskClientRenderer';
import { TaskEntry } from '../../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../../hooks/appHook';

const MAX_PREVIEW_LENGTH = 200;

const AgentTaskView = () => {
  const { agentId } = useParams();
  const { agents } = useContext(AppContext);
  const agent = agents.find((a) => a.id === agentId);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TaskEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  const navigate = useNavigate();

  const taskClient = useMemo(() => {
    if (!agent) return null;
    try {
      return new TaskClientRenderer(agent);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [agent]);

  useEffect(() => {
    if (agent) {
      handleSearch();
    }
  }, [agent]);

  const handleSearch = async () => {
    if (!taskClient) return;
    setLoading(true);
    setError(null);

    try {
      const data = query ? await taskClient.search(query) : await taskClient.getRecent();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskClient) return;
    if (!newDescription) {
      setError('Please enter a task description.');
      return;
    }

    try {
      setLoading(true);
      await taskClient.insertTask(newDescription);
      setNewDescription('');
      setShowAddForm(false);
      setError(null);
      await handleSearch();
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const truncate = (text: string, length: number) =>
    text.length <= length ? text : text.slice(0, length).trim() + '...';

  if (!agent) {
    return <Alert variant="danger">Invalid agent</Alert>;
  }

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
          placeholder="Search by task description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit">Search</Button>
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
          <h5>{query ? 'Search Results' : 'Recent Tasks'}</h5>
          {results.length === 0 ? (
            <p>No tasks found.</p>
          ) : (
            <div>
              {results.map((task) => (
                <div key={task.id} className="mb-4 pb-2 border-bottom">
                  <div>
                    <strong>Description:</strong>{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/agents/${agent.id}/tasks/${task.id}`);
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      {truncate(task.description, MAX_PREVIEW_LENGTH)}
                    </a>
                  </div>
                  {task.code && (
                    <div className="mt-2">
                      <strong>Generated Code:</strong>
                      <pre style={{ background: '#f8f9fa', padding: '0.5rem' }}>
                        {truncate(task.code, MAX_PREVIEW_LENGTH)}
                      </pre>
                    </div>
                  )}
                  <div className="text-muted small mt-1 d-flex justify-content-between">
                    <div>
                      Created: {new Date(task.createdAt).toLocaleString()}
                      {task.score !== undefined && <> · Score: {task.score.toFixed(3)}</>}
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
                  setNewDescription(query);
                }}
              >
                Can’t find what you’re looking for? Add a new task
              </Button>
            </div>
          )}

          {showAddForm && (
            <Form className="mt-3">
              <Form.Group className="mb-2">
                <Form.Label>Task Description</Form.Label>
                <Form.Control
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe what the task should do"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleAddTask}>
                Submit Task
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

export default AgentTaskView;
