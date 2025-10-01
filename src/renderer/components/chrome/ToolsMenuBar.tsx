export const ToolsMenuBar = ({ onMappingCreate, onRefreshSidFriendly }: { onMappingCreate: () => void | Promise<void>; onRefreshSidFriendly?: () => void | Promise<void> }) => {
  return (
    <div className="flex h-8 items-center gap-4 border-b border-slate-900 bg-slate-950/80 px-3 text-xs text-slate-300">
      <div className="group relative">
        <button className="rounded px-2 py-1 hover:bg-slate-800">Tools</button>
        <div className="invisible absolute left-0 top-full z-40 w-56 rounded-md border border-slate-800 bg-slate-900 py-1 text-slate-200 shadow-xl group-hover:visible">
          <button
            className="block w-full px-3 py-1 text-left text-xs hover:bg-slate-800"
            onClick={() => void onMappingCreate()}
          >
            Mapping Create (fluxo atual)
          </button>
          <button
            className="block w-full px-3 py-1 text-left text-xs hover:bg-slate-800"
            onClick={() => onRefreshSidFriendly && onRefreshSidFriendly()}
          >
            Atualizar nomes amigáveis (SIDs)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolsMenuBar;