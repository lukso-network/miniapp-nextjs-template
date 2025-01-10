'use client';
import { useCallback, useEffect, useState } from 'react';
import { parseUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGrid } from './GridProvider';

// TODO: we need to find a way to import this globally instead
if (typeof window !== 'undefined') {
  import('@lukso/web-components');
}

const minAmount = 0.25;
const maxAmount = 1000;

interface DonateProps {
  selectedAddress?: `0x${string}` | null;
  profileImgUrl?: string;
}

export function Donate({ selectedAddress, profileImgUrl }: DonateProps) {
  const { client, accounts, contextAccounts, walletConnected, setIsSearching } =
    useGrid();
  const [amount, setAmount] = useState<number>(minAmount);
  const [error, setError] = useState('');

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

  const recipientAddress = selectedAddress || contextAccounts[0];

  const sendToken = async () => {
    if (!client || !walletConnected || !amount) return;
    await client.sendTransaction({
      account: accounts[0] as `0x${string}`,
      to: recipientAddress as `0x${string}`,
      value: parseUnits(amount.toString(), 18),
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 md:p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Donate LYX
          </h2>
          <button
            onClick={() => setIsSearching(true)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            Change Address
          </button>
        </div>

        {/* Recipient Address Display */}
        {recipientAddress && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-2">Recipient Address</div>
            <code className="block text-sm font-mono text-gray-700 break-all">
              {recipientAddress}
              {/* TODO: need to find a way to import/merge types of lukso on globals.d.ts with JSX.IntrinsicElements */}
              <lukso-profile
                profile-address={recipientAddress}
                profile-url={profileImgUrl}
                has-identicon
                size="small"
              ></lukso-profile>
            </code>
          </div>
        )}
      </div>

      {/* Amount Input Section */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700"
          >
            Amount (LYX)
          </label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                validateAmount(value);
              }}
              min={minAmount}
              max={maxAmount}
              step="0.25"
              className="block w-full px-4 py-3 text-lg rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!walletConnected}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              LYX
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>

        {/* Donate Button */}
        <Button
          onClick={sendToken}
          disabled={!walletConnected || !amount || !recipientAddress}
          className="w-full py-4 text-lg font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {walletConnected
            ? `Donate ${amount} LYX`
            : 'Connect Wallet to Donate'}
        </Button>
      </div>
    </div>
  );
}
