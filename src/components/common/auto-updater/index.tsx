import { useEffect } from "react";
import { checkUpdate, installUpdate } from "@tauri-apps/api/updater";
import { relaunch } from "@tauri-apps/api/process";
import toast from "react-hot-toast";
import "./index.css";

const i32Max = 2147483647;
const toastId = "auto-updater";

const App = () => {
  useEffect(() => {
    autoInstallLatestVersion();
  }, []);

  function autoInstallLatestVersion() {
    checkUpdate()
      .then(async (res) => {
        if (res.shouldUpdate && res.manifest?.version) {
           await installUpdate();
           return true
        }
        return false
      })
      .then((installed) => {
        if (installed) {
          toast.custom(renderUpdater(), {
            id: toastId,
            duration: i32Max,
            position: "bottom-right",
          });
        }
      });
  }

  function reloadApp() {
    return relaunch();
  }

  function onToastCloseClick() {
    toast.remove(toastId);
  }

  function renderUpdater() {
    return (
      <div
        className="auto-updater"
        style={{
          alignItems: "center",
          background: "#fff",
          color: "#363636",
          lineHeight: 1.3,
          willChange: "transform",
          boxShadow:
            "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
          width: "250px",
          pointerEvents: "auto",
          padding: "8px 25px",
          borderRadius: "8px",
        }}
      >
        <div className="auto-updater-row title">
          🔥 New version available!
        </div>
        <a
          onClick={onToastCloseClick}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            cursor: "pointer",
            color: "#363636",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8 7.99999L15.5 0.499992L16.5 1.49999L9 8.99999L16.5 16.5L15.5 17.5L8 10L0.5 17.5L-0.5 16.5L7 8.99999L-0.5 1.49999L0.5 0.499992L8 7.99999Z"
              fill="currentColor"
            />
          </svg>
        </a>
        <button
          className="auto-updater-row"
          onClick={reloadApp}
          style={{
            textAlign: "center",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
  return <></>;
};

export default App;
