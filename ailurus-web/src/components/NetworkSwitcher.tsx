import { useAppNetwork } from '../hooks/useAppNetwork';
import type { SuiNetwork } from '../sui/config';

export function NetworkSwitcher({ className = '' }: { className?: string }) {
  const { network, switchNetwork } = useAppNetwork();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="network-switch" className="text-xs text-muted shrink-0">
        Network
      </label>
      <select
        id="network-switch"
        value={network}
        onChange={(event) => void switchNetwork(event.target.value as SuiNetwork)}
        className="h-9 px-3 rounded-xl border border-border bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-panda/30"
      >
        <option value="testnet">Testnet</option>
        <option value="mainnet">Mainnet</option>
      </select>
    </div>
  );
}
