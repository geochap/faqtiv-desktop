import { Fragment, HTMLAttributes, useCallback, useState, ClassAttributes } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Copy } from 'lucide-react'
import cs from 'classnames'
import ReactMarkdown, { ExtraProps } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeKatex, { Options } from 'rehype-katex'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

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
    <Fragment>
      <SyntaxHighlighter {...rest} style={vscDarkPlus} language={match[1]} PreTag="div">
        {code}
      </SyntaxHighlighter>
      <OverlayTrigger
        show={tooltipOpen}
        placement="top"
        overlay={<Tooltip id="tooltip-top">Copied!</Tooltip>}
      >
        <button
          style={{ float: 'right' }}
          onClick={onCopy}
          onMouseLeave={() => setTooltipOpen(false)}
          className="btn unstyled p-0"
        >
          <Copy size={15} />
        </button>
      </OverlayTrigger>
    </Fragment>
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
  fleqn: true
}

export const Markdown = ({ className, children }: MarkdownProps) => {
  return (
    <ReactMarkdown
      className={cs('markdown-block', className)}
      remarkPlugins={[remarkParse, remarkMath, remarkRehype, remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, rehypeKatexOptions], rehypeStringify]}
      components={{
        code(props) {
          return <HighlightCode {...props} />
        },
        table(props) {
          return <CustomTable {...props} />
        }
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
