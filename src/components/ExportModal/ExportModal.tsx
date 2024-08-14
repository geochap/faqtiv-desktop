import { Button, Modal } from 'react-bootstrap'
import { useContext, useState } from 'react'
import { AppContext } from '../../hooks/appHook'
import { exportLangchainAgent } from '../../ai/exportLangchainAgent'
import { Markdown } from '../Markdown/Markdown'

import './index.css'

export const ExportModal = () => {
  const { agents, toggleExportModal, openExportModal } = useContext(AppContext)
  const [exportData, setExportData] = useState({ requirementsTxt: '', instructions: '', code: '' })

  async function handleExport() {
    const { requirementsTxt, instructions, code } = await exportLangchainAgent(agents)
    setExportData({ requirementsTxt, instructions, code })
  }

  const isExported = exportData.requirementsTxt || exportData.instructions || exportData.code

  return (
    <>
      <Modal
        className="mt-2"
        size="lg"
        show={openExportModal}
        onHide={toggleExportModal}
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1.5em' }}>Export to Langchain Agent</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {exportData.instructions && (
            <>
              <h4>Instructions</h4>
              <p>
                Copy and paste requirements.txt and code to an agent.py file, then run the following
                commands in your terminal:
              </p>
              <Markdown>{`\`\`\`bash\n${exportData.instructions}\n\`\`\``}</Markdown>
            </>
          )}
          {exportData.requirementsTxt && (
            <>
              <h4>requirements.txt</h4>
              <div style={{ maxHeight: '300px', overflow: 'auto', position: 'relative' }}>
                <Markdown>{`\`\`\`python\n${exportData.requirementsTxt}\n\`\`\``}</Markdown>
              </div>
            </>
          )}
          {exportData.code && (
            <>
              <h4>Code</h4>
              <div style={{ maxHeight: '300px', overflow: 'auto', position: 'relative' }}>
                <Markdown>{`\`\`\`python\n${exportData.code}\n\`\`\``}</Markdown>
              </div>
            </>
          )}
          <Button onClick={handleExport} className="mt-3">
            {isExported && <>Re-run export to Langchain Agent</>}
            {!isExported && <>Export to Langchain Agent</>}
          </Button>
        </Modal.Body>
      </Modal>
    </>
  )
}
