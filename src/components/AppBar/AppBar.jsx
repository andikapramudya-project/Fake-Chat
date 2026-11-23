import React, { useContext } from "react";
import { AppContext } from "../../App";
import { avatarSrc } from "../../model";
import { BackIcon, VideoIcon, CallIcon, MoreIcon, DropdownIcon } from "../Icons";
import "./index.css";

const AppBar = () => {
  const {
    isMenuOpen,
    setIsMenuOpen,
    contact,
    setContact,
    phone,
    openDialog,
    recording,
  } = useContext(AppContext);

  const menuClick = (event) => {
    event.stopPropagation();
    setIsMenuOpen((p) => !p);
  };

  // While the contact "records" a voice note, WhatsApp shows it in the status line.
  const theyRecord = recording && recording.self === false;
  const showStatus = phone.showContactStatus;
  // Business chats in WhatsApp show only the phone icon with a small ▾.
  const phoneOnly = phone.headerCalls === "phone";

  return (
    <div className="appBar">
      <div className="appBarLeft">
        <BackIcon className="arrow" />
        <button
          type="button"
          className="ppLabel"
          onClick={() => openDialog({ kind: "avatar" })}
          aria-label="Change profile picture"
          title="Change profile picture: color or photo"
        >
          <img src={avatarSrc(contact.avatar)} alt="" className="ppImage" />
        </button>
        <div className={`nameBlock ${showStatus ? "" : "noStatus"}`}>
          <input
            className="nickname"
            type="text"
            value={contact.name}
            onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
            title="Click to edit the contact name"
            aria-label="Contact name"
            spellCheck={false}
          />
          {showStatus &&
            (theyRecord ? (
              <span className="contactStatus recordingStatus">merekam audio…</span>
            ) : (
              <input
                className={`contactStatus ${contact.status ? "" : "no-export"}`}
                type="text"
                placeholder="add status (optional)"
                value={contact.status}
                onChange={(e) => setContact((c) => ({ ...c, status: e.target.value }))}
                title="Click to edit the status line (leave empty to hide)"
                aria-label="Contact status"
                spellCheck={false}
              />
            ))}
        </div>
      </div>
      <div className={`appBarRight ${phoneOnly ? "phoneOnly" : ""}`} data-header-calls={phoneOnly ? "phone" : "both"}>
        {phoneOnly ? (
          <div className="callCombo">
            <button
              className="headerBtn callComboMain"
              onClick={() => openDialog({ kind: "call", media: "voice" })}
              aria-label="Add voice call"
              title="Add a voice call (Telepon suara) to the chat"
            >
              <CallIcon className="appBarIcons" />
            </button>
            <button
              className="headerBtn callComboCaret"
              onClick={() => openDialog({ kind: "call", media: "video" })}
              aria-label="Add video call"
              title="Add a video call (Panggilan video) to the chat"
            >
              <DropdownIcon className="appBarCaret" />
            </button>
          </div>
        ) : (
          <>
            <button
              className="headerBtn"
              onClick={() => openDialog({ kind: "call", media: "video" })}
              aria-label="Add video call"
              title="Add a video call (Panggilan video) to the chat"
            >
              <VideoIcon className="appBarIcons" />
            </button>
            <button
              className="headerBtn"
              onClick={() => openDialog({ kind: "call", media: "voice" })}
              aria-label="Add voice call"
              title="Add a voice call (Telepon suara) to the chat"
            >
              <CallIcon className="appBarIcons" />
            </button>
          </>
        )}
        <button
          className={`headerBtn menuBtn ${isMenuOpen ? "open" : ""}`}
          onClick={menuClick}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          title="Menu: phone style, screenshot, video, replay"
        >
          <MoreIcon className="appBarIcons moreIcon" />
        </button>
      </div>
    </div>
  );
};

export default AppBar;
