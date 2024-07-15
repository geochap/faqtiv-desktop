import { useCallback, useState } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Copy } from 'lucide-react'

export const CopyButton = ({ content }: { content: string }) => {
  const copy = useCopyToClipboard()
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false)

  const onCopy = useCallback(() => {
    copy(content, (isSuccess) => {
      if (isSuccess) {
        setTooltipOpen(true)
        setTimeout(() => setTooltipOpen(false), 2000)
      }
    })
  }, [content, copy])

  return (
    <OverlayTrigger
      show={tooltipOpen}
      placement="top"
      overlay={<Tooltip id="tooltip-top">Copied!</Tooltip>}
    >
      <button onClick={onCopy} onMouseLeave={() => setTooltipOpen(false)} className="btn p-0">
        <Copy size={15} />
      </button>
    </OverlayTrigger>
  )
}
