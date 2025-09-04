"use client";

import ChatForm from "@/components/ChatForm";
import ChatMessage from "@/components/ChatMessage";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socketClient";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<
    { sender: string; message: string }[]
  >([]);
  const handleSendMessage = (message: string) => {
    const data = { room, message, sender: userName };
    setMessages((prev) => [...prev, { sender: userName, message }]);
    socket.emit("message", data);
    console.log(message);
  };

  const handleJoinRoom = () => {
    if (room && userName) {
      console.log(`Emited the join room event : ${room}, ${userName}`);
      socket.emit("join-room", { room, username: userName });
      // setJoined(true);
    }
    setJoined(true);
  };

  useEffect(() => {
    socket.on("message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("user_joined", (message) => {
      setMessages((prev) => [...prev, { sender: "system", message }]);
    });

    return () => {
      socket.off("user_joined");
      socket.off("message");
    };
  }, []);
  return (
    <div className="">
      {!joined ? (
        <div className="flex flex-col items-center justify-center">
          <h1 className="mb-4 text-2xl font-bold">Join a Room</h1>

          <Input
            type="text "
            placeholder="Username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-64 px-4 py-2 mb-4 border-2 rounded-lg"
          />
          <Input
            type="text"
            placeholder="Room Name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-64 px-4 py-2 mb-4 border-2 rounded-lg"
          />
          <button
            type="button"
            onClick={handleJoinRoom}
            className="px-4 py-2 text-white bg-blue-500 rounded-lg"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="h-[500px] overflow-y-auto p-4 mb-4 border-2 rounded-lg">
          {messages?.map((msg, index) => {
            return (
              <ChatMessage
                key={index}
                sender={msg.sender}
                message={msg.message}
                isOwnMessage={msg.sender === userName}
              />
            );
          })}
          <ChatForm onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
}
