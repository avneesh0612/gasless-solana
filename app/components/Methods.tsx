import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

import "./Methods.css";

interface DynamicMethodsProps {
  isDarkMode: boolean;
}

export default function DynamicMethods({ isDarkMode }: DynamicMethodsProps) {
  const isLoggedIn = useIsLoggedIn();
  const { primaryWallet } = useDynamicContext();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const sendUSDC = async () => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      setResult("Wallet not connected or not a Solana wallet");
      return;
    }

    if (!recipientAddress || !amount) {
      setResult("Please enter recipient address and amount");
      return;
    }

    try {
      setIsLoading(true);
      setResult("Preparing transaction...");

      let toAddress: PublicKey;
      try {
        toAddress = new PublicKey(recipientAddress);
      } catch (error) {
        setResult("Invalid recipient address");
        setIsLoading(false);
        return;
      }

      const amountInUsdcUnits = parseFloat(amount) * 1_000_000;

      const response = await fetch("/api/gas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderAddress: primaryWallet.address,
          recipientAddress: toAddress.toString(),
          amount: amountInUsdcUnits,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message || "Failed to prepare transaction"
        );
      }

      const { serializedTransaction } = responseData;
      const signer = await primaryWallet.getSigner();

      setResult("Please sign the transaction...");

      try {
        setResult("Signing transaction...");
        const transaction = Transaction.from(
          bs58.decode(serializedTransaction)
        );

        const { signature } = await signer.signAndSendTransaction(transaction);

        setResult(`USDC transfer successful! Signature: ${signature}
        View on Solana explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      } catch (err) {
        setResult(
          `Error signing transaction: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } catch (error) {
      setResult(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dynamic-methods" data-theme={isDarkMode ? "dark" : "light"}>
      <div className="usdc-transfer">
        <h2>Send USDC (Gasless)</h2>
        <div className="input-group">
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <input
            type="text"
            placeholder="Amount in USDC"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={sendUSDC}
            disabled={
              !isLoggedIn ||
              !primaryWallet ||
              isLoading ||
              !recipientAddress ||
              !amount
            }
          >
            {isLoading ? "Processing..." : "Send USDC"}
          </button>
        </div>
      </div>

      {result && <div className="result">{result}</div>}
    </div>
  );
}
