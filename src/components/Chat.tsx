import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Message {
  id: number
  message: string
  timestamp: string
  userId?: string
  isOwn?: boolean
  isSystem?: boolean
}

interface ChatProps {
  room?: string
}

export default function Chat({ room = 'general' }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState<string>('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const { socket, isConnected, connectionError, sendMessage } = useSocket(room)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleReceiveMessage = (data: {
      message: string
      timestamp: string
      userId: string
    }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        message: data.message,
        timestamp: data.timestamp,
        userId: data.userId,
        isOwn: data.userId === socket.id
      }])
    }

    const handleUserJoined = (data: { userId: string }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        message: `User ${data.userId} joined the room`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }])
    }

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        if (data.isTyping) {
          newSet.add(data.userId)
        } else {
          newSet.delete(data.userId)
        }
        return newSet
      })
    }

    socket.on('receive-message', handleReceiveMessage)
    socket.on('user-joined', handleUserJoined)
    socket.on('user-typing', handleUserTyping)

    return () => {
      socket.off('receive-message', handleReceiveMessage)
      socket.off('user-joined', handleUserJoined)
      socket.off('user-typing', handleUserTyping)
    }
  }, [socket])

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (inputMessage.trim() && isConnected) {
      sendMessage('send-message', {
        room,
        message: inputMessage.trim(),
        timestamp: new Date().toISOString()
      })
      setInputMessage('')
      
      // Stop typing indicator
      sendMessage('typing', { room, isTyping: false })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)
    
    // Send typing indicator
    if (isConnected) {
      sendMessage('typing', { room, isTyping: true })
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        sendMessage('typing', { room, isTyping: false })
      }, 1000)
    }
  }

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Connection Error: {connectionError}
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <h3 className="text-lg font-semibold">Room: {room}</h3>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Badge>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} ${
                  msg.isSystem ? 'justify-center' : ''
                }`}
              >
                <div 
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    msg.isSystem 
                      ? 'bg-muted text-muted-foreground text-center italic text-sm'
                      : msg.isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                  }`}
                >
                  {msg.isSystem ? (
                    <em>{msg.message}</em>
                  ) : (
                    <div>
                      <span className="block">{msg.message}</span>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {typingUsers.size > 0 && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm italic text-muted-foreground">
                  {Array.from(typingUsers).map(userId => 
                    `User ${userId}`
                  ).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              disabled={!isConnected}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!isConnected || !inputMessage.trim()}
            >
              Send
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}