"use client";
import React, { useState } from "react";
import { Input } from "./ui/input";

const ChatForm = ({
  onSendMessage,
}: {
  onSendMessage: (message: string) => void;
}) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() !== "") {
      onSendMessage(message);
      setMessage("");
    }
  };
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <Input type="text" onChange={(e) => setMessage(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatForm;
