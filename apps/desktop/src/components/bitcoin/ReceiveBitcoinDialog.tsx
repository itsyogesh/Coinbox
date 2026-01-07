/**
 * ReceiveBitcoinDialog - Display Bitcoin address with QR code for receiving
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

interface ReceiveBitcoinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  walletName: string;
}

export function ReceiveBitcoinDialog({
  open,
  onOpenChange,
  address,
  walletName,
}: ReceiveBitcoinDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // BIP21 URI format for Bitcoin
  const bitcoinUri = `bitcoin:${address}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Bitcoin address copied to clipboard",
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
    const svg = document.querySelector("#receive-qr-code svg");
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
      downloadLink.download = `bitcoin-${address.slice(0, 8)}.png`;
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
    window.open(`https://mempool.space/address/${address}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChainIcon chainId="bitcoin" size={20} variant="branded" />
            Receive Bitcoin
          </DialogTitle>
          <DialogDescription>
            Share this address to receive Bitcoin to {walletName}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* QR Code */}
          <div
            id="receive-qr-code"
            className="flex items-center justify-center p-6 bg-white rounded-xl"
          >
            <QRCodeSVG
              value={bitcoinUri}
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
              Bitcoin Address
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
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Only send Bitcoin (BTC) to this address. Sending other
              cryptocurrencies may result in permanent loss.
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default ReceiveBitcoinDialog;
