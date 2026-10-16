export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function applyMask(value: string, template: string): string {
  const digits = digitsOnly(value, template.split('9').length - 1)
  let result = ''
  let digitIndex = 0

  for (const character of template) {
    if (digitIndex >= digits.length) break
    if (character === '9') {
      result += digits[digitIndex]
      digitIndex += 1
    } else {
      result += character
    }
  }

  return result
}

export function maskDocument(value: string, personType: 'PF' | 'PJ'): string {
  return applyMask(value, personType === 'PF' ? '999.999.999-99' : '99.999.999/9999-99')
}

export function maskPhone(value: string): string {
  return applyMask(value, '(99) 99999-9999')
}

export function maskZipCode(value: string): string {
  return applyMask(value, '99999-999')
}
