'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '../../../src/components/ui/button'
import { Textarea } from '../../../src/components/ui/textarea'

interface ChatInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSubmit, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div className="border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        <Textarea ref={textareaRef} value={value} onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder={placeholder ?? 'Type anything\u2026'} rows={1}
          className="min-h-[40px] max-h-32 resize-none flex-1 rounded-2xl bg-muted border-0 focus-visible:ring-1 py-2.5 px-4 text-sm leading-relaxed"
          disabled={disabled} />
        <Button onClick={handleSubmit} disabled={!value.trim() || disabled} size="icon" className="rounded-full h-10 w-10 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
