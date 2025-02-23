import { HTMLAttributes, useCallback, useState, ClassAttributes, memo } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Copy } from 'lucide-react'
import cs from 'classnames'
import ReactMarkdown, { ExtraProps } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex, { Options } from 'rehype-katex'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import remarkAgentMessage from '../MarkdownExtensions/agentMessageExtension'
import AgentMessage from '../MarkdownExtensions/AgentMessage'

import 'katex/dist/katex.min.css'
import './index.css'

export interface MarkdownProps {
  className?: string
  children: string
}

const HighlightCode = (
  props: ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps
) => {
  const { children, className, ref, ...rest } = props
  const match = /language-(\w+)/.exec(className || '')
  const copy = useCopyToClipboard()
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false)

  const code = match ? String(children).replace(/\n$/, '') : ''

  const onCopy = useCallback(() => {
    copy(code, (isSuccess) => {
      if (isSuccess) {
        setTooltipOpen(true)
        setTimeout(() => setTooltipOpen(false), 2000)
      }
    })
  }, [code, copy])

  return match ? (
    <div style={{ position: 'relative' }}>
      <SyntaxHighlighter {...rest} style={vscDarkPlus} language={match[1]} PreTag="div">
        {code}
      </SyntaxHighlighter>
      <OverlayTrigger
        show={tooltipOpen}
        placement="top"
        overlay={<Tooltip id="tooltip-top">Copied!</Tooltip>}
      >
        <button
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer'
          }}
          onClick={onCopy}
          onMouseLeave={() => setTooltipOpen(false)}
          className="btn unstyled p-0"
        >
          <Copy size={15} />
        </button>
      </OverlayTrigger>
    </div>
  ) : (
    <code ref={ref} {...rest} className={cs('highlight', className)}>
      {children}
    </code>
  )
}

const CustomTable = (props: HTMLAttributes<HTMLTableElement>) => {
  return <table {...props} className={cs(props.className, 'table', 'table-striped')} />
}

const rehypeKatexOptions: Options = {
  output: 'html',
  fleqn: true,
  strict: false
}

const markdownComponents = {
  code: (props: any) => <HighlightCode {...props} />,
  table: (props: any) => <CustomTable {...props} />,
  a: (props: any) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  agentmessage: (props: any) => {
    const { node, ...rest } = props
    const msg = node.data?.msg || ''
    return <AgentMessage msg={msg} {...rest} />
  }
}

export const Markdown = memo(({ className, children }: MarkdownProps) => {
  return (
    <ReactMarkdown
      className={cs('markdown-block', className)}
      remarkPlugins={[
        remarkGfm,
        [remarkMath, { singleDollarTextMath: false }],
        remarkAgentMessage // must run after GFM/Math so it can transform code blocks
      ]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, rehypeKatexOptions]]}
      components={markdownComponents}
    >
      {children}
    </ReactMarkdown>
  );
});