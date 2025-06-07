import { useCallback, useState } from 'react';
import { useWeb3 } from './Web3Context';
import { LENDING_VAULT_ABI, COLLATERAL_TOKEN_ABI, STABLECOIN_ABI, CONTRACT_ADDRESSES } from './contractConfig';
import { BN } from '@polkadot/util';

export const useLendingVault = () => {
  const { api, account, contracts } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVaultInfo = useCallback(async () => {
    if (!api || !account) return null;
    
    try {
      const lendingVault = contracts.lendingVault;
      
      // Get vault info
      const { result, output } = await lendingVault.query.vaults(account.address, {});
      
      if (result.isOk && output) {
        const vault = output.toJSON() as { collateralAmount: string; debtAmount: string };
        
        // Get health ratio
        const healthResult = await lendingVault.query.getHealthRatio(account.address, {});
        const healthRatio = healthResult.output?.toString() || '0';
        
        return {
          collateralAmount: vault.collateralAmount,
          debtAmount: vault.debtAmount,
          healthRatio
        };
      }
      
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get vault info');
      return null;
    }
  }, [api, account, contracts]);

  const depositCollateral = useCallback(async (amount: string) => {
    if (!api || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const lendingVault = contracts.lendingVault;
      const collateralToken = contracts.collateralToken;

      // First approve the lending vault to spend tokens
      const approveTx = await collateralToken.tx.approve(
        { value: 0, gasLimit: -1 },
        CONTRACT_ADDRESSES.lendingVault,
        new BN(amount)
      );
      await approveTx.signAndSend(account.address);

      // Then deposit collateral
      const tx = await lendingVault.tx.depositCollateral(
        { value: 0, gasLimit: -1 },
        new BN(amount)
      );
      await tx.signAndSend(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deposit collateral');
    } finally {
      setLoading(false);
    }
  }, [api, account, contracts]);

  const borrow = useCallback(async (amount: string) => {
    if (!api || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const lendingVault = contracts.lendingVault;

      const tx = await lendingVault.tx.borrow(
        { value: 0, gasLimit: -1 },
        new BN(amount)
      );
      await tx.signAndSend(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to borrow');
    } finally {
      setLoading(false);
    }
  }, [api, account, contracts]);

  const repay = useCallback(async (amount: string) => {
    if (!api || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const lendingVault = contracts.lendingVault;
      const stablecoin = contracts.stablecoin;

      // First approve the lending vault to spend stablecoins
      const approveTx = await stablecoin.tx.approve(
        { value: 0, gasLimit: -1 },
        CONTRACT_ADDRESSES.lendingVault,
        new BN(amount)
      );
      await approveTx.signAndSend(account.address);

      // Then repay
      const tx = await lendingVault.tx.repay(
        { value: 0, gasLimit: -1 },
        new BN(amount)
      );
      await tx.signAndSend(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repay');
    } finally {
      setLoading(false);
    }
  }, [api, account, contracts]);

  return {
    getVaultInfo,
    depositCollateral,
    borrow,
    repay,
    loading,
    error
  };
}; 