import React, { useContext, useRef, useState } from "react";
import "./index.css";
import ChatMessage from "../ChatMessage/ChatMessage";
import RecordingPanel from "./RecordingPanel";
import { EmojiIcon, AttachIcon, CameraIcon, MicIcon, SendIcon } from "../Icons";
import { AppContext } from "../../App";
import { newId, nowTime, loadImageFile } from "../../utils";
import { dateLabel, isGroupStart, isSelf, messageType, nextMessageTime } from "../../model";

/** Date divider ("Hari ini", "Kemarin", …). Click it to pick another date. */
const DateChip = ({ date, onClick, componentRef }) => (
  <button
    type="button"
    className="dayChip"
    ref={componentRef || undefined}
    onClick={onClick}
    data-date={date}
    title="Click to change the date"
  >
    {dateLabel(date)}
  </button>
);

const ChatScreen = () => {
  const [chatInput, setChatInput] = useState("");

  const {
    messageList,
    setMessageList,
    playFor,
    lastMessageRef,
    operationRef,
    setOperation,
    setIsMenuOpen,
    sendAsSelf,
    setSendAsSelf,
    openDialog,
    recording,
    setRecording,
    chatDate,
  } = useContext(AppContext);

  // New messages get the current time, but never one before the last message
  // of the day, so the chat always reads in order.
  const append = (message) =>
    setMessageList((list) => [...list, { ...message, time: nextMessageTime(list, nowTime()) }]);

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
            type: "image",
            text: caption,
            image,
            self: sendAsSelf,
          };
          append(message);
          caption = "";
          sent = true;
          playFor(message);
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
    const message = { msgId: newId(), type: "text", text: chatInput, self: sendAsSelf };
    append(message);
    setChatInput("");
    playFor(message);
  };

  // With an empty composer the green button is the microphone: it opens the
  // voice-note simulation instead of sending.
  const onMainButton = () => {
    if (chatInput.trim()) sendMessage();
    else openDialog({ kind: "voice" });
  };

  const draft = recording?.mode === "draft" ? recording : null;
  const discardDraft = () => setRecording(null);
  const sendDraft = () => {
    if (!draft) return;
    const message = {
      msgId: draft.seed,
      type: "voice",
      voice: { durationSec: draft.durationSec, sceneSec: draft.sceneSec },
      self: draft.self,
    };
    setRecording(null);
    append(message);
    playFor(message);
  };
  // You are recording: WhatsApp replaces the composer with the recording bar.
  const selfRecording = recording && recording.self !== false;

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
            The green mic simulates a voice note; the header icons add calls.
            <br />
            Use the <b>You / Them</b> switch to pick the sender, or
            double-click any bubble to flip it.
            <br />
            Hold or right-click a bubble to change its time; click the date to change it.
          </div>
        )}
        {messageList.length > 0 && (
          <DateChip
            date={chatDate}
            onClick={() => openDialog({ kind: "date", target: "top" })}
          />
        )}
        {messageList.map((message, index) =>
          messageType(message) === "date" ? (
            <DateChip
              key={message.msgId}
              date={message.date}
              componentRef={index === messageList.length - 1 ? lastMessageRef : null}
              onClick={() => openDialog({ kind: "date", editId: message.msgId })}
            />
          ) : (
          <ChatMessage
            key={message.msgId}
            message={message}
            left={!isSelf(message)}
            first={isGroupStart(messageList, index)}
            componentRef={index === messageList.length - 1 ? lastMessageRef : null}
          />
          )
        )}
        </div>
      </div>

      {draft && draft.self === false && (
        <div className="themRecording no-export" role="group" aria-label="Contact recording preview">
          <span>Them is recording a voice message…</span>
          <button type="button" onClick={discardDraft}>Discard</button>
          <button type="button" className="primary" onClick={sendDraft}>Send</button>
        </div>
      )}

      {selfRecording ? (
        <div className="chatBar recordingBar">
          <RecordingPanel recording={recording} onDiscard={discardDraft} onSend={sendDraft} />
        </div>
      ) : (
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
            placeholder="Ketik pesan"
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
          onClick={onMainButton}
          aria-label={chatInput.trim() ? "Send" : "Record voice message"}
          title={chatInput.trim() ? "Send" : "Simulate a voice message (no microphone used)"}
        >
          {chatInput.trim() ? (
            <SendIcon className="sendIcon" />
          ) : (
            <MicIcon className="micIcon" />
          )}
        </button>
      </div>
      )}
    </div>
  );
};

export default ChatScreen;
