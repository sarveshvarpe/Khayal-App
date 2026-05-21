"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Trash2, Mic, Volume2 } from "lucide-react"
import { toast } from "sonner"
import type { ChatMessage } from "@/types"

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    api.get<ChatMessage[]>("/chatbot/history")
      .then(setMessages)
      .catch(() => {})
  }, [user])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    setLoading(true)
    const userMsg = input
    setInput("")

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: userMsg,
      created_at: new Date().toISOString(),
    }])

    try {
      const res = await api.post<{ response: string }>("/chatbot/chat", { message: userMsg })
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: res.response,
        created_at: new Date().toISOString(),
      }])
    } catch (err: any) {
      toast.error(err.message || "Failed to get response")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await api.post("/chatbot/clear-history")
      setMessages([])
      toast.success("Chat history cleared")
    } catch {
      toast.error("Failed to clear history")
    }
  }

  return (
    <div className="min-h-[90vh] max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">AI Health Assistant</h1>
          <p className="text-sm text-gray-500">Ask me anything about your health</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear} className="gap-2">
          <Trash2 className="w-4 h-4" /> Clear
        </Button>
      </div>

      <div className="glass rounded-2xl p-4 h-[65vh] overflow-y-auto mb-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <Bot className="w-16 h-16 mb-4 text-primary-500/50" />
            <h3 className="text-lg font-medium mb-2">How can I help you today?</h3>
            <p className="text-sm max-w-md">
              Ask about symptoms, medications, fitness tips, diet plans, or any health concern.
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary-500" />
                </div>
              )}
              <div className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-primary-500 text-white rounded-br-sm"
                  : "glass rounded-bl-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-accent-500" />
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-500" />
              </div>
              <div className="glass rounded-2xl rounded-bl-sm p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEnd} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your health question..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
