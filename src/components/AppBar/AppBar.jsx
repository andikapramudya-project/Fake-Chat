import React, { useContext } from "react";
import { AppContext } from "../../App";
import { loadImageFile } from "../../utils";
import { BackIcon, VideoIcon, CallIcon, MoreIcon } from "../Icons";
import "./index.css";

const AppBar = () => {
  const {
    isMenuOpen,
    setIsMenuOpen,
    operationRef,
    setOperation,
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

  const avatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || operationRef.current) return;
    operationRef.current = "image";
    setOperation("image");
    setIsMenuOpen(false);
    try {
      const image = await loadImageFile(file);
      setContact((c) => ({ ...c, avatar: image.src }));
    } catch (error) {
      alert(error.message || "Could not load the profile picture.");
    } finally {
      operationRef.current = null;
      setOperation(null);
    }
  };

  // While the contact "records" a voice note, WhatsApp shows it in the status line.
  const theyRecord = recording && recording.self === false;
  const showStatus = phone.showContactStatus;

  return (
    <div className="appBar">
      <div className="appBarLeft">
        <BackIcon className="arrow" />
        <label htmlFor="pp" className="ppLabel" title="Change profile picture">
          <img src={contact.avatar} alt="Profile" className="ppImage" />
        </label>
        <input id="pp" type="file" accept="image/*" onChange={avatarChange} />
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
              <span className="contactStatus recordingStatus">recording audio…</span>
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
      <div className="appBarRight">
        <button
          className="headerBtn"
          onClick={() => openDialog({ kind: "call", media: "video" })}
          aria-label="Add video call"
          title="Add a video call to the chat"
        >
          <VideoIcon className="appBarIcons" />
        </button>
        <button
          className="headerBtn"
          onClick={() => openDialog({ kind: "call", media: "voice" })}
          aria-label="Add voice call"
          title="Add a voice call to the chat"
        >
          <CallIcon className="appBarIcons" />
        </button>
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
