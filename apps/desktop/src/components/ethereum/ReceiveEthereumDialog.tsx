/**
 * ReceiveEthereumDialog - Display Ethereum address with QR code for receiving
 *
 * The same address works for all EVM chains (Ethereum, Arbitrum, Optimism, Base, Polygon).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Check,
  Download,
  ExternalLink,
} from "lucide-react";
import { ChainIcon } from "@/components/ui/crypto-icon";

import { cn, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type EVMChainId } from "@/lib/viem";

interface ReceiveEthereumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  walletName: string;
}

// Supported chains info
const SUPPORTED_CHAINS: { id: EVMChainId; name: string; color: string }[] = [
  { id: "ethereum", name: "Ethereum", color: "text-blue-500" },
  { id: "arbitrum", name: "Arbitrum", color: "text-blue-400" },
  { id: "optimism", name: "Optimism", color: "text-red-500" },
  { id: "base", name: "Base", color: "text-blue-600" },
  { id: "polygon", name: "Polygon", color: "text-purple-500" },
];

export function ReceiveEthereumDialog({
  open,
  onOpenChange,
  address,
  walletName,
}: ReceiveEthereumDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // EIP-681 URI format for Ethereum
  const ethereumUri = `ethereum:${address}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Ethereum address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSaveQR = () => {
    // Get the SVG element and convert to image for download
    const svg = document.querySelector("#receive-eth-qr-code svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `ethereum-${address.slice(0, 8)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast({
        title: "QR code saved",
        description: "The QR code has been downloaded",
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const openInExplorer = () => {
    window.open(`https://etherscan.io/address/${address}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChainIcon chainId="ethereum" size={20} variant="branded" />
            Receive Ethereum
          </DialogTitle>
          <DialogDescription>
            Share this address to receive ETH to {walletName}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* QR Code */}
          <div
            id="receive-eth-qr-code"
            className="flex items-center justify-center p-6 bg-white rounded-xl"
          >
            <QRCodeSVG
              value={ethereumUri}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: "",
                height: 0,
                width: 0,
                excavate: false,
              }}
            />
          </div>

          {/* Address Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Ethereum Address
            </label>
            <div
              className={cn(
                "p-4 rounded-lg border bg-card/50 cursor-pointer transition-colors",
                "hover:bg-card hover:border-primary/50",
                copied && "border-success bg-success/5"
              )}
              onClick={handleCopy}
            >
              <p className="font-mono text-sm break-all select-all">
                {address}
              </p>
            </div>
          </div>

          {/* Supported Chains */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Supported on
            </label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <span
                  key={chain.id}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
                    chain.color,
                    "bg-current/10"
                  )}
                >
                  <ChainIcon chainId={chain.id} size={14} variant="branded" />
                  {chain.name}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Address
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSaveQR}
              title="Save QR code"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={openInExplorer}
              title="View in explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Info Notice */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              This address works for ETH and ERC-20 tokens on all EVM chains
              including Ethereum, Arbitrum, Optimism, Base, and Polygon.
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default ReceiveEthereumDialog;
