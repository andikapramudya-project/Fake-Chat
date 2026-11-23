import React, { useContext, useState } from "react";
import { AppContext } from "../../App";
import { loadImageFile } from "../../utils";
import {
  BackIcon,
  VideoIcon,
  CallIcon,
  MoreIcon,
  DEFAULT_AVATAR,
} from "../Icons";
import "./index.css";

const AppBar = () => {
  const { isMenuOpen, setIsMenuOpen, operationRef, setOperation } = useContext(AppContext);
  const [pp, setPp] = useState(DEFAULT_AVATAR);
  const [nickname, setNickname] = useState("Nickname");
  const [status, setStatus] = useState("online");

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
      setPp(image.src);
    } catch (error) {
      alert(error.message || "Could not load the profile picture.");
    } finally {
      operationRef.current = null;
      setOperation(null);
    }
  };

  return (
    <div className="appBar">
      <div className="appBarLeft">
        <BackIcon className="arrow" />
        <label htmlFor="pp" className="ppLabel" title="Change profile picture">
          <img src={pp} alt="Profile" className="ppImage" />
        </label>
        <input id="pp" type="file" accept="image/*" onChange={avatarChange} />
        <div className="nameBlock">
          <input
            className="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            title="Click to edit the contact name"
            aria-label="Contact name"
            spellCheck={false}
          />
          <input
            className={`contactStatus ${status ? "" : "no-export"}`}
            type="text"
            placeholder="add status (optional)"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            title="Click to edit the status line (leave empty to hide)"
            aria-label="Contact status"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="appBarRight">
        <VideoIcon className="appBarIcons" />
        <CallIcon className="appBarIcons" />
        <button
          className={`menuBtn ${isMenuOpen ? "open" : ""}`}
          onClick={menuClick}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          title="Menu: screenshot, video, replay"
        >
          <MoreIcon className="appBarIcons" />
        </button>
      </div>
    </div>
  );
};

export default AppBar;
