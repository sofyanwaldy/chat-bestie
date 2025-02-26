"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

// Helper function to format text with bold and line breaks
const formatMessageText = (text: string) => {
  return text.split("\n").map((line, lineIndex) => {
    // Split the line by bold markers ** **
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <span key={lineIndex}>
        {parts.map((part, partIndex) => {
          // Check if this part is wrapped in ** **
          if (part.startsWith("**") && part.endsWith("**")) {
            // Remove the ** markers and wrap in bold tag
            return (
              <strong key={partIndex} className="font-bold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={partIndex}>{part}</span>;
        })}
        {lineIndex !== text.split("\n").length - 1 && <br />}
      </span>
    );
  });
};

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! Ada yang bisa aku bantu?",
      isUser: false,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const functionMap = {
    search_product: (args: string) => {
      console.log("mencari product", args);
    },
  } as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message
    const newMessage: Message = {
      id: messages.length + 1,
      text: message,
      isUser: true,
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      // Create placeholder for AI response
      const responseId = messages.length + 2;
      setMessages((prev) => [
        ...prev,
        {
          id: responseId,
          text: "",
          isUser: false,
        },
      ]);

      const slicedMessages = messages.slice(1);
      const prevMessages = slicedMessages
        .map((msg) => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.text,
        }))
        .slice(messages.length - 2);
      const systemMessage = {
        role: "system",
        content: `Kamu adalah Beauty Assistant bernama 'Bestie.' Bestie berarti teman, dan sebagai Beauty Assistant khusus untuk Sociolla, tugasmu adalah membantu pengguna dalam memilih produk kecantikan yang sesuai dengan keinginan pengguna. 
        Sociolla adalah salah satu e-commerce terkemuka yang menyediakan berbagai produk kecantikan, termasuk skincare, makeup, dan perawatan rambut. Kamu memiliki pengetahuan mendalam tentang produk-produk Sociolla dan sebagaimana cara penggunaan masing-masing produk. Kamu harus bersikap ramah, suportif, dan informatif, layaknya seorang sahabat yang selalu siap membantu pengguna dalam perjalanan kecantikannya.
        Kamu juga dapat membantu pengguna jika mereka membutuhkan aksi seperti mencari product kamu bisa memanggil function search_product jika dibutuhkan oleh pengguna`,
      };
      const userMessage = {
        role: "user",
        content: message,
      };
      const messagesToSend = [systemMessage, ...prevMessages, userMessage];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesToSend,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      const func: { name: string; args: string } = { name: "", args: "" };

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Decode the stream chunk and split by newlines
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          // Process each line
          for (const line of lines) {
            if (line.trim() === "") continue;

            try {
              const json = JSON.parse(line);

              // Handle function calls
              if (
                json.message?.tool_calls &&
                json.message.tool_calls.length > 0
              ) {
                const tool_calls = json.message.tool_calls[0];
                func.name = tool_calls.function.name
                  ? tool_calls.function.name
                  : func.name;
                func.args = func.args + tool_calls.function.arguments;
              }
              // Handle normal responses
              else if (json.message?.content) {
                accumulatedText += json.message.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === responseId
                      ? { ...msg, text: accumulatedText }
                      : msg
                  )
                );
              }
              // Handle function call responses
              else if (json.message?.function_call) {
                // Don't need to do anything here as we'll handle the results when they come back
                console.log("Function call:", json.message.function_call);
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      }
      if (func.name) {
        functionMap[func.name as keyof typeof functionMap](func.args);
      }
      // console.log("accumulatedArgs:", accumulatedArgs);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "Sorry, there was an error processing your request.",
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all"
        >
          <MessageCircle size={24} />
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-[350px] h-[500px] flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Chat with Bestie</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 whitespace-pre-wrap ${
                    msg.isUser
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {formatMessageText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-full p-2 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
