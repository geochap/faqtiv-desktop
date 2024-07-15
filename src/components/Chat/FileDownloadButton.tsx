type FileDownloaderProps = {
  name: string
  path: string
  mimeType: string
}

const FileDownloadButton = ({ name, mimeType, path }: FileDownloaderProps) => {
  const handleDownload = () => {
    window.ipcRenderer.send('download-local-file', path)
    window.ipcRenderer.once('download-local-file-reply', (_event, response) => {
      if (response.error) {
        console.error('Error downloading file:', response.error)
      } else {
        const blob = new Blob([response.data], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 0)
      }
    })
  }

  return (
    <a className="d-flex align-items-center" style={{ cursor: 'pointer' }} onClick={handleDownload}>
      {name}
    </a>
  )
}

export default FileDownloadButton
