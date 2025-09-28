import { useEffect, useState } from "react";

const App = () => {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const appVersion = window.twilioStudio.getAppVersion();
    setVersion(appVersion);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="w-72 border-r border-slate-800 p-6">
        <h1 className="text-lg font-semibold">Twilio Studio Editor</h1>
        <p className="mt-1 text-xs text-slate-400">Versão {version}</p>
      </aside>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-400">Interface em desenvolvimento...</p>
      </main>
    </div>
  );
};

export default App;
