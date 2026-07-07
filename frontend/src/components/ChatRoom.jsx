import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { formatTimeIST, formatDateLabelIST } from '../utils/helpers'

const MAX = 1000

function Avatar({ username, profilePic }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
      {profilePic
        ? <img src={profilePic} alt="" className="w-full h-full object-cover" />
        : (username?.[0]?.toUpperCase() ?? '?')}
    </div>
  )
}

/**
 * Presentational chat panel. All message state lives in the parent (so the
 * subscription and unread badge survive tab switches); this component owns only
 * the composer input and scroll behaviour.
 */
export default function ChatRoom({
  messages,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onSend,
  connected,
  currentUsername,
  avatars = {},   // userId → profilePic, resolved from the room member list
}) {
  const [text, setText] = useState('')
  const listRef = useRef(null)

  // Scroll bookkeeping
  const nearBottomRef       = useRef(true)
  const initialRef          = useRef(true)
  const prevFirstIdRef      = useRef(null)
  const prevLastIdRef       = useRef(null)
  const prevScrollHeightRef = useRef(0)

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // Keep the viewport sensible as messages change:
  //  • older messages prepended → anchor so the view doesn't jump
  //  • new message appended → follow to bottom only if already near it
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    const firstId = messages[0]?.id ?? null
    const lastId  = messages[messages.length - 1]?.id ?? null
    const prevFirst = prevFirstIdRef.current
    const prevLast  = prevLastIdRef.current

    if (prevFirst != null && firstId != null && firstId < prevFirst) {
      // Prepend: preserve the scroll offset of the first previously-visible row.
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current
    } else if (initialRef.current) {
      el.scrollTop = el.scrollHeight
      if (messages.length) initialRef.current = false
    } else if (lastId !== prevLast && nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }

    prevFirstIdRef.current      = firstId
    prevLastIdRef.current       = lastId
    prevScrollHeightRef.current = el.scrollHeight
  }, [messages])

  // A fresh mount (e.g. re-opening the tab) should land at the newest message.
  useEffect(() => { initialRef.current = true }, [])

  const trimmed = text.trim()
  const canSend = connected && trimmed.length > 0

  const handleSend = () => {
    if (!canSend) return
    onSend(trimmed.slice(0, MAX))
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[65vh] min-h-[420px] bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">

      {/* Message list */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1 scrollbar-hide"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-sm">No messages yet — say hello! 👋</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loadingMore && <Loader2 size={12} className="animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            )}

            {messages.map((m, i) => {
              const prev       = messages[i - 1]
              const mine       = m.username === currentUsername
              const dayChanged = !prev || formatDateLabelIST(prev.createdAt) !== formatDateLabelIST(m.createdAt)
              const showHeader = dayChanged || !prev || prev.userId !== m.userId

              return (
                <div key={m.id}>
                  {dayChanged && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {formatDateLabelIST(m.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}

                  <div className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : 'flex-row'} ${showHeader ? 'mt-2.5' : 'mt-0.5'}`}>
                    {/* avatar column keeps bubbles aligned even when header is hidden */}
                    <div className="w-8 flex-shrink-0">
                      {showHeader && !mine && <Avatar username={m.username} profilePic={avatars[m.userId]} />}
                    </div>

                    <div className={`flex flex-col max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}>
                      {showHeader && (
                        <div className={`flex items-baseline gap-2 mb-0.5 ${mine ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-bold text-white">{mine ? 'You' : m.username}</span>
                          <span className="text-[10px] text-gray-500">{formatTimeIST(m.createdAt)}</span>
                        </div>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          mine
                            ? 'bg-primary/25 text-white rounded-tr-sm'
                            : 'bg-white/[0.06] text-gray-100 rounded-tl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/[0.06] p-2.5 sm:p-3">
        {!connected && (
          <div className="text-[11px] text-amber-400/80 mb-1.5 px-1">Reconnecting… messages will send once you're back online.</div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message the room…"
            className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] focus:border-primary/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none max-h-32 scrollbar-hide"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/80 hover:bg-primary disabled:bg-white/5 disabled:text-gray-600 text-white flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        {text.length > MAX * 0.8 && (
          <div className="text-right text-[10px] text-gray-500 mt-1 px-1">{text.length}/{MAX}</div>
        )}
      </div>
    </div>
  )
}
