/**
 * A component that facilitates LYX token transfers to a specified LUKSO address.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.selectedAddress] - Optional hex address of the donation recipient.
 *                                          If not provided, uses the first address from context.
 *
 * Features:
 * - Amount validation (${minAmount}-${maxAmount} LYX)
 * - Integration with UP Browser wallet
 * - Recipient profile display using LuksoProfile
 * - Real-time amount validation
 *
 * @requires useUpProvider - Hook for UP Browser wallet integration
 * @requires LuksoProfile - Component for displaying LUKSO profile information
 * @requires viem - For handling blockchain transactions
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { parseUnits } from "viem";
import { useUpProvider } from "./upProvider";
import { LuksoProfile } from "./LuksoProfile";
import { waitForTransactionReceipt } from "viem/actions";

const minAmount = 1.0;
const maxAmount = 1000;

interface DonateProps {
  selectedAddress?: `0x${string}` | null;
}

export function Donate({ selectedAddress }: DonateProps) {
  const { client, accounts, contextAccounts, walletConnected } =
    useUpProvider();
  const [amount, setAmount] = useState<number>(minAmount);
  const [error, setError] = useState("");
  const recipientAddress = selectedAddress || contextAccounts[0];
  const [isLoading, setIsLoading] = useState(false);

  const validateAmount = useCallback((value: number) => {
    if (value < minAmount) {
      setError(`Amount must be at least ${minAmount} LYX.`);
    } else if (value > maxAmount) {
      setError(`Amount cannot exceed ${maxAmount} LYX.`);
    } else {
      setError("");
    }
    setAmount(value);
  }, []);

  useEffect(() => {
    validateAmount(amount);
  }, [amount, validateAmount]);

  const sendToken = useCallback(async () => {
    if (!client || !walletConnected || !amount) {
      return;
    }

    try {
      setIsLoading(true);
      const tx = await client.sendTransaction({
        account: accounts[0] as `0x${string}`,
        to: recipientAddress as `0x${string}`,
        value: parseUnits(amount.toString(), 18),
        chain: client.chain,
      });

      // Wait for transaction confirmation
      await waitForTransactionReceipt(client, { hash: tx });

      // Reset amount after successful transaction
      setAmount(minAmount);
    } catch (err) {
      console.error("Transaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [accounts, amount, client, recipientAddress, walletConnected]);

  const sendTokenKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        sendToken();
      }
    },
    [sendToken]
  );

  const handleOnInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseFloat(e.target.value);
      validateAmount(value);
    },
    [validateAmount]
  );

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl">
      <div className="rounded-xl">
        <div className="flex flex-row items-center justify-center gap-2">
          <LuksoProfile address={recipientAddress} />
        </div>
      </div>

      {/* Amount Input and Donate Button Section */}
      <div className="flex gap-2">
        <div className="flex-1">
          <lukso-input
            value={minAmount.toString()}
            type="number"
            min={minAmount}
            max={maxAmount}
            onInput={handleOnInput}
            is-full-width
            is-disabled={!walletConnected}
            className="mt-2"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <lukso-button
          onClick={sendToken}
          onKeyPress={sendTokenKeyPress}
          variant="primary"
          size="medium"
          className="mt-2"
          isLoading={isLoading}
          disabled={!walletConnected}
        >
          {`Donate ${amount} LYX`}
        </lukso-button>
      </div>
    </div>
  );
}
