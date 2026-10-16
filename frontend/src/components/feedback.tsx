interface FeedbackProps {
  error: string
  notice: string
}

export function Feedback({ error, notice }: FeedbackProps) {
  return (
    <>
      {error && <div className="feedback feedback--error" role="alert">{error}</div>}
      {notice && <div className="feedback feedback--success" role="status">{notice}</div>}
    </>
  )
}
