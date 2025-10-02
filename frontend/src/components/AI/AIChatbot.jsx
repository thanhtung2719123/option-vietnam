import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createChatSession, sendMessage, getSuggestions, getContextFromPath } from '../../services/geminiService';
import './AIChatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const context = getContextFromPath(location.pathname);
    const newSession = createChatSession(context);
    setSession(newSession);
    setSuggestions(getSuggestions(context));
    setMessages([{ role: 'assistant', content: 'Xin chào! Tôi có thể giúp gì cho bạn?' }]);
  }, [location.pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !session) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      const response = await sendMessage(session, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, đã có lỗi xảy ra.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content) => {
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
  };

  return (
    <>
      <button className={`ai-chatbot-button ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '' : ''}
      </button>
      {isOpen && (
        <div className="ai-chatbot-window">
          <div className="ai-chatbot-header">
            <div className="ai-chatbot-header-info">
              <div className="ai-chatbot-avatar"></div>
              <div>
                <div className="ai-chatbot-title">AI Assistant</div>
                <div className="ai-chatbot-subtitle">Powered by Gemini 2.0</div>
              </div>
            </div>
            <button className="ai-chatbot-close" onClick={() => setIsOpen(false)}></button>
          </div>
          <div className="ai-chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-chatbot-message ${msg.role}`}>
                {msg.role === 'assistant' && <div className="message-avatar"></div>}
                <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                {msg.role === 'user' && <div className="message-avatar"></div>}
              </div>
            ))}
            {loading && (
              <div className="ai-chatbot-message assistant">
                <div className="message-avatar"></div>
                <div className="message-content loading"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {messages.length <= 1 && suggestions.length > 0 && (
            <div className="ai-chatbot-suggestions">
              <div className="suggestions-title"> Gợi ý câu hỏi:</div>
              {suggestions.map((suggestion, idx) => (
                <button key={idx} className="suggestion-chip" onClick={() => setInput(suggestion)}>{suggestion}</button>
              ))}
            </div>
          )}
          <div className="ai-chatbot-input">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Hỏi gì đó..." rows={1} disabled={loading} />
            <button onClick={handleSend} disabled={!input.trim() || loading} className="send-button">{loading ? '' : ''}</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;