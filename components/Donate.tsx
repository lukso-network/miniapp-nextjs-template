'use client';
import { useCallback, useEffect, useState } from 'react';
import { parseUnits } from 'viem';
import { useUpProvider } from './upProvider';
import { LuksoProfile } from './LuksoProfile';

const minAmount = 1.00;
const maxAmount = 1000;

interface DonateProps {
  selectedAddress?: `0x${string}` | null;
}

export function Donate({ selectedAddress }: DonateProps) {
  const { client, accounts, contextAccounts, walletConnected, setIsSearching } =
    useUpProvider();
  const [amount, setAmount] = useState<number>(minAmount);
  const [error, setError] = useState('');
  const recipientAddress = selectedAddress || contextAccounts[0];

  const validateAmount = useCallback((value: number) => {
    if (value < minAmount) {
      setError(`Amount must be at least ${minAmount} LYX.`);
    } else if (value > maxAmount) {
      setError(`Amount cannot exceed ${maxAmount} LYX.`);
    } else {
      setError('');
    }
    setAmount(value);
  }, []);

  useEffect(() => {
    validateAmount(amount);
  }, [amount, validateAmount]);

  const sendToken = async () => {
    if (!client || !walletConnected || !amount) return;
    await client.sendTransaction({
      account: accounts[0] as `0x${string}`,
      to: recipientAddress as `0x${string}`,
      value: parseUnits(amount.toString(), 18),
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 md:p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-l md:text-xl font-bold text-gray-900">
            Donate LYX
          </h2>
          <lukso-button
            onClick={() => setIsSearching(true)}
            variant="primary"
            size="medium"
            isFullWidth={true}
          >
            Change Address
          </lukso-button>
        </div>

        {/* Recipient Address Display */}
        {recipientAddress && (
          <div className="bg-gray-20 rounded-xl p-2 space-y-2">
            <div className="flex flex-col items-center">
              <LuksoProfile address={recipientAddress} />
            </div>
          </div>
        )}
      </div>

      {/* Amount Input Section */}
      <lukso-input
        label="Amount (LYX)"
        placeholder={minAmount.toString()}
        type="number"
        min={minAmount}
        max={maxAmount}
        on-change={(e: any) => {
          const value = Number.parseFloat(e.target.value);
          validateAmount(value);
        }}
        className="w-full"
        is-disabled={!walletConnected}
      ></lukso-input>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      <div className="space-y-4">
        {/* Donate Button */}
        <lukso-button
          onClick={sendToken}
          variant="primary"
          size="medium"
          isFullWidth={true}
        >
          {walletConnected
            ? `Donate ${amount} LYX`
            : 'Connect UP to Donate'}
        </lukso-button>
      </div>
    </div>
  );
}
