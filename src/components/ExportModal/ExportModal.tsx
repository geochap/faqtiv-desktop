import { Button, Modal } from 'react-bootstrap'
import { useContext } from 'react'
import { AppContext } from '../../hooks/appHook'
import { exportLangchainAgent } from '../../ai/exportLangchainAgent'

export const ExportModal = () => {
  const { agents, toggleExportModal, openExportModal } = useContext(AppContext)
  return (
    <>
      <Modal className="mt-5" size="lg" show={openExportModal} onHide={toggleExportModal}>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1.5em' }}>Export</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}
        >
          <Button onClick={() => exportLangchainAgent(agents)}>Export to Langchain Agent</Button>
        </Modal.Body>
      </Modal>
    </>
  )
}
