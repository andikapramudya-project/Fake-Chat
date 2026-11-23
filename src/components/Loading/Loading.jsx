import React, { useContext } from "react";
import { AppContext } from "../../App";
import "./index.css";

const Loading = () => {
  const { loadPercent, videoAbortRef, operation } = useContext(AppContext);
  const replaying = operation === "replay";
  return (
    <div className="loading no-export">
      <div className="loadingCard">
        <div className="recDot" />
        <h2>{replaying ? "Replaying your chat…" : "Creating your video…"}</h2>
        <button className="cancelBtn" onClick={() => videoAbortRef.current?.abort()}>
          Cancel
        </button>
        <p>{replaying ? "Cancel to return to your complete conversation." : "Keep this tab open. The video downloads automatically when it's ready."}</p>
        <div className="loadingBar">
          <div className="loadingFill" style={{ width: `${loadPercent}%` }} />
        </div>
        <span className="loadingPct">{Math.round(loadPercent)}%</span>
      </div>
    </div>
  );
};

export default Loading;
