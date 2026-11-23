import React, { useContext, useEffect, useRef } from "react";
import { AppContext } from "../../App";
import { toPng } from "html-to-image";
import { PROJECT } from "../../config";
import {
  sleep,
  exportOptions,
  downloadUrl,
  withPinnedScroll,
  clearFocus,
  MESSAGE_GAP,
} from "../../utils";
import { PRESETS, PRESET_IDS, buildTimeline, messageType, withPreset } from "../../model";
import "./index.css";


const Icon = ({ d }) => (
  <svg className="menuIcon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);

const icons = {
  camera:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9Zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z",
  video:
    "M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z",
  replay:
    "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8Z",
  clear:
    "M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z",
  help: "M11 18h2v-2h-2v2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4Z",
  date: "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z",
  code: "M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z",
};

const Menu = () => {
  const {
    isMenuOpen,
    messageList,
    setShowLoading,
    setLoadPercent,
    appRef,
    setMessageList,
    playFor,
    setIsMenuOpen,
    setShowHelp,
    recordingRef,
    videoAbortRef,
    setOperation,
    operationRef,
    phone,
    setPhone,
    recording,
    setRecording,
    openDialog,
  } = useContext(AppContext);
  const menuRef = useRef();

  // Claim the operation synchronously, before React renders the disabled editor.
  const beginOperation = (name) => {
    if (operationRef.current) return false;
    operationRef.current = name;
    setOperation(name);
    // No focus ring or caret may end up in an export.
    clearFocus();
    return true;
  };
  const endOperation = () => {
    operationRef.current = null;
    setOperation(null);
  };

  // Close the menu when clicking anywhere outside it.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (event.target.closest?.(".menuBtn")) return;
      setIsMenuOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setIsMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMenuOpen, setIsMenuOpen]);

  const replayChat = async () => {
    if (!beginOperation("replay")) return;
    setIsMenuOpen(false);
    const tmpMessageList = [...messageList];
    const draft = recording;
    const controller = new AbortController();
    videoAbortRef.current = controller;
    setLoadPercent(0);
    setShowLoading(true);
    try {
      setRecording(null);
      setMessageList([]);
      // Same timeline as the video: voice notes get their recording scene first.
      const timeline = buildTimeline(tmpMessageList, {
        leadIn: MESSAGE_GAP,
        gap: MESSAGE_GAP,
        tail: 0,
      });
      let now = 0;
      for (let i = 0; i < tmpMessageList.length; i++) {
        const item = timeline.items[i];
        const message = tmpMessageList[i];
        // Date dividers show up together with the message after them.
        if (messageType(message) === "date") continue;
        if (item.sceneStart !== null) {
          await sleep((item.sceneStart - now) * 1000, controller.signal);
          now = item.sceneStart;
          setRecording({
            mode: "replay",
            self: message.self === true,
            durationSec: message.voice?.durationSec || 1,
            sceneSec: item.sceneSec,
            seed: message.msgId,
            startedAt: performance.now(),
          });
        }
        await sleep((item.appear - now) * 1000, controller.signal);
        now = item.appear;
        setRecording(null);
        setMessageList(tmpMessageList.slice(0, i + 1));
        setLoadPercent(((i + 1) / tmpMessageList.length) * 100);
        playFor(message);
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Replay failed", error);
    } finally {
      setMessageList(tmpMessageList);
      setRecording(draft);
      videoAbortRef.current = null;
      setShowLoading(false);
      setLoadPercent(0);
      endOperation();
    }
  };

  const takeScreenshot = async () => {
    if (!beginOperation("screenshot")) return;
    setIsMenuOpen(false);
    try {
      await sleep(250);
      const options = await exportOptions(appRef.current, { pixelRatio: 2 });
      const image = await withPinnedScroll(appRef.current, () =>
        toPng(appRef.current, options)
      );
      downloadUrl(image, `fake-chat-${Date.now()}.png`);
    } catch (error) {
      console.error("Screenshot export failed", error);
      alert("Could not save the screenshot. Please try again.");
    } finally {
      endOperation();
    }
  };

  const saveVideo = async () => {
    setIsMenuOpen(false);
    if (messageList.length === 0) return;
    if (!beginOperation("video")) return;
    const controller = new AbortController();
    videoAbortRef.current = controller;
    recordingRef.current = true;
    setLoadPercent(0);
    setShowLoading(true);
    try {
      await sleep(250, controller.signal);
      // Loaded on demand: the video encoder library is large.
      const { renderChatVideo } = await import("../../video");
      const { blob, extension } = await renderChatVideo({
        phoneEl: appRef.current,
        messages: [...messageList],
        setMessageList,
        setRecording,
        restoreRecording: recording,
        onProgress: setLoadPercent,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      const ext = extension.replace(/^\./, "");
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `fake-chat-${Date.now()}.${ext}`);
      // Allow the browser to start the download before releasing the buffer.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Video export failed", error);
        alert(
          error.name === "VideoUnsupportedError"
            ? "Your browser has no supported video encoder. Try an updated Chrome or Edge browser over HTTPS or localhost."
            : "Sorry, the video export failed. Please try again."
        );
      }
    } finally {
      recordingRef.current = false;
      videoAbortRef.current = null;
      setShowLoading(false);
      setLoadPercent(0);
      endOperation();
    }
  };

  const clearChat = () => {
    setIsMenuOpen(false);
    if (!window.confirm("Clear all messages? This cannot be undone.")) return;
    setMessageList([]);
  };

  const openHelp = () => {
    setIsMenuOpen(false);
    setShowHelp(true);
  };

  const openRepo = () => {
    setIsMenuOpen(false);
    window.open(
      PROJECT.repository,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const choosePreset = (id) => {
    setPhone((p) => withPreset(p, id));
  };
  const toggleStatus = () =>
    setPhone((p) => ({ ...p, showContactStatus: !p.showContactStatus }));

  const empty = messageList.length === 0;
  const items = [
    { section: "Phone style" },
    ...PRESET_IDS.map((id) => ({
      label: PRESETS[id].label,
      role: "menuitemradio",
      checked: phone.preset === id,
      onClick: () => choosePreset(id),
    })),
    {
      label: "Show contact status",
      role: "menuitemcheckbox",
      checked: phone.showContactStatus,
      onClick: toggleStatus,
    },
    { divider: true },
    {
      label: "Add date divider",
      icon: icons.date,
      onClick: () => openDialog({ kind: "date" }),
      disabled: empty,
    },
    { divider: true },
    { label: "Take screenshot", icon: icons.camera, onClick: takeScreenshot },
    { label: "Save video", icon: icons.video, onClick: saveVideo, disabled: empty },
    { label: "Replay chat", icon: icons.replay, onClick: replayChat, disabled: empty },
    { label: "Clear chat", icon: icons.clear, onClick: clearChat, disabled: empty },
    { divider: true },
    { label: "How to use", icon: icons.help, onClick: openHelp },
    { label: "Source code", icon: icons.code, onClick: openRepo },
  ];

  return (
    <div
      ref={menuRef}
      className={`menu no-export ${isMenuOpen ? "showMenu" : ""}`}
      role="menu"
    >
      {items.map((item, i) => {
        if (item.divider) return <div key={i} className="menuDivider" />;
        if (item.section) {
          return (
            <div key={i} className="menuSection" role="presentation">
              {item.section}
            </div>
          );
        }
        const toggle = item.role === "menuitemradio" || item.role === "menuitemcheckbox";
        return (
          <button
            key={item.label}
            className={`menuItems ${toggle ? "menuToggle" : ""}`}
            role={item.role || "menuitem"}
            aria-checked={toggle ? item.checked : undefined}
            onClick={item.onClick}
            disabled={item.disabled}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {toggle ? (
              <span
                className={`menuCheck ${item.role === "menuitemradio" ? "radio" : "box"} ${
                  item.checked ? "on" : ""
                }`}
                aria-hidden="true"
              />
            ) : (
              <Icon d={item.icon} />
            )}
            {item.label}
          </button>
        );
      })}
      <div className="menuCredit">Maintained by {PROJECT.maintainer}</div>
    </div>
  );
};

export default Menu;
