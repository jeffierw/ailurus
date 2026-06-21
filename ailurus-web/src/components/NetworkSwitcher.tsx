import { useAppNetwork } from '../hooks/useAppNetwork';

export function NetworkSwitcher({ className = '' }: { className?: string }) {
  const { network } = useAppNetwork();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="network-switch" className="text-xs text-muted shrink-0">
        Network
      </label>
      <select
        id="network-switch"
        value={network}
        disabled
        className="h-9 px-3 rounded-xl border border-border bg-surface text-sm font-medium opacity-90 cursor-default"
      >
        <option value="testnet">Testnet</option>
        <option value="mainnet" disabled>
          Mainnet (Coming Soon)
        </option>
      </select>
    </div>
  );
}
