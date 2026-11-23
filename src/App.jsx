import { createContext, useEffect, useRef, useState } from "react";
import "./App.css";

import { playMessageSound } from "./sounds";
import { defaultPhoneSettings, soundFor } from "./model";
import ChatScreen from "./components/ChatScreen/ChatScreen";
import Loading from "./components/Loading/Loading";
import Menu from "./components/Menu/Menu";
import AppBar from "./components/AppBar/AppBar";
import Help from "./components/Help/Help";
import StatusBar, { NavHandle } from "./components/StatusBar/StatusBar";
import Dialogs from "./components/Dialogs/Dialogs";
import { DEFAULT_AVATAR } from "./components/Icons";

const HELP_SEEN_KEY = "fake-chat:help-seen";

const readHelpSeen = () => {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

export const AppContext = createContext();
function App() {
  const appRef = useRef();
  const lastMessageRef = useRef();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messageList, setMessageList] = useState([]);
  const [showLoading, setShowLoading] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [operation, setOperation] = useState(null);
  const operationRef = useRef(null);
  const [showHelp, setShowHelp] = useState(() => !readHelpSeen());

  // One source of truth for everything the menu, header and status bar share.
  const [phone, setPhone] = useState(() => defaultPhoneSettings());
  const [contact, setContact] = useState({
    name: "Nickname",
    status: "online",
    avatar: DEFAULT_AVATAR,
  });
  // Who the next message is sent as: true = you (right/green), false = them.
  const [sendAsSelf, setSendAsSelf] = useState(true);
  // Open editor dialog: {kind: "clock" | "battery" | "call" | "voice", ...}.
  const [dialog, setDialog] = useState(null);
  // Voice "recording" scene shown in the phone (draft preview, replay or video frame).
  const [recording, setRecording] = useState(null);

  const closeHelp = () => {
    setShowHelp(false);
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch {
      /* storage unavailable: guide just shows again next visit */
    }
  };

  // Plays the notification sound that fits the message (call cards are silent).
  const playFor = (message) => {
    const sound = soundFor(message);
    if (sound) playMessageSound(sound === "send");
  };

  // True while a video is being rendered (it controls scrolling itself).
  const recordingRef = useRef(false);
  const videoAbortRef = useRef(null);

  useEffect(() => {
    if (recordingRef.current) return;
    lastMessageRef?.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageList]);

  const openDialog = (next) => {
    if (operationRef.current) return;
    setIsMenuOpen(false);
    setDialog(next);
  };

  return (
    <AppContext.Provider
      value={{
        messageList,
        setMessageList,
        playFor,
        isMenuOpen,
        setShowLoading,
        setLoadPercent,
        appRef,
        setIsMenuOpen,
        loadPercent,
        lastMessageRef,
        setShowHelp,
        closeHelp,
        recordingRef,
        videoAbortRef,
        operation,
        setOperation,
        operationRef,
        phone,
        setPhone,
        contact,
        setContact,
        sendAsSelf,
        setSendAsSelf,
        dialog,
        setDialog,
        openDialog,
        recording,
        setRecording,
      }}
    >
      <div className="conntainer">
        {showHelp && <Help />}
        {showLoading && <Loading />}
        <Menu />
        {dialog && <Dialogs />}
        <div className="phone" ref={appRef} inert={operation ? true : undefined}>
          <StatusBar
            settings={phone}
            onClockClick={() => openDialog({ kind: "clock" })}
            onBatteryClick={() => openDialog({ kind: "battery" })}
          />
          <AppBar />
          <ChatScreen />
          <NavHandle preset={phone.preset} />
        </div>
      </div>
    </AppContext.Provider>
  );
}

export default App;
