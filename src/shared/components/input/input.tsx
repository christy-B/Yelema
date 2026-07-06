import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  action?: ReactNode
  error?: string
}

export function Input({ label, icon, action, error, id, className = '', ...props }: InputProps) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label className="field-label" htmlFor={id}>{label}</label>}
      <span className={`input-shell${error ? ' has-error' : ''}`}>{icon}<input id={id} {...props} />{action}</span>
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
