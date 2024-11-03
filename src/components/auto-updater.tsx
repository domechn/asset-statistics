import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { reloadApp } from '@/utils/app'

const maxInt = 2147483647;

const App = () => {
  const { toast } = useToast();
  useEffect(() => {
    autoInstallLatestVersion();
  }, []);

  function autoInstallLatestVersion() {
    check()
      .then(async (update) => {
        if (update?.available) {
          await update.downloadAndInstall();
          return true;
        }
        return false;
      })
      .then((installed) => {
        if (installed) {
          toast({
            title: "🔥 New version available!",
            duration: maxInt,
            action: (
              <ToastAction
                altText={"reload"}
                onClick={reloadApp}
                className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
              >
                Reload
              </ToastAction>
            ),
          });
        }
      });
  }

  return <></>;
};

export default App;
