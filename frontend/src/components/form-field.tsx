import type { ComponentProps } from 'react'

type FormFieldProps = Omit<ComponentProps<'input'>, 'id' | 'name'> & {
  label: string
  name: string
  optional?: boolean
}

export function FormField({ label, optional = false, name, ...inputProps }: FormFieldProps) {
  return (
    <label className="form-field" htmlFor={name}>
      <span className="form-field__label">
        {label} {optional && <span className="form-field__optional">(opcional)</span>}
      </span>
      <input id={name} name={name} {...inputProps} />
    </label>
  )
}
