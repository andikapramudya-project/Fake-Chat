import React, { useContext, useRef, useState } from "react";
import "./index.css";
import ChatMessage from "../ChatMessage/ChatMessage";
import { EmojiIcon, AttachIcon, CameraIcon, MicIcon, SendIcon } from "../Icons";
import { AppContext } from "../../App";
import { newId, nowTime, loadImageFile } from "../../utils";

const ChatScreen = () => {
  const [chatInput, setChatInput] = useState("");
  // Who the next message is sent as: true = you (right/green), false = them (left).
  const [sendAsSelf, setSendAsSelf] = useState(true);

  const { messageList, setMessageList, playBip, lastMessageRef, operationRef, setOperation, setIsMenuOpen } =
    useContext(AppContext);

  const fileInputRef = useRef();
  const [dragging, setDragging] = useState(false);

  // Send one or more images. Text in the input becomes the caption of the first one.
  const sendImages = async (files) => {
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    if (images.length === 0 || operationRef.current) return;
    operationRef.current = "image";
    setOperation("image");
    setIsMenuOpen(false);
    let caption = chatInput.trim() ? chatInput : "";
    let sent = false;
    try {
      for (const file of images) {
        try {
          const image = await loadImageFile(file);
          // Capture the caption before React processes the state updater.
          const message = {
            msgId: newId(),
            text: caption,
            image,
            self: sendAsSelf,
            time: nowTime(),
          };
          setMessageList((list) => [...list, message]);
          caption = "";
          sent = true;
          playBip(sendAsSelf);
        } catch (error) {
          console.error(error);
          alert(error.message || "Could not load this image.");
        }
      }
      if (sent) setChatInput("");
    } finally {
      operationRef.current = null;
      setOperation(null);
    }
  };

  const onPickFiles = (event) => {
    sendImages(event.target.files);
    event.target.value = ""; // allow picking the same file again
  };

  const onPaste = (event) => {
    const files = [...event.clipboardData.files].filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) {
      event.preventDefault();
      sendImages(files);
    }
  };

  const dragHandlers = {
    onDragOver: (event) => {
      if ([...event.dataTransfer.types].includes("Files")) {
        event.preventDefault();
        setDragging(true);
      }
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
    },
    onDrop: (event) => {
      event.preventDefault();
      setDragging(false);
      sendImages(event.dataTransfer.files);
    },
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessageList((list) => [
      ...list,
      { msgId: newId(), text: chatInput, self: sendAsSelf, time: nowTime() },
    ]);
    setChatInput("");
    playBip(sendAsSelf);
  };

  // Enter sends, Shift+Enter adds a new line.
  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatScreen" {...dragHandlers}>
      {dragging && (
        <div className="dropOverlay no-export">Drop image to send</div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onPickFiles}
      />
      <div className="chatMessages">
        <div className="chatInner">
        {messageList.length === 0 && (
          <div className="emptyHint no-export">
            Type a message below and press <kbd>Enter</kbd>.
            <br />
            Send images with the 📎 or camera icon, or paste / drop them here.
            <br />
            Use the <b>You / Them</b> switch to pick the sender, or
            double-click any bubble to flip it.
          </div>
        )}
        {messageList.length > 0 && <div className="dayChip">Today</div>}
        {messageList.map((message, index) => (
          <ChatMessage
            text={message.text}
            image={message.image}
            time={message.time}
            key={message.msgId}
            msgId={message.msgId}
            left={message.self !== true}
            first={index === 0 || messageList[index - 1].self !== message.self}
            componentRef={index === messageList.length - 1 ? lastMessageRef : null}
          />
        ))}
        </div>
      </div>

      <div className="chatBar">
        <button
          className={`senderToggle no-export ${sendAsSelf ? "self" : "other"}`}
          onClick={() => setSendAsSelf((s) => !s)}
          title="Switch who sends the next message (hidden in screenshots/videos)"
          aria-label={`Sending as ${sendAsSelf ? "you" : "them"}. Click to switch.`}
        >
          <span className="senderKnob" />
          <span className="senderLabel">{sendAsSelf ? "You" : "Them"}</span>
        </button>
        <div className="chatInput">
          <EmojiIcon className="barIcon emojiIcon" />
          <textarea
            className="chatBox"
            rows={Math.min(5, chatInput.split("\n").length)}
            value={chatInput}
            placeholder="Message"
            aria-label="Message"
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          <button
            className="barBtn"
            onClick={() => fileInputRef.current.click()}
            title="Send an image (text in the box becomes its caption)"
            aria-label="Attach image"
          >
            <AttachIcon className="barIcon attachIcon" />
          </button>
          {!chatInput && (
            <button
              className="barBtn"
              onClick={() => fileInputRef.current.click()}
              title="Send an image"
              aria-label="Send photo"
            >
              <CameraIcon className="barIcon cameraIcon" />
            </button>
          )}
        </div>
        <button
          className="sendBtn"
          onClick={sendMessage}
          aria-label="Send"
          title={chatInput ? "Send" : "Type a message to send"}
        >
          {chatInput ? (
            <SendIcon className="sendIcon" />
          ) : (
            <MicIcon className="micIcon" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;
