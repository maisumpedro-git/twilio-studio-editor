import type { ReactNode } from "react";
import { APP_MANIFEST, APPLICATION_TECH_STACK, APPLICATION_DESIGN_GUIDELINES } from "@shared/appManifest";
import { Button } from "../ui/Button";
import { DownloadIcon, SearchIcon, RefreshIcon, FlowIcon } from "../ui/icons";

export type InitialPromptProps = {
  appVersion: string;
  isFetching: boolean;
  onDownloadFlows: () => void;
  onRefreshFlows: () => void;
  onToggleSearch: () => void;
};

const QuickAction = ({
  title,
  description,
  icon,
  action
}: {
  title: string;
  description: string;
  icon: ReactNode;
  action: ReactNode;
}) => (
  <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-slate-950/30">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 text-slate-200">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
    </div>
    <p className="text-sm text-slate-400">{description}</p>
    {action}
  </div>
);

export const InitialPrompt = ({
  appVersion,
  isFetching,
  onDownloadFlows,
  onRefreshFlows,
  onToggleSearch
}: InitialPromptProps) => {
  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-10 py-12 shadow-lg shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Twilio Studio Editor · v{appVersion}</p>
        <h2 className="mt-4 text-3xl font-semibold text-slate-50">
          Construa e sincronize fluxos do Twilio Studio com agilidade.
        </h2>
        <p className="mt-3 max-w-2xl text-base text-slate-400">
          {APP_MANIFEST.description}
        </p>
        <div className="mt-6 grid gap-4 text-sm text-slate-400 lg:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pilares de design</p>
            <ul className="mt-2 space-y-1">
              {APPLICATION_DESIGN_GUIDELINES.slice(0, 3).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-surface-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Stack principal</p>
            <ul className="mt-2 space-y-1">
              {APPLICATION_TECH_STACK.slice(0, 4).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-surface-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Próximos passos</p>
            <ul className="mt-2 space-y-1">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-surface-500" />
                <span>Baixe todos os fluxos com o Twilio CLI instalado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-surface-500" />
                <span>Selecione um fluxo na barra lateral para abrir o editor.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-surface-500" />
                <span>Use a busca global para localizar widgets rapidamente.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <QuickAction
          title="Baixar fluxos do Twilio"
          description="Sincronize o diretório local com os fluxos publicados na sua conta através do Twilio CLI."
          icon={<DownloadIcon className="h-5 w-5" />}
          action={
            <Button onClick={onDownloadFlows} disabled={isFetching} icon={<DownloadIcon />}>
              {isFetching ? "Sincronizando..." : "Baixar agora"}
            </Button>
          }
        />
        <QuickAction
          title="Atualizar workspace"
          description="Releia os arquivos locais e garanta que o editor mostre a versão mais recente do fluxo."
          icon={<RefreshIcon className="h-5 w-5" />}
          action={
            <Button variant="ghost" onClick={onRefreshFlows} disabled={isFetching} icon={<RefreshIcon />}>
              {isFetching ? "Atualizando..." : "Recarregar"}
            </Button>
          }
        />
        <QuickAction
          title="Buscar widgets e nós"
          description="Faça uma busca semântica em todos os fluxos para encontrar rapidamente estados, transições e textos."
          icon={<SearchIcon className="h-5 w-5" />}
          action={
            <Button variant="outline" onClick={onToggleSearch} icon={<SearchIcon />}>
              Abrir busca global
            </Button>
          }
        />
      </section>

      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-4 text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <FlowIcon className="h-5 w-5 text-surface-400" />
          <p>
            Precisando importar um fluxo manualmente? Utilize o comando <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-slate-200">twilio api:studio:v2:flows:fetch --sid XXX --output json</code> e salve o arquivo em <span className="text-slate-300">%APPDATA%/Twilio Studio Editor/flows</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InitialPrompt;
